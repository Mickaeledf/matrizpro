-- ============================================================================
-- MatrizPro — reprodutores, assinaturas (teste grátis + mensalidade) e admin
--
-- Regras:
--   * Todo usuário novo ganha 10 dias de teste grátis (criado automaticamente).
--   * Depois disso, só consegue GRAVAR dados com mensalidade em dia
--     (pago_ate no futuro). A leitura continua liberada, para ninguém perder dados.
--   * Plano "vitalicio" (a dona) não expira. "bloqueado" impede gravações.
--   * Administradores (admin = true) podem listar assinantes e liberar acesso.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Reprodutores (cachaços)
-- ---------------------------------------------------------------------------
create table if not exists public.reprodutores (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  identificador text not null,
  dados jsonb not null,
  atualizado_em timestamptz not null default now(),
  primary key (user_id, id)
);

drop trigger if exists reprodutores_atualizado_em on public.reprodutores;
create trigger reprodutores_atualizado_em before update on public.reprodutores
  for each row execute function public.tocar_atualizado_em();

alter table public.reprodutores enable row level security;
revoke all on public.reprodutores from anon;
grant select, insert, update, delete on public.reprodutores to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Assinaturas
-- ---------------------------------------------------------------------------
create table if not exists public.assinaturas (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plano text not null default 'teste' check (plano in ('teste', 'mensal', 'vitalicio', 'bloqueado')),
  teste_ate timestamptz not null default (now() + interval '10 days'),
  pago_ate timestamptz,
  admin boolean not null default false,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

drop trigger if exists assinaturas_atualizado_em on public.assinaturas;
create trigger assinaturas_atualizado_em before update on public.assinaturas
  for each row execute function public.tocar_atualizado_em();

alter table public.assinaturas enable row level security;
revoke all on public.assinaturas from anon, authenticated;
-- O usuário só pode LER a própria assinatura (alterações só pelo admin/servidor)
grant select on public.assinaturas to authenticated;
drop policy if exists "dono_select" on public.assinaturas;
create policy "dono_select" on public.assinaturas for select to authenticated
  using ((select auth.uid()) = user_id);

-- Cria a assinatura de teste automaticamente para cada novo cadastro
create or replace function public.criar_assinatura_teste()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.assinaturas (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists ao_criar_usuario_criar_assinatura on auth.users;
create trigger ao_criar_usuario_criar_assinatura after insert on auth.users
  for each row execute function public.criar_assinatura_teste();

-- Usuários que já existiam também recebem a assinatura de teste
insert into public.assinaturas (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- A dona do sistema: acesso ilimitado e administradora
update public.assinaturas a
set plano = 'vitalicio', admin = true, observacoes = 'Dona do sistema'
from auth.users u
where u.id = a.user_id and u.email = 'k.mickaele@gmail.com';

-- A assinatura do usuário permite gravar dados agora?
create or replace function public.assinatura_ativa(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.assinaturas a
    where a.user_id = uid
      and a.plano <> 'bloqueado'
      and (
        a.plano = 'vitalicio'
        or a.teste_ate > now()
        or coalesce(a.pago_ate, '-infinity'::timestamptz) > now()
      )
  );
$$;

revoke all on function public.assinatura_ativa(uuid) from public, anon;
grant execute on function public.assinatura_ativa(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Políticas das tabelas de dados: leitura do próprio dado sempre;
--    gravação somente com assinatura ativa
-- ---------------------------------------------------------------------------
do $$
declare
  tabela text;
begin
  foreach tabela in array array['matrizes', 'reprodutores', 'lotes', 'configuracoes'] loop
    execute format('drop policy if exists "dono_select" on public.%I', tabela);
    execute format('drop policy if exists "dono_insert" on public.%I', tabela);
    execute format('drop policy if exists "dono_update" on public.%I', tabela);
    execute format('drop policy if exists "dono_delete" on public.%I', tabela);

    execute format(
      'create policy "dono_select" on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      tabela);
    execute format(
      'create policy "dono_insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id and (select public.assinatura_ativa()))',
      tabela);
    execute format(
      'create policy "dono_update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and (select public.assinatura_ativa()))',
      tabela);
    execute format(
      'create policy "dono_delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id and (select public.assinatura_ativa()))',
      tabela);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4) Funções de administração (só funcionam para quem tem admin = true)
-- ---------------------------------------------------------------------------
create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.assinaturas where user_id = auth.uid() and admin);
$$;

revoke all on function public.eh_admin() from public, anon;
grant execute on function public.eh_admin() to authenticated;

create or replace function public.admin_listar_assinantes()
returns table (
  user_id uuid,
  email text,
  cadastrado_em timestamptz,
  ultimo_acesso timestamptz,
  email_confirmado boolean,
  plano text,
  teste_ate timestamptz,
  pago_ate timestamptz,
  admin boolean,
  ativa boolean,
  observacoes text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Acesso restrito ao administrador.' using errcode = '42501';
  end if;
  return query
    select u.id, u.email::text, u.created_at, u.last_sign_in_at, u.email_confirmed_at is not null,
           a.plano, a.teste_ate, a.pago_ate, a.admin, public.assinatura_ativa(u.id), a.observacoes
    from auth.users u
    left join public.assinaturas a on a.user_id = u.id
    order by u.created_at desc;
end;
$$;

revoke all on function public.admin_listar_assinantes() from public, anon;
grant execute on function public.admin_listar_assinantes() to authenticated;

-- acao: 'pagamento' (+dias de mensalidade), 'teste' (+dias de teste),
--       'bloquear', 'desbloquear', 'vitalicio'
create or replace function public.admin_alterar_assinatura(alvo uuid, acao text, dias integer default 30)
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

  insert into public.assinaturas (user_id) values (alvo) on conflict (user_id) do nothing;

  if acao = 'pagamento' then
    update public.assinaturas
    set plano = 'mensal',
        pago_ate = greatest(coalesce(pago_ate, now()), now()) + make_interval(days => dias)
    where user_id = alvo;
  elsif acao = 'teste' then
    update public.assinaturas
    set plano = 'teste', teste_ate = greatest(teste_ate, now()) + make_interval(days => dias)
    where user_id = alvo;
  elsif acao = 'bloquear' then
    update public.assinaturas set plano = 'bloqueado' where user_id = alvo and not admin;
  elsif acao = 'desbloquear' then
    update public.assinaturas
    set plano = case when coalesce(pago_ate, '-infinity'::timestamptz) > now() then 'mensal' else 'teste' end
    where user_id = alvo and plano = 'bloqueado';
  elsif acao = 'vitalicio' then
    update public.assinaturas set plano = 'vitalicio' where user_id = alvo;
  else
    raise exception 'Ação desconhecida: %', acao;
  end if;
end;
$$;

revoke all on function public.admin_alterar_assinatura(uuid, text, integer) from public, anon;
grant execute on function public.admin_alterar_assinatura(uuid, text, integer) to authenticated;
