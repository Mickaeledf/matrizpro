import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Matriz, Lote, Alerta } from '@/types';

interface AppState {
  matrizes: Matriz[];
  lotes: Lote[];
  alertas: Alerta[];
  addMatriz: (matriz: Omit<Matriz, 'id' | 'createdAt'>) => void;
  updateMatriz: (id: string, data: Partial<Matriz>) => void;
  deleteMatriz: (id: string) => void;
  addLote: (lote: Omit<Lote, 'id' | 'createdAt' | 'leitoes'>) => void;
  updateLote: (id: string, data: Partial<Lote>) => void;
  deleteLote: (id: string) => void;
  addAlerta: (alerta: Omit<Alerta, 'id'>) => void;
  dismissAlerta: (id: string) => void;
}

const generateId = () => crypto.randomUUID();

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      matrizes: [],
      lotes: [],
      alertas: [
        {
          id: '1',
          tipo: 'baixo_peso',
          titulo: 'Alerta de Baixo Ganho de Peso',
          descricao: 'Leitão MP-01-01 está 15% abaixo do ganho de peso médio para sua idade.',
          severidade: 'critical',
          data: new Date().toISOString(),
        },
        {
          id: '2',
          tipo: 'vacinacao',
          titulo: 'Próxima Vacinação',
          descricao: "O lote 'M-042' deve ser vacinado contra PCV2 em 3 dias.",
          severidade: 'warning',
          data: new Date().toISOString(),
        },
        {
          id: '3',
          tipo: 'pesagem',
          titulo: 'Agenda de Pesagem',
          descricao: 'A pesagem semanal para lotes ativos está agendada para amanhã.',
          severidade: 'info',
          data: new Date().toISOString(),
        },
        {
          id: '4',
          tipo: 'baixo_peso',
          titulo: 'Alerta de Baixo Ganho de Peso',
          descricao: 'Leitão MP-01-02 está 10% abaixo do ganho de peso médio para sua idade.',
          severidade: 'critical',
          data: new Date().toISOString(),
        },
        {
          id: '5',
          tipo: 'reforco',
          titulo: 'Reforço de Vacina',
          descricao: "O lote 'M-042' necessita de reforço para E. coli em 5 dias.",
          severidade: 'warning',
          data: new Date().toISOString(),
        },
      ],

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
            { ...lote, id: generateId(), createdAt: new Date().toISOString(), leitoes: [] },
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

      addAlerta: (alerta) =>
        set((state) => ({
          alertas: [...state.alertas, { ...alerta, id: generateId() }],
        })),

      dismissAlerta: (id) =>
        set((state) => ({
          alertas: state.alertas.filter((a) => a.id !== id),
        })),
    }),
    { name: 'matrizpro-storage' }
  )
);
