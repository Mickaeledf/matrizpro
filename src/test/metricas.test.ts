import { describe, it, expect } from "vitest";
import { calcularGPD, estatisticasLote } from "@/utils/metricas";
import { criarLeitao, criarLote } from "./fixtures";

describe("calcularGPD", () => {
  it("usa a última pesagem e a data dela", () => {
    const leitao = criarLeitao({
      pesoNascimento: 1.5,
      pesoAtual: 4.3,
      dataNascimento: "2026-10-01",
      pesagens: [
        { id: "p2", leitaoId: "x", peso: 4.3, data: "2026-10-15" },
        { id: "p1", leitaoId: "x", peso: 2.9, data: "2026-10-08" },
      ],
    });
    expect(calcularGPD(leitao)).toBeCloseTo(0.2, 5); // 2,8 kg em 14 dias
  });

  it("retorna null sem pesagens", () => {
    expect(calcularGPD(criarLeitao())).toBeNull();
  });
});

describe("estatisticasLote", () => {
  it("calcula mortalidade, natimortalidade, peso médio e custos", () => {
    const lote = criarLote({
      nascidosVivos: 9,
      nascidosMortos: 1,
      leitoes: [
        criarLeitao({ id: "a", pesoAtual: 5, pesoNascimento: 1 }),
        criarLeitao({ id: "b", pesoAtual: 3, pesoNascimento: 1 }),
        criarLeitao({
          id: "c",
          status: "Morto",
          registrosSaude: [{ id: "r", leitaoId: "c", tipo: "medicacao", descricao: "x", data: "2026-10-02", custo: 20 }],
        }),
        criarLeitao({ id: "d", status: "Vendido", pesoAtual: 7, pesoNascimento: 1 }),
      ],
      lancamentos: [
        { id: "1", tipo: "custo", categoria: "Ração", descricao: "", valor: 100, data: "2026-10-05" },
        { id: "2", tipo: "receita", categoria: "Venda de leitões", descricao: "", valor: 300, data: "2026-10-20" },
      ],
    });

    const est = estatisticasLote(lote);
    expect(est.ativos).toBe(2);
    expect(est.mortalidadePercent).toBe(25);
    expect(est.natimortalidadePercent).toBe(10);
    expect(est.pesoMedio).toBe(4);
    expect(est.totalCustos).toBe(120);
    expect(est.custosSaude).toBe(20);
    expect(est.saldo).toBe(180);
    expect(est.kgProduzidos).toBe(12); // 4 + 2 + 6 (mortos não contam)
    expect(est.custoPorKg).toBe(10);
  });
});
