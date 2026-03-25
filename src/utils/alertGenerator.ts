import { Lote, Matriz, Alerta, Leitao } from '@/types';
import { differenceInDays, addDays, format } from 'date-fns';

const generateId = () => crypto.randomUUID();

export function gerarAlertasDinamicos(lotes: Lote[], matrizes: Matriz[]): Alerta[] {
  const alertas: Alerta[] = [];
  const hoje = new Date();

  // --- Alertas por Lote ---
  lotes.filter(l => l.status === 'Ativo').forEach((lote) => {
    const matriz = matrizes.find(m => m.id === lote.matrizId);
    const diasDesdeNascimento = differenceInDays(hoje, new Date(lote.dataParto));

    // Vacinas pendentes do lote
    if (lote.vacinasPendentes) {
      lote.vacinasPendentes.filter(v => !v.aplicada).forEach((vacina) => {
        const diasAteVacina = differenceInDays(new Date(vacina.dataAgendada), hoje);
        if (diasAteVacina <= 5 && diasAteVacina >= 0) {
          alertas.push({
            id: generateId(),
            tipo: 'vacinacao',
            titulo: 'Próxima Vacinação',
            descricao: `O lote '${lote.nome}' deve receber ${vacina.nome} em ${diasAteVacina} dia(s).`,
            severidade: diasAteVacina <= 1 ? 'critical' : 'warning',
            data: hoje.toISOString(),
            loteId: lote.id,
            link: '/lotes',
          });
        } else if (diasAteVacina < 0) {
          alertas.push({
            id: generateId(),
            tipo: 'vacinacao',
            titulo: 'Vacina Atrasada!',
            descricao: `O lote '${lote.nome}' está com a vacina ${vacina.nome} atrasada em ${Math.abs(diasAteVacina)} dia(s).`,
            severidade: 'critical',
            data: hoje.toISOString(),
            loteId: lote.id,
            link: '/lotes',
          });
        }
      });
    }

    // Agenda de pesagem semanal (a cada 7 dias)
    if (diasDesdeNascimento > 0 && diasDesdeNascimento % 7 <= 1) {
      alertas.push({
        id: generateId(),
        tipo: 'pesagem',
        titulo: 'Agenda de Pesagem',
        descricao: `A pesagem semanal do lote '${lote.nome}' está prevista para ${diasDesdeNascimento % 7 === 0 ? 'hoje' : 'amanhã'}.`,
        severidade: 'info',
        data: hoje.toISOString(),
        loteId: lote.id,
        link: '/lotes',
      });
    }

    // --- Alertas por Leitão ---
    if (lote.leitoes && lote.leitoes.length > 0) {
      const pesosAtivos = lote.leitoes
        .filter(lt => lt.status === 'Ativo')
        .map(lt => lt.pesoAtual);

      const pesoMedio = pesosAtivos.length > 0
        ? pesosAtivos.reduce((a, b) => a + b, 0) / pesosAtivos.length
        : 0;

      lote.leitoes.filter(lt => lt.status === 'Ativo').forEach((leitao) => {
        // Alerta de baixo peso (abaixo de 15% da média)
        if (pesoMedio > 0 && leitao.pesoAtual < pesoMedio * 0.85) {
          const percentAbaixo = Math.round((1 - leitao.pesoAtual / pesoMedio) * 100);
          alertas.push({
            id: generateId(),
            tipo: 'baixo_peso',
            titulo: 'Alerta de Baixo Ganho de Peso',
            descricao: `Leitão ${leitao.identificador} está ${percentAbaixo}% abaixo do ganho de peso médio para sua idade.`,
            severidade: percentAbaixo >= 20 ? 'critical' : 'warning',
            data: hoje.toISOString(),
            leitaoId: leitao.id,
            loteId: lote.id,
            link: '/lotes',
          });
        }

        // Alerta de saúde crítica
        if (leitao.statusSaude === 'Crítico') {
          alertas.push({
            id: generateId(),
            tipo: 'saude',
            titulo: 'Saúde Crítica',
            descricao: `Leitão ${leitao.identificador} do lote '${lote.nome}' está em estado crítico. Ação imediata necessária.`,
            severidade: 'critical',
            data: hoje.toISOString(),
            leitaoId: leitao.id,
            loteId: lote.id,
            link: '/lotes',
          });
        }

        if (leitao.statusSaude === 'Em tratamento') {
          alertas.push({
            id: generateId(),
            tipo: 'saude',
            titulo: 'Animal em Tratamento',
            descricao: `Leitão ${leitao.identificador} do lote '${lote.nome}' está em tratamento. Monitorar evolução.`,
            severidade: 'warning',
            data: hoje.toISOString(),
            leitaoId: leitao.id,
            loteId: lote.id,
            link: '/lotes',
          });
        }
      });

      // Alerta de mortalidade alta
      const mortos = lote.leitoes.filter(lt => lt.status === 'Morto').length;
      const taxaMortalidade = mortos / lote.leitoes.length;
      if (taxaMortalidade >= 0.1 && lote.leitoes.length >= 3) {
        alertas.push({
          id: generateId(),
          tipo: 'mortalidade',
          titulo: 'Alta Taxa de Mortalidade',
          descricao: `O lote '${lote.nome}' apresenta ${Math.round(taxaMortalidade * 100)}% de mortalidade (${mortos}/${lote.leitoes.length}).`,
          severidade: 'critical',
          data: hoje.toISOString(),
          loteId: lote.id,
          link: '/lotes',
        });
      }
    }
  });

  // --- Alertas por Matriz ---
  matrizes.filter(m => m.status === 'Ativa').forEach((matriz) => {
    if (matriz.statusReprodutivo === 'Gestante') {
      // Gestação suína ~114 dias
      const diasDesdeEntrada = differenceInDays(hoje, new Date(matriz.dataEntrada));
      if (diasDesdeEntrada > 100) {
        alertas.push({
          id: generateId(),
          tipo: 'pesagem',
          titulo: 'Parto Próximo',
          descricao: `A matriz '${matriz.identificador}' pode estar próxima do parto. Preparar maternidade.`,
          severidade: 'warning',
          data: hoje.toISOString(),
          matrizId: matriz.id,
          link: '/matrizes',
        });
      }
    }
  });

  // Ordenar: critical primeiro, depois warning, depois info
  const ordem = { critical: 0, warning: 1, info: 2 };
  alertas.sort((a, b) => ordem[a.severidade] - ordem[b.severidade]);

  return alertas;
}

// Gerar alertas padrão quando não há dados
export function gerarAlertasPadrao(): Alerta[] {
  return [
    {
      id: '1',
      tipo: 'vacinacao',
      titulo: 'Bem-vindo ao MatrizPro',
      descricao: 'Comece cadastrando suas matrizes e lotes para receber alertas automáticos.',
      severidade: 'info',
      data: new Date().toISOString(),
      link: '/matrizes',
    },
  ];
}
