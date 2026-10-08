import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { SituacaoAssinatura } from "@/lib/assinatura";
import { NEGOCIO, PLANOS } from "@/config/negocio";

/**
 * Caixa de mensagens.
 * - Mensagens da administradora (tabela public.mensagens): só a admin envia; usuários só leem.
 * - Mensagens automáticas do sistema (geradas aqui): aviso de renovação 10 dias antes de
 *   vencer e aviso de assinatura vencida, com os links de pagamento.
 */

export interface Mensagem {
  id: string;
  para: string | null;
  titulo: string;
  corpo: string;
  link?: string | null;
  link_rotulo?: string | null;
  criado_em: string;
  lida: boolean;
  /** Mensagem automática (não está no banco) */
  sistema?: boolean;
  /** Mostrar os planos com os links de pagamento junto da mensagem */
  mostrarPlanos?: boolean;
}

const CHAVE_LIDAS_SISTEMA = "matrizpro-mensagens-sistema-lidas";

function lidasDoSistema(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_LIDAS_SISTEMA) ?? "[]");
  } catch {
    return [];
  }
}

function marcarLidaSistema(id: string) {
  try {
    const atuais = new Set(lidasDoSistema());
    atuais.add(id);
    localStorage.setItem(CHAVE_LIDAS_SISTEMA, JSON.stringify([...atuais].slice(-50)));
  } catch {
    // armazenamento indisponível
  }
}

const dataBR = (d: Date) => d.toLocaleDateString("pt-BR");

/** Mensagens automáticas a partir da situação da assinatura (função pura, testável). */
export function mensagensDoSistema(situacao: SituacaoAssinatura, lidas: string[] = []): Mensagem[] {
  const lista: Omit<Mensagem, "lida">[] = [];
  if (situacao.tipo === "pago" && situacao.diasRestantes <= NEGOCIO.diasAvisoRenovacao) {
    const vence = situacao.ate.toISOString().slice(0, 10);
    lista.push({
      id: `sistema-renovacao-${vence}`,
      para: null,
      titulo: `Sua assinatura vence em ${situacao.diasRestantes} dia(s)`,
      corpo:
        `Seu plano ${PLANOS[situacao.plano].nome.toLowerCase()} vence em ${dataBR(situacao.ate)}. ` +
        "Para continuar usando o MatrizPro sem interrupção, renove pelo plano mensal ou semestral (6 meses pelo preço de 5).",
      criado_em: new Date(situacao.ate.getTime() - NEGOCIO.diasAvisoRenovacao * 86_400_000).toISOString(),
      sistema: true,
      mostrarPlanos: true,
    });
  }
  if (situacao.tipo === "expirada") {
    lista.push({
      id: `sistema-vencida-${situacao.motivo}`,
      para: null,
      titulo: situacao.motivo === "teste" ? "Seu teste grátis terminou" : "Sua assinatura venceu",
      corpo:
        "Seus dados continuam guardados. Escolha um plano para voltar a usar o MatrizPro normalmente: " +
        "mensal ou semestral (6 meses pelo preço de 5).",
      criado_em: new Date().toISOString(),
      sistema: true,
      mostrarPlanos: true,
    });
  }
  return lista.map((m) => ({ ...m, lida: lidas.includes(m.id) }));
}

interface EstadoMensagens {
  mensagens: Mensagem[];
  carregando: boolean;
  erro: string | null;
  carregar: (situacao: SituacaoAssinatura) => Promise<void>;
  marcarLida: (id: string) => Promise<void>;
  enviar: (m: { para: string | null; titulo: string; corpo: string; link?: string; link_rotulo?: string }) => Promise<string | null>;
  apagar: (id: string) => Promise<string | null>;
  limpar: () => void;
}

export const useMensagens = create<EstadoMensagens>((set, get) => ({
  mensagens: [],
  carregando: false,
  erro: null,

  carregar: async (situacao) => {
    set({ carregando: true });
    const [msgs, lidas] = await Promise.all([
      supabase
        .from("mensagens")
        .select("id, para, titulo, corpo, link, link_rotulo, criado_em")
        .order("criado_em", { ascending: false })
        .limit(200),
      supabase.from("mensagens_lidas").select("mensagem_id"),
    ]);
    const erro = msgs.error ?? lidas.error;
    const idsLidas = new Set((lidas.data ?? []).map((l) => l.mensagem_id as string));
    const doBanco: Mensagem[] = (msgs.data ?? []).map((m) => ({ ...m, lida: idsLidas.has(m.id) }));
    const todas = [...mensagensDoSistema(situacao, lidasDoSistema()), ...doBanco].sort((a, b) =>
      b.criado_em.localeCompare(a.criado_em)
    );
    set({ mensagens: todas, carregando: false, erro: erro ? erro.message : null });
  },

  marcarLida: async (id) => {
    const m = get().mensagens.find((x) => x.id === id);
    if (!m || m.lida) return;
    set({ mensagens: get().mensagens.map((x) => (x.id === id ? { ...x, lida: true } : x)) });
    if (m.sistema) marcarLidaSistema(id);
    else await supabase.from("mensagens_lidas").insert({ mensagem_id: id });
  },

  enviar: async (m) => {
    const { error } = await supabase.from("mensagens").insert({
      para: m.para,
      titulo: m.titulo.trim(),
      corpo: m.corpo.trim(),
      link: m.link?.trim() || null,
      link_rotulo: m.link_rotulo?.trim() || null,
    });
    return error ? error.message : null;
  },

  apagar: async (id) => {
    const { error } = await supabase.from("mensagens").delete().eq("id", id);
    if (!error) set({ mensagens: get().mensagens.filter((x) => x.id !== id) });
    return error ? error.message : null;
  },

  limpar: () => set({ mensagens: [], erro: null }),
}));

export const contarNaoLidas = (mensagens: Mensagem[], userId?: string) =>
  mensagens.filter((m) => !m.lida && (m.para === null || m.para === userId)).length;
