// ============================================================================
// CONFIGURAÇÕES DO NEGÓCIO — valores definidos pela Karen
// (o que ainda falta definir está no arquivo PENDENCIAS.md na raiz)
// ============================================================================

export type PlanoPago = "mensal" | "semestral";

const VALOR_MENSAL = 97.9;

export const PLANOS: Record<PlanoPago, { nome: string; dias: number; valor: number; descricao: string }> = {
  mensal: {
    nome: "Mensal",
    dias: 30,
    valor: VALOR_MENSAL,
    descricao: "Renovação a cada mês.",
  },
  semestral: {
    nome: "Semestral",
    dias: 180,
    // 6 meses pelo preço de 5: ganha 1 mês sem pagar
    valor: Math.round(VALOR_MENSAL * 5 * 100) / 100,
    descricao: "6 meses pelo preço de 5 — 1 mês grátis.",
  },
};

export const NEGOCIO = {
  /** Dias de teste grátis para novos cadastros (também definido no banco, em 004_teste_7_dias_e_pagamentos.sql). */
  diasTeste: 7,

  /** Quantos dias antes do vencimento o assinante recebe o aviso de renovação. */
  diasAvisoRenovacao: 10,

  /**
   * WhatsApp do suporte, só números, com código do país e DDD.
   * Exemplo: "5562999998888". A DEFINIR — enquanto vazio, o botão aparece desativado.
   */
  whatsappSuporte: "",

  /** Mensagem que já vem escrita ao abrir o WhatsApp. */
  mensagemWhatsapp: "Olá! Preciso de ajuda com o MatrizPro.",

  /**
   * Links de pagamento avulsos (reserva). O pagamento normal é por PIX (SyncPay), com liberação
   * automática (Edge Function "pagamentos"). Estes links só aparecem se o pagamento online
   * ainda não estiver ativado no servidor.
   */
  linksPagamento: {
    mensal: "",
    semestral: "",
  } as Record<PlanoPago, string>,

  /** Manual de uso em PDF (arquivo em public/). */
  manualPdf: "/manual-matrizpro.pdf",
};

export const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Quanto se economiza no semestral em relação a 6 mensalidades. */
export const economiaSemestral = () => PLANOS.mensal.valor * 6 - PLANOS.semestral.valor;

export const linkWhatsapp = (mensagem = NEGOCIO.mensagemWhatsapp) =>
  NEGOCIO.whatsappSuporte
    ? `https://wa.me/${NEGOCIO.whatsappSuporte}?text=${encodeURIComponent(mensagem)}`
    : null;

/**
 * Abas dos planos pagos. No teste grátis elas aparecem com cadeado e mostram os planos;
 * as demais (Painel, Matrizes, Lotes, Mensagens, Suporte, Configurações) ficam liberadas.
 */
export const ABAS_PLANO_PAGO = [
  { rota: "/reprodutores", nome: "Reprodutores", descricao: "cadastro dos cachaços e desempenho de cada um" },
  { rota: "/faturamento", nome: "Faturamento", descricao: "vendas de leitões e de descarte, com gráfico mensal" },
  { rota: "/analise", nome: "Análise", descricao: "comparativo entre lotes, curva de crescimento e custos x receitas" },
  { rota: "/relatorios", nome: "Relatórios", descricao: "relatórios em PDF e exportação para planilha" },
] as const;

export const abaDoPlanoPago = (pathname: string) =>
  ABAS_PLANO_PAGO.find((a) => pathname === a.rota || pathname.startsWith(`${a.rota}/`)) ?? null;
