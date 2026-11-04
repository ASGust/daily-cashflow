import type { Centavos, Conta, DataISO, Lancamento, StatusConta } from '../types'
import { diferencaDias, intervaloDias } from './datas'

export interface Totais {
  entradas: Centavos
  saidas: Centavos
  saldo: Centavos
  quantidade: number
}

export function totais(lancamentos: Pick<Lancamento, 'tipo' | 'valor'>[]): Totais {
  let entradas = 0
  let saidas = 0
  for (const l of lancamentos) {
    if (l.tipo === 'entrada') entradas += l.valor
    else saidas += l.valor
  }
  return { entradas, saidas, saldo: entradas - saidas, quantidade: lancamentos.length }
}

export function noPeriodo(lancamentos: Lancamento[], inicio: DataISO, fim: DataISO): Lancamento[] {
  return lancamentos.filter((l) => l.data >= inicio && l.data <= fim)
}

/** Ordena por data (mais recente primeiro) e depois por criação. */
export function ordenarRecentes(lancamentos: Lancamento[]): Lancamento[] {
  return [...lancamentos].sort((a, b) => b.data.localeCompare(a.data) || b.criadoEm.localeCompare(a.criadoEm))
}

export interface ResumoDia extends Totais {
  data: DataISO
  /** "Dia N" do controle: 1 = data do primeiro lançamento registrado. */
  numero: number
  lancamentos: Lancamento[]
}

/** Agrupa os lançamentos por dia dentro do período. */
export function resumoPorDia(
  todos: Lancamento[],
  inicio: DataISO,
  fim: DataISO,
  incluirDiasVazios = false,
): ResumoDia[] {
  const primeiraData = todos.reduce<DataISO | null>((min, l) => (!min || l.data < min ? l.data : min), null)
  const porData = new Map<DataISO, Lancamento[]>()
  for (const l of noPeriodo(todos, inicio, fim)) {
    const lista = porData.get(l.data) ?? []
    lista.push(l)
    porData.set(l.data, lista)
  }
  const datas = incluirDiasVazios ? intervaloDias(inicio, fim) : [...porData.keys()].sort()
  return datas.map((data) => {
    const lancs = (porData.get(data) ?? []).sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))
    return {
      data,
      numero: primeiraData ? diferencaDias(primeiraData, data) + 1 : 1,
      lancamentos: lancs,
      ...totais(lancs),
    }
  })
}

export interface FatiaCategoria {
  id: string
  nome: string
  cor: string
  valor: Centavos
}

export function agruparPor<T extends string>(
  lancamentos: Lancamento[],
  chave: (l: Lancamento) => T,
): Map<T, Centavos> {
  const m = new Map<T, Centavos>()
  for (const l of lancamentos) m.set(chave(l), (m.get(chave(l)) ?? 0) + l.valor)
  return m
}

/** Status efetivo de uma conta: pendente vencida vira "atrasada". */
export function statusConta(conta: Conta, hoje: DataISO): StatusConta {
  if (conta.status === 'paga') return 'paga'
  return conta.vencimento < hoje ? 'atrasada' : 'pendente'
}

/** Dias até o vencimento (negativo = já venceu). */
export function diasParaVencer(conta: Conta, hoje: DataISO): number {
  return diferencaDias(hoje, conta.vencimento)
}

export function venceEmBreve(conta: Conta, hoje: DataISO, dias = 7): boolean {
  const d = diasParaVencer(conta, hoje)
  return conta.status === 'pendente' && d >= 0 && d <= dias
}
