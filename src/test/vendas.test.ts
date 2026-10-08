import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "@/store/useStore";
import { estatisticasLote } from "@/utils/metricas";
import { agruparVendas, faturamentoPorMes, listarVendidos, resumirFaturamento } from "@/utils/faturamento";

const estado = () => useStore.getState();

function prepararLote() {
  const loteId = estado().addLote({ nome: "L1", matrizId: "", dataParto: "2026-08-01", nascidosVivos: 3, nascidosMortos: 0, status: "Desmamado" });
  for (const id of ["A", "B", "C"]) {
    estado().addLeitao(loteId, { identificador: id, sexo: "Macho", pesoNascimento: 1.5, dataNascimento: "2026-08-01", status: "Ativo", statusSaude: "Saudável" });
  }
  const [a, b, c] = estado().lotes[0].leitoes.map((l) => l.id);
  return { loteId, a, b, c };
}

beforeEach(() => estado().resetarDados());

describe("venda de leitões", () => {
  it("vende um por um, cada leitão com seu valor, e registra o peso de venda", () => {
    const { loteId, a } = prepararLote();
    estado().registrarVendaLeitoes(loteId, [{ leitaoId: a, valor: 350, pesoKg: 23 }], { data: "2026-10-05", comprador: "Frigorífico X" });
    const lote = estado().lotes[0];
    const vendido = lote.leitoes.find((l) => l.id === a)!;
    expect(vendido).toMatchObject({ status: "Vendido", pesoAtual: 23, venda: { valor: 350, comprador: "Frigorífico X" } });
    expect(lote.status).toBe("Desmamado"); // ainda restam leitões vivos
    expect(estatisticasLote(lote).receitaVendas).toBe(350);
  });

  it("vendendo todos, o lote vira 'Vendido'; desfazer volta tudo", () => {
    const { loteId, a, b, c } = prepararLote();
    const vendaId = estado().registrarVendaLeitoes(
      loteId,
      [a, b, c].map((id) => ({ leitaoId: id, valor: 300, pesoKg: 22 })),
      { data: "2026-10-05" }
    );
    expect(estado().lotes[0].status).toBe("Vendido");
    estado().desfazerVendaLeitoes(loteId, vendaId);
    const lote = estado().lotes[0];
    expect(lote.status).toBe("Ativo");
    expect(lote.leitoes.every((l) => l.status === "Ativo" && !l.venda)).toBe(true);
  });
});

describe("faturamento", () => {
  it("separa leitões e descarte, agrupa por venda e soma por mês", () => {
    const { loteId, a, b } = prepararLote();
    estado().registrarVendaLeitoes(loteId, [{ leitaoId: a, valor: 300, pesoKg: 20 }, { leitaoId: b, valor: 330, pesoKg: 22 }], { data: "2026-09-10" });
    const matrizId = estado().addMatriz({ identificador: "M1", dataNascimento: "2024-01-01", dataEntrada: "2024-06-01", precoAquisicao: 0, statusReprodutivo: "Vazia", status: "Ativa" });
    estado().registrarVendaAnimal("matriz", matrizId, { data: "2026-10-01", valor: 1200 });
    expect(estado().matrizes[0]).toMatchObject({ status: "Descartada", venda: { valor: 1200 } });

    const s = estado();
    const itens = listarVendidos(s.lotes, s.matrizes, s.reprodutores);
    const resumo = resumirFaturamento(itens);
    expect(resumo.total).toBe(1830);
    expect(resumo.leitoes).toMatchObject({ quantidade: 2, valor: 630, precoMedio: 315, precoKg: 15 });
    expect(resumo.descarte).toMatchObject({ quantidade: 1, valor: 1200 });
    expect(agruparVendas(itens)).toHaveLength(2);
    expect(faturamentoPorMes(itens)).toEqual([
      { mes: "2026-09", leitoes: 630, descarte: 0 },
      { mes: "2026-10", leitoes: 0, descarte: 1200 },
    ]);
  });
});
