import type { Centavos } from '../types'

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtNum = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** 500 -> "R$ 5,00" (sempre sem sinal; use formatarComSinal para saldos). */
export function formatarReal(centavos: Centavos): string {
  // Intl usa espaço não separável; trocamos por espaço comum para copiar/colar sem surpresas.
  return fmt.format(Math.abs(centavos) / 100).replace(/ /g, ' ')
}

/** 500 -> "+R$ 5,00"; -500 -> "−R$ 5,00"; 0 -> "R$ 0,00". */
export function formatarComSinal(centavos: Centavos): string {
  if (centavos > 0) return '+' + formatarReal(centavos)
  if (centavos < 0) return '−' + formatarReal(centavos)
  return formatarReal(0)
}

/** 123456 -> "1234,56" (formato numérico usado no CSV). */
export function centavosParaTexto(centavos: Centavos): string {
  const sinal = centavos < 0 ? '-' : ''
  const abs = Math.abs(centavos)
  return `${sinal}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`
}

/** 123456 -> "1.234,56" */
export function formatarNumero(centavos: Centavos): string {
  return fmtNum.format(centavos / 100)
}

/**
 * Converte texto digitado pelo usuário em centavos, sem passar por float.
 * Aceita "5", "5,5", "5,50", "1.234,56", "R$ 1.234,56", "1234.56", "-10,00".
 * Retorna null se não for um valor válido.
 */
export function textoParaCentavos(texto: string): Centavos | null {
  let s = texto.trim().replace(/R\$\s?/i, '').replace(/\s/g, '').replace('−', '-')
  if (!s) return null
  const negativo = s.startsWith('-')
  if (negativo) s = s.slice(1)

  let inteiro: string
  let fracao = ''
  const ultimaVirgula = s.lastIndexOf(',')
  const ultimoPonto = s.lastIndexOf('.')
  if (ultimaVirgula > -1) {
    // Formato brasileiro: vírgula é decimal, pontos são milhar.
    inteiro = s.slice(0, ultimaVirgula).replace(/\./g, '')
    fracao = s.slice(ultimaVirgula + 1)
  } else if (ultimoPonto > -1 && s.length - ultimoPonto - 1 <= 2 && s.split('.').length === 2) {
    // "1234.56" — ponto decimal (formato inglês, comum em exportações).
    inteiro = s.slice(0, ultimoPonto)
    fracao = s.slice(ultimoPonto + 1)
  } else {
    inteiro = s.replace(/\./g, '')
  }
  if (!/^\d*$/.test(inteiro) || !/^\d{0,2}$/.test(fracao) || (inteiro === '' && fracao === '')) return null
  const valor = Number(inteiro || '0') * 100 + Number(fracao.padEnd(2, '0') || '0')
  return negativo ? -valor : valor
}

/** Soma segura de centavos. */
export function somar(valores: Centavos[]): Centavos {
  return valores.reduce((a, b) => a + b, 0)
}
