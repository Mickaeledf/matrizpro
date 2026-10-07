import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { CONFIG_PADRAO, DadosApp, normalizarDados, useStore } from "@/store/useStore";
import { Lote, Matriz } from "@/types";

/**
 * Sincronização entre o estado local (Zustand) e o banco do Supabase.
 *
 * - Ao entrar: baixa os dados do usuário. Se a conta ainda não tem dados na
 *   nuvem, envia os dados que já existiam neste navegador (migração).
 * - Durante o uso: cada alteração é enviada ao banco (agrupada a cada ~1s),
 *   gravando somente as matrizes/lotes que mudaram.
 */

export type StatusSincronizacao = "carregando" | "sincronizado" | "salvando" | "erro";

export const useStatusSincronizacao = create<{ status: StatusSincronizacao; erro: string | null }>(() => ({
  status: "carregando",
  erro: null,
}));

const definirStatus = (status: StatusSincronizacao, erro: string | null = null) =>
  useStatusSincronizacao.setState({ status, erro });

/** Chave que guarda de qual usuário são os dados salvos neste navegador. */
const CHAVE_DONO = "matrizpro-dono";

export function lerDonoLocal(): string | null {
  try {
    return localStorage.getItem(CHAVE_DONO);
  } catch {
    return null;
  }
}

export function definirDonoLocal(userId: string | null) {
  try {
    if (userId) localStorage.setItem(CHAVE_DONO, userId);
    else localStorage.removeItem(CHAVE_DONO);
  } catch {
    // navegação privada / armazenamento bloqueado: segue sem cache local
  }
}

export interface Mudancas {
  matrizesSalvar: Matriz[];
  matrizesExcluir: string[];
  lotesSalvar: Lote[];
  lotesExcluir: string[];
  configuracoes: boolean;
}

/**
 * Compara dois estados e lista o que precisa ser gravado.
 * O store é imutável: um objeto só muda de referência quando foi alterado.
 */
export function calcularMudancas(anterior: DadosApp, atual: DadosApp): Mudancas {
  const diff = <T extends { id: string }>(antes: T[], depois: T[]) => {
    const mapaAntes = new Map(antes.map((x) => [x.id, x]));
    const idsDepois = new Set(depois.map((x) => x.id));
    return {
      salvar: depois.filter((x) => mapaAntes.get(x.id) !== x),
      excluir: antes.filter((x) => !idsDepois.has(x.id)).map((x) => x.id),
    };
  };
  const m = diff(anterior.matrizes, atual.matrizes);
  const l = diff(anterior.lotes, atual.lotes);
  return {
    matrizesSalvar: m.salvar,
    matrizesExcluir: m.excluir,
    lotesSalvar: l.salvar,
    lotesExcluir: l.excluir,
    configuracoes: anterior.configuracoes !== atual.configuracoes,
  };
}

export const semMudancas = (m: Mudancas) =>
  m.matrizesSalvar.length === 0 &&
  m.matrizesExcluir.length === 0 &&
  m.lotesSalvar.length === 0 &&
  m.lotesExcluir.length === 0 &&
  !m.configuracoes;

/** Grava as mudanças no banco. Lança erro se alguma operação falhar. */
export async function enviarMudancas(userId: string, mudancas: Mudancas, dados: DadosApp) {
  const operacoes: PromiseLike<{ error: { message: string } | null }>[] = [];

  if (mudancas.matrizesSalvar.length > 0) {
    operacoes.push(
      supabase.from("matrizes").upsert(
        mudancas.matrizesSalvar.map((m) => ({ user_id: userId, id: m.id, identificador: m.identificador, dados: m })),
        { onConflict: "user_id,id" }
      )
    );
  }
  if (mudancas.matrizesExcluir.length > 0) {
    operacoes.push(supabase.from("matrizes").delete().eq("user_id", userId).in("id", mudancas.matrizesExcluir));
  }
  if (mudancas.lotesSalvar.length > 0) {
    operacoes.push(
      supabase.from("lotes").upsert(
        mudancas.lotesSalvar.map((l) => ({
          user_id: userId,
          id: l.id,
          nome: l.nome,
          matriz_id: l.matrizId || null,
          dados: l,
        })),
        { onConflict: "user_id,id" }
      )
    );
  }
  if (mudancas.lotesExcluir.length > 0) {
    operacoes.push(supabase.from("lotes").delete().eq("user_id", userId).in("id", mudancas.lotesExcluir));
  }
  if (mudancas.configuracoes) {
    operacoes.push(
      supabase.from("configuracoes").upsert({ user_id: userId, dados: dados.configuracoes }, { onConflict: "user_id" })
    );
  }

  const resultados = await Promise.all(operacoes);
  const falha = resultados.find((r) => r.error);
  if (falha?.error) throw new Error(falha.error.message);
}

