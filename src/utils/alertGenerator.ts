import { Lote, Matriz, Alerta, Configuracoes } from '@/types';
import { diasEntre, paraISODia } from '@/lib/date';
import { CONFIG_PADRAO } from '@/store/useStore';
import { leitoesAbaixoDaMedia } from '@/utils/metricas';

export function gerarAlertasDinamicos(
  lotes: Lote[],
  matrizes: Matriz[],
  config: Configuracoes = CONFIG_PADRAO,
  hoje: Date = new Date()
): Alerta[] {
  const alertas: Alerta[] = [];
  const dataHoje = hoje.toISOString();

  // --- Alertas por Lote ---
  lotes.filter((l) => l.status === 'Ativo').forEach((lote) => {
    const linkLote = `/lotes/${lote.id}`;
    const idadeDias = diasEntre(lote.dataParto, hoje);

    // Vacinas pendentes do lote
    (lote.vacinasPendentes || []).filter((v) => !v.aplicada).forEach((vacina) => {
      const diasAteVacina = diasEntre(paraISODia(hoje), vacina.dataAgendada);
      if (diasAteVacina < 0) {
        alertas.push({
          id: `vacina-${vacina.id}`,
          tipo: 'vacinacao',
          titulo: 'Vacina Atrasada!',
          descricao: `O lote '${lote.nome}' está com a vacina ${vacina.nome} atrasada em ${Math.abs(diasAteVacina)} dia(s).`,
          severidade: 'critical',
          data: dataHoje,
          loteId: lote.id,
          link: linkLote,
        });
      } else if (diasAteVacina <= config.antecedenciaVacinaDias) {
        alertas.push({
          id: `vacina-${vacina.id}`,
          tipo: 'vacinacao',
          titulo: 'Próxima Vacinação',
          descricao:
            diasAteVacina === 0
              ? `O lote '${lote.nome}' deve receber ${vacina.nome} hoje.`
              : `O lote '${lote.nome}' deve receber ${vacina.nome} em ${diasAteVacina} dia(s).`,
          severidade: diasAteVacina <= 1 ? 'critical' : 'warning',
          data: dataHoje,
          loteId: lote.id,
          link: linkLote,
        });
      }
    });

    // Agenda de pesagem periódica
    const intervalo = Math.max(1, config.intervaloPesagemDias);
    const resto = idadeDias % intervalo;
    if (idadeDias > 0 && (resto === 0 || resto === intervalo - 1)) {
      alertas.push({
        id: `pesagem-${lote.id}`,
        tipo: 'pesagem',
        titulo: 'Agenda de Pesagem',
        descricao: `A pesagem periódica do lote '${lote.nome}' está prevista para ${resto === 0 ? 'hoje' : 'amanhã'}.`,
        severidade: 'info',
        data: dataHoje,
        loteId: lote.id,
        link: linkLote,
      });
    }

    // Desmame previsto
    const diasParaDesmame = config.diasDesmame - idadeDias;
    if (!lote.dataDesmame && diasParaDesmame <= 3) {
      alertas.push({
        id: `desmame-${lote.id}`,
        tipo: 'desmame',
        titulo: diasParaDesmame < 0 ? 'Desmame Atrasado' : 'Desmame Previsto',
        descricao:
          diasParaDesmame < 0
            ? `O lote '${lote.nome}' passou ${Math.abs(diasParaDesmame)} dia(s) da idade de desmame (${config.diasDesmame} dias).`
            : `O lote '${lote.nome}' atinge a idade de desmame em ${diasParaDesmame} dia(s).`,
        severidade: diasParaDesmame < 0 ? 'warning' : 'info',
        data: dataHoje,
        loteId: lote.id,
        link: linkLote,
      });
    }

    // Natimortalidade (nascidos mortos no parto)
    const totalNascidos = lote.nascidosVivos + lote.nascidosMortos;
    if (totalNascidos >= 5) {
      const taxaNatimortos = (lote.nascidosMortos / totalNascidos) * 100;
      if (taxaNatimortos >= config.limiteMortalidadePercent) {
        alertas.push({
          id: `natimortos-${lote.id}`,
          tipo: 'mortalidade',
          titulo: 'Alta Taxa de Natimortos',
          descricao: `O lote '${lote.nome}' teve ${Math.round(taxaNatimortos)}% de nascidos mortos (${lote.nascidosMortos}/${totalNascidos}).`,
          severidade: 'warning',
          data: dataHoje,
          loteId: lote.id,
          link: linkLote,
        });
      }
    }

    // --- Alertas por Leitão ---
    const leitoes = lote.leitoes || [];
    if (leitoes.length > 0) {
      const ativos = leitoes.filter((lt) => lt.status === 'Ativo');
      const abaixoDaMedia = leitoesAbaixoDaMedia(lote, config.limiteBaixoPesoPercent);

      ativos.forEach((leitao) => {
        const link = `${linkLote}?leitao=${leitao.id}`;

        // Ganho de peso abaixo da média do lote
        const percentAbaixo = abaixoDaMedia.get(leitao.id);
        if (percentAbaixo !== undefined) {
          alertas.push({
            id: `baixo-peso-${leitao.id}`,
            tipo: 'baixo_peso',
            titulo: 'Alerta de Baixo Ganho de Peso',
            descricao: `Leitão ${leitao.identificador} (lote '${lote.nome}') está ganhando peso ${percentAbaixo}% abaixo da média do lote.`,
            severidade: percentAbaixo >= config.limiteBaixoPesoPercent + 5 ? 'critical' : 'warning',
            data: dataHoje,
            leitaoId: leitao.id,
            loteId: lote.id,
            link,
          });
        }

        if (leitao.statusSaude === 'Crítico') {
          alertas.push({
            id: `saude-${leitao.id}`,
            tipo: 'saude',
            titulo: 'Saúde Crítica',
            descricao: `Leitão ${leitao.identificador} do lote '${lote.nome}' está em estado crítico. Ação imediata necessária.`,
            severidade: 'critical',
            data: dataHoje,
            leitaoId: leitao.id,
            loteId: lote.id,
            link,
          });
        } else if (leitao.statusSaude === 'Em tratamento') {
          alertas.push({
            id: `saude-${leitao.id}`,
            tipo: 'saude',
            titulo: 'Animal em Tratamento',
            descricao: `Leitão ${leitao.identificador} do lote '${lote.nome}' está em tratamento. Monitorar evolução.`,
            severidade: 'warning',
            data: dataHoje,
            leitaoId: leitao.id,
            loteId: lote.id,
            link,
          });
        }
      });

      // Mortalidade após o nascimento
      const mortos = leitoes.filter((lt) => lt.status === 'Morto').length;
      const taxaMortalidade = (mortos / leitoes.length) * 100;
      if (leitoes.length >= 3 && taxaMortalidade >= config.limiteMortalidadePercent) {
        alertas.push({
          id: `mortalidade-${lote.id}`,
          tipo: 'mortalidade',
          titulo: 'Alta Taxa de Mortalidade',
          descricao: `O lote '${lote.nome}' apresenta ${Math.round(taxaMortalidade)}% de mortalidade (${mortos}/${leitoes.length}).`,
          severidade: 'critical',
          data: dataHoje,
          loteId: lote.id,
          link: linkLote,
        });
      }
    }
  });

  // --- Alertas por Matriz (baseados no ciclo reprodutivo) ---
  matrizes.filter((m) => m.status === 'Ativa').forEach((matriz) => {
    (matriz.ciclos || []).filter((c) => c.status === 'Em gestação').forEach((ciclo) => {
      const diasParaParto = diasEntre(paraISODia(hoje), ciclo.dataPrevistaParto);
      if (diasParaParto <= 7) {
        alertas.push({
          id: `parto-${ciclo.id}`,
          tipo: 'parto',
          titulo: diasParaParto < 0 ? 'Parto Atrasado' : 'Parto Próximo',
          descricao:
            diasParaParto < 0
              ? `A matriz '${matriz.identificador}' passou ${Math.abs(diasParaParto)} dia(s) da data prevista de parto. Registre o parto ou verifique a gestação.`
              : diasParaParto === 0
                ? `A matriz '${matriz.identificador}' tem parto previsto para hoje. Preparar maternidade.`
                : `A matriz '${matriz.identificador}' tem parto previsto em ${diasParaParto} dia(s). Preparar maternidade.`,
          severidade: diasParaParto <= 2 ? 'critical' : 'warning',
          data: dataHoje,
          matrizId: matriz.id,
          link: `/matrizes/${matriz.id}`,
        });
      }
    });
  });

  const ordem = { critical: 0, warning: 1, info: 2 };
  alertas.sort((a, b) => ordem[a.severidade] - ordem[b.severidade]);

  return alertas;
}

// Alerta exibido quando ainda não há dados
export function gerarAlertasPadrao(): Alerta[] {
  return [
    {
      id: 'boas-vindas',
      tipo: 'vacinacao',
      titulo: 'Bem-vindo ao MatrizPro',
      descricao: 'Comece cadastrando suas matrizes e lotes para receber alertas automáticos.',
      severidade: 'info',
      data: new Date().toISOString(),
      link: '/matrizes',
    },
  ];
}
