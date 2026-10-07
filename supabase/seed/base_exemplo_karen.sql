-- ============================================================================
-- MatrizPro — BASE DE DEMONSTRAÇÃO (50 leitões) para a conta da Karen
--
-- Pensada para mostrar CADA situação do sistema pelo menos uma vez.
-- Todas as datas são relativas a HOJE, então os alertas sempre aparecem.
--
-- Reprodutores: R-01 (ativo), R-02 (ativo), R-03 (inativo), R-04 (descartado)
-- Matrizes:
--   M-001 Gestante, parto em 2 dias      → alerta crítico "Parto Próximo"
--   M-002 Gestante, parto em 6 dias      → alerta "Parto Próximo"
--   M-003 Gestante, parto atrasado 3 dias → alerta "Parto Atrasado"
--   M-004 Lactante  (lote A)   M-005 Lactante (lote B)   M-006 Lactante (lote C)
--   M-007 Desmamada (lote D)   M-008 Vazia, gestação falhou
--   M-009 Descartada           M-010 Inativa
-- Lotes (12 + 11 + 10 + 9 + 8 = 50 leitões):
--   A  14 dias, Ativo     → pesagem hoje, vacina atrasada, leitão crítico,
--                           leitão em tratamento, leitão com baixo ganho de peso
--   B  20 dias, Ativo     → vacina amanhã e em 4 dias, desmame amanhã,
--                           pesagem amanhã, mortalidade e natimortos altos
--   C  25 dias, Ativo     → desmame atrasado
--   D  45 dias, Desmamado → creche, com um leitão morto
--   E 150 dias, Vendido   → ciclo completo com venda (receita)
--
-- Todos os registros têm "origem": "exemplo" (removíveis em Configurações).
-- Pode ser executado de novo: apaga a demonstração anterior (inclusive a de 10 mil).
-- ============================================================================

-- Data (yyyy-mm-dd) para o JSON
create or replace function pg_temp.d(x date) returns text
language sql immutable as $$ select to_char(x, 'YYYY-MM-DD') $$;

-- Monta um leitão com pesagens nos dias informados (até hoje e até a morte, se houver)
create or replace function pg_temp.leitao(
  lote_id text, lote_nome text, k int, parto date, nasc numeric, gpd numeric, dias int[],
  status_padrao text, saude text, morre_dia int, sexo text, registro jsonb
) returns jsonb
language plpgsql as $$
declare
  id_leitao text := gen_random_uuid()::text;
  pesagens jsonb := '[]'::jsonb;
  peso numeric := nasc;
  dia int;
  idade int := current_date - parto;
  morto boolean := morre_dia is not null and morre_dia <= idade;
begin
  foreach dia in array dias loop
    exit when dia > idade or (morto and dia >= morre_dia);
    -- maternidade ~gpd até o desmame (24 d), depois creche ~1,7x mais rápido
    peso := round(nasc + gpd * least(dia, 24) + gpd * 1.7 * greatest(dia - 24, 0), 2);
    pesagens := pesagens || jsonb_build_object(
      'id', gen_random_uuid()::text, 'leitaoId', id_leitao, 'peso', peso, 'data', pg_temp.d(parto + dia));
  end loop;
  return jsonb_build_object(
    'id', id_leitao, 'loteId', lote_id,
    'identificador', lote_nome || '-' || lpad(k::text, 2, '0'),
    'sexo', sexo, 'pesoNascimento', nasc, 'pesoAtual', peso,
    'status', case when morto then 'Morto' else status_padrao end,
    'statusSaude', case when morto then 'Saudável' else saude end,
    'dataNascimento', pg_temp.d(parto),
    'pesagens', pesagens,
    'registrosSaude', case when registro is null then '[]'::jsonb
                           else jsonb_build_array(registro || jsonb_build_object('id', gen_random_uuid()::text, 'leitaoId', id_leitao)) end);
end;
$$;

