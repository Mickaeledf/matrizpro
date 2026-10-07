import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Matriz,
  Lote,
  Leitao,
  Pesagem,
  RegistroSaude,
  VacinaPendente,
  StatusSaude,
  CicloReprodutivo,
  Lancamento,
  Configuracoes,
  TipoCobertura,
} from '@/types';
import { hojeISO, somarDias } from '@/lib/date';

export const CONFIG_PADRAO: Configuracoes = {
  nomeFazenda: '',
  responsavel: '',
  cidade: '',
  diasGestacao: 114,
  diasDesmame: 21,
  intervaloPesagemDias: 7,
  antecedenciaVacinaDias: 5,
  limiteBaixoPesoPercent: 15,
  limiteMortalidadePercent: 10,
};

export interface DadosApp {
  matrizes: Matriz[];
  lotes: Lote[];
  configuracoes: Configuracoes;
}

type NovaMatriz = Omit<Matriz, 'id' | 'createdAt' | 'ciclos'>;
type NovoLote = Omit<Lote, 'id' | 'createdAt' | 'leitoes' | 'vacinasPendentes' | 'lancamentos'>;
type NovoLeitao = Omit<Leitao, 'id' | 'loteId' | 'pesagens' | 'registrosSaude' | 'pesoAtual'> & { pesoAtual?: number };

interface AppState extends DadosApp {
  addMatriz: (matriz: NovaMatriz) => string;
  updateMatriz: (id: string, data: Partial<Matriz>) => void;
  deleteMatriz: (id: string) => void;

  registrarCobertura: (
    matrizId: string,
    dados: { dataCobertura: string; tipoCobertura: TipoCobertura; reprodutor?: string; observacoes?: string }
  ) => void;
  registrarParto: (
    matrizId: string,
    cicloId: string,
    dados: { dataParto: string; nascidosVivos: number; nascidosMortos: number; nomeLote: string }
  ) => string;
  registrarDesmame: (matrizId: string, cicloId: string, dataDesmame: string) => void;
  registrarFalhaGestacao: (matrizId: string, cicloId: string) => void;
  deleteCiclo: (matrizId: string, cicloId: string) => void;

  addLote: (lote: NovoLote) => string;
  updateLote: (id: string, data: Partial<Lote>) => void;
  deleteLote: (id: string) => void;

  addLeitao: (loteId: string, leitao: NovoLeitao) => void;
  updateLeitao: (loteId: string, leitaoId: string, data: Partial<Leitao>) => void;
  deleteLeitao: (loteId: string, leitaoId: string) => void;
  addPesagem: (loteId: string, leitaoId: string, peso: number, data?: string) => void;
  deletePesagem: (loteId: string, leitaoId: string, pesagemId: string) => void;
  addRegistroSaude: (loteId: string, leitaoId: string, registro: Omit<RegistroSaude, 'id' | 'leitaoId'>) => void;
  deleteRegistroSaude: (loteId: string, leitaoId: string, registroId: string) => void;

  addVacinaPendente: (loteId: string, vacina: Omit<VacinaPendente, 'id' | 'aplicada'>) => void;
  marcarVacinaAplicada: (loteId: string, vacinaId: string, dataAplicacao?: string) => void;
  deleteVacina: (loteId: string, vacinaId: string) => void;

  addLancamento: (loteId: string, lancamento: Omit<Lancamento, 'id'>) => void;
  deleteLancamento: (loteId: string, lancamentoId: string) => void;

  updateConfiguracoes: (data: Partial<Configuracoes>) => void;
  importarDados: (dados: unknown) => void;
  resetarDados: () => void;
}

const generateId = () => crypto.randomUUID();

const asArray = <T,>(valor: unknown): T[] => (Array.isArray(valor) ? (valor as T[]) : []);

