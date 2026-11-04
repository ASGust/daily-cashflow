import { useMemo, useState, type ReactNode } from 'react'
import { FilterX, Search, SearchX } from 'lucide-react'
import type { TipoLancamento } from '../types'
import { useFinancas } from '../store/FinancasContext'
import { useUI } from '../store/UIContext'
import { ordenarRecentes, totais } from '../lib/calculos'
import { formatarDataCompleta } from '../lib/datas'
import { formatarReal } from '../lib/dinheiro'
import { normalizar } from '../lib/util'
import { Cabecalho, Saldo, Vazio, useDebounce } from '../components/ui'
import { ItemLancamento } from '../components/ItemLancamento'

interface Filtros {
  busca: string
  tipo: '' | TipoLancamento
  categoriaId: string
  origem: string
  de: string
  ate: string
}
const SEM_FILTRO: Filtros = { busca: '', tipo: '', categoriaId: '', origem: '', de: '', ate: '' }

export function Lancamentos() {
  const { dados, categoriaPorId } = useFinancas()
  const { abrirLancamento } = useUI()
  const [f, setF] = useState<Filtros>(SEM_FILTRO)
  const busca = useDebounce(f.busca)
  const set = <K extends keyof Filtros>(k: K, v: Filtros[K]) => setF((x) => ({ ...x, [k]: v }))
  const temFiltro = JSON.stringify(f) !== JSON.stringify(SEM_FILTRO)

  const origens = useMemo(
    () => [...new Set(dados.lancamentos.map((l) => l.origemDestino).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [dados.lancamentos],
  )

  const filtrados = useMemo(() => {
    const q = normalizar(busca)
    return ordenarRecentes(
      dados.lancamentos.filter((l) => {
        if (f.tipo && l.tipo !== f.tipo) return false
        if (f.categoriaId && l.categoriaId !== f.categoriaId) return false
        if (f.origem && l.origemDestino !== f.origem) return false
        if (f.de && l.data < f.de) return false
        if (f.ate && l.data > f.ate) return false
        if (q) {
          const alvo = normalizar(
            [l.descricao, l.origemDestino, l.observacao ?? '', categoriaPorId(l.categoriaId).nome, l.formaPagamento, formatarReal(l.valor)].join(' '),
          )
          if (!alvo.includes(q)) return false
        }
        return true
      }),
    )
  }, [dados.lancamentos, f, busca, categoriaPorId])

  const t = totais(filtrados)

  // Agrupa por data para leitura mais fácil.
  const grupos = useMemo(() => {
    const m = new Map<string, typeof filtrados>()
    for (const l of filtrados) m.set(l.data, [...(m.get(l.data) ?? []), l])
    return [...m.entries()]
  }, [filtrados])

  return (
    <>
      <Cabecalho titulo="Lançamentos" subtitulo="Tudo o que entrou e saiu" />

      <section className="card mb-4 p-4">
        <div className="relative mb-3">
          <Search size={18} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Buscar por descrição, origem, categoria, valor…"
            value={f.busca}
            onChange={(e) => set('busca', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <select className="input" value={f.tipo} onChange={(e) => set('tipo', e.target.value as Filtros['tipo'])} aria-label="Tipo">
            <option value="">Entradas e saídas</option>
            <option value="entrada">Só entradas</option>
            <option value="saida">Só saídas</option>
          </select>
          <select className="input" value={f.categoriaId} onChange={(e) => set('categoriaId', e.target.value)} aria-label="Categoria">
            <option value="">Todas as categorias</option>
            {dados.categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <select className="input" value={f.origem} onChange={(e) => set('origem', e.target.value)} aria-label="Origem/Destino">
            <option value="">Toda origem/destino</option>
            {origens.map((o) => <option key={o}>{o}</option>)}
          </select>
          <input type="date" className="input" value={f.de} onChange={(e) => set('de', e.target.value)} aria-label="De" title="De" />
          <input type="date" className="input" value={f.ate} onChange={(e) => set('ate', e.target.value)} aria-label="Até" title="Até" />
        </div>
        {temFiltro && (
          <button className="btn-fantasma mt-2 px-2 py-1 text-xs" onClick={() => setF(SEM_FILTRO)}>
            <FilterX size={14} /> Limpar filtros
          </button>
        )}
      </section>

      <div className="mb-4 grid grid-cols-3 gap-2 text-center sm:gap-4">
        <Resumo rotulo="Entradas" valor={<span className="text-emerald-600 dark:text-emerald-400">{formatarReal(t.entradas)}</span>} />
        <Resumo rotulo="Saídas" valor={<span className="text-red-600 dark:text-red-400">{formatarReal(t.saidas)}</span>} />
        <Resumo rotulo="Saldo" valor={<Saldo valor={t.saldo} />} />
      </div>

      {grupos.length === 0 ? (
        <section className="card">
          {temFiltro ? (
            <Vazio icone={<SearchX />} titulo="Nada encontrado" texto="Ajuste ou limpe os filtros." />
          ) : (
            <Vazio
              icone={<Search />}
              titulo="Nenhum lançamento"
              texto="Registre sua primeira entrada ou saída."
              acao={<button className="btn-primario" onClick={() => abrirLancamento()}>Novo lançamento</button>}
            />
          )}
        </section>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">{filtrados.length} lançamento(s)</p>
          {grupos.map(([data, lista]) => {
            const td = totais(lista)
            return (
              <section key={data} className="card overflow-hidden">
                <header className="flex items-center justify-between bg-slate-50 px-4 py-2 text-sm dark:bg-slate-800/50">
                  <span className="font-medium">{formatarDataCompleta(data)}</span>
                  <Saldo valor={td.saldo} className="font-semibold" />
                </header>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {lista.map((l) => <ItemLancamento key={l.id} l={l} mostrarData={false} />)}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </>
  )
}

function Resumo({ rotulo, valor }: { rotulo: string; valor: ReactNode }) {
  return (
    <div className="card px-2 py-3">
      <p className="text-xs text-slate-500 dark:text-slate-400">{rotulo}</p>
      <p className="text-sm font-bold tabular-nums sm:text-lg">{valor}</p>
    </div>
  )
}
