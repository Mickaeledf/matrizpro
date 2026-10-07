import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Banco falso em memória que imita o cliente do Supabase (somente o necessário)
// ---------------------------------------------------------------------------
type Linha = Record<string, unknown>;
const banco: Record<string, Linha[]> = { matrizes: [], lotes: [], configuracoes: [] };

function consulta(tabela: string) {
  let filtroIds: string[] | null = null;
  let operacao: "select" | "delete" = "select";
  let unico = false;

  const executar = () => {
    if (operacao === "delete") {
      banco[tabela] = banco[tabela].filter((l) => !filtroIds?.includes(l.id as string));
      return { data: null, error: null };
    }
    const dados = banco[tabela].map((l) => ({ dados: l.dados }));
    return { data: unico ? (dados[0] ?? null) : dados, error: null };
  };

  const builder = {
    select: () => builder,
    maybeSingle: () => {
      unico = true;
      return builder;
    },
    delete: () => {
      operacao = "delete";
      return builder;
    },
    eq: () => builder,
    in: (_coluna: string, ids: string[]) => {
      filtroIds = ids;
      return builder;
    },
    upsert: (linhas: Linha | Linha[]) => {
      const lista = Array.isArray(linhas) ? linhas : [linhas];
      for (const linha of lista) {
        const chave = tabela === "configuracoes" ? "user_id" : "id";
        banco[tabela] = banco[tabela].filter((l) => l[chave] !== linha[chave]).concat(linha);
      }
      return Promise.resolve({ data: null, error: null });
    },
    then: (resolve: (v: unknown) => void) => resolve(executar()),
  };
  return builder;
}

vi.mock("@/lib/supabase", () => ({
  supabase: { from: (tabela: string) => consulta(tabela) },
  supabaseConfigurado: true,
}));

import { calcularMudancas, encerrarSincronizacao, iniciarSincronizacao, lerDonoLocal } from "@/lib/sincronizacao";
import { CONFIG_PADRAO, useStore } from "@/store/useStore";
import { criarLote, criarMatriz } from "./fixtures";

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
const estado = () => useStore.getState();

beforeEach(async () => {
  await encerrarSincronizacao();
  banco.matrizes = [];
  banco.lotes = [];
  banco.configuracoes = [];
  localStorage.clear();
  estado().resetarDados();
});

describe("calcularMudancas", () => {
  it("detecta apenas o que foi criado, alterado ou excluído", () => {
    const m1 = criarMatriz({ id: "m1" });
    const m2 = criarMatriz({ id: "m2" });
    const l1 = criarLote({ id: "l1" });
    const antes = { matrizes: [m1, m2], lotes: [l1], configuracoes: CONFIG_PADRAO };
    const m2Editada = { ...m2, identificador: "M-99" };
    const l2 = criarLote({ id: "l2" });
    const depois = { matrizes: [m1, m2Editada], lotes: [l2], configuracoes: CONFIG_PADRAO };

    const mudancas = calcularMudancas(antes, depois);
    expect(mudancas.matrizesSalvar.map((m) => m.id)).toEqual(["m2"]);
    expect(mudancas.matrizesExcluir).toEqual([]);
    expect(mudancas.lotesSalvar.map((l) => l.id)).toEqual(["l2"]);
    expect(mudancas.lotesExcluir).toEqual(["l1"]);
    expect(mudancas.configuracoes).toBe(false);
  });
});

describe("iniciarSincronizacao", () => {
  it("na primeira vez da conta, envia os dados que já existiam no navegador", async () => {
    estado().addLote({ nome: "L1", matrizId: "", dataParto: "2026-10-01", nascidosVivos: 10, nascidosMortos: 0, status: "Ativo" });
    const pronto = vi.fn();
    iniciarSincronizacao("user-a", pronto);
    await esperar(20);

    expect(pronto).toHaveBeenCalled();
    expect(banco.lotes).toHaveLength(1);
    expect(banco.lotes[0]).toMatchObject({ user_id: "user-a", nome: "L1" });
    expect(lerDonoLocal()).toBe("user-a");
  });

  it("baixa os dados da nuvem e grava alterações automaticamente", async () => {
    banco.matrizes = [{ id: "m1", dados: criarMatriz({ id: "m1", identificador: "M-NUVEM" }) }];
    iniciarSincronizacao("user-a", () => {});
    await esperar(20);
    expect(estado().matrizes.map((m) => m.identificador)).toEqual(["M-NUVEM"]);

    estado().updateMatriz("m1", { identificador: "M-EDITADA" });
    estado().addLote({ nome: "L2", matrizId: "m1", dataParto: "2026-10-01", nascidosVivos: 8, nascidosMortos: 0, status: "Ativo" });
    await esperar(900); // agrupamento de ~0,8 s
    expect(banco.matrizes[0]).toMatchObject({ identificador: "M-EDITADA" });
    expect(banco.lotes[0]).toMatchObject({ nome: "L2", matriz_id: "m1" });

    estado().deleteLote(estado().lotes[0].id);
    await encerrarSincronizacao(); // grava o pendente na hora (como no logout)
    expect(banco.lotes).toHaveLength(0);
  });

  it("não envia para uma conta os dados locais de outra conta", async () => {
    localStorage.setItem("matrizpro-dono", "user-a");
    estado().addLote({ nome: "DA-CONTA-A", matrizId: "", dataParto: "2026-10-01", nascidosVivos: 5, nascidosMortos: 0, status: "Ativo" });

    iniciarSincronizacao("user-b", () => {});
    await esperar(20);

    expect(banco.lotes).toHaveLength(0);
    expect(estado().lotes).toHaveLength(0);
    expect(lerDonoLocal()).toBe("user-b");
  });
});
