import { useMemo, useState } from 'react'
import { CalendarDays, Plus, TrendingDown, TrendingUp } from 'lucide-react'
import { useFinancas } from '../store/FinancasContext'
import { useUI } from '../store/UIContext'
import { resumoPorDia, totais, type ResumoDia } from '../lib/calculos'
import { fimDoMes, formatarDataCompleta, hojeISO, inicioDoMes, nomeMes } from '../lib/datas'
import { formatarReal } from '../lib/dinheiro'
import { cx } from '../lib/util'
import { Cabecalho, Saldo, SeletorMes, Vazio } from '../components/ui'
import { ItemLancamento } from '../components/ItemLancamento'

/** Resultado (lucro/prejuízo) de cada dia. */
export function Dias() {
  const { dados } = useFinancas()
  const { abrirLancamento } = useUI()
  const hoje = hojeISO()
  const [mes, setMes] = useState(hoje.slice(0, 7))
  const [vazios, setVazios] = useState(false)

  const dias = useMemo(() => {
    const ini = inicioDoMes(`${mes}-01`)
    const fim = fimDoMes(ini)
    return resumoPorDia(dados.lancamentos, ini, fim, vazios).reverse()
  }, [dados.lancamentos, mes, vazios])

  const t = totais(dias.flatMap((d) => d.lancamentos))
  const comMov = dias.filter((d) => d.quantidade > 0)
  const positivos = comMov.filter((d) => d.saldo > 0).length
  const negativos = comMov.filter((d) => d.saldo < 0).length

  return (
    <>
      <Cabecalho
        titulo="Resultado do dia"
        subtitulo="Lucro ou prejuízo de cada dia"
        acoes={<SeletorMes mes={mes} onChange={setMes} />}
      />

      <section className="card mb-4 grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Resultado de {nomeMes(mes)}</p>
          <p className="text-xl font-bold"><Saldo valor={t.saldo} /></p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Entradas / Saídas</p>
          <p className="text-sm font-semibold tabular-nums">
            <span className="text-emerald-600 dark:text-emerald-400">{formatarReal(t.entradas)}</span>
            {' / '}
            <span className="text-red-600 dark:text-red-400">{formatarReal(t.saidas)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="text-emerald-500" size={20} />
          <p className="text-sm"><b>{positivos}</b> dia(s) com lucro</p>
        </div>
        <div className="flex items-center gap-2">
          <TrendingDown className="text-red-500" size={20} />
          <p className="text-sm"><b>{negativos}</b> dia(s) com prejuízo</p>
        </div>
      </section>

      <label className="mb-4 inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input type="checkbox" className="h-4 w-4 accent-emerald-600" checked={vazios} onChange={(e) => setVazios(e.target.checked)} />
        Mostrar dias sem movimento
      </label>

      {dias.length === 0 ? (
        <section className="card">
          <Vazio
            icone={<CalendarDays />}
            titulo={`Nenhum lançamento em ${nomeMes(mes)}`}
            acao={<button className="btn-primario" onClick={() => abrirLancamento()}>Novo lançamento</button>}
          />
        </section>
      ) : (
        <div className="space-y-4">
          {dias.map((d) => <CartaoDia key={d.data} d={d} hoje={d.data === hoje} />)}
        </div>
      )}
    </>
  )
}

/** Junta as descrições de um tipo: "serviço realizado, venda" */
function descricoes(d: ResumoDia, tipo: 'entrada' | 'saida') {
  const nomes = d.lancamentos.filter((l) => l.tipo === tipo).map((l) => l.descricao.toLowerCase())
  return nomes.length ? ` (${nomes.join(', ')})` : ''
}

function CartaoDia({ d, hoje }: { d: ResumoDia; hoje: boolean }) {
  const { abrirLancamento } = useUI()
  const vazio = d.quantidade === 0
  return (
    <section
      className={cx(
        'card overflow-hidden border-l-4',
        d.saldo > 0 && 'border-l-emerald-500',
        d.saldo < 0 && 'border-l-red-500',
        d.saldo === 0 && 'border-l-slate-300 dark:border-l-slate-700',
        vazio && 'opacity-60',
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <h2 className="text-base font-semibold sm:text-lg">
            Dia {d.numero} – {formatarDataCompleta(d.data)}
            {hoje && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 align-middle text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">hoje</span>}
          </h2>
          <div className="mt-1 space-y-0.5 text-sm text-slate-600 dark:text-slate-300">
            <p>
              Entradas: <b className="text-emerald-600 tabular-nums dark:text-emerald-400">{formatarReal(d.entradas)}</b>
              <span className="text-slate-500 dark:text-slate-400">{descricoes(d, 'entrada')}</span>
            </p>
            <p>
              Saídas: <b className="text-red-600 tabular-nums dark:text-red-400">{formatarReal(d.saidas)}</b>
              <span className="text-slate-500 dark:text-slate-400">{descricoes(d, 'saida')}</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 dark:text-slate-400">Saldo do dia</p>
          <p className="text-2xl font-bold"><Saldo valor={d.saldo} /></p>
          <button
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline"
            onClick={() => abrirLancamento({ data: d.data })}
          >
            <Plus size={12} /> lançar neste dia
          </button>
        </div>
      </header>
      {!vazio && (
        <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
          {d.lancamentos.map((l) => <ItemLancamento key={l.id} l={l} mostrarData={false} />)}
        </div>
      )}
    </section>
  )
}