do $$
#variable_conflict use_variable
declare
  dono uuid;
  h date := current_date;
  -- reprodutores
  r1 text := gen_random_uuid()::text; r2 text := gen_random_uuid()::text;
  r3 text := gen_random_uuid()::text; r4 text := gen_random_uuid()::text;
  -- matrizes
  m1 text := gen_random_uuid()::text; m2 text := gen_random_uuid()::text; m3 text := gen_random_uuid()::text;
  m4 text := gen_random_uuid()::text; m5 text := gen_random_uuid()::text; m6 text := gen_random_uuid()::text;
  m7 text := gen_random_uuid()::text; m8 text := gen_random_uuid()::text; m9 text := gen_random_uuid()::text;
  m10 text := gen_random_uuid()::text;
  -- lotes
  la text := gen_random_uuid()::text; lb text := gen_random_uuid()::text; lc text := gen_random_uuid()::text;
  ld text := gen_random_uuid()::text; le text := gen_random_uuid()::text;
  leitoes jsonb;
  k int;
  fatores numeric[];
  nascs numeric[] := array[1.52, 1.38, 1.45, 1.61, 1.29, 1.47, 1.33, 1.56, 1.41, 1.36, 1.18, 1.25];
begin
  select id into dono from auth.users where email = 'k.mickaele@gmail.com';
  if dono is null then raise exception 'Conta k.mickaele@gmail.com não encontrada.'; end if;

  -- Limpa demonstrações anteriores (não mexe em dados reais)
  delete from public.lotes where user_id = dono and dados ->> 'origem' = 'exemplo';
  delete from public.matrizes where user_id = dono and dados ->> 'origem' = 'exemplo';
  delete from public.reprodutores where user_id = dono and dados ->> 'origem' = 'exemplo';

  -- ---------------------------------------------------------------- REPRODUTORES
  insert into public.reprodutores (user_id, id, identificador, dados) values
  (dono, r1, 'R-01', jsonb_build_object('id', r1, 'identificador', 'R-01', 'raca', 'Duroc', 'status', 'Ativo',
     'dataNascimento', pg_temp.d(h - 900), 'dataEntrada', pg_temp.d(h - 650), 'createdAt', h - 650, 'origem', 'exemplo')),
  (dono, r2, 'R-02', jsonb_build_object('id', r2, 'identificador', 'R-02', 'raca', 'Pietrain', 'status', 'Ativo',
     'dataNascimento', pg_temp.d(h - 800), 'dataEntrada', pg_temp.d(h - 560), 'createdAt', h - 560, 'origem', 'exemplo')),
  (dono, r3, 'R-03', jsonb_build_object('id', r3, 'identificador', 'R-03', 'raca', 'Large White', 'status', 'Inativo',
     'observacoes', 'Em descanso (problema de casco).',
     'dataNascimento', pg_temp.d(h - 1100), 'dataEntrada', pg_temp.d(h - 850), 'createdAt', h - 850, 'origem', 'exemplo')),
  (dono, r4, 'R-04', jsonb_build_object('id', r4, 'identificador', 'R-04', 'raca', 'Landrace', 'status', 'Descartado',
     'observacoes', 'Descartado por idade.',
     'dataNascimento', pg_temp.d(h - 1600), 'dataEntrada', pg_temp.d(h - 1350), 'createdAt', h - 1350, 'origem', 'exemplo'));

  -- ---------------------------------------------------------------- MATRIZES
  insert into public.matrizes (user_id, id, identificador, dados)
  select dono, x.id, x.ident, jsonb_build_object(
    'id', x.id, 'identificador', x.ident, 'raca', x.raca,
    'dataNascimento', pg_temp.d(x.entrada - 210), 'dataEntrada', pg_temp.d(x.entrada),
    'precoAquisicao', x.preco, 'status', x.status, 'statusReprodutivo', x.rep,
    'observacoes', x.obs, 'createdAt', x.entrada, 'origem', 'exemplo', 'ciclos', x.ciclos)
  from (values
    (m1, 'M-001', 'F1 (LW x LD)', h - 420, 1900, 'Ativa', 'Gestante', null::text, jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid()::text, 'dataCobertura', pg_temp.d(h - 264), 'tipoCobertura', 'Inseminação artificial',
        'reprodutor', 'R-02', 'reprodutorId', r2, 'dataPrevistaParto', pg_temp.d(h - 150), 'dataParto', pg_temp.d(h - 150),
        'dataDesmame', pg_temp.d(h - 126), 'loteId', le, 'status', 'Desmamada'),
      jsonb_build_object('id', gen_random_uuid()::text, 'dataCobertura', pg_temp.d(h - 112), 'tipoCobertura', 'Inseminação artificial',
        'reprodutor', 'R-01', 'reprodutorId', r1, 'dataPrevistaParto', pg_temp.d(h + 2), 'status', 'Em gestação'))),
    (m2, 'M-002', 'Large White', h - 380, 2100, 'Ativa', 'Gestante', null, jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid()::text, 'dataCobertura', pg_temp.d(h - 108), 'tipoCobertura', 'Monta natural',
        'reprodutor', 'R-02', 'reprodutorId', r2, 'dataPrevistaParto', pg_temp.d(h + 6), 'status', 'Em gestação'))),
    (m3, 'M-003', 'Landrace', h - 360, 2000, 'Ativa', 'Gestante', null, jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid()::text, 'dataCobertura', pg_temp.d(h - 117), 'tipoCobertura', 'Inseminação artificial',
        'reprodutor', 'R-01', 'reprodutorId', r1, 'dataPrevistaParto', pg_temp.d(h - 3), 'status', 'Em gestação'))),
    (m4, 'M-004', 'F1 (LW x LD)', h - 330, 1850, 'Ativa', 'Lactante', null, jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid()::text, 'dataCobertura', pg_temp.d(h - 128), 'tipoCobertura', 'Inseminação artificial',
        'reprodutor', 'R-01', 'reprodutorId', r1, 'dataPrevistaParto', pg_temp.d(h - 14), 'dataParto', pg_temp.d(h - 14),
        'loteId', la, 'status', 'Parida'))),
    (m5, 'M-005', 'F1 (LW x LD)', h - 340, 1950, 'Ativa', 'Lactante', null, jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid()::text, 'dataCobertura', pg_temp.d(h - 134), 'tipoCobertura', 'Inseminação artificial',
        'reprodutor', 'R-02', 'reprodutorId', r2, 'dataPrevistaParto', pg_temp.d(h - 20), 'dataParto', pg_temp.d(h - 20),
        'loteId', lb, 'status', 'Parida'))),
    (m6, 'M-006', 'Large White', h - 350, 2050, 'Ativa', 'Lactante', null, jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid()::text, 'dataCobertura', pg_temp.d(h - 139), 'tipoCobertura', 'Monta natural',
        'reprodutor', 'R-03', 'reprodutorId', r3, 'dataPrevistaParto', pg_temp.d(h - 25), 'dataParto', pg_temp.d(h - 25),
        'loteId', lc, 'status', 'Parida'))),
    (m7, 'M-007', 'Landrace', h - 400, 1800, 'Ativa', 'Desmamada', null, jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid()::text, 'dataCobertura', pg_temp.d(h - 159), 'tipoCobertura', 'Inseminação artificial',
        'reprodutor', 'R-01', 'reprodutorId', r1, 'dataPrevistaParto', pg_temp.d(h - 45), 'dataParto', pg_temp.d(h - 45),
        'dataDesmame', pg_temp.d(h - 21), 'loteId', ld, 'status', 'Desmamada'))),
    (m8, 'M-008', 'F1 (LW x LD)', h - 300, 1750, 'Ativa', 'Vazia', 'Repetiu cio após a cobertura; observar.', jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid()::text, 'dataCobertura', pg_temp.d(h - 60), 'tipoCobertura', 'Inseminação artificial',
        'reprodutor', 'R-02', 'reprodutorId', r2, 'dataPrevistaParto', pg_temp.d(h + 54), 'status', 'Falhou'))),
    (m9, 'M-009', 'Landrace', h - 1500, 1600, 'Descartada', 'Vazia', 'Descartada por baixa produtividade.', '[]'::jsonb),
    (m10, 'M-010', 'Large White', h - 500, 1900, 'Inativa', 'Vazia', 'Em recuperação (problema de casco).', '[]'::jsonb)
  ) as x(id, ident, raca, entrada, preco, status, rep, obs, ciclos);

  -- ---------------------------------------------------------------- LOTE A (14 dias, 12 leitões)
  -- fatores de crescimento: o 11º cresce bem menos (alerta de baixo ganho); o 12º morreu no 3º dia
  fatores := array[1.00, 1.04, 0.97, 1.02, 0.99, 1.03, 0.94, 1.01, 0.95, 1.05, 0.48, 1.00];
  leitoes := '[]'::jsonb;
  for k in 1..12 loop
    leitoes := leitoes || pg_temp.leitao(la, 'M-004-P1', k, h - 14, nascs[k], 0.245 * fatores[k], array[7, 14], 'Ativo',
      case k when 5 then 'Em observação' when 7 then 'Em tratamento' when 9 then 'Crítico' else 'Saudável' end,
      case when k = 12 then 3 end,
      case when k % 2 = 0 then 'Fêmea' else 'Macho' end,
      case k
        when 7 then jsonb_build_object('tipo', 'tratamento', 'descricao', 'Diarreia neonatal', 'data', pg_temp.d(h - 3),
                     'medicamento', 'Enrofloxacina', 'dose', '0,5 mL', 'veterinario', 'Dr. Paulo', 'custo', 12)
        when 9 then jsonb_build_object('tipo', 'tratamento', 'descricao', 'Problema respiratório grave, febre', 'data', pg_temp.d(h - 1),
                     'medicamento', 'Florfenicol', 'dose', '1 mL', 'veterinario', 'Dr. Paulo', 'custo', 18)
        when 5 then jsonb_build_object('tipo', 'observacao', 'descricao', 'Mamando pouco; acompanhar.', 'data', pg_temp.d(h - 2))
      end);
  end loop;
  insert into public.lotes (user_id, id, nome, matriz_id, dados) values (dono, la, 'M-004-P1', m4, jsonb_build_object(
    'id', la, 'nome', 'M-004-P1', 'matrizId', m4, 'dataParto', pg_temp.d(h - 14),
    'nascidosVivos', 12, 'nascidosMortos', 1, 'status', 'Ativo', 'createdAt', h - 14, 'origem', 'exemplo',
    'leitoes', leitoes,
    'vacinasPendentes', jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid()::text, 'nome', 'Ferro dextrano', 'dataAgendada', pg_temp.d(h - 11), 'aplicada', true, 'dataAplicacao', pg_temp.d(h - 11)),
      jsonb_build_object('id', gen_random_uuid()::text, 'nome', 'Mycoplasma', 'dataAgendada', pg_temp.d(h - 7), 'aplicada', false),
      jsonb_build_object('id', gen_random_uuid()::text, 'nome', 'Circovírus', 'dataAgendada', pg_temp.d(h + 7), 'aplicada', false)),
    'lancamentos', jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid()::text, 'tipo', 'custo', 'categoria', 'Ração', 'descricao', 'Ração pré-inicial', 'valor', 180, 'data', pg_temp.d(h - 7)),
      jsonb_build_object('id', gen_random_uuid()::text, 'tipo', 'custo', 'categoria', 'Medicamentos', 'descricao', 'Antibióticos', 'valor', 46, 'data', pg_temp.d(h - 3)))));

  -- ---------------------------------------------------------------- LOTE B (20 dias, 11 leitões)
  fatores := array[1.00, 0.98, 1.03, 1.01, 0.97, 1.02, 1.00, 0.99, 1.04, 1.00, 1.00];
  leitoes := '[]'::jsonb;
  for k in 1..11 loop
    leitoes := leitoes || pg_temp.leitao(lb, 'M-005-P1', k, h - 20, nascs[k], 0.24 * fatores[k], array[7, 14], 'Ativo',
      case k when 3 then 'Em observação' else 'Saudável' end,
      case k when 10 then 2 when 11 then 5 end,   -- dois morreram (mortalidade alta)
      case when k % 2 = 1 then 'Fêmea' else 'Macho' end,
      case k when 3 then jsonb_build_object('tipo', 'observacao', 'descricao', 'Leve claudicação na pata traseira.', 'data', pg_temp.d(h - 1)) end);
  end loop;
  insert into public.lotes (user_id, id, nome, matriz_id, dados) values (dono, lb, 'M-005-P1', m5, jsonb_build_object(
    'id', lb, 'nome', 'M-005-P1', 'matrizId', m5, 'dataParto', pg_temp.d(h - 20),
    'nascidosVivos', 11, 'nascidosMortos', 2, 'status', 'Ativo', 'createdAt', h - 20, 'origem', 'exemplo',
    'leitoes', leitoes,
    'vacinasPendentes', jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid()::text, 'nome', 'Ferro dextrano', 'dataAgendada', pg_temp.d(h - 17), 'aplicada', true, 'dataAplicacao', pg_temp.d(h - 17)),
      jsonb_build_object('id', gen_random_uuid()::text, 'nome', 'Mycoplasma', 'dataAgendada', pg_temp.d(h - 13), 'aplicada', true, 'dataAplicacao', pg_temp.d(h - 13)),
      jsonb_build_object('id', gen_random_uuid()::text, 'nome', 'Circovírus', 'dataAgendada', pg_temp.d(h + 1), 'aplicada', false),
      jsonb_build_object('id', gen_random_uuid()::text, 'nome', 'Rinite atrófica', 'dataAgendada', pg_temp.d(h + 4), 'aplicada', false)),
    'lancamentos', jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid()::text, 'tipo', 'custo', 'categoria', 'Ração', 'descricao', 'Ração pré-inicial', 'valor', 160, 'data', pg_temp.d(h - 6)),
      jsonb_build_object('id', gen_random_uuid()::text, 'tipo', 'custo', 'categoria', 'Vacinas', 'descricao', 'Ferro + Mycoplasma', 'valor', 50.6, 'data', pg_temp.d(h - 13)))));

  -- ---------------------------------------------------------------- LOTE C (25 dias, 10 leitões)
  fatores := array[1.02, 0.99, 1.01, 0.98, 1.03, 1.00, 0.97, 1.02, 1.01, 0.99];
  leitoes := '[]'::jsonb;
  for k in 1..10 loop
    leitoes := leitoes || pg_temp.leitao(lc, 'M-006-P1', k, h - 25, nascs[k], 0.25 * fatores[k], array[7, 14, 21], 'Ativo',
      'Saudável', null, case when k <= 5 then 'Macho' else 'Fêmea' end, null);
  end loop;
  insert into public.lotes (user_id, id, nome, matriz_id, dados) values (dono, lc, 'M-006-P1', m6, jsonb_build_object(
    'id', lc, 'nome', 'M-006-P1', 'matrizId', m6, 'dataParto', pg_temp.d(h - 25),
    'nascidosVivos', 10, 'nascidosMortos', 0, 'status', 'Ativo', 'createdAt', h - 25, 'origem', 'exemplo',
    'leitoes', leitoes,
    'vacinasPendentes', jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid()::text, 'nome', 'Ferro dextrano', 'dataAgendada', pg_temp.d(h - 22), 'aplicada', true, 'dataAplicacao', pg_temp.d(h - 22)),
      jsonb_build_object('id', gen_random_uuid()::text, 'nome', 'Mycoplasma', 'dataAgendada', pg_temp.d(h - 18), 'aplicada', true, 'dataAplicacao', pg_temp.d(h - 18)),
      jsonb_build_object('id', gen_random_uuid()::text, 'nome', 'Circovírus', 'dataAgendada', pg_temp.d(h - 4), 'aplicada', true, 'dataAplicacao', pg_temp.d(h - 4))),
    'lancamentos', jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid()::text, 'tipo', 'custo', 'categoria', 'Ração', 'descricao', 'Ração pré-inicial', 'valor', 170, 'data', pg_temp.d(h - 5)),
      jsonb_build_object('id', gen_random_uuid()::text, 'tipo', 'custo', 'categoria', 'Vacinas', 'descricao', 'Protocolo vacinal', 'valor', 46, 'data', pg_temp.d(h - 4)),
      jsonb_build_object('id', gen_random_uuid()::text, 'tipo', 'custo', 'categoria', 'Mão de obra', 'descricao', 'Manejo da maternidade', 'valor', 140, 'data', pg_temp.d(h - 1)))));

  -- ---------------------------------------------------------------- LOTE D (45 dias, desmamado, 9 leitões)
  fatores := array[1.00, 1.03, 0.97, 1.01, 0.99, 1.04, 0.98, 1.02, 1.00];
  leitoes := '[]'::jsonb;
  for k in 1..9 loop
    leitoes := leitoes || pg_temp.leitao(ld, 'M-007-P1', k, h - 45, nascs[k], 0.245 * fatores[k], array[7, 14, 21, 28, 35, 42], 'Ativo',
      'Saudável', case when k = 9 then 10 end, case when k % 3 = 0 then 'Fêmea' else 'Macho' end,
      case k when 9 then jsonb_build_object('tipo', 'tratamento', 'descricao', 'Esmagamento pela matriz', 'data', pg_temp.d(h - 36),
                     'medicamento', 'Anti-inflamatório', 'dose', '0,5 mL', 'custo', 8) end);
  end loop;
  insert into public.lotes (user_id, id, nome, matriz_id, dados) values (dono, ld, 'M-007-P1', m7, jsonb_build_object(
    'id', ld, 'nome', 'M-007-P1', 'matrizId', m7, 'dataParto', pg_temp.d(h - 45), 'dataDesmame', pg_temp.d(h - 21),
    'nascidosVivos', 9, 'nascidosMortos', 1, 'status', 'Desmamado', 'createdAt', h - 45, 'origem', 'exemplo',
    'leitoes', leitoes,
    'vacinasPendentes', jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid()::text, 'nome', 'Ferro dextrano', 'dataAgendada', pg_temp.d(h - 42), 'aplicada', true, 'dataAplicacao', pg_temp.d(h - 42)),
      jsonb_build_object('id', gen_random_uuid()::text, 'nome', 'Mycoplasma', 'dataAgendada', pg_temp.d(h - 38), 'aplicada', true, 'dataAplicacao', pg_temp.d(h - 38)),
      jsonb_build_object('id', gen_random_uuid()::text, 'nome', 'Circovírus', 'dataAgendada', pg_temp.d(h - 24), 'aplicada', true, 'dataAplicacao', pg_temp.d(h - 24))),
    'lancamentos', jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid()::text, 'tipo', 'custo', 'categoria', 'Vacinas', 'descricao', 'Protocolo vacinal', 'valor', 41.4, 'data', pg_temp.d(h - 24)),
      jsonb_build_object('id', gen_random_uuid()::text, 'tipo', 'custo', 'categoria', 'Ração', 'descricao', 'Ração pré-inicial (maternidade)', 'valor', 150, 'data', pg_temp.d(h - 21)),
      jsonb_build_object('id', gen_random_uuid()::text, 'tipo', 'custo', 'categoria', 'Mão de obra', 'descricao', 'Manejo da maternidade', 'valor', 140, 'data', pg_temp.d(h - 21)),
      jsonb_build_object('id', gen_random_uuid()::text, 'tipo', 'custo', 'categoria', 'Ração', 'descricao', 'Ração de creche', 'valor', 300, 'data', pg_temp.d(h - 2)))));

  -- ---------------------------------------------------------------- LOTE E (150 dias, vendido, 8 leitões)
  fatores := array[1.00, 1.02, 0.98, 1.03, 0.99, 1.01, 0.97, 1.00];
  leitoes := '[]'::jsonb;
  for k in 1..8 loop
    leitoes := leitoes || pg_temp.leitao(le, 'M-001-P1', k, h - 150, nascs[k], 0.25 * fatores[k], array[7, 21, 42, 63], 'Vendido',
      'Saudável', null, case when k % 2 = 0 then 'Fêmea' else 'Macho' end, null);
  end loop;
  insert into public.lotes (user_id, id, nome, matriz_id, dados) values (dono, le, 'M-001-P1', m1, jsonb_build_object(
    'id', le, 'nome', 'M-001-P1', 'matrizId', m1, 'dataParto', pg_temp.d(h - 150), 'dataDesmame', pg_temp.d(h - 126),
    'nascidosVivos', 8, 'nascidosMortos', 0, 'status', 'Vendido', 'createdAt', h - 150, 'origem', 'exemplo',
    'leitoes', leitoes,
    'vacinasPendentes', jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid()::text, 'nome', 'Ferro dextrano', 'dataAgendada', pg_temp.d(h - 147), 'aplicada', true, 'dataAplicacao', pg_temp.d(h - 147)),
      jsonb_build_object('id', gen_random_uuid()::text, 'nome', 'Mycoplasma', 'dataAgendada', pg_temp.d(h - 143), 'aplicada', true, 'dataAplicacao', pg_temp.d(h - 143)),
      jsonb_build_object('id', gen_random_uuid()::text, 'nome', 'Circovírus', 'dataAgendada', pg_temp.d(h - 129), 'aplicada', true, 'dataAplicacao', pg_temp.d(h - 129))),
    'lancamentos', jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid()::text, 'tipo', 'custo', 'categoria', 'Vacinas', 'descricao', 'Protocolo vacinal', 'valor', 36.8, 'data', pg_temp.d(h - 129)),
      jsonb_build_object('id', gen_random_uuid()::text, 'tipo', 'custo', 'categoria', 'Ração', 'descricao', 'Ração pré-inicial (maternidade)', 'valor', 136, 'data', pg_temp.d(h - 126)),
      jsonb_build_object('id', gen_random_uuid()::text, 'tipo', 'custo', 'categoria', 'Mão de obra', 'descricao', 'Manejo da maternidade', 'valor', 140, 'data', pg_temp.d(h - 126)),
      jsonb_build_object('id', gen_random_uuid()::text, 'tipo', 'custo', 'categoria', 'Ração', 'descricao', 'Ração de creche', 'valor', 464, 'data', pg_temp.d(h - 87)),
      jsonb_build_object('id', gen_random_uuid()::text, 'tipo', 'receita', 'categoria', 'Venda de leitões', 'descricao', '8 leitões vendidos (~23 kg)', 'valor', 2795, 'data', pg_temp.d(h - 87)))));
end $$;

-- Resumo do que ficou salvo na conta
select
  (select count(*) from public.matrizes m join auth.users u on u.id = m.user_id where u.email = 'k.mickaele@gmail.com') as matrizes,
  (select count(*) from public.reprodutores r join auth.users u on u.id = r.user_id where u.email = 'k.mickaele@gmail.com') as reprodutores,
  (select count(*) from public.lotes l join auth.users u on u.id = l.user_id where u.email = 'k.mickaele@gmail.com') as lotes,
  (select sum(jsonb_array_length(l.dados -> 'leitoes')) from public.lotes l join auth.users u on u.id = l.user_id where u.email = 'k.mickaele@gmail.com') as leitoes;
