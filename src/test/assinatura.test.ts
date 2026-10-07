import { describe, it, expect } from "vitest";
import { acessoLiberado, calcularSituacao } from "@/lib/assinatura";

const agora = new Date("2026-10-07T12:00:00Z");
const dias = (n: number) => new Date(agora.getTime() + n * 86_400_000).toISOString();

describe("calcularSituacao", () => {
  it("dona com plano vitalício nunca expira", () => {
    const s = calcularSituacao({ plano: "vitalicio", teste_ate: dias(-100), pago_ate: null, admin: true }, agora);
    expect(s.tipo).toBe("vitalicio");
    expect(acessoLiberado(s)).toBe(true);
  });

  it("conta dias restantes do teste grátis", () => {
    const s = calcularSituacao({ plano: "teste", teste_ate: dias(10), pago_ate: null, admin: false }, agora);
    expect(s).toMatchObject({ tipo: "teste", diasRestantes: 10 });
  });

  it("teste vencido bloqueia a interface", () => {
    const s = calcularSituacao({ plano: "teste", teste_ate: dias(-1), pago_ate: null, admin: false }, agora);
    expect(s).toEqual({ tipo: "expirada", motivo: "teste" });
    expect(acessoLiberado(s)).toBe(false);
  });

  it("mensalidade paga libera e, vencida, indica o motivo", () => {
    expect(calcularSituacao({ plano: "mensal", teste_ate: dias(-30), pago_ate: dias(20), admin: false }, agora)).toMatchObject({
      tipo: "mensal",
      diasRestantes: 20,
    });
    expect(calcularSituacao({ plano: "mensal", teste_ate: dias(-60), pago_ate: dias(-2), admin: false }, agora)).toEqual({
      tipo: "expirada",
      motivo: "mensalidade",
    });
  });

  it("conta bloqueada ou sem registro não tem acesso", () => {
    expect(acessoLiberado(calcularSituacao({ plano: "bloqueado", teste_ate: dias(5), pago_ate: null, admin: false }, agora))).toBe(false);
    expect(acessoLiberado(calcularSituacao(null, agora))).toBe(false);
  });
});
