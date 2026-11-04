import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Categoria, Conta, DadosFinanceiros, FormaPagamento, Lancamento } from '../types'
import { repositorio } from '../lib/repositorio'
import { CATEGORIAS_PADRAO, dadosExemplo, dadosIniciais, ehExemplo } from '../lib/exemplo'
import { agoraISO, novoId } from '../lib/util'
import { somarMeses } from '../lib/datas'
import type { ResultadoImportacao } from '../lib/csv'

export type NovoLancamento = Omit<Lancamento, 'id' | 'criadoEm' | 'atualizadoEm'>
export type NovaConta = Omit<Conta, 'id' | 'criadoEm' | 'status' | 'pagaEm' | 'lancamentoId'>

interface FinancasAPI {
  dados: DadosFinanceiros
  carregado: boolean
  categoriaPorId: (id: string) => Categoria
  adicionarLancamento: (l: NovoLancamento) => Lancamento
  atualizarLancamento: (id: string, l: Partial<NovoLancamento>) => void
  excluirLancamento: (id: string) => void
  adicionarConta: (c: NovaConta) => void
  atualizarConta: (id: string, c: Partial<NovaConta>) => void
  excluirConta: (id: string) => void
  pagarConta: (id: string, opcoes: { data: string; formaPagamento: FormaPagamento }) => void
  desfazerPagamento: (id: string) => void
  adicionarCategoria: (c: Omit<Categoria, 'id'>) => Categoria
  atualizarCategoria: (id: string, c: Partial<Omit<Categoria, 'id'>>) => void
  excluirCategoria: (id: string) => void
  importarLancamentos: (r: ResultadoImportacao) => number
  restaurarBackup: (d: DadosFinanceiros) => void
  carregarExemplo: () => void
  apagarExemplo: () => void
  apagarTudo: () => void
}

const Ctx = createContext<FinancasAPI | null>(null)

const VAZIO: DadosFinanceiros = { versao: 1, lancamentos: [], contas: [], categorias: CATEGORIAS_PADRAO }
const CATEGORIA_DESCONHECIDA: Categoria = { id: '', nome: 'Sem categoria', tipo: 'ambos', cor: '#94a3b8' }

const CORES_NOVAS = ['#06b6d4', '#d946ef', '#eab308', '#14b8a6', '#f43f5e', '#6366f1', '#84cc16', '#a855f7']

