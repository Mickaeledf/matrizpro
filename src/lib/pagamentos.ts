import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { PlanoPago } from "@/config/negocio";

/**
 * Pagamento online (Mercado Pago), feito pela Edge Function "pagamentos"
 * (código em supabase/functions/pagamentos/index.ts).
 * A liberação do plano acontece no servidor, só depois de conferir o pagamento no Mercado Pago.
 */

export type StatusPagamento = "pendente" | "aprovado" | "recusado" | "cancelado" | "estornado";

export interface Pagamento {
  id: string;
  user_id: string;
  plano: PlanoPago;
  valor: number;
  status: StatusPagamento;
  forma: string | null;
  criado_em: string;
  aprovado_em: string | null;
}

export const ROTULO_STATUS_PAGAMENTO: Record<StatusPagamento, string> = {
  pendente: "Aguardando pagamento",
  aprovado: "Pago",
  recusado: "Recusado",
  cancelado: "Cancelado",
  estornado: "Estornado",
};

type Resposta<T> = { dados: T; erro: null; naoConfigurado?: false } | { dados: null; erro: string; naoConfigurado: boolean };

async function chamar<T>(corpo: Record<string, unknown>): Promise<Resposta<T>> {
  const { data, error } = await supabase.functions.invoke("pagamentos", { body: corpo });
  if (!error) return { dados: data as T, erro: null };

  let mensagem = "Não foi possível falar com o servidor de pagamentos. Tente novamente.";
  let naoConfigurado = false;
  if (error instanceof FunctionsHttpError) {
    const info = await error.context.json().catch(() => null);
    if (info?.erro) mensagem = info.erro;
    naoConfigurado = !!info?.naoConfigurado;
  } else if (/not found|404/i.test(error.message)) {
    naoConfigurado = true;
    mensagem = "O pagamento online ainda não foi ativado. Fale com o suporte.";
  }
  return { dados: null, erro: mensagem, naoConfigurado };
}

/** Cria o pedido e devolve o endereço do Mercado Pago para pagar. */
export const iniciarPagamento = (plano: PlanoPago) =>
  chamar<{ url: string; pedido: string }>({ acao: "criar", plano, retorno: window.location.origin });

/** Ao voltar do Mercado Pago: confere o pedido e libera o plano se estiver pago. */
export const confirmarPagamento = (pedido: string) =>
  chamar<{ status: StatusPagamento }>({ acao: "confirmar", pedido });

/** Histórico de pagamentos (o próprio; a administradora recebe todos). */
export async function listarPagamentos(limite = 50): Promise<Pagamento[]> {
  const { data, error } = await supabase
    .from("pagamentos")
    .select("id, user_id, plano, valor, status, forma, criado_em, aprovado_em")
    .order("criado_em", { ascending: false })
    .limit(limite);
  if (error) {
    console.warn("[MatrizPro] Não foi possível carregar os pagamentos:", error.message);
    return [];
  }
  return (data ?? []).map((p) => ({ ...p, valor: Number(p.valor) })) as Pagamento[];
}
