import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { PlanoPago } from "@/config/negocio";

/**
 * Situação da assinatura do usuário logado (tabela public.assinaturas).
 * O bloqueio de verdade acontece no banco (RLS); aqui é só para a interface.
 */

export type Plano = "teste" | PlanoPago | "vitalicio" | "bloqueado";

export interface RegistroAssinatura {
  plano: Plano;
  teste_ate: string;
  pago_ate: string | null;
  admin: boolean;
}

export type SituacaoAssinatura =
  | { tipo: "carregando" }
  | { tipo: "vitalicio" }
  | { tipo: "teste"; diasRestantes: number; ate: Date }
  | { tipo: "pago"; plano: PlanoPago; diasRestantes: number; ate: Date }
  | { tipo: "expirada"; motivo: "teste" | "mensalidade" }
  | { tipo: "bloqueada" };

const MS_DIA = 24 * 60 * 60 * 1000;

/** Interpreta o registro do banco (função pura, testável). */
export function calcularSituacao(registro: RegistroAssinatura | null, agora = new Date()): SituacaoAssinatura {
  if (!registro) return { tipo: "expirada", motivo: "teste" };
  if (registro.plano === "bloqueado") return { tipo: "bloqueada" };
  if (registro.plano === "vitalicio") return { tipo: "vitalicio" };

  const pagoAte = registro.pago_ate ? new Date(registro.pago_ate) : null;
  if (pagoAte && pagoAte > agora) {
    return {
      tipo: "pago",
      plano: registro.plano === "semestral" ? "semestral" : "mensal",
      ate: pagoAte,
      diasRestantes: Math.ceil((pagoAte.getTime() - agora.getTime()) / MS_DIA),
    };
  }
  const testeAte = new Date(registro.teste_ate);
  if (testeAte > agora) {
    return { tipo: "teste", ate: testeAte, diasRestantes: Math.ceil((testeAte.getTime() - agora.getTime()) / MS_DIA) };
  }
  return { tipo: "expirada", motivo: pagoAte ? "mensalidade" : "teste" };
}

/** Pode usar o sistema (teste grátis ou plano em dia). */
export const acessoLiberado = (s: SituacaoAssinatura) =>
  s.tipo === "vitalicio" || s.tipo === "teste" || s.tipo === "pago" || s.tipo === "carregando";

/** Tem todas as abas liberadas (plano pago ou conta da dona). No teste, só as abas básicas. */
export const planoCompleto = (s: SituacaoAssinatura) =>
  s.tipo === "vitalicio" || s.tipo === "pago" || s.tipo === "carregando";

interface EstadoAssinatura {
  situacao: SituacaoAssinatura;
  admin: boolean;
  carregar: () => Promise<void>;
  limpar: () => void;
}

export const useAssinatura = create<EstadoAssinatura>((set) => ({
  situacao: { tipo: "carregando" },
  admin: false,
  carregar: async () => {
    const { data, error } = await supabase
      .from("assinaturas")
      .select("plano, teste_ate, pago_ate, admin")
      .maybeSingle();
    if (error) {
      // Sem conseguir consultar, não bloqueia a interface (o banco continua protegendo as gravações)
      console.warn("[MatrizPro] Não foi possível consultar a assinatura:", error.message);
      set({ situacao: { tipo: "carregando" }, admin: false });
      return;
    }
    const registro = data as RegistroAssinatura | null;
    set({ situacao: calcularSituacao(registro), admin: !!registro?.admin });
  },
  limpar: () => set({ situacao: { tipo: "carregando" }, admin: false }),
}));