/** Garante que dados antigos ou importados tenham todos os campos esperados. */
export function normalizarDados(bruto: unknown): DadosApp {
  if (!bruto || typeof bruto !== 'object') {
    throw new Error('Arquivo inválido: formato não reconhecido.');
  }
  const dados = bruto as Record<string, unknown>;
  if (!Array.isArray(dados.matrizes) || !Array.isArray(dados.lotes)) {
    throw new Error('Arquivo inválido: matrizes ou lotes ausentes.');
  }

  const matrizes = asArray<Matriz>(dados.matrizes).map((m) => ({
    ...m,
    status: m.status || 'Ativa',
    statusReprodutivo: m.statusReprodutivo || 'Vazia',
    precoAquisicao: Number(m.precoAquisicao) || 0,
    ciclos: asArray<CicloReprodutivo>(m.ciclos),
  }));

  const lotes = asArray<Lote>(dados.lotes).map((l) => ({
    ...l,
    matrizId: l.matrizId || '',
    nascidosVivos: Number(l.nascidosVivos) || 0,
    nascidosMortos: Number(l.nascidosMortos) || 0,
    vacinasPendentes: asArray<VacinaPendente>(l.vacinasPendentes),
    lancamentos: asArray<Lancamento>(l.lancamentos),
    leitoes: asArray<Leitao>(l.leitoes).map((lt) => ({
      ...lt,
      loteId: l.id,
      statusSaude: lt.statusSaude || ('Saudável' as StatusSaude),
      pesagens: asArray<Pesagem>(lt.pesagens),
      registrosSaude: asArray<RegistroSaude>(lt.registrosSaude),
    })),
  }));

  const configuracoes = {
    ...CONFIG_PADRAO,
    ...((dados.configuracoes as Partial<Configuracoes>) || {}),
  };

  return { matrizes, lotes, configuracoes };
}

const mapLote = (lotes: Lote[], loteId: string, fn: (l: Lote) => Lote) =>
  lotes.map((l) => (l.id === loteId ? fn(l) : l));

const mapLeitao = (lotes: Lote[], loteId: string, leitaoId: string, fn: (lt: Leitao) => Leitao) =>
  mapLote(lotes, loteId, (l) => ({
    ...l,
    leitoes: l.leitoes.map((lt) => (lt.id === leitaoId ? fn(lt) : lt)),
  }));

const mapCiclo = (
  matrizes: Matriz[],
  matrizId: string,
  cicloId: string,
  fn: (c: CicloReprodutivo) => CicloReprodutivo,
  extra: Partial<Matriz> = {}
) =>
  matrizes.map((m) =>
    m.id === matrizId
      ? { ...m, ...extra, ciclos: m.ciclos.map((c) => (c.id === cicloId ? fn(c) : c)) }
      : m
  );

/** O peso atual é sempre o da pesagem mais recente (ou o de nascimento). */
const recalcularPesoAtual = (lt: Leitao): Leitao => {
  const ordenadas = [...lt.pesagens].sort((a, b) => a.data.localeCompare(b.data));
  const ultima = ordenadas[ordenadas.length - 1];
  return { ...lt, pesagens: ordenadas, pesoAtual: ultima ? ultima.peso : lt.pesoNascimento };
};

