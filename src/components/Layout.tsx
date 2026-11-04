import type { ReactNode } from 'react'
import { CalendarDays, CheckCircle2, FileBarChart, LayoutDashboard, List, Moon, Plus, Receipt, Settings, Sun, Monitor, AlertCircle, Wallet } from 'lucide-react'
import { useUI, type Pagina, type Tema } from '../store/UIContext'
import { useFinancas } from '../store/FinancasContext'
import { statusConta } from '../lib/calculos'
import { hojeISO } from '../lib/datas'
import { cx } from '../lib/util'
import { Modal } from './ui'

const ITENS: { id: Pagina; nome: string; curto: string; icone: typeof List }[] = [
  { id: 'inicio', nome: 'Painel', curto: 'Painel', icone: LayoutDashboard },
  { id: 'lancamentos', nome: 'Lançamentos', curto: 'Lançam.', icone: List },
  { id: 'dias', nome: 'Resultado do dia', curto: 'Dias', icone: CalendarDays },
  { id: 'contas', nome: 'Contas a pagar', curto: 'Contas', icone: Receipt },
  { id: 'relatorios', nome: 'Relatórios', curto: 'Relatórios', icone: FileBarChart },
  { id: 'config', nome: 'Configurações', curto: 'Ajustes', icone: Settings },
]

const TEMAS: { id: Tema; nome: string; icone: typeof Sun }[] = [
  { id: 'claro', nome: 'Claro', icone: Sun },
  { id: 'escuro', nome: 'Escuro', icone: Moon },
  { id: 'sistema', nome: 'Sistema', icone: Monitor },
]

export function SeletorTema() {
  const { tema, setTema } = useUI()
  return (
    <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
      {TEMAS.map(({ id, nome, icone: I }) => (
        <button
          key={id}
          onClick={() => setTema(id)}
          title={`Tema ${nome.toLowerCase()}`}
          className={cx(
            'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition',
            tema === id ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200',
          )}
        >
          <I size={14} />
          {nome}
        </button>
      ))}
    </div>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  const { pagina, irPara, abrirLancamento, setTema, escuro } = useUI()
  const { dados } = useFinancas()
  const hoje = hojeISO()
  const atrasadas = dados.contas.filter((c) => statusConta(c, hoje) === 'atrasada').length

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Barra lateral (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-5 lg:flex dark:border-slate-800 dark:bg-slate-900">
        <Marca />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {ITENS.map(({ id, nome, icone: I }) => (
            <a
              key={id}
              href={`#/${id}`}
              className={cx(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                pagina === id
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
              )}
            >
              <I size={19} />
              <span className="flex-1">{nome}</span>
              {id === 'contas' && atrasadas > 0 && (
                <span className="rounded-full bg-red-600 px-1.5 text-xs font-semibold text-white">{atrasadas}</span>
              )}
            </a>
          ))}
        </nav>
        <SeletorTema />
      </aside>

      {/* Topo (celular) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/85 px-4 py-3 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/85">
        <Marca />
        <button
          className="btn-icone"
          aria-label="Alternar tema"
          onClick={() => setTema(escuro ? 'claro' : 'escuro')}
        >
          {escuro ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-5 pb-36 sm:px-6 lg:px-8 lg:pt-8 lg:pb-28">{children}</main>

      {/* Navegação inferior (celular) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/95">
        {ITENS.map(({ id, curto, icone: I }) => (
          <button
            key={id}
            onClick={() => irPara(id)}
            className={cx(
              'relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium',
              pagina === id ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400',
            )}
          >
            <I size={20} />
            {curto}
            {id === 'contas' && atrasadas > 0 && <span className="absolute top-1.5 right-[calc(50%-16px)] h-2 w-2 rounded-full bg-red-600" />}
          </button>
        ))}
      </nav>

      {/* Botão flutuante sempre acessível */}
      <button
        onClick={() => abrirLancamento()}
        className="fixed right-4 bottom-20 z-40 flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3.5 font-semibold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-700 active:scale-95 lg:right-8 lg:bottom-8"
      >
        <Plus size={20} strokeWidth={2.5} />
        <span>Novo lançamento</span>
      </button>

      <Toasts />
      <DialogoConfirmacao />
    </div>
  )
}

function Marca() {
  return (
    <a href="#/inicio" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
        <Wallet size={20} />
      </span>
      <span className="leading-tight">
        <span className="block font-bold">Meu Caixa</span>
        <span className="block text-xs text-slate-500 dark:text-slate-400">Controle financeiro</span>
      </span>
    </a>
  )
}

function Toasts() {
  const { toasts } = useUI()
  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-[60] flex flex-col items-center gap-2 px-4 lg:top-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cx(
            'pointer-events-auto flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg',
            t.tipo === 'ok' ? 'bg-slate-900 dark:bg-slate-700' : 'bg-red-600',
          )}
        >
          {t.tipo === 'ok' ? <CheckCircle2 size={16} className="text-emerald-400" /> : <AlertCircle size={16} />}
          {t.texto}
        </div>
      ))}
    </div>
  )
}

function DialogoConfirmacao() {
  const { confirmacao, fecharConfirmacao } = useUI()
  return (
    <Modal
      aberto={!!confirmacao}
      titulo={confirmacao?.titulo ?? ''}
      onFechar={() => fecharConfirmacao(false)}
      largura="max-w-md"
      rodape={
        <>
          <button className="btn-secundario" onClick={() => fecharConfirmacao(false)}>
            Cancelar
          </button>
          <button className={confirmacao?.perigo ? 'btn-perigo' : 'btn-primario'} onClick={() => fecharConfirmacao(true)}>
            {confirmacao?.botao ?? 'Confirmar'}
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-600 dark:text-slate-300">{confirmacao?.mensagem}</p>
    </Modal>
  )
}
