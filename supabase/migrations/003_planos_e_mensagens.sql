-- ============================================================================
-- MatrizPro — plano semestral e caixa de mensagens
--
-- * Planos pagos: "mensal" (30 dias) e "semestral" (180 dias, 6 pelo preço de 5).
-- * Caixa de mensagens: somente administradores enviam; cada usuário lê as
--   mensagens enviadas para ele ou para todos. Usuários NÃO enviam nada.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Plano semestral
-- ---------------------------------------------------------------------------
alter table public.assinaturas drop constraint if exists assinaturas_plano_check;
alter table public.assinaturas
  add constraint assinaturas_plano_check check (plano in ('teste', 'mensal', 'semestral', 'vitalicio', 'bloqueado'));

-- A versão anterior (sem o parâmetro "plano") é substituída
drop function if exists public.admin_alterar_assinatura(uuid, text, integer);

-- acao: 'pagamento' (+dias, no plano informado), 'teste' (+dias de teste),
--       'bloquear', 'desbloquear', 'vitalicio'
create or replace function public.admin_alterar_assinatura(
  alvo uuid, acao text, dias integer default 30, plano text default 'mensal'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Acesso restrito ao administrador.' using errcode = '42501';
  end if;
  if dias is null or dias < 1 or dias > 3660 then
    raise exception 'Quantidade de dias inválida.';
  end if;
  if plano not in ('mensal', 'semestral') then
    raise exception 'Plano inválido: %', plano;
  end if;

  insert into public.assinaturas (user_id) values (alvo) on conflict (user_id) do nothing;

  if acao = 'pagamento' then
    update public.assinaturas a
    set plano = admin_alterar_assinatura.plano,
        pago_ate = greatest(coalesce(a.pago_ate, now()), now()) + make_interval(days => dias)
    where a.user_id = alvo;
  elsif acao = 'teste' then
    update public.assinaturas a
    set plano = 'teste', teste_ate = greatest(a.teste_ate, now()) + make_interval(days => dias)
    where a.user_id = alvo;
  elsif acao = 'bloquear' then
    update public.assinaturas a set plano = 'bloqueado' where a.user_id = alvo and not a.admin;
  elsif acao = 'desbloquear' then
    update public.assinaturas a
    set plano = case when coalesce(a.pago_ate, '-infinity'::timestamptz) > now() then 'mensal' else 'teste' end
    where a.user_id = alvo and a.plano = 'bloqueado';
  elsif acao = 'vitalicio' then
    update public.assinaturas a set plano = 'vitalicio' where a.user_id = alvo;
  else
    raise exception 'Ação desconhecida: %', acao;
  end if;
end;
$$;

revoke all on function public.admin_alterar_assinatura(uuid, text, integer, text) from public, anon;
grant execute on function public.admin_alterar_assinatura(uuid, text, integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Caixa de mensagens
-- ---------------------------------------------------------------------------
create table if not exists public.mensagens (
  id uuid primary key default gen_random_uuid(),
  -- null = enviada para todos os usuários
  para uuid references auth.users (id) on delete cascade,
  titulo text not null check (length(trim(titulo)) between 1 and 150),
  corpo text not null check (length(trim(corpo)) between 1 and 5000),
  link text check (link is null or link ~* '^https?://'),
  link_rotulo text,
  criado_por uuid default auth.uid() references auth.users (id) on delete set null,
  criado_em timestamptz not null default now()
);

create index if not exists mensagens_para_idx on public.mensagens (para, criado_em desc);

alter table public.mensagens enable row level security;
revoke all on public.mensagens from anon, authenticated;
grant select, insert, delete on public.mensagens to authenticated;

drop policy if exists "ler_mensagens" on public.mensagens;
create policy "ler_mensagens" on public.mensagens for select to authenticated
  using (para is null or para = (select auth.uid()) or (select public.eh_admin()));

drop policy if exists "admin_envia" on public.mensagens;
create policy "admin_envia" on public.mensagens for insert to authenticated
  with check ((select public.eh_admin()));

drop policy if exists "admin_apaga" on public.mensagens;
create policy "admin_apaga" on public.mensagens for delete to authenticated
  using ((select public.eh_admin()));

-- Quais mensagens cada usuário já leu
create table if not exists public.mensagens_lidas (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mensagem_id uuid not null references public.mensagens (id) on delete cascade,
  lida_em timestamptz not null default now(),
  primary key (user_id, mensagem_id)
);

alter table public.mensagens_lidas enable row level security;
revoke all on public.mensagens_lidas from anon, authenticated;
grant select, insert on public.mensagens_lidas to authenticated;

drop policy if exists "dono_select" on public.mensagens_lidas;
create policy "dono_select" on public.mensagens_lidas for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "dono_insert" on public.mensagens_lidas;
create policy "dono_insert" on public.mensagens_lidas for insert to authenticated
  with check ((select auth.uid()) = user_id);
