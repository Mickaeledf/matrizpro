-- ============================================================================
-- MatrizPro — BASE GRANDE (10.000 leitões) — só para teste de desempenho.
-- Para a demonstração do dia a dia use base_exemplo_karen.sql (50 leitões).
--
-- Gera ~10.000 leitões distribuídos em leitegadas de 115 matrizes, com
-- 6 reprodutores, ciclos reprodutivos (cobertura → parto → desmame), pesagens,
-- registros de saúde, vacinas e lançamentos financeiros, de 2022 até hoje.
--
-- Todos os registros recebem "origem": "exemplo" e podem ser removidos pelo
-- app (Configurações → Remover dados de exemplo) ou rodando de novo só a
-- seção "LIMPEZA" abaixo.
--
-- Pode ser executado mais de uma vez: apaga a base de exemplo anterior antes.
-- Os números aleatórios usam semente fixa (o resultado é sempre o mesmo).
-- ============================================================================

-- Funções auxiliares temporárias (somem ao fim da sessão)
create or replace function pg_temp.ri(a int, b int) returns int
language sql volatile as $$ select a + floor(random() * (b - a + 1))::int $$;

create or replace function pg_temp.normal(media float8, dp float8) returns float8
language sql volatile as $$
  select media + dp * sqrt(-2 * ln(greatest(random(), 1e-12))) * cos(2 * pi() * random())
$$;

create or replace function pg_temp.d(x date) returns text
language sql immutable as $$ select to_char(x, 'YYYY-MM-DD') $$;

create or replace function pg_temp.escolha(opcoes text[]) returns text
language sql volatile as $$ select opcoes[1 + floor(random() * array_length(opcoes, 1))::int] $$;

do $$
#variable_conflict use_variable
declare
  dono uuid;
  hoje date := current_date;
  alvo_leitoes int := 10000;

  -- matrizes / ciclos
  i int; k int; n_parto int;
  m_id text; m_ident text; m_raca text; m_entrada date; m_nasc date;
  m_status text; m_status_rep text; m_limite_partos int;
  c date; parto date; desmame date; prev date;
  rep_id text; rep_ident text; tipo text;
  ciclos jsonb;
  ultimo text;

  -- lotes / leitões
  r record;
  lt_id text; lote_id text;
  leitoes jsonb; pesagens jsonb; registros jsonb; vacinas jsonb; lanc jsonb;
  peso_nasc float8; fator float8; peso float8; dia int; idade int; idade_fim int;
  morre_dia int; morto boolean; status_lt text; saude text;
  vivos_total int; diff int; passo int;
  soma_venda float8; n_vendidos int; data_venda date;
  dias_pesagem int[];
  custo_saude float8;
