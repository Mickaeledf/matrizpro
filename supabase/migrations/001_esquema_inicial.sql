-- ============================================================================
-- MatrizPro — esquema do banco de dados (Supabase / Postgres)
--
-- Cada registro pertence a um usuário (user_id). As políticas de RLS garantem
-- que cada usuário só consegue ler e alterar os PRÓPRIOS dados.
--
-- Matrizes e lotes são guardados como documentos JSON (coluna "dados"), no
-- mesmo formato usado pelo app. Lotes incluem leitões, pesagens, saúde,
-- vacinas e lançamentos financeiros.
-- ============================================================================

-- Matrizes (inclui o histórico de ciclos reprodutivos)
create table if not exists public.matrizes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  identificador text not null,
  dados jsonb not null,
  atualizado_em timestamptz not null default now(),
  primary key (user_id, id)
);

-- Lotes / leitegadas
create table if not exists public.lotes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  nome text not null,
  matriz_id text,
  dados jsonb not null,
  atualizado_em timestamptz not null default now(),
  primary key (user_id, id)
);

-- Configurações da fazenda (uma linha por usuário)
create table if not exists public.configuracoes (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  dados jsonb not null,
  atualizado_em timestamptz not null default now()
);

-- Atualiza "atualizado_em" automaticamente
create or replace function public.tocar_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists matrizes_atualizado_em on public.matrizes;
create trigger matrizes_atualizado_em before update on public.matrizes
  for each row execute function public.tocar_atualizado_em();

drop trigger if exists lotes_atualizado_em on public.lotes;
create trigger lotes_atualizado_em before update on public.lotes
  for each row execute function public.tocar_atualizado_em();

drop trigger if exists configuracoes_atualizado_em on public.configuracoes;
create trigger configuracoes_atualizado_em before update on public.configuracoes
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------------
-- Segurança: Row Level Security (cada usuário só vê os próprios registros)
-- ---------------------------------------------------------------------------
alter table public.matrizes enable row level security;
alter table public.lotes enable row level security;
alter table public.configuracoes enable row level security;

-- Usuários anônimos (sem login) não têm acesso a nada
revoke all on public.matrizes, public.lotes, public.configuracoes from anon;
grant select, insert, update, delete on public.matrizes, public.lotes, public.configuracoes to authenticated;

do $$
declare
  tabela text;
begin
  foreach tabela in array array['matrizes', 'lotes', 'configuracoes'] loop
    execute format('drop policy if exists "dono_select" on public.%I', tabela);
    execute format('drop policy if exists "dono_insert" on public.%I', tabela);
    execute format('drop policy if exists "dono_update" on public.%I', tabela);
    execute format('drop policy if exists "dono_delete" on public.%I', tabela);

    execute format(
      'create policy "dono_select" on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      tabela);
    execute format(
      'create policy "dono_insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      tabela);
    execute format(
      'create policy "dono_update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      tabela);
    execute format(
      'create policy "dono_delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      tabela);
  end loop;
end $$;

-- Índice para buscar os lotes de uma matriz
create index if not exists lotes_matriz_idx on public.lotes (user_id, matriz_id);