const estadoInicial: DadosApp = { matrizes: [], lotes: [], configuracoes: CONFIG_PADRAO };

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...estadoInicial,

      addMatriz: (matriz) => {
        const id = generateId();
        set((state) => ({
          matrizes: [...state.matrizes, { ...matriz, id, ciclos: [], createdAt: new Date().toISOString() }],
        }));
        return id;
      },

      updateMatriz: (id, data) =>
        set((state) => ({
          matrizes: state.matrizes.map((m) => (m.id === id ? { ...m, ...data } : m)),
        })),

      deleteMatriz: (id) =>
        set((state) => ({
          matrizes: state.matrizes.filter((m) => m.id !== id),
          // Lotes da matriz excluída permanecem, mas sem vínculo
          lotes: state.lotes.map((l) => (l.matrizId === id ? { ...l, matrizId: '' } : l)),
        })),

      registrarCobertura: (matrizId, dados) =>
        set((state) => ({
          matrizes: state.matrizes.map((m) =>
            m.id === matrizId
              ? {
                  ...m,
                  statusReprodutivo: 'Gestante',
                  ciclos: [
                    ...m.ciclos,
                    {
                      id: generateId(),
                      ...dados,
                      dataPrevistaParto: somarDias(dados.dataCobertura, state.configuracoes.diasGestacao),
                      status: 'Em gestação',
                    },
                  ],
                }
              : m
          ),
        })),

      registrarParto: (matrizId, cicloId, dados) => {
        const loteId = generateId();
        set((state) => ({
          matrizes: mapCiclo(
            state.matrizes,
            matrizId,
            cicloId,
            (c) => ({ ...c, status: 'Parida', dataParto: dados.dataParto, loteId }),
            { statusReprodutivo: 'Lactante' }
          ),
          lotes: [
            ...state.lotes,
            {
              id: loteId,
              nome: dados.nomeLote,
              matrizId,
              dataParto: dados.dataParto,
              nascidosVivos: dados.nascidosVivos,
              nascidosMortos: dados.nascidosMortos,
              status: 'Ativo',
              leitoes: [],
              vacinasPendentes: [],
              lancamentos: [],
              createdAt: new Date().toISOString(),
            },
          ],
        }));
        return loteId;
      },

      registrarDesmame: (matrizId, cicloId, dataDesmame) => {
        const ciclo = get().matrizes.find((m) => m.id === matrizId)?.ciclos.find((c) => c.id === cicloId);
        set((state) => ({
          matrizes: mapCiclo(
            state.matrizes,
            matrizId,
            cicloId,
            (c) => ({ ...c, status: 'Desmamada', dataDesmame }),
            { statusReprodutivo: 'Desmamada' }
          ),
          lotes: ciclo?.loteId
            ? mapLote(state.lotes, ciclo.loteId, (l) => ({
                ...l,
                dataDesmame,
                status: l.status === 'Ativo' ? 'Desmamado' : l.status,
              }))
            : state.lotes,
        }));
      },

      registrarFalhaGestacao: (matrizId, cicloId) =>
        set((state) => ({
          matrizes: mapCiclo(state.matrizes, matrizId, cicloId, (c) => ({ ...c, status: 'Falhou' }), {
            statusReprodutivo: 'Vazia',
          }),
        })),

      deleteCiclo: (matrizId, cicloId) =>
        set((state) => ({
          matrizes: state.matrizes.map((m) =>
            m.id === matrizId ? { ...m, ciclos: m.ciclos.filter((c) => c.id !== cicloId) } : m
          ),
        })),

      addLote: (lote) => {
        const id = generateId();
        set((state) => ({
          lotes: [
            ...state.lotes,
            {
              ...lote,
              id,
              createdAt: new Date().toISOString(),
              leitoes: [],
              vacinasPendentes: [],
              lancamentos: [],
            },
          ],
        }));
        return id;
      },

      updateLote: (id, data) =>
        set((state) => ({ lotes: mapLote(state.lotes, id, (l) => ({ ...l, ...data })) })),

      deleteLote: (id) =>
        set((state) => ({
          lotes: state.lotes.filter((l) => l.id !== id),
          matrizes: state.matrizes.map((m) => ({
            ...m,
            ciclos: m.ciclos.map((c) => (c.loteId === id ? { ...c, loteId: undefined } : c)),
          })),
        })),

      addLeitao: (loteId, leitao) =>
        set((state) => ({
          lotes: mapLote(state.lotes, loteId, (l) => ({
            ...l,
            leitoes: [
              ...l.leitoes,
              {
                ...leitao,
                id: generateId(),
                loteId,
                pesoAtual: leitao.pesoAtual ?? leitao.pesoNascimento,
                pesagens: [],
                registrosSaude: [],
                statusSaude: leitao.statusSaude || 'Saudável',
              },
            ],
          })),
        })),

      updateLeitao: (loteId, leitaoId, data) =>
        set((state) => ({
          lotes: mapLeitao(state.lotes, loteId, leitaoId, (lt) => {
            const atualizado = { ...lt, ...data };
            return data.pesoNascimento !== undefined ? recalcularPesoAtual(atualizado) : atualizado;
          }),
        })),

      deleteLeitao: (loteId, leitaoId) =>
        set((state) => ({
          lotes: mapLote(state.lotes, loteId, (l) => ({
            ...l,
            leitoes: l.leitoes.filter((lt) => lt.id !== leitaoId),
          })),
        })),

      addPesagem: (loteId, leitaoId, peso, data = hojeISO()) =>
        set((state) => ({
          lotes: mapLeitao(state.lotes, loteId, leitaoId, (lt) =>
            recalcularPesoAtual({
              ...lt,
              pesagens: [...lt.pesagens, { id: generateId(), leitaoId, peso, data }],
            })
          ),
        })),

      deletePesagem: (loteId, leitaoId, pesagemId) =>
        set((state) => ({
          lotes: mapLeitao(state.lotes, loteId, leitaoId, (lt) =>
            recalcularPesoAtual({ ...lt, pesagens: lt.pesagens.filter((p) => p.id !== pesagemId) })
          ),
        })),

      addRegistroSaude: (loteId, leitaoId, registro) =>
        set((state) => ({
          lotes: mapLeitao(state.lotes, loteId, leitaoId, (lt) => ({
            ...lt,
            registrosSaude: [...lt.registrosSaude, { ...registro, id: generateId(), leitaoId }],
          })),
        })),

      deleteRegistroSaude: (loteId, leitaoId, registroId) =>
        set((state) => ({
          lotes: mapLeitao(state.lotes, loteId, leitaoId, (lt) => ({
            ...lt,
            registrosSaude: lt.registrosSaude.filter((r) => r.id !== registroId),
          })),
        })),

      addVacinaPendente: (loteId, vacina) =>
        set((state) => ({
          lotes: mapLote(state.lotes, loteId, (l) => ({
            ...l,
            vacinasPendentes: [...l.vacinasPendentes, { ...vacina, id: generateId(), aplicada: false }],
          })),
        })),

      marcarVacinaAplicada: (loteId, vacinaId, dataAplicacao = hojeISO()) =>
        set((state) => ({
          lotes: mapLote(state.lotes, loteId, (l) => ({
            ...l,
            vacinasPendentes: l.vacinasPendentes.map((v) =>
              v.id === vacinaId ? { ...v, aplicada: true, dataAplicacao } : v
            ),
          })),
        })),

      deleteVacina: (loteId, vacinaId) =>
        set((state) => ({
          lotes: mapLote(state.lotes, loteId, (l) => ({
            ...l,
            vacinasPendentes: l.vacinasPendentes.filter((v) => v.id !== vacinaId),
          })),
        })),

      addLancamento: (loteId, lancamento) =>
        set((state) => ({
          lotes: mapLote(state.lotes, loteId, (l) => ({
            ...l,
            lancamentos: [...l.lancamentos, { ...lancamento, id: generateId() }],
          })),
        })),

      deleteLancamento: (loteId, lancamentoId) =>
        set((state) => ({
          lotes: mapLote(state.lotes, loteId, (l) => ({
            ...l,
            lancamentos: l.lancamentos.filter((x) => x.id !== lancamentoId),
          })),
        })),

      updateConfiguracoes: (data) =>
        set((state) => ({ configuracoes: { ...state.configuracoes, ...data } })),

      importarDados: (dados) => set(normalizarDados(dados)),

      resetarDados: () => set(estadoInicial),
    }),
    {
      name: 'matrizpro-storage',
      version: 2,
      partialize: (state) => ({
        matrizes: state.matrizes,
        lotes: state.lotes,
        configuracoes: state.configuracoes,
      }),
      migrate: (persisted) => {
        try {
          return normalizarDados(persisted);
        } catch {
          return estadoInicial;
        }
      },
    }
  )
);
