export interface Matriz {
  id: string;
  identificador: string;
  dataNascimento: string;
  dataEntrada: string;
  precoAquisicao: number;
  statusReprodutivo: StatusReprodutivo;
  status: StatusMatriz;
  raca?: string;
  ciclos: CicloReprodutivo[];
  observacoes?: string;
  createdAt: string;
  /** 'exemplo' = registro criado pela base de demonstração */
  origem?: 'exemplo';
}

export type StatusReprodutivo = 'Vazia' | 'Gestante' | 'Lactante' | 'Desmamada';
export type StatusMatriz = 'Ativa' | 'Inativa' | 'Descartada';

export type TipoCobertura = 'Monta natural' | 'Inseminação artificial';
export type StatusCiclo = 'Em gestação' | 'Parida' | 'Desmamada' | 'Falhou';

export interface CicloReprodutivo {
  id: string;
  dataCobertura: string;
  tipoCobertura: TipoCobertura;
  /** Identificador do reprodutor (cachaço) ou descrição do sêmen */
  reprodutor?: string;
  reprodutorId?: string;
  dataPrevistaParto: string;
  dataParto?: string;
  dataDesmame?: string;
  loteId?: string;
  status: StatusCiclo;
  observacoes?: string;
}

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
  dataDesmame?: string;
  vacinasPendentes: VacinaPendente[];
  lancamentos: Lancamento[];
  origem?: 'exemplo';
}

export type StatusReprodutor = 'Ativo' | 'Inativo' | 'Descartado';

/** Macho reprodutor (cachaço) */
export interface Reprodutor {
  id: string;
  identificador: string;
  raca: string;
  dataNascimento: string;
  dataEntrada: string;
  status: StatusReprodutor;
  observacoes?: string;
  createdAt: string;
  origem?: 'exemplo';
}

export type StatusLote = 'Ativo' | 'Desmamado' | 'Vendido' | 'Finalizado';

export interface VacinaPendente {
  id: string;
  nome: string;
  dataAgendada: string;
  aplicada: boolean;
  dataAplicacao?: string;
}

export type StatusLeitao = 'Ativo' | 'Morto' | 'Vendido';

export interface Leitao {
  id: string;
  loteId: string;
  identificador: string;
  pesoNascimento: number;
  pesoAtual: number;
  sexo: 'Macho' | 'Fêmea';
  status: StatusLeitao;
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

export type TipoRegistroSaude = 'vacinacao' | 'medicacao' | 'observacao' | 'tratamento';

export interface RegistroSaude {
  id: string;
  leitaoId: string;
  tipo: TipoRegistroSaude;
  descricao: string;
  data: string;
  medicamento?: string;
  dose?: string;
  veterinario?: string;
  custo?: number;
}

export type TipoLancamento = 'custo' | 'receita';
export type CategoriaLancamento =
  | 'Ração'
  | 'Medicamentos'
  | 'Vacinas'
  | 'Mão de obra'
  | 'Instalações'
  | 'Venda de leitões'
  | 'Outros';

export interface Lancamento {
  id: string;
  tipo: TipoLancamento;
  categoria: CategoriaLancamento;
  descricao: string;
  valor: number;
  data: string;
}

export interface Configuracoes {
  nomeFazenda: string;
  responsavel: string;
  cidade: string;
  diasGestacao: number;
  diasDesmame: number;
  intervaloPesagemDias: number;
  antecedenciaVacinaDias: number;
  limiteBaixoPesoPercent: number;
  limiteMortalidadePercent: number;
}

export interface Alerta {
  id: string;
  tipo: 'baixo_peso' | 'vacinacao' | 'pesagem' | 'reforco' | 'saude' | 'mortalidade' | 'parto' | 'desmame';
  titulo: string;
  descricao: string;
  severidade: 'info' | 'warning' | 'critical';
  data: string;
  loteId?: string;
  leitaoId?: string;
  matrizId?: string;
  link?: string;
}