begin
  select id into dono from auth.users where email = 'k.mickaele@gmail.com';
  if dono is null then
    raise exception 'Conta k.mickaele@gmail.com não encontrada.';
  end if;

  perform setseed(0.2026);

  -- ------------------------------------------------------------------------
  -- LIMPEZA: remove a base de exemplo anterior (não mexe em dados reais)
  -- ------------------------------------------------------------------------
  delete from public.lotes where user_id = dono and dados ->> 'origem' = 'exemplo';
  delete from public.matrizes where user_id = dono and dados ->> 'origem' = 'exemplo';
  delete from public.reprodutores where user_id = dono and dados ->> 'origem' = 'exemplo';

  -- ------------------------------------------------------------------------
  -- REPRODUTORES
  -- ------------------------------------------------------------------------
  create temp table t_rep (id text, ident text, raca text, nasc date, entrada date, saida date, status text) on commit drop;
  insert into t_rep values
    (gen_random_uuid()::text, 'R-01', 'Duroc',       '2020-11-10', '2021-09-01', null,         'Ativo'),
    (gen_random_uuid()::text, 'R-02', 'Pietrain',    '2021-02-03', '2021-10-15', null,         'Ativo'),
    (gen_random_uuid()::text, 'R-03', 'Large White', '2021-06-20', '2022-03-10', null,         'Ativo'),
    (gen_random_uuid()::text, 'R-04', 'Landrace',    '2022-01-12', '2022-09-05', null,         'Ativo'),
    (gen_random_uuid()::text, 'R-05', 'Duroc',       '2024-02-18', '2024-11-20', null,         'Ativo'),
    (gen_random_uuid()::text, 'R-06', 'Pietrain',    '2020-05-30', '2021-08-01', '2024-06-30', 'Descartado');

  insert into public.reprodutores (user_id, id, identificador, dados)
  select dono, id, ident, jsonb_build_object(
    'id', id, 'identificador', ident, 'raca', raca,
    'dataNascimento', pg_temp.d(nasc), 'dataEntrada', pg_temp.d(entrada),
    'status', status,
    'observacoes', case when saida is not null then 'Descartado em ' || to_char(saida, 'DD/MM/YYYY') || ' (idade).' end,
    'createdAt', entrada::timestamptz, 'origem', 'exemplo')
  from t_rep;

  -- ------------------------------------------------------------------------
  -- PLANO DOS CICLOS (sem leitões ainda)
  -- ------------------------------------------------------------------------
  create temp table t_mat (idx int, id text, ident text, raca text, nasc date, entrada date,
                           preco int, status text, status_rep text) on commit drop;
  create temp table t_ciclo (mat_idx int, ordem int, id text, cobertura date, tipo text, rep_id text, rep_ident text,
                             prevista date, parto date, desmame date, status text, lote_id text) on commit drop;
  create temp table t_lote (id text, mat_idx int, mat_id text, nome text, parto date, desmame date,
                            vivos int, mortos int, status text) on commit drop;

  for i in 1..115 loop
    m_id := gen_random_uuid()::text;
    m_ident := 'M-' || lpad(i::text, 3, '0');
    m_raca := pg_temp.escolha(array['Large White', 'Landrace', 'F1 (LW x LD)', 'F1 (LW x LD)', 'F1 (LW x LD)']);
    -- matrizes mais antigas entram primeiro (2022) e as novas até 2026
    m_entrada := date '2022-01-10' + (power(random(), 1.35) * (date '2026-03-01' - date '2022-01-10'))::int;
    m_nasc := m_entrada - pg_temp.ri(190, 240);
    m_status := 'Ativa';
    m_limite_partos := 99;
    if m_entrada < date '2023-09-01' and random() < 0.22 then
      m_status := 'Descartada';
      m_limite_partos := pg_temp.ri(4, 7);
    elsif random() < 0.02 then
      m_status := 'Inativa';
    end if;

    c := m_entrada + pg_temp.ri(20, 45);
    n_parto := 0;
    k := 0;
    ultimo := 'Vazia';

    while c <= hoje and n_parto < m_limite_partos loop
      k := k + 1;
      select id, ident into rep_id, rep_ident from t_rep
      where entrada <= c and (saida is null or saida >= c)
      order by random() limit 1;
      tipo := case when random() < 0.8 then 'Inseminação artificial' else 'Monta natural' end;
      prev := c + 114;

      if random() < 0.07 then
        insert into t_ciclo values (i, k, gen_random_uuid()::text, c, tipo, rep_id, rep_ident, prev, null, null, 'Falhou', null);
        ultimo := 'Vazia';
        c := c + pg_temp.ri(21, 27);
        continue;
      end if;

      parto := c + pg_temp.ri(112, 116);
      if parto > hoje then
        insert into t_ciclo values (i, k, gen_random_uuid()::text, c, tipo, rep_id, rep_ident, prev, null, null, 'Em gestação', null);
        ultimo := 'Gestante';
        exit;
      end if;

      n_parto := n_parto + 1;
      lote_id := gen_random_uuid()::text;
      desmame := parto + pg_temp.ri(21, 28);

      insert into t_lote values (
        lote_id, i, m_id, m_ident || '-P' || n_parto, parto,
        case when desmame <= hoje then desmame end,
        greatest(5, least(17, round(pg_temp.normal(12.2, 2.3))::int)),
        (array[0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 2, 3, 4])[pg_temp.ri(1, 20)],
        case
          when desmame > hoje then 'Ativo'
          when hoje - parto < 70 then 'Desmamado'
          when random() < 0.88 then 'Vendido'
          else 'Finalizado'
        end);

      if desmame > hoje then
        insert into t_ciclo values (i, k, gen_random_uuid()::text, c, tipo, rep_id, rep_ident, prev, parto, null, 'Parida', lote_id);
        ultimo := 'Lactante';
        exit;
      end if;

      insert into t_ciclo values (i, k, gen_random_uuid()::text, c, tipo, rep_id, rep_ident, prev, parto, desmame, 'Desmamada', lote_id);
      ultimo := 'Desmamada';
      c := desmame + pg_temp.ri(4, 9);
    end loop;

    -- matriz desmamada há mais de 10 dias sem nova cobertura volta a "Vazia"
    if ultimo = 'Desmamada' and hoje - (select max(t.desmame) from t_ciclo t where t.mat_idx = i) > 10 then
      ultimo := 'Vazia';
    end if;
    if m_status <> 'Ativa' then
      ultimo := 'Vazia';
    end if;

    insert into t_mat values (i, m_id, m_ident, m_raca, m_nasc, m_entrada,
                              (pg_temp.ri(24, 52) * 50), m_status, ultimo);
  end loop;

  -- Ajusta o total de nascidos vivos para fechar exatamente no alvo
  select sum(vivos) into vivos_total from t_lote;
  diff := alvo_leitoes - vivos_total;
  passo := sign(diff);
  while diff <> 0 loop
    update t_lote set vivos = vivos + passo
    where id = (
      select id from t_lote
      where status in ('Vendido', 'Finalizado') and vivos + passo between 5 and 17
      order by random() limit 1);
    diff := diff - passo;
  end loop;

  -- ------------------------------------------------------------------------
  -- MATRIZES (com o histórico de ciclos)
  -- ------------------------------------------------------------------------
  insert into public.matrizes (user_id, id, identificador, dados)
  select dono, m.id, m.ident, jsonb_build_object(
    'id', m.id, 'identificador', m.ident, 'raca', m.raca,
    'dataNascimento', pg_temp.d(m.nasc), 'dataEntrada', pg_temp.d(m.entrada),
    'precoAquisicao', m.preco, 'status', m.status, 'statusReprodutivo', m.status_rep,
    'createdAt', m.entrada::timestamptz, 'origem', 'exemplo',
    'ciclos', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', c2.id, 'dataCobertura', pg_temp.d(c2.cobertura), 'tipoCobertura', c2.tipo,
        'reprodutor', c2.rep_ident, 'reprodutorId', c2.rep_id,
        'dataPrevistaParto', pg_temp.d(c2.prevista),
        'dataParto', pg_temp.d(c2.parto), 'dataDesmame', pg_temp.d(c2.desmame),
        'loteId', c2.lote_id, 'status', c2.status)) order by c2.ordem)
      from t_ciclo c2 where c2.mat_idx = m.idx), '[]'::jsonb))
  from t_mat m;

  -- ------------------------------------------------------------------------
  -- LOTES + LEITÕES
  -- ------------------------------------------------------------------------
  for r in select * from t_lote order by parto loop
    idade := hoje - r.parto;
    -- até quando os leitões ficam na granja (venda ~63-70 dias)
    idade_fim := case when r.status in ('Vendido', 'Finalizado') then pg_temp.ri(63, 70) else idade end;
    data_venda := r.parto + idade_fim;

    if r.status in ('Vendido', 'Finalizado') then
      dias_pesagem := array[7, 21, 42, idade_fim];
    else
      select array_agg(g) into dias_pesagem from generate_series(7, idade, 7) g;
      dias_pesagem := coalesce(dias_pesagem, array[]::int[]);
    end if;

    leitoes := '[]'::jsonb;
    soma_venda := 0;
    n_vendidos := 0;
    custo_saude := 0;

    for k in 1..r.vivos loop
      lt_id := gen_random_uuid()::text;
      peso_nasc := round(greatest(0.6, least(2.4, pg_temp.normal(1.42, 0.27)))::numeric, 2);
      fator := greatest(0.6, pg_temp.normal(1.0, 0.09));
      -- mortalidade ~8% na maternidade/creche
      morre_dia := case when random() < 0.08 then pg_temp.ri(1, 30) else null end;
      morto := morre_dia is not null and morre_dia <= least(idade, idade_fim);

      pesagens := '[]'::jsonb;
      peso := peso_nasc;
      foreach dia in array dias_pesagem loop
        exit when morto and dia >= morre_dia;
        peso := round((peso_nasc
                 + 0.245 * fator * least(dia, 24)
                 + 0.42 * fator * greatest(dia - 24, 0)
                 + pg_temp.normal(0, 0.06 + dia * 0.004))::numeric, 2);
        pesagens := pesagens || jsonb_build_object(
          'id', gen_random_uuid()::text, 'leitaoId', lt_id, 'peso', peso,
          'data', pg_temp.d(r.parto + dia));
      end loop;

      status_lt := case when morto then 'Morto' when r.status in ('Vendido', 'Finalizado') then 'Vendido' else 'Ativo' end;
      saude := 'Saudável';
      registros := '[]'::jsonb;

      if status_lt = 'Ativo' then
        saude := case
          when random() < 0.008 then 'Crítico'
          when random() < 0.02 then 'Em tratamento'
          when random() < 0.04 then 'Em observação'
          else 'Saudável' end;
      end if;

      if saude in ('Crítico', 'Em tratamento') or random() < 0.06 then
        dia := least(greatest(idade, 1), pg_temp.ri(2, 20));
        registros := jsonb_build_array(jsonb_build_object(
          'id', gen_random_uuid()::text, 'leitaoId', lt_id,
          'tipo', case when random() < 0.6 then 'tratamento' else 'medicacao' end,
          'descricao', pg_temp.escolha(array['Diarreia neonatal', 'Artrite', 'Problema respiratório',
                                             'Onfalite', 'Baixo ganho de peso', 'Lesão de pele']),
          'data', pg_temp.d(r.parto + dia),
          'medicamento', pg_temp.escolha(array['Enrofloxacina', 'Amoxicilina', 'Florfenicol', 'Ceftiofur']),
          'dose', pg_temp.escolha(array['0,5 mL', '1 mL', '1,5 mL']),
          'custo', pg_temp.ri(4, 18)));
        custo_saude := custo_saude + (registros -> 0 ->> 'custo')::int;
      end if;

      if status_lt = 'Vendido' then
        soma_venda := soma_venda + peso;
        n_vendidos := n_vendidos + 1;
      end if;

      leitoes := leitoes || jsonb_build_object(
        'id', lt_id, 'loteId', r.id,
        'identificador', r.nome || '-' || lpad(k::text, 2, '0'),
        'sexo', case when random() < 0.5 then 'Macho' else 'Fêmea' end,
        'pesoNascimento', peso_nasc, 'pesoAtual', peso,
        'status', status_lt, 'statusSaude', saude,
        'dataNascimento', pg_temp.d(r.parto),
        'pesagens', pesagens, 'registrosSaude', registros);
    end loop;

    -- Vacinas do protocolo (exemplo): dia 3, 7 e 21 de vida
    vacinas := '[]'::jsonb;
    for dia, tipo in select * from (values (3, 'Ferro dextrano'), (7, 'Mycoplasma'), (21, 'Circovírus')) v(d, n) loop
      vacinas := vacinas || jsonb_strip_nulls(jsonb_build_object(
        'id', gen_random_uuid()::text, 'nome', tipo, 'dataAgendada', pg_temp.d(r.parto + dia),
        'aplicada', (r.parto + dia <= hoje and not (r.status = 'Ativo' and random() < 0.15)),
        'dataAplicacao', case when r.parto + dia <= hoje then pg_temp.d(r.parto + dia) end));
    end loop;
    -- vacina não aplicada não tem data de aplicação
    select jsonb_agg(case when (v ->> 'aplicada')::boolean then v else v - 'dataAplicacao' end)
    into vacinas from jsonb_array_elements(vacinas) v;

    -- Lançamentos financeiros
    lanc := '[]'::jsonb;
    if r.parto + 21 <= hoje then
      lanc := lanc || jsonb_build_object('id', gen_random_uuid()::text, 'tipo', 'custo', 'categoria', 'Vacinas',
        'descricao', 'Protocolo vacinal da leitegada', 'valor', round((r.vivos * 4.6)::numeric, 2), 'data', pg_temp.d(r.parto + 21));
    end if;
    if r.desmame is not null then
      lanc := lanc || jsonb_build_object('id', gen_random_uuid()::text, 'tipo', 'custo', 'categoria', 'Ração',
        'descricao', 'Ração pré-inicial (maternidade)', 'valor', round((r.vivos * pg_temp.normal(17, 1.5))::numeric, 2), 'data', pg_temp.d(r.desmame));
      lanc := lanc || jsonb_build_object('id', gen_random_uuid()::text, 'tipo', 'custo', 'categoria', 'Mão de obra',
        'descricao', 'Manejo da maternidade', 'valor', 140, 'data', pg_temp.d(r.desmame));
    end if;
    if r.status in ('Vendido', 'Finalizado') then
      lanc := lanc || jsonb_build_object('id', gen_random_uuid()::text, 'tipo', 'custo', 'categoria', 'Ração',
        'descricao', 'Ração de creche', 'valor', round((n_vendidos * pg_temp.normal(58, 4))::numeric, 2), 'data', pg_temp.d(data_venda));
      lanc := lanc || jsonb_build_object('id', gen_random_uuid()::text, 'tipo', 'receita', 'categoria', 'Venda de leitões',
        'descricao', n_vendidos || ' leitões vendidos', 'valor', round((soma_venda * pg_temp.normal(15.2, 0.8))::numeric, 2),
        'data', pg_temp.d(data_venda));
    end if;

    insert into public.lotes (user_id, id, nome, matriz_id, dados)
    values (dono, r.id, r.nome, r.mat_id, jsonb_strip_nulls(jsonb_build_object(
      'id', r.id, 'nome', r.nome, 'matrizId', r.mat_id,
      'dataParto', pg_temp.d(r.parto), 'dataDesmame', pg_temp.d(r.desmame),
      'nascidosVivos', r.vivos, 'nascidosMortos', r.mortos,
      'status', r.status, 'createdAt', r.parto::timestamptz, 'origem', 'exemplo',
      'vacinasPendentes', coalesce(vacinas, '[]'::jsonb), 'lancamentos', lanc)) || jsonb_build_object('leitoes', leitoes));
  end loop;

  raise notice 'Base de exemplo criada: % matrizes, % reprodutores, % lotes, % leitões',
    (select count(*) from t_mat), (select count(*) from t_rep), (select count(*) from t_lote),
    (select sum(vivos) from t_lote);
end $$;

-- Resumo do que ficou salvo na conta
select
  (select count(*) from public.matrizes m join auth.users u on u.id = m.user_id where u.email = 'k.mickaele@gmail.com') as matrizes,
  (select count(*) from public.reprodutores r join auth.users u on u.id = r.user_id where u.email = 'k.mickaele@gmail.com') as reprodutores,
  (select count(*) from public.lotes l join auth.users u on u.id = l.user_id where u.email = 'k.mickaele@gmail.com') as lotes,
  (select sum(jsonb_array_length(l.dados -> 'leitoes')) from public.lotes l join auth.users u on u.id = l.user_id where u.email = 'k.mickaele@gmail.com') as leitoes;