export function FinancasProvider({ children }: { children: ReactNode }) {
  const [dados, setDados] = useState<DadosFinanceiros>(VAZIO)
  const [carregado, setCarregado] = useState(false)

  // Carrega do repositório; no primeiro acesso, pré-carrega os dados de exemplo.
  useEffect(() => {
    repositorio.carregar().then((salvos) => {
      setDados(salvos ?? dadosIniciais())
      setCarregado(true)
    })
  }, [])

  // Persiste a cada alteração (após o carregamento inicial).
  useEffect(() => {
    // No primeiro acesso isso já grava o exemplo, para que não seja recriado depois de apagado.
    if (!carregado) return
    repositorio.salvar(dados).catch((e) => {
      console.error(e)
      alert('Não foi possível salvar os dados no navegador. Verifique o espaço disponível.')
    })
  }, [dados, carregado])

  const categoriaPorId = useCallback(
    (id: string) => dados.categorias.find((c) => c.id === id) ?? CATEGORIA_DESCONHECIDA,
    [dados.categorias],
  )

  const adicionarLancamento = useCallback((l: NovoLancamento) => {
    const agora = agoraISO()
    const novo: Lancamento = { ...l, id: novoId(), criadoEm: agora, atualizadoEm: agora }
    setDados((d) => ({ ...d, lancamentos: [...d.lancamentos, novo] }))
    return novo
  }, [])

  const atualizarLancamento = useCallback((id: string, l: Partial<NovoLancamento>) => {
    setDados((d) => ({
      ...d,
      lancamentos: d.lancamentos.map((x) => (x.id === id ? { ...x, ...l, atualizadoEm: agoraISO() } : x)),
    }))
  }, [])

  const excluirLancamento = useCallback((id: string) => {
    setDados((d) => ({
      ...d,
      lancamentos: d.lancamentos.filter((x) => x.id !== id),
      // Se o lançamento era o pagamento de uma conta, a conta volta a ficar pendente.
      contas: d.contas.map((c) =>
        c.lancamentoId === id ? { ...c, status: 'pendente', pagaEm: undefined, lancamentoId: undefined } : c,
      ),
    }))
  }, [])

  const adicionarConta = useCallback((c: NovaConta) => {
    const nova: Conta = { ...c, id: novoId(), status: 'pendente', criadoEm: agoraISO() }
    setDados((d) => ({ ...d, contas: [...d.contas, nova] }))
  }, [])

  const atualizarConta = useCallback((id: string, c: Partial<NovaConta>) => {
    setDados((d) => ({ ...d, contas: d.contas.map((x) => (x.id === id ? { ...x, ...c } : x)) }))
  }, [])

  const excluirConta = useCallback((id: string) => {
    setDados((d) => ({
      ...d,
      contas: d.contas.filter((x) => x.id !== id),
      // O lançamento de pagamento (se houver) é mantido, apenas perde o vínculo.
      lancamentos: d.lancamentos.map((l) => (l.contaId === id ? { ...l, contaId: undefined } : l)),
    }))
  }, [])

  const pagarConta = useCallback((id: string, { data, formaPagamento }: { data: string; formaPagamento: FormaPagamento }) => {
    setDados((d) => {
      const conta = d.contas.find((c) => c.id === id)
      if (!conta || conta.status === 'paga') return d
      const agora = agoraISO()
      const lanc: Lancamento = {
        id: novoId(),
        tipo: 'saida',
        valor: conta.valor,
        data,
        descricao: conta.nome,
        categoriaId: conta.categoriaId,
        origemDestino: conta.destino || conta.nome,
        formaPagamento,
        observacao: 'Pagamento de conta',
        contaId: conta.id,
        criadoEm: agora,
        atualizadoEm: agora,
      }
      let contas = d.contas.map((c) =>
        c.id === id ? { ...c, status: 'paga' as const, pagaEm: data, lancamentoId: lanc.id } : c,
      )
      // Conta recorrente: cria a do mês seguinte (se ainda não existir).
      if (conta.recorrente) {
        const proximo = somarMeses(conta.vencimento, 1)
        const jaExiste = contas.some((c) => c.nome === conta.nome && c.vencimento === proximo)
        if (!jaExiste) {
          contas = [
            ...contas,
            {
              id: novoId(),
              nome: conta.nome,
              valor: conta.valor,
              vencimento: proximo,
              status: 'pendente',
              recorrente: true,
              categoriaId: conta.categoriaId,
              destino: conta.destino,
              observacao: conta.observacao,
              criadoEm: agora,
            },
          ]
        }
      }
      return { ...d, contas, lancamentos: [...d.lancamentos, lanc] }
    })
  }, [])

  const desfazerPagamento = useCallback((id: string) => {
    setDados((d) => {
      const conta = d.contas.find((c) => c.id === id)
      if (!conta) return d
      return {
        ...d,
        lancamentos: d.lancamentos.filter((l) => l.id !== conta.lancamentoId),
        contas: d.contas.map((c) =>
          c.id === id ? { ...c, status: 'pendente', pagaEm: undefined, lancamentoId: undefined } : c,
        ),
      }
    })
  }, [])

  const adicionarCategoria = useCallback(
    (c: Omit<Categoria, 'id'>) => {
      const nova: Categoria = { ...c, id: novoId() }
      setDados((d) => ({ ...d, categorias: [...d.categorias, nova] }))
      return nova
    },
    [],
  )

  const atualizarCategoria = useCallback((id: string, c: Partial<Omit<Categoria, 'id'>>) => {
    setDados((d) => ({ ...d, categorias: d.categorias.map((x) => (x.id === id ? { ...x, ...c } : x)) }))
  }, [])

  const excluirCategoria = useCallback((id: string) => {
    // Lançamentos e contas da categoria excluída passam para "Outros".
    setDados((d) => {
      const destino = d.categorias.find((c) => c.id === 'cat-outros' && c.id !== id) ?? d.categorias.find((c) => c.id !== id)
      const novoId = destino?.id ?? ''
      return {
        ...d,
        categorias: d.categorias.filter((c) => c.id !== id),
        lancamentos: d.lancamentos.map((l) => (l.categoriaId === id ? { ...l, categoriaId: novoId } : l)),
        contas: d.contas.map((c) => (c.categoriaId === id ? { ...c, categoriaId: novoId } : c)),
      }
    })
  }, [])

  const importarLancamentos = useCallback((r: ResultadoImportacao) => {
    setDados((d) => {
      const categorias = [...d.categorias]
      const idNova = new Map<string, string>()
      r.novasCategorias.forEach((nome, i) => {
        const c: Categoria = { id: novoId(), nome, tipo: 'ambos', cor: CORES_NOVAS[i % CORES_NOVAS.length] }
        categorias.push(c)
        idNova.set(`nova:${nome}`, c.id)
      })
      const agora = agoraISO()
      const novos: Lancamento[] = r.lancamentos.map((l) => ({
        ...l,
        categoriaId: idNova.get(l.categoriaId) ?? l.categoriaId,
        id: novoId(),
        criadoEm: agora,
        atualizadoEm: agora,
      }))
      return { ...d, categorias, lancamentos: [...d.lancamentos, ...novos] }
    })
    return r.lancamentos.length
  }, [])

  const restaurarBackup = useCallback((novo: DadosFinanceiros) => setDados(novo), [])

  const carregarExemplo = useCallback(() => {
    setDados((d) => {
      const ex = dadosExemplo()
      const categorias = [...d.categorias]
      for (const c of CATEGORIAS_PADRAO) if (!categorias.some((x) => x.id === c.id)) categorias.push(c)
      return {
        ...d,
        categorias,
        lancamentos: [...d.lancamentos.filter((l) => !ehExemplo(l)), ...ex.lancamentos],
        contas: [...d.contas.filter((c) => !ehExemplo(c)), ...ex.contas],
      }
    })
  }, [])

  const apagarExemplo = useCallback(() => {
    setDados((d) => ({
      ...d,
      lancamentos: d.lancamentos.filter((l) => !ehExemplo(l)),
      // Remove também contas futuras geradas a partir de contas recorrentes de exemplo.
      contas: d.contas.filter((c) => !ehExemplo(c)),
    }))
  }, [])

  const apagarTudo = useCallback(() => setDados({ ...VAZIO, categorias: CATEGORIAS_PADRAO }), [])

  const api = useMemo<FinancasAPI>(
    () => ({
      dados,
      carregado,
      categoriaPorId,
      adicionarLancamento,
      atualizarLancamento,
      excluirLancamento,
      adicionarConta,
      atualizarConta,
      excluirConta,
      pagarConta,
      desfazerPagamento,
      adicionarCategoria,
      atualizarCategoria,
      excluirCategoria,
      importarLancamentos,
      restaurarBackup,
      carregarExemplo,
      apagarExemplo,
      apagarTudo,
    }),
    [
      dados, carregado, categoriaPorId, adicionarLancamento, atualizarLancamento, excluirLancamento,
      adicionarConta, atualizarConta, excluirConta, pagarConta, desfazerPagamento, adicionarCategoria,
      atualizarCategoria, excluirCategoria, importarLancamentos, restaurarBackup, carregarExemplo,
      apagarExemplo, apagarTudo,
    ],
  )

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useFinancas(): FinancasAPI {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useFinancas deve ser usado dentro de <FinancasProvider>')
  return ctx
}