/** Baixa todos os dados do usuário. Retorna null se a conta ainda não tem nada salvo. */
export async function baixarDados(): Promise<DadosApp | null> {
  const [matrizes, lotes, configuracoes] = await Promise.all([
    supabase.from("matrizes").select("dados"),
    supabase.from("lotes").select("dados"),
    supabase.from("configuracoes").select("dados").maybeSingle(),
  ]);
  const erro = matrizes.error ?? lotes.error ?? configuracoes.error;
  if (erro) throw new Error(erro.message);

  const linhasMatrizes = matrizes.data ?? [];
  const linhasLotes = lotes.data ?? [];
  if (linhasMatrizes.length === 0 && linhasLotes.length === 0 && !configuracoes.data) return null;

  return normalizarDados({
    matrizes: linhasMatrizes.map((r) => r.dados),
    lotes: linhasLotes.map((r) => r.dados),
    configuracoes: configuracoes.data?.dados,
  });
}

const mensagemErro = (e: unknown) => (e instanceof Error ? e.message : "Erro desconhecido");

const dadosAtuais = (): DadosApp => {
  const s = useStore.getState();
  return { matrizes: s.matrizes, lotes: s.lotes, configuracoes: s.configuracoes };
};

/** Controle da sincronização ativa (uma por vez). */
let sessaoAtiva: { encerrar: (salvarPendentes: boolean) => Promise<void> } | null = null;

/**
 * Inicia a sincronização para o usuário logado.
 * `aoCarregar` é chamado quando os dados iniciais já estão no store.
 */
export function iniciarSincronizacao(userId: string, aoCarregar: () => void) {
  let ativo = true;
  let snapshot: DadosApp | null = null; // último estado confirmado no banco
  let timer: ReturnType<typeof setTimeout> | undefined;
  let fila: Promise<void> = Promise.resolve();

  const salvar = async () => {
    if (!snapshot) return;
    const atual = dadosAtuais();
    const mudancas = calcularMudancas(snapshot, atual);
    if (semMudancas(mudancas)) return;
    definirStatus("salvando");
    try {
      await enviarMudancas(userId, mudancas, atual);
      snapshot = atual;
      if (ativo) definirStatus("sincronizado");
    } catch (e) {
      definirStatus("erro", `Não foi possível salvar na nuvem: ${mensagemErro(e)}`);
      // tenta de novo em 10 s (o snapshot não mudou, então nada se perde)
      if (ativo) timer = setTimeout(agendar, 10_000);
    }
  };

  // Enfileira para nunca haver duas gravações ao mesmo tempo
  const agendar = () => {
    fila = fila.then(salvar);
  };

  const cancelarInscricao = useStore.subscribe(() => {
    if (!ativo || !snapshot) return;
    clearTimeout(timer);
    timer = setTimeout(agendar, 800);
  });

  const carregar = async () => {
    definirStatus("carregando");
    const donoLocal = lerDonoLocal();
    try {
      const remoto = await baixarDados();
      if (!ativo) return;
      if (remoto) {
        // A nuvem é a fonte da verdade
        useStore.getState().importarDados(remoto);
      } else if (donoLocal && donoLocal !== userId) {
        // Dados locais são de outra conta: não podem ir para esta
        useStore.getState().resetarDados();
      } else {
        // Primeira vez desta conta: envia o que já existia neste navegador
        const local = dadosAtuais();
        const mudancas = calcularMudancas({ matrizes: [], lotes: [], configuracoes: CONFIG_PADRAO }, local);
        if (!semMudancas(mudancas)) await enviarMudancas(userId, mudancas, local);
      }
      snapshot = dadosAtuais();
      definirDonoLocal(userId);
      definirStatus("sincronizado");
    } catch (e) {
      if (!ativo) return;
      // Sem conexão: usa o cache local apenas se ele for desta conta
      if (donoLocal && donoLocal !== userId) useStore.getState().resetarDados();
      snapshot = dadosAtuais();
      definirStatus("erro", `Não foi possível carregar os dados da nuvem: ${mensagemErro(e)}`);
    }
    if (ativo) aoCarregar();
  };

  const controle = {
    encerrar: async (salvarPendentes: boolean) => {
      clearTimeout(timer);
      if (salvarPendentes) {
        agendar();
        await fila;
      }
      ativo = false;
      cancelarInscricao();
      if (sessaoAtiva === controle) sessaoAtiva = null;
    },
  };
  sessaoAtiva = controle;
  carregar();

  return () => {
    controle.encerrar(false);
  };
}

/** Salva o que estiver pendente e para a sincronização (usado no logout). */
export async function encerrarSincronizacao() {
  await sessaoAtiva?.encerrar(true);
}

export { definirStatus };
