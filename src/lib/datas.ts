import type { DataISO } from '../types'

export const DIAS_SEMANA = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
]
export const DIAS_SEMANA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const pad = (n: number) => String(n).padStart(2, '0')

/** Converte "AAAA-MM-DD" em Date local (meia-noite), sem problemas de fuso. */
export function paraDate(iso: DataISO): Date {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d)
}

export function paraISO(data: Date): DataISO {
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}`
}

export function hojeISO(): DataISO {
  return paraISO(new Date())
}

/** "2026-11-02" -> "02/11/2026" */
export function formatarData(iso: DataISO): string {
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

/** "02/11/2026" -> "2026-11-02" (também aceita "2026-11-02"). Retorna null se inválida. */
export function textoParaISO(texto: string): DataISO | null {
  const t = texto.trim()
  let a: number, m: number, d: number
  let r = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t)
  if (r) {
    d = +r[1]; m = +r[2]; a = +r[3]
  } else if ((r = /^(\d{4})-(\d{2})-(\d{2})/.exec(t))) {
    a = +r[1]; m = +r[2]; d = +r[3]
  } else return null
  const dt = new Date(a, m - 1, d)
  if (dt.getFullYear() !== a || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null
  return paraISO(dt)
}

export function diaDaSemana(iso: DataISO): string {
  return DIAS_SEMANA[paraDate(iso).getDay()]
}

/** "Segunda-feira, 02/11/2026" */
export function formatarDataCompleta(iso: DataISO): string {
  return `${diaDaSemana(iso)}, ${formatarData(iso)}`
}

export function somarDias(iso: DataISO, dias: number): DataISO {
  const d = paraDate(iso)
  d.setDate(d.getDate() + dias)
  return paraISO(d)
}

/** Soma meses mantendo o dia (ajusta para o último dia do mês quando necessário: 31/01 + 1 mês = 28/02). */
export function somarMeses(iso: DataISO, meses: number): DataISO {
  const [a, m, d] = iso.split('-').map(Number)
  const alvo = new Date(a, m - 1 + meses, 1)
  const ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate()
  alvo.setDate(Math.min(d, ultimoDia))
  return paraISO(alvo)
}

/** Diferença em dias inteiros (b − a). */
export function diferencaDias(a: DataISO, b: DataISO): number {
  return Math.round((paraDate(b).getTime() - paraDate(a).getTime()) / 86_400_000)
}

/** Semana de segunda a domingo que contém a data. */
export function inicioDaSemana(iso: DataISO): DataISO {
  const dia = paraDate(iso).getDay() // 0 = domingo
  return somarDias(iso, dia === 0 ? -6 : 1 - dia)
}
export function fimDaSemana(iso: DataISO): DataISO {
  return somarDias(inicioDaSemana(iso), 6)
}

export function inicioDoMes(iso: DataISO): DataISO {
  return iso.slice(0, 8) + '01'
}
export function fimDoMes(iso: DataISO): DataISO {
  const [a, m] = iso.split('-').map(Number)
  return paraISO(new Date(a, m, 0))
}

/** "2026-11" -> "Novembro/2026" */
export function nomeMes(anoMes: string): string {
  const [a, m] = anoMes.split('-').map(Number)
  return `${MESES[m - 1]}/${a}`
}

/** Lista todas as datas entre inicio e fim (inclusive). */
export function intervaloDias(inicio: DataISO, fim: DataISO): DataISO[] {
  const out: DataISO[] = []
  for (let d = inicio; d <= fim; d = somarDias(d, 1)) out.push(d)
  return out
}
