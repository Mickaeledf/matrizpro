// ============================================================================
// CONFIGURAÇÕES DO NEGÓCIO — valores que a Karen ainda vai definir
// (a lista completa de pendências está no arquivo PENDENCIAS.md na raiz)
// ============================================================================

export const NEGOCIO = {
  /** Dias de teste grátis para novos cadastros (também definido no banco, em 002_reprodutores_e_assinaturas.sql). */
  diasTeste: 10,

  /** Valor da mensalidade em reais. A DEFINIR — enquanto for null, aparece "valor a definir". */
  valorMensalidade: null as number | null,

  /**
   * WhatsApp do suporte, só números, com código do país e DDD.
   * Exemplo: "5562999998888". A DEFINIR — enquanto vazio, o botão aparece desativado.
   */
  whatsappSuporte: "",

  /** Mensagem que já vem escrita ao abrir o WhatsApp. */
  mensagemWhatsapp: "Olá! Preciso de ajuda com o MatrizPro.",

  /** Link de pagamento da mensalidade (Mercado Pago, Asaas, PIX etc.). A DEFINIR. */
  linkPagamento: "",

  /** Manual de uso em PDF (arquivo em public/). */
  manualPdf: "/manual-matrizpro.pdf",
};

export const valorMensalidadeTexto = () =>
  NEGOCIO.valorMensalidade !== null
    ? NEGOCIO.valorMensalidade.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "valor a definir";

export const linkWhatsapp = (mensagem = NEGOCIO.mensagemWhatsapp) =>
  NEGOCIO.whatsappSuporte
    ? `https://wa.me/${NEGOCIO.whatsappSuporte}?text=${encodeURIComponent(mensagem)}`
    : null;
