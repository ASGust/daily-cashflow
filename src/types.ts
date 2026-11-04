/**
 * Tipos de domínio do controle financeiro.
 * Todos os valores monetários são inteiros em CENTAVOS (ex.: R$ 5,00 = 500).
 * Todas as datas são strings ISO "AAAA-MM-DD" (sem fuso horário).
 */

export type TipoLancamento = 'entrada' | 'saida'

export const FORMAS_PAGAMENTO = [
  'Dinheiro',
  'Pix',
  'Débito',
  'Crédito',
  'Transferência',
  'Boleto',
] as const
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number]

/** Data no formato ISO "AAAA-MM-DD". */
export type DataISO = string

/** Valor em centavos (inteiro). */
export type Centavos = number

export interface Categoria {
  id: string
  nome: string
  /** Para qual tipo de lançamento a categoria é sugerida. */
  tipo: TipoLancamento | 'ambos'
  /** Cor em hexadecimal usada nos gráficos. */
  cor: string
}

export interface Lancamento {
  id: string
  tipo: TipoLancamento
  valor: Centavos
  data: DataISO
  descricao: string
  categoriaId: string
  /** Origem (entrada) ou destino (saída) do dinheiro. Ex.: "Cliente João", "Padaria". */
  origemDestino: string
  formaPagamento: FormaPagamento
  observacao?: string
  /** Preenchido quando o lançamento foi gerado ao pagar uma conta. */
  contaId?: string
  criadoEm: string
  atualizadoEm: string
}

/** Status persistido. "atrasada" é derivado (pendente + vencida) — veja statusConta(). */
export type StatusContaArmazenado = 'pendente' | 'paga'
export type StatusConta = 'pendente' | 'paga' | 'atrasada'

export interface Conta {
  id: string
  nome: string
  valor: Centavos
  vencimento: DataISO
  status: StatusContaArmazenado
  recorrente: boolean
  categoriaId: string
  /** Para quem se paga (ex.: "Companhia de Energia"). */
  destino: string
  observacao?: string
  pagaEm?: DataISO
  /** Lançamento de saída gerado ao marcar como paga. */
  lancamentoId?: string
  criadoEm: string
}

export interface DadosFinanceiros {
  versao: 1
  lancamentos: Lancamento[]
  contas: Conta[]
  categorias: Categoria[]
}
