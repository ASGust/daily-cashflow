import { Loader2 } from 'lucide-react'
import { FinancasProvider, useFinancas } from './store/FinancasContext'
import { UIProvider, useUI } from './store/UIContext'
import { Layout } from './components/Layout'
import { FormLancamento } from './components/FormLancamento'
import { Painel } from './pages/Painel'
import { Lancamentos } from './pages/Lancamentos'
import { Dias } from './pages/Dias'
import { Contas } from './pages/Contas'
import { Relatorios } from './pages/Relatorios'
import { Configuracoes } from './pages/Configuracoes'

function Conteudo() {
  const { carregado } = useFinancas()
  const { pagina } = useUI()
  if (!carregado) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-slate-400">
        <Loader2 className="animate-spin" />
      </div>
    )
  }
  return (
    <Layout>
      {pagina === 'inicio' && <Painel />}
      {pagina === 'lancamentos' && <Lancamentos />}
      {pagina === 'dias' && <Dias />}
      {pagina === 'contas' && <Contas />}
      {pagina === 'relatorios' && <Relatorios />}
      {pagina === 'config' && <Configuracoes />}
      <FormLancamento />
    </Layout>
  )
}

export default function App() {
  return (
    <UIProvider>
      <FinancasProvider>
        <Conteudo />
      </FinancasProvider>
    </UIProvider>
  )
}
