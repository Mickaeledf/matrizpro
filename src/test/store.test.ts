import { beforeEach, describe, it, expect } from "vitest";
import { CONFIG_PADRAO, normalizarDados, useStore } from "@/store/useStore";

const estado = () => useStore.getState();

beforeEach(() => {
  estado().resetarDados();
});

describe("ciclo reprodutivo", () => {
  it("cobertura → parto → desmame atualiza matriz, ciclo e lote", () => {
    const matrizId = estado().addMatriz({
      identificador: "M-01",
      dataNascimento: "2025-01-01",
      dataEntrada: "2025-06-01",
      precoAquisicao: 0,
      statusReprodutivo: "Vazia",
      status: "Ativa",
    });

    estado().registrarCobertura(matrizId, { dataCobertura: "2026-06-01", tipoCobertura: "Monta natural" });
    let matriz = estado().matrizes[0];
    expect(matriz.statusReprodutivo).toBe("Gestante");
    expect(matriz.ciclos[0].dataPrevistaParto).toBe("2026-09-23");

    const cicloId = matriz.ciclos[0].id;
    const loteId = estado().registrarParto(matrizId, cicloId, {
      dataParto: "2026-09-22",
      nascidosVivos: 12,
      nascidosMortos: 1,
      nomeLote: "M-01-P1",
    });
    matriz = estado().matrizes[0];
    expect(matriz.statusReprodutivo).toBe("Lactante");
    expect(matriz.ciclos[0]).toMatchObject({ status: "Parida", loteId });
    expect(estado().lotes[0]).toMatchObject({ id: loteId, matrizId, nascidosVivos: 12, status: "Ativo" });

    estado().registrarDesmame(matrizId, cicloId, "2026-10-13");
    expect(estado().matrizes[0].statusReprodutivo).toBe("Desmamada");
    expect(estado().lotes[0]).toMatchObject({ status: "Desmamado", dataDesmame: "2026-10-13" });
  });
});

describe("exclusões", () => {
  it("excluir matriz desvincula os lotes em vez de deixá-los órfãos", () => {
    const matrizId = estado().addMatriz({
      identificador: "M-01",
      dataNascimento: "2025-01-01",
      dataEntrada: "2025-06-01",
      precoAquisicao: 0,
      statusReprodutivo: "Vazia",
      status: "Ativa",
    });
    estado().addLote({ nome: "L1", matrizId, dataParto: "2026-10-01", nascidosVivos: 10, nascidosMortos: 0, status: "Ativo" });
    estado().deleteMatriz(matrizId);
    expect(estado().matrizes).toHaveLength(0);
    expect(estado().lotes[0].matrizId).toBe("");
  });
});

describe("pesagens", () => {
  it("peso atual segue a pesagem mais recente, mesmo lançada fora de ordem", () => {
    const loteId = estado().addLote({ nome: "L1", matrizId: "", dataParto: "2026-10-01", nascidosVivos: 1, nascidosMortos: 0, status: "Ativo" });
    estado().addLeitao(loteId, {
      identificador: "A",
      sexo: "Fêmea",
      pesoNascimento: 1.4,
      dataNascimento: "2026-10-01",
      status: "Ativo",
      statusSaude: "Saudável",
    });
    const leitaoId = estado().lotes[0].leitoes[0].id;

    estado().addPesagem(loteId, leitaoId, 4.0, "2026-10-14");
    estado().addPesagem(loteId, leitaoId, 2.5, "2026-10-07");
    expect(estado().lotes[0].leitoes[0].pesoAtual).toBe(4.0);

    const ultima = estado().lotes[0].leitoes[0].pesagens.find((p) => p.peso === 4.0)!;
    estado().deletePesagem(loteId, leitaoId, ultima.id);
    expect(estado().lotes[0].leitoes[0].pesoAtual).toBe(2.5);
  });
});

describe("normalizarDados (migração e importação)", () => {
  it("completa campos ausentes de dados da versão antiga", () => {
    const dados = normalizarDados({
      matrizes: [{ id: "m", identificador: "M", dataNascimento: "", dataEntrada: "", precoAquisicao: 0, statusReprodutivo: "Vazia", status: "Ativa", createdAt: "" }],
      lotes: [{ id: "l", nome: "L", matrizId: "m", dataParto: "2026-01-01", nascidosVivos: 5, nascidosMortos: 0, status: "Ativo", createdAt: "", leitoes: [{ id: "x", identificador: "X", pesoNascimento: 1, pesoAtual: 1, sexo: "Macho", status: "Ativo", dataNascimento: "2026-01-01" }] }],
    });
    expect(dados.matrizes[0].ciclos).toEqual([]);
    expect(dados.lotes[0].lancamentos).toEqual([]);
    expect(dados.lotes[0].vacinasPendentes).toEqual([]);
    expect(dados.lotes[0].leitoes[0]).toMatchObject({ pesagens: [], registrosSaude: [], statusSaude: "Saudável", loteId: "l" });
    expect(dados.configuracoes).toEqual(CONFIG_PADRAO);
  });

  it("rejeita arquivos inválidos", () => {
    expect(() => normalizarDados(null)).toThrow();
    expect(() => normalizarDados({ foo: 1 })).toThrow(/inválido/);
  });
});
