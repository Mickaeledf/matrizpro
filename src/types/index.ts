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
}

export type StatusLote = 'Ativo' | 'Desmamado' | 'Vendido' | 'Finalizado';

export interface Leitao {
  id: string;
  loteId: string;
  identificador: string;
  pesoNascimento: number;
  pesoAtual: number;
  sexo: 'Macho' | 'Fêmea';
  status: 'Ativo' | 'Morto' | 'Vendido';
  dataNascimento: string;
  pesagens: Pesagem[];
}

export interface Pesagem {
  id: string;
  leitaoId: string;
  peso: number;
  data: string;
}

export interface Alerta {
  id: string;
  tipo: 'baixo_peso' | 'vacinacao' | 'pesagem' | 'reforco';
  titulo: string;
  descricao: string;
  severidade: 'info' | 'warning' | 'critical';
  data: string;
}
