export interface Matriz {
  id: string;
  identificador: string;
  dataNascimento: string;
  dataEntrada: string;
  precoAquisicao: number;
  statusReprodutivo: StatusReprodutivo;
  status: StatusMatriz;
  createdAt: string;
}

export type StatusReprodutivo = 'Vazia' | 'Gestante' | 'Lactante' | 'Desmamada';
export type StatusMatriz = 'Ativa' | 'Inativa' | 'Descartada';

export interface Lote {
  id: string;
  nome: string;
  matrizId: string;
  dataParto: string;
  nascidosVivos: number;
  nascidosMortos: number;
  status: StatusLote;
  leitoes: Leitao[];
  createdAt: string;
  proximaVacinacao?: string;
  vacinasPendentes?: VacinaPendente[];
}

export type StatusLote = 'Ativo' | 'Desmamado' | 'Vendido' | 'Finalizado';

export interface VacinaPendente {
  id: string;
  nome: string;
  dataAgendada: string;
  aplicada: boolean;
}

export interface Leitao {
  id: string;
  loteId: string;
  identificador: string;
  pesoNascimento: number;
  pesoAtual: number;
  sexo: 'Macho' | 'Fêmea';
  status: 'Ativo' | 'Morto' | 'Vendido';
  statusSaude: StatusSaude;
  dataNascimento: string;
  pesagens: Pesagem[];
  registrosSaude: RegistroSaude[];
}

export type StatusSaude = 'Saudável' | 'Em observação' | 'Em tratamento' | 'Crítico';

export interface Pesagem {
  id: string;
  leitaoId: string;
  peso: number;
  data: string;
}

export interface RegistroSaude {
  id: string;
  leitaoId: string;
  tipo: 'vacinacao' | 'medicacao' | 'observacao' | 'tratamento';
  descricao: string;
  data: string;
  medicamento?: string;
  dose?: string;
  veterinario?: string;
}

export interface Alerta {
  id: string;
  tipo: 'baixo_peso' | 'vacinacao' | 'pesagem' | 'reforco' | 'saude' | 'mortalidade';
  titulo: string;
  descricao: string;
  severidade: 'info' | 'warning' | 'critical';
  data: string;
  loteId?: string;
  leitaoId?: string;
  matrizId?: string;
  link?: string;
}
