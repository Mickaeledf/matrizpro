import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Banco falso em memória que imita o cliente do Supabase (somente o necessário)
// ---------------------------------------------------------------------------
type Linha = Record<string, unknown>;
const banco: Record<string, Linha[]> = { matrizes: [], reprodutores: [], lotes: [], configuracoes: [] };
/** Simula aparelho sem internet: toda operação no banco falha. */
let semInternet = false;
const FALHA = { data: null, error: { message: "Failed to fetch" } };

function consulta(tabela: string) {
  let filtroIds: string[] | null = null;
  let operacao: "select" | "delete" = "select";
  let unico = false;
  let faixa: [number, number] | null = null;

  const executar = () => {
    if (semInternet) return FALHA;
    if (operacao === "delete") {
      banco[tabela] = banco[tabela].filter((l) => !filtroIds?.includes(l.id as string));
      return { data: null, error: null };
    }
    let dados = banco[tabela].map((l) => ({ dados: l.dados }));
    if (faixa) dados = dados.slice(faixa[0], faixa[1] + 1);
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
    order: () => builder,
    range: (de: number, ate: number) => {
      faixa = [de, ate];
      return builder;
    },
    in: (_coluna: string, ids: string[]) => {
      filtroIds = ids;
      return builder;
    },
    upsert: (linhas: Linha | Linha[]) => {
      if (semInternet) return Promise.resolve(FALHA);
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

import {
  calcularMudancas,
  encerrarSincronizacao,
  iniciarSincronizacao,
  lerDonoLocal,
  lerPendencias,
  temAlteracoesNaoSalvas,
} from "@/lib/sincronizacao";
import { CONFIG_PADRAO, useStore } from "@/store/useStore";
import { criarLote, criarMatriz } from "./fixtures";

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
const estado = () => useStore.getState();

beforeEach(async () => {
  await encerrarSincronizacao();
  banco.matrizes = [];
  banco.reprodutores = [];
  banco.lotes = [];
  banco.configuracoes = [];
  semInternet = false;
  localStorage.clear();
  estado().resetarDados();
});

describe("calcularMudancas", () => {
  it("detecta apenas o que foi criado, alterado ou excluído", () => {
    const m1 = criarMatriz({ id: "m1" });
    const m2 = criarMatriz({ id: "m2" });
    const l1 = criarLote({ id: "l1" });
    const antes = { matrizes: [m1, m2], reprodutores: [], lotes: [l1], configuracoes: CONFIG_PADRAO };
    const m2Editada = { ...m2, identificador: "M-99" };
    const l2 = criarLote({ id: "l2" });
    const depois = { matrizes: [m1, m2Editada], reprodutores: [], lotes: [l2], configuracoes: CONFIG_PADRAO };

    const mudancas = calcularMudancas(antes, depois);
    expect(mudancas.salvar.matrizes.map((m) => m.id)).toEqual(["m2"]);
    expect(mudancas.excluir.matrizes).toEqual([]);
    expect(mudancas.salvar.lotes.map((l) => l.id)).toEqual(["l2"]);
    expect(mudancas.excluir.lotes).toEqual(["l1"]);
    expect(mudancas.configuracoes).toBe(false);
  });
});

describe("iniciarSincronizacao", () => {
  it("envia para a nuvem o que a própria conta registrou neste navegador", async () => {
    localStorage.setItem("matrizpro-dono", "user-a");
    estado().addLote({ nome: "L1", matrizId: "", dataParto: "2026-10-01", nascidosVivos: 10, nascidosMortos: 0, status: "Ativo" });
    const pronto = vi.fn();
    iniciarSincronizacao("user-a", pronto);
    await esperar(20);

    expect(pronto).toHaveBeenCalled();
    expect(banco.lotes).toHaveLength(1);
    expect(banco.lotes[0]).toMatchObject({ user_id: "user-a", nome: "L1" });
    expect(lerDonoLocal()).toBe("user-a");
  });

  it("conta nova não herda dados locais sem dono conhecido", async () => {
    estado().addLote({ nome: "SEM-DONO", matrizId: "", dataParto: "2026-10-01", nascidosVivos: 10, nascidosMortos: 0, status: "Ativo" });
    iniciarSincronizacao("user-nova", () => {});
    await esperar(20);

    expect(banco.lotes).toHaveLength(0);
    expect(estado().lotes).toHaveLength(0);
    expect(lerDonoLocal()).toBe("user-nova");
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

describe("alterações sem internet não se perdem", () => {
  const matrizNaNuvem = (id: string, identificador: string) => ({ id, user_id: "user-a", dados: criarMatriz({ id, identificador }) });

  it("edição feita sem internet sobe na próxima abertura, sem apagar o que veio de outro aparelho", async () => {
    banco.matrizes = [matrizNaNuvem("m1", "M-1")];
    iniciarSincronizacao("user-a", () => {});
    await esperar(20);

    // cai a internet e a pessoa edita
    semInternet = true;
    estado().updateMatriz("m1", { identificador: "M-1-EDITADA-NO-CAMPO" });
    estado().addLote({ nome: "LOTE-OFFLINE", matrizId: "m1", dataParto: "2026-10-20", nascidosVivos: 9, nascidosMortos: 0, status: "Ativo" });
    await esperar(900);
    expect(temAlteracoesNaoSalvas()).toBe(true);
    expect(lerPendencias("user-a")?.salvar.matrizes).toContain("m1");

    // fecha o app sem internet
    await encerrarSincronizacao();

    // enquanto isso, outro aparelho cadastrou outra matriz na nuvem
    banco.matrizes.push(matrizNaNuvem("m2", "M-2-OUTRO-APARELHO"));

    // volta a internet e abre de novo
    semInternet = false;
    iniciarSincronizacao("user-a", () => {});
    await esperar(30);

    const nomes = estado().matrizes.map((m) => m.identificador).sort();
    expect(nomes).toEqual(["M-1-EDITADA-NO-CAMPO", "M-2-OUTRO-APARELHO"]);
    expect(estado().lotes.map((l) => l.nome)).toEqual(["LOTE-OFFLINE"]);
    expect((banco.matrizes.find((l) => l.id === "m1")?.dados as { identificador: string }).identificador).toBe("M-1-EDITADA-NO-CAMPO");
    expect(banco.lotes).toHaveLength(1);
    expect(lerPendencias("user-a")).toBeNull();
  });

  it("abrindo sem internet mostra o que está no aparelho e envia quando a internet volta", async () => {
    banco.matrizes = [matrizNaNuvem("m1", "M-1")];
    iniciarSincronizacao("user-a", () => {});
    await esperar(20);
    await encerrarSincronizacao();

    semInternet = true;
    const pronto = vi.fn();
    iniciarSincronizacao("user-a", pronto);
    await esperar(20);
    expect(pronto).toHaveBeenCalledTimes(1);
    expect(estado().matrizes.map((m) => m.identificador)).toEqual(["M-1"]);

    estado().updateMatriz("m1", { identificador: "M-1-SEM-SINAL" });
    await esperar(900);
    expect(lerPendencias("user-a")?.salvar.matrizes).toContain("m1");

    semInternet = false;
    await encerrarSincronizacao(); // força a nova tentativa na hora
    expect((banco.matrizes[0].dados as { identificador: string }).identificador).toBe("M-1-SEM-SINAL");
    expect(pronto).toHaveBeenCalledTimes(1);
  });

  it("pendências de uma conta nunca vão para outra conta", async () => {
    banco.matrizes = [matrizNaNuvem("m1", "M-DO-A")];
    iniciarSincronizacao("user-a", () => {});
    await esperar(20);
    semInternet = true;
    estado().updateMatriz("m1", { identificador: "M-DO-A-EDITADA" });
    await esperar(900);
    await encerrarSincronizacao();

    // outra pessoa entra no mesmo navegador (conta B, sem nada na nuvem)
    semInternet = false;
    banco.matrizes = [];
    iniciarSincronizacao("user-b", () => {});
    await esperar(20);
    expect(estado().matrizes).toHaveLength(0);
    expect(banco.matrizes).toHaveLength(0);
    expect(lerPendencias("user-b")).toBeNull();
  });
});
