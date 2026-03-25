import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Matriz, Lote, Alerta, Leitao, RegistroSaude, VacinaPendente, StatusSaude } from '@/types';

interface AppState {
  matrizes: Matriz[];
  lotes: Lote[];
  addMatriz: (matriz: Omit<Matriz, 'id' | 'createdAt'>) => void;
  updateMatriz: (id: string, data: Partial<Matriz>) => void;
  deleteMatriz: (id: string) => void;
  addLote: (lote: Omit<Lote, 'id' | 'createdAt' | 'leitoes'>) => void;
  updateLote: (id: string, data: Partial<Lote>) => void;
  deleteLote: (id: string) => void;
  addLeitao: (loteId: string, leitao: Omit<Leitao, 'id' | 'pesagens' | 'registrosSaude'>) => void;
  updateLeitao: (loteId: string, leitaoId: string, data: Partial<Leitao>) => void;
  deleteLeitao: (loteId: string, leitaoId: string) => void;
  addPesagem: (loteId: string, leitaoId: string, peso: number) => void;
  addRegistroSaude: (loteId: string, leitaoId: string, registro: Omit<RegistroSaude, 'id' | 'leitaoId'>) => void;
  addVacinaPendente: (loteId: string, vacina: Omit<VacinaPendente, 'id'>) => void;
  marcarVacinaAplicada: (loteId: string, vacinaId: string) => void;
}

const generateId = () => crypto.randomUUID();

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      matrizes: [],
      lotes: [],

      addMatriz: (matriz) =>
        set((state) => ({
          matrizes: [
            ...state.matrizes,
            { ...matriz, id: generateId(), createdAt: new Date().toISOString() },
          ],
        })),

      updateMatriz: (id, data) =>
        set((state) => ({
          matrizes: state.matrizes.map((m) => (m.id === id ? { ...m, ...data } : m)),
        })),

      deleteMatriz: (id) =>
        set((state) => ({
          matrizes: state.matrizes.filter((m) => m.id !== id),
        })),

      addLote: (lote) =>
        set((state) => ({
          lotes: [
            ...state.lotes,
            { ...lote, id: generateId(), createdAt: new Date().toISOString(), leitoes: [], vacinasPendentes: [] },
          ],
        })),

      updateLote: (id, data) =>
        set((state) => ({
          lotes: state.lotes.map((l) => (l.id === id ? { ...l, ...data } : l)),
        })),

      deleteLote: (id) =>
        set((state) => ({
          lotes: state.lotes.filter((l) => l.id !== id),
        })),

      addLeitao: (loteId, leitao) =>
        set((state) => ({
          lotes: state.lotes.map((l) =>
            l.id === loteId
              ? {
                  ...l,
                  leitoes: [
                    ...l.leitoes,
                    { ...leitao, id: generateId(), pesagens: [], registrosSaude: [], statusSaude: leitao.statusSaude || 'Saudável' as StatusSaude },
                  ],
                }
              : l
          ),
        })),

      updateLeitao: (loteId, leitaoId, data) =>
        set((state) => ({
          lotes: state.lotes.map((l) =>
            l.id === loteId
              ? {
                  ...l,
                  leitoes: l.leitoes.map((lt) =>
                    lt.id === leitaoId ? { ...lt, ...data } : lt
                  ),
                }
              : l
          ),
        })),

      deleteLeitao: (loteId, leitaoId) =>
        set((state) => ({
          lotes: state.lotes.map((l) =>
            l.id === loteId
              ? { ...l, leitoes: l.leitoes.filter((lt) => lt.id !== leitaoId) }
              : l
          ),
        })),

      addPesagem: (loteId, leitaoId, peso) =>
        set((state) => ({
          lotes: state.lotes.map((l) =>
            l.id === loteId
              ? {
                  ...l,
                  leitoes: l.leitoes.map((lt) =>
                    lt.id === leitaoId
                      ? {
                          ...lt,
                          pesoAtual: peso,
                          pesagens: [
                            ...lt.pesagens,
                            { id: generateId(), leitaoId, peso, data: new Date().toISOString() },
                          ],
                        }
                      : lt
                  ),
                }
              : l
          ),
        })),

      addRegistroSaude: (loteId, leitaoId, registro) =>
        set((state) => ({
          lotes: state.lotes.map((l) =>
            l.id === loteId
              ? {
                  ...l,
                  leitoes: l.leitoes.map((lt) =>
                    lt.id === leitaoId
                      ? {
                          ...lt,
                          registrosSaude: [
                            ...(lt.registrosSaude || []),
                            { ...registro, id: generateId(), leitaoId },
                          ],
                        }
                      : lt
                  ),
                }
              : l
          ),
        })),

      addVacinaPendente: (loteId, vacina) =>
        set((state) => ({
          lotes: state.lotes.map((l) =>
            l.id === loteId
              ? {
                  ...l,
                  vacinasPendentes: [
                    ...(l.vacinasPendentes || []),
                    { ...vacina, id: generateId() },
                  ],
                }
              : l
          ),
        })),

      marcarVacinaAplicada: (loteId, vacinaId) =>
        set((state) => ({
          lotes: state.lotes.map((l) =>
            l.id === loteId
              ? {
                  ...l,
                  vacinasPendentes: (l.vacinasPendentes || []).map((v) =>
                    v.id === vacinaId ? { ...v, aplicada: true } : v
                  ),
                }
              : l
          ),
        })),
    }),
    { name: 'matrizpro-storage' }
  )
);
