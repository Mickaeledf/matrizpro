import { describe, it, expect } from "vitest";
import { acessoLiberado, calcularSituacao, planoCompleto } from "@/lib/assinatura";
import { mensagensDoSistema } from "@/lib/mensagens";
import { PLANOS, abaDoPlanoPago } from "@/config/negocio";

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
      tipo: "pago",
      plano: "mensal",
      diasRestantes: 20,
    });
    expect(calcularSituacao({ plano: "semestral", teste_ate: dias(-30), pago_ate: dias(170), admin: false }, agora)).toMatchObject({
      tipo: "pago",
      plano: "semestral",
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

describe("planos", () => {
  it("semestral = 6 meses pelo preço de 5 (1 mês grátis)", () => {
    expect(PLANOS.mensal.valor).toBe(97.9);
    expect(PLANOS.semestral.valor).toBe(489.5);
    expect(PLANOS.semestral.dias).toBe(180);
  });
});

describe("mensagens automáticas de renovação", () => {
  it("avisa 10 dias antes de vencer, com os planos", () => {
    const s = calcularSituacao({ plano: "mensal", teste_ate: dias(-30), pago_ate: dias(10), admin: false }, agora);
    const msgs = mensagensDoSistema(s);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({ sistema: true, mostrarPlanos: true, lida: false });
    expect(msgs[0].titulo).toContain("10 dia");
  });

  it("não avisa quando ainda faltam mais de 10 dias, nem no teste grátis", () => {
    expect(mensagensDoSistema(calcularSituacao({ plano: "mensal", teste_ate: dias(-30), pago_ate: dias(11), admin: false }, agora))).toEqual([]);
    expect(mensagensDoSistema(calcularSituacao({ plano: "teste", teste_ate: dias(3), pago_ate: null, admin: false }, agora))).toEqual([]);
  });

  it("avisa quando venceu e respeita as já lidas", () => {
    const s = calcularSituacao({ plano: "mensal", teste_ate: dias(-60), pago_ate: dias(-1), admin: false }, agora);
    const [m] = mensagensDoSistema(s);
    expect(m.titulo).toBe("Sua assinatura venceu");
    expect(mensagensDoSistema(s, [m.id])[0].lida).toBe(true);
  });
});

describe("abas liberadas por plano", () => {
  const agora = new Date("2026-10-15T12:00:00Z");
  const em = (dias: number) => new Date(agora.getTime() + dias * 86_400_000).toISOString();

  it("teste grátis: usa o sistema, mas só as abas básicas", () => {
    const s = calcularSituacao({ plano: "teste", teste_ate: em(3), pago_ate: null, admin: false }, agora);
    expect(acessoLiberado(s)).toBe(true);
    expect(planoCompleto(s)).toBe(false);
  });

  it("plano pago e conta da dona: tudo liberado", () => {
    const pago = calcularSituacao({ plano: "mensal", teste_ate: em(-30), pago_ate: em(5), admin: false }, agora);
    const dona = calcularSituacao({ plano: "vitalicio", teste_ate: em(-30), pago_ate: null, admin: true }, agora);
    expect(planoCompleto(pago)).toBe(true);
    expect(planoCompleto(dona)).toBe(true);
  });

  it("teste vencido: nada liberado (só a página Assinatura)", () => {
    const s = calcularSituacao({ plano: "teste", teste_ate: em(-1), pago_ate: null, admin: false }, agora);
    expect(acessoLiberado(s)).toBe(false);
    expect(planoCompleto(s)).toBe(false);
  });

  it("identifica as abas dos planos pagos, inclusive subpáginas", () => {
    expect(abaDoPlanoPago("/faturamento")?.nome).toBe("Faturamento");
    expect(abaDoPlanoPago("/relatorios")).not.toBeNull();
    expect(abaDoPlanoPago("/reprodutores/abc")).not.toBeNull();
    expect(abaDoPlanoPago("/matrizes")).toBeNull();
    expect(abaDoPlanoPago("/")).toBeNull();
  });
});
