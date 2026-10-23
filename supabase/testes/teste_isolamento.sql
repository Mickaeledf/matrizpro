-- ============================================================================
-- MatrizPro — TESTE DE ISOLAMENTO ENTRE CADASTROS (não deixa nada gravado)
--
-- Cria dois produtores fictícios (A e B) e um terceiro com teste vencido (C),
-- age como cada um deles e confere o que cada um consegue ver e mexer.
-- No final o bloco termina com um "erro" proposital: o Postgres desfaz TUDO
-- (usuários, matrizes, assinaturas) e a mensagem do erro é o relatório.
--
-- Como usar: Supabase → SQL Editor → colar tudo → Run.
-- Resultado esperado: "RELATÓRIO ... 0 FALHA(S)".
-- ============================================================================
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  rel text := '';
  falhas int := 0;
  n int;
  ok boolean;

  procedure_dummy int;
begin
  -- Usuários fictícios (o gatilho cria a assinatura de teste de cada um)
  insert into auth.users (id, email) values
    (a, 'teste-a-' || a || '@isolamento.invalid'),
    (b, 'teste-b-' || b || '@isolamento.invalid'),
    (c, 'teste-c-' || c || '@isolamento.invalid');
  update public.assinaturas set teste_ate = now() - interval '1 day' where user_id = c;

  -- ------------------------------------------------------------ como A
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', a::text, true);
  execute 'set local role authenticated';

  insert into public.matrizes (user_id, id, identificador, dados) values (a, 'm1', 'MATRIZ-DO-A', '{}');
  insert into public.lotes (user_id, id, nome, dados) values (a, 'l1', 'LOTE-DO-A', '{}');
  insert into public.configuracoes (user_id, dados) values (a, '{"nomeFazenda":"Fazenda A"}');
  select count(*) into n from public.matrizes;
  ok := n = 1; falhas := falhas + (not ok)::int;
  rel := rel || E'\n' || case when ok then '[OK]   ' else '[FALHA]' end || ' A grava e lê a própria matriz';

  -- ------------------------------------------------------------ como B
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', b::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.matrizes where identificador = 'MATRIZ-DO-A';
  ok := n = 0; falhas := falhas + (not ok)::int;
  rel := rel || E'\n' || case when ok then '[OK]   ' else '[FALHA]' end || ' B NÃO vê a matriz do A';

  select count(*) into n from public.lotes;
  ok := n = 0; falhas := falhas + (not ok)::int;
  rel := rel || E'\n' || case when ok then '[OK]   ' else '[FALHA]' end || ' B NÃO vê os lotes do A';

  select count(*) into n from public.configuracoes;
  ok := n = 0; falhas := falhas + (not ok)::int;
  rel := rel || E'\n' || case when ok then '[OK]   ' else '[FALHA]' end || ' B NÃO vê as configurações do A';

  update public.matrizes set identificador = 'HACKEADA' where user_id = a;
  get diagnostics n = row_count;
  ok := n = 0; falhas := falhas + (not ok)::int;
  rel := rel || E'\n' || case when ok then '[OK]   ' else '[FALHA]' end || ' B NÃO consegue alterar a matriz do A';

  delete from public.matrizes where user_id = a;
  get diagnostics n = row_count;
  ok := n = 0; falhas := falhas + (not ok)::int;
  rel := rel || E'\n' || case when ok then '[OK]   ' else '[FALHA]' end || ' B NÃO consegue apagar a matriz do A';

  begin
    insert into public.matrizes (user_id, id, identificador, dados) values (a, 'intrusa', 'PLANTADA-PELO-B', '{}');
    ok := false;
  exception when others then ok := true;
  end;
  falhas := falhas + (not ok)::int;
  rel := rel || E'\n' || case when ok then '[OK]   ' else '[FALHA]' end || ' B NÃO consegue gravar dados na conta do A';

  -- B usa o mesmo código de matriz do A: cada um tem o seu, sem conflito
  insert into public.matrizes (user_id, id, identificador, dados) values (b, 'm1', 'MATRIZ-DO-B', '{}');
  insert into public.configuracoes (user_id, dados) values (b, '{"nomeFazenda":"Fazenda B"}');
  select count(*) into n from public.matrizes;
  ok := n = 1; falhas := falhas + (not ok)::int;
  rel := rel || E'\n' || case when ok then '[OK]   ' else '[FALHA]' end || ' B grava a própria matriz (mesmo código do A) e só vê a dele';

  select count(*) into n from public.assinaturas;
  ok := n = 1; falhas := falhas + (not ok)::int;
  rel := rel || E'\n' || case when ok then '[OK]   ' else '[FALHA]' end || ' B só vê a própria assinatura';

  begin
    update public.assinaturas set plano = 'vitalicio', pago_ate = now() + interval '10 years' where user_id = b;
    get diagnostics n = row_count;
    ok := n = 0;
  exception when others then ok := true;
  end;
  falhas := falhas + (not ok)::int;
  rel := rel || E'\n' || case when ok then '[OK]   ' else '[FALHA]' end || ' B NÃO consegue se dar plano grátis/vitalício';

  begin
    perform public.admin_listar_assinantes();
    ok := false;
  exception when others then ok := true;
  end;
  falhas := falhas + (not ok)::int;
  rel := rel || E'\n' || case when ok then '[OK]   ' else '[FALHA]' end || ' B NÃO acessa a lista de assinantes (área da dona)';

  begin
    perform public.admin_alterar_assinatura(b, 'pagamento', 365, 'mensal');
    ok := false;
  exception when others then ok := true;
  end;
  falhas := falhas + (not ok)::int;
  rel := rel || E'\n' || case when ok then '[OK]   ' else '[FALHA]' end || ' B NÃO consegue liberar pagamento para si mesmo';

  begin
    insert into public.pagamentos (user_id, plano, valor, status) values (b, 'semestral', 0.01, 'aprovado');
    ok := false;
  exception when others then ok := true;
  end;
  falhas := falhas + (not ok)::int;
  rel := rel || E'\n' || case when ok then '[OK]   ' else '[FALHA]' end || ' B NÃO consegue registrar pagamento falso';

  begin
    insert into public.mensagens (titulo, corpo) values ('golpe', 'mensagem falsa para todos');
    ok := false;
  exception when others then ok := true;
  end;
  falhas := falhas + (not ok)::int;
  rel := rel || E'\n' || case when ok then '[OK]   ' else '[FALHA]' end || ' B NÃO consegue enviar mensagem para os clientes';

  -- ------------------------------------------------------------ de volta como A
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', a::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.matrizes where identificador = 'MATRIZ-DO-A';
  ok := n = 1; falhas := falhas + (not ok)::int;
  rel := rel || E'\n' || case when ok then '[OK]   ' else '[FALHA]' end || ' A continua com a matriz dele intacta';

  select count(*) into n from public.configuracoes where dados->>'nomeFazenda' = 'Fazenda A';
  ok := n = 1; falhas := falhas + (not ok)::int;
  rel := rel || E'\n' || case when ok then '[OK]   ' else '[FALHA]' end || ' A continua com as configurações dele (Fazenda A)';

  -- ------------------------------------------------------------ como C (teste vencido)
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', c::text, true);
  execute 'set local role authenticated';

  begin
    insert into public.matrizes (user_id, id, identificador, dados) values (c, 'm1', 'MATRIZ-DO-C', '{}');
    ok := false;
  exception when others then ok := true;
  end;
  falhas := falhas + (not ok)::int;
  rel := rel || E'\n' || case when ok then '[OK]   ' else '[FALHA]' end || ' C (teste vencido) NÃO grava nada sem pagar';

  -- ------------------------------------------------------------ visitante sem login
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role anon';
  begin
    select count(*) into n from public.matrizes;
    ok := n = 0;
  exception when others then ok := true;
  end;
  falhas := falhas + (not ok)::int;
  rel := rel || E'\n' || case when ok then '[OK]   ' else '[FALHA]' end || ' Visitante sem login NÃO vê dado nenhum';
  execute 'reset role';

  -- Desfaz tudo e mostra o relatório
  raise exception E'RELATÓRIO DO TESTE DE ISOLAMENTO — % FALHA(S)%\n\n(Nada foi gravado: este "erro" desfaz o teste de propósito.)', falhas, rel;
end $$;
