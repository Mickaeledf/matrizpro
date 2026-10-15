import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { PlanoPago } from "@/config/negocio";

/**
 * Pagamento online por PIX (SyncPay), feito pela Edge Function "pagamentos"
 * (código em supabase/functions/pagamentos/index.ts).
 * A liberação do plano acontece no servidor, só depois de conferir a cobrança na SyncPay.
 */

export type StatusPagamento = "pendente" | "aprovado" | "recusado" | "cancelado" | "estornado";

export interface Pagamento {
  id: string;
  user_id: string;
  plano: PlanoPago;
  valor: number;
  status: StatusPagamento;
  forma: string | null;
  pix_codigo: string | null;
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

/** Dados de quem paga, exigidos pela SyncPay para gerar o PIX. */
export interface DadosPagador {
  nome: string;
  cpf: string;
  celular: string;
}

export const soDigitos = (v: string) => v.replace(/\D/g, "");

/** Confere os dígitos verificadores do CPF. */
export function cpfValido(valor: string) {
  const cpf = soDigitos(valor);
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const dv = (base: string, peso: number) => {
    let soma = 0;
    for (const d of base) soma += Number(d) * peso--;
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return dv(cpf.slice(0, 9), 10) === Number(cpf[9]) && dv(cpf.slice(0, 10), 11) === Number(cpf[10]);
}

export const formatarCpf = (v: string) =>
  soDigitos(v)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

export const formatarCelular = (v: string) => {
  const d = soDigitos(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
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
  }
  return { dados: null, erro: mensagem, naoConfigurado };
}

/** Cria o pedido e gera o PIX (código copia e cola) na SyncPay. */
export const gerarPix = (plano: PlanoPago, pagador: DadosPagador) =>
  chamar<{ pedido: string; pix: string; valor: number }>({
    acao: "criar",
    plano,
    nome: pagador.nome.trim(),
    cpf: soDigitos(pagador.cpf),
    celular: soDigitos(pagador.celular),
  });

/** Confere na SyncPay se o pedido foi pago (e libera o plano, se foi). */
export const confirmarPagamento = (pedido: string) =>
  chamar<{ status: StatusPagamento }>({ acao: "confirmar", pedido });

/** Histórico de pagamentos (o próprio; a administradora recebe todos). */
export async function listarPagamentos(limite = 50): Promise<Pagamento[]> {
  const { data, error } = await supabase
    .from("pagamentos")
    .select("id, user_id, plano, valor, status, forma, pix_codigo, criado_em, aprovado_em")
    .order("criado_em", { ascending: false })
    .limit(limite);
  if (error) {
    console.warn("[MatrizPro] Não foi possível carregar os pagamentos:", error.message);
    return [];
  }
  return (data ?? []).map((p) => ({ ...p, valor: Number(p.valor) })) as Pagamento[];
}
