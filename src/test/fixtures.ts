import { Leitao, Lote, Matriz } from "@/types";

export function criarLeitao(parcial: Partial<Leitao> = {}): Leitao {
  return {
    id: parcial.id ?? crypto.randomUUID(),
    loteId: "lote-1",
    identificador: "L-01",
    pesoNascimento: 1.5,
    pesoAtual: 1.5,
    sexo: "Macho",
    status: "Ativo",
    statusSaude: "Saudável",
    dataNascimento: "2026-10-01",
    pesagens: [],
    registrosSaude: [],
    ...parcial,
  };
}

export function criarLote(parcial: Partial<Lote> = {}): Lote {
  return {
    id: "lote-1",
    nome: "Lote-1",
    matrizId: "",
    dataParto: "2026-10-01",
    nascidosVivos: 10,
    nascidosMortos: 0,
    status: "Ativo",
    leitoes: [],
    vacinasPendentes: [],
    lancamentos: [],
    createdAt: "2026-10-01T00:00:00.000Z",
    ...parcial,
  };
}

export function criarMatriz(parcial: Partial<Matriz> = {}): Matriz {
  return {
    id: "matriz-1",
    identificador: "M-01",
    dataNascimento: "2025-01-01",
    dataEntrada: "2025-06-01",
    precoAquisicao: 1500,
    statusReprodutivo: "Vazia",
    status: "Ativa",
    ciclos: [],
    createdAt: "2025-06-01T00:00:00.000Z",
    ...parcial,
  };
}

/** Data local ao meio-dia, para evitar ambiguidade de fuso nos testes. */
export const dia = (iso: string) => new Date(`${iso}T12:00:00`);
