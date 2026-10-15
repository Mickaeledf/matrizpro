-- ============================================================================
-- MatrizPro — teste grátis de 7 dias e pagamentos online (Mercado Pago)
--
-- Regras:
--   * Novos cadastros ganham 7 dias de teste (só as abas básicas, controlado no app).
--   * Depois do teste, sem plano pago, o banco bloqueia as gravações (já era assim)
--     e o app mostra apenas a página Assinatura.
--   * Cada clique em "Assinar" cria um pedido em public.pagamentos.
--   * O acesso só é liberado pelo servidor (Edge Function "pagamentos"), depois de
--     consultar o pagamento direto no Mercado Pago e conferir status e valor.
--     O usuário não consegue criar nem alterar pagamentos pelo navegador.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Teste grátis: 7 dias para os novos cadastros
-- ---------------------------------------------------------------------------
alter table public.assinaturas alter column teste_ate set default (now() + interval '7 days');

-- ---------------------------------------------------------------------------
-- 2) Pedidos e pagamentos
-- ---------------------------------------------------------------------------
create table if not exists public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plano text not null check (plano in ('mensal', 'semestral')),
  valor numeric(10, 2) not null check (valor > 0),
  status text not null default 'pendente'
    check (status in ('pendente', 'aprovado', 'recusado', 'cancelado', 'estornado')),
  gateway text not null default 'mercadopago',
  preferencia_id text,
  -- id do pagamento no Mercado Pago (único: o mesmo pagamento nunca libera duas vezes)
  pagamento_id text unique,
  forma text,
  valor_pago numeric(10, 2),
  dias_liberados integer,
  criado_em timestamptz not null default now(),
  aprovado_em timestamptz,
  atualizado_em timestamptz not null default now()
);

create index if not exists pagamentos_usuario_idx on public.pagamentos (user_id, criado_em desc);

drop trigger if exists pagamentos_atualizado_em on public.pagamentos;
create trigger pagamentos_atualizado_em before update on public.pagamentos
  for each row execute function public.tocar_atualizado_em();

alter table public.pagamentos enable row level security;
revoke all on public.pagamentos from anon, authenticated;
-- Pelo navegador: só leitura (o próprio histórico; a administradora vê todos)
grant select on public.pagamentos to authenticated;

drop policy if exists "ver_pagamentos" on public.pagamentos;
create policy "ver_pagamentos" on public.pagamentos for select to authenticated
  using ((select auth.uid()) = user_id or (select public.eh_admin()));

-- ---------------------------------------------------------------------------
-- 3) Liberação do plano — chamada SOMENTE pelo servidor (service_role),
--    depois de confirmar o pagamento no Mercado Pago.
--    Retorna true se liberou agora; false se esse pedido já tinha sido liberado.
-- ---------------------------------------------------------------------------
create or replace function public.registrar_pagamento_aprovado(
  p_pedido uuid, p_pagamento_id text, p_valor_pago numeric, p_forma text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.pagamentos%rowtype;
  v_dias integer;
begin
  select * into v from public.pagamentos where id = p_pedido for update;
  if not found then
    raise exception 'Pedido % não encontrado.', p_pedido;
  end if;
  if v.status = 'aprovado' then
    return false;
  end if;
  -- Confere o valor (tolerância de 1 centavo para arredondamento)
  if p_valor_pago is null or p_valor_pago + 0.01 < v.valor then
    raise exception 'Valor pago (%) menor que o valor do plano (%).', p_valor_pago, v.valor;
  end if;

  v_dias := case v.plano when 'semestral' then 180 else 30 end;

  update public.pagamentos
  set status = 'aprovado', pagamento_id = p_pagamento_id, valor_pago = p_valor_pago,
      forma = p_forma, dias_liberados = v_dias, aprovado_em = now()
  where id = p_pedido;

  insert into public.assinaturas (user_id) values (v.user_id) on conflict (user_id) do nothing;

  -- Soma os dias a partir de hoje ou do vencimento atual (quem renova antes não perde dias).
  -- Conta bloqueada pela administradora continua bloqueada; vitalício continua vitalício.
  update public.assinaturas a
  set plano = case when a.plano in ('vitalicio', 'bloqueado') then a.plano else v.plano end,
      pago_ate = greatest(coalesce(a.pago_ate, now()), now()) + make_interval(days => v_dias)
  where a.user_id = v.user_id;

  return true;
end;
$$;

revoke all on function public.registrar_pagamento_aprovado(uuid, text, numeric, text) from public, anon, authenticated;
grant execute on function public.registrar_pagamento_aprovado(uuid, text, numeric, text) to service_role;
