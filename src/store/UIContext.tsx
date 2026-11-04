import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Lancamento, TipoLancamento } from '../types'

export type Tema = 'claro' | 'escuro' | 'sistema'
export type Pagina = 'inicio' | 'lancamentos' | 'dias' | 'contas' | 'relatorios' | 'config'

export const PAGINAS: Pagina[] = ['inicio', 'lancamentos', 'dias', 'contas', 'relatorios', 'config']

interface Toast {
  id: number
  texto: string
  tipo: 'ok' | 'erro'
}

interface Confirmacao {
  titulo: string
  mensagem: string
  botao?: string
  perigo?: boolean
  resolver: (ok: boolean) => void
}

/** Estado do formulário de lançamento: null = fechado. */
export type EstadoFormLancamento = { editar?: Lancamento; tipo?: TipoLancamento; data?: string } | null

interface UIAPI {
  pagina: Pagina
  irPara: (p: Pagina) => void
  tema: Tema
  setTema: (t: Tema) => void
  /** true quando o modo escuro está efetivamente ativo (tema escolhido ou do sistema). */
  escuro: boolean
  formLancamento: EstadoFormLancamento
  abrirLancamento: (estado?: NonNullable<EstadoFormLancamento>) => void
  fecharLancamento: () => void
  toasts: Toast[]
  avisar: (texto: string, tipo?: Toast['tipo']) => void
  confirmacao: Confirmacao | null
  confirmar: (c: Omit<Confirmacao, 'resolver'>) => Promise<boolean>
  fecharConfirmacao: (ok: boolean) => void
}

const Ctx = createContext<UIAPI | null>(null)
const CHAVE_TEMA = 'financas:tema'

function paginaDoHash(): Pagina {
  const h = window.location.hash.replace('#/', '').replace('#', '') as Pagina
  return PAGINAS.includes(h) ? h : 'inicio'
}

function lerTema(): Tema {
  try {
    const t = localStorage.getItem(CHAVE_TEMA) as Tema | null
    return t === 'claro' || t === 'escuro' ? t : 'sistema'
  } catch {
    return 'sistema'
  }
}

export function UIProvider({ children }: { children: ReactNode }) {
  const [pagina, setPagina] = useState<Pagina>(paginaDoHash)
  const [tema, setTemaState] = useState<Tema>(lerTema)
  const [formLancamento, setForm] = useState<EstadoFormLancamento>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null)
  const [sistemaEscuro, setSistemaEscuro] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches)
  const escuro = tema === 'escuro' || (tema === 'sistema' && sistemaEscuro)

  useEffect(() => {
    const ouvir = () => setPagina(paginaDoHash())
    window.addEventListener('hashchange', ouvir)
    return () => window.removeEventListener('hashchange', ouvir)
  }, [])

  const irPara = useCallback((p: Pagina) => {
    window.location.hash = `/${p}`
    window.scrollTo({ top: 0 })
  }, [])

  // Aplica o tema (classe "dark" no <html>) e acompanha o tema do sistema.
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const ouvir = () => setSistemaEscuro(mq.matches)
    mq.addEventListener('change', ouvir)
    return () => mq.removeEventListener('change', ouvir)
  }, [])
  useEffect(() => {
    document.documentElement.classList.toggle('dark', escuro)
  }, [escuro])

  const setTema = useCallback((t: Tema) => {
    setTemaState(t)
    try {
      localStorage.setItem(CHAVE_TEMA, t)
    } catch {
      /* armazenamento indisponível: o tema vale só nesta sessão */
    }
  }, [])

  const avisar = useCallback((texto: string, tipo: Toast['tipo'] = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, texto, tipo }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }, [])

  const confirmar = useCallback(
    (c: Omit<Confirmacao, 'resolver'>) => new Promise<boolean>((resolver) => setConfirmacao({ ...c, resolver })),
    [],
  )
  const fecharConfirmacao = useCallback(
    (ok: boolean) => {
      confirmacao?.resolver(ok)
      setConfirmacao(null)
    },
    [confirmacao],
  )

  return (
    <Ctx.Provider
      value={{
        pagina,
        irPara,
        tema,
        setTema,
        escuro,
        formLancamento,
        abrirLancamento: (e = {}) => setForm(e),
        fecharLancamento: () => setForm(null),
        toasts,
        avisar,
        confirmacao,
        confirmar,
        fecharConfirmacao,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useUI(): UIAPI {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useUI deve ser usado dentro de <UIProvider>')
  return ctx
}
