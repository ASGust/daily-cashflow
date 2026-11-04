import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { Centavos } from '../types'
import { formatarComSinal, formatarReal } from '../lib/dinheiro'
import { nomeMes } from '../lib/datas'
import { cx } from '../lib/util'

/** Saldo colorido: verde com "+" quando positivo, vermelho com "−" quando negativo. */
export function Saldo({ valor, className }: { valor: Centavos; className?: string }) {
  return (
    <span
      className={cx(
        'tabular-nums',
        valor > 0 && 'text-emerald-600 dark:text-emerald-400',
        valor < 0 && 'text-red-600 dark:text-red-400',
        valor === 0 && 'text-slate-500 dark:text-slate-400',
        className,
      )}
    >
      {formatarComSinal(valor)}
    </span>
  )
}

/** Valor de entrada (verde, +) ou saída (vermelho, −). */
export function ValorTipo({ valor, tipo, className }: { valor: Centavos; tipo: 'entrada' | 'saida'; className?: string }) {
  return (
    <span
      className={cx(
        'tabular-nums font-semibold',
        tipo === 'entrada' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
        className,
      )}
    >
      {tipo === 'entrada' ? '+' : '−'}
      {formatarReal(valor)}
    </span>
  )
}

export function Modal({
  aberto,
  titulo,
  onFechar,
  children,
  rodape,
  largura = 'max-w-lg',
}: {
  aberto: boolean
  titulo: string
  onFechar: () => void
  children: ReactNode
  rodape?: ReactNode
  largura?: string
}) {
  useEffect(() => {
    if (!aberto) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    document.addEventListener('keydown', esc)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = overflow
    }
  }, [aberto, onFechar])

  if (!aberto) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" onClick={onFechar} />
      <div
        className={cx(
          'relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl dark:bg-slate-900',
          largura,
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <button className="btn-icone" onClick={onFechar} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {rodape && (
          <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-slate-800">
            {rodape}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Campo monetário no estilo "caixa eletrônico": cada dígito digitado entra pela direita
 * (digitar 5 0 0 → R$ 5,00). Trabalha sempre com centavos inteiros.
 */
export function CampoDinheiro({
  valor,
  onChange,
  id,
  autoFocus,
  className,
}: {
  valor: Centavos
  onChange: (c: Centavos) => void
  id?: string
  autoFocus?: boolean
  className?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <input
      ref={ref}
      id={id}
      autoFocus={autoFocus}
      inputMode="numeric"
      className={cx('input text-right text-lg font-semibold tabular-nums', className)}
      value={formatarReal(valor)}
      onChange={(e) => {
        const digitos = e.target.value.replace(/\D/g, '').slice(0, 12)
        onChange(Number(digitos || '0'))
      }}
      // Mantém o cursor sempre no fim: assim cada dígito entra pela direita e o
      // Backspace apaga o último dígito, não importa onde o usuário clicou.
      onSelect={(e) => {
        const el = e.currentTarget
        const fim = el.value.length
        if (el.selectionStart !== fim || el.selectionEnd !== fim) el.setSelectionRange(fim, fim)
      }}
    />
  )
}

/** Navegador de mês: ‹ Novembro/2026 › */
export function SeletorMes({ mes, onChange }: { mes: string; onChange: (m: string) => void }) {
  const mover = (delta: number) => {
    const [a, m] = mes.split('-').map(Number)
    const d = new Date(a, m - 1 + delta, 1)
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
      <button className="btn-icone h-8 w-8" onClick={() => mover(-1)} aria-label="Mês anterior">
        <ChevronLeft size={18} />
      </button>
      <span className="min-w-36 text-center text-sm font-semibold">{nomeMes(mes)}</span>
      <button className="btn-icone h-8 w-8" onClick={() => mover(1)} aria-label="Próximo mês">
        <ChevronRight size={18} />
      </button>
    </div>
  )
}

export function Vazio({ icone, titulo, texto, acao }: { icone: ReactNode; titulo: string; texto?: string; acao?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      <div className="mb-1 rounded-2xl bg-slate-100 p-3 text-slate-400 dark:bg-slate-800">{icone}</div>
      <p className="font-medium">{titulo}</p>
      {texto && <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{texto}</p>}
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  )
}

export function Badge({ cor, children }: { cor: 'verde' | 'vermelho' | 'amarelo' | 'cinza' | 'azul'; children: ReactNode }) {
  const cores = {
    verde: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    vermelho: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
    amarelo: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    cinza: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    azul: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  }
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', cores[cor])}>{children}</span>
}

export function PontoCor({ cor }: { cor: string }) {
  return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cor }} />
}

export function Cabecalho({ titulo, subtitulo, acoes }: { titulo: string; subtitulo?: string; acoes?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{titulo}</h1>
        {subtitulo && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitulo}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </div>
  )
}

/** Hook simples para estado com atraso (ex.: busca). */
export function useDebounce<T>(valor: T, ms = 200): T {
  const [v, setV] = useState(valor)
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms)
    return () => clearTimeout(t)
  }, [valor, ms])
  return v
}
