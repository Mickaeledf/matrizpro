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
  /** Dias de teste grátis para novos cadastros (também definido no banco, em 002_reprodutores_e_assinaturas.sql). */
  diasTeste: 10,

  /** Quantos dias antes do vencimento o assinante recebe o aviso de renovação. */
  diasAvisoRenovacao: 10,

  /**
   * WhatsApp do suporte, só números, com código do país e DDD.
   * Exemplo: "5562999998888". A DEFINIR — enquanto vazio, o botão aparece desativado.
   */
  whatsappSuporte: "",

  /** Mensagem que já vem escrita ao abrir o WhatsApp. */
  mensagemWhatsapp: "Olá! Preciso de ajuda com o MatrizPro.",

  /** Links de pagamento (Mercado Pago, Asaas, PIX etc.). A DEFINIR — enquanto vazios, aparece "em breve". */
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
