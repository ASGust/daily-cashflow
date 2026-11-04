import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarClock, ChevronRight, PiggyBank, Wallet } from 'lucide-react'
import type { Conta } from '../types'
import { useFinancas } from '../store/FinancasContext'
import { useUI } from '../store/UIContext'
import { agruparPor, diasParaVencer, noPeriodo, ordenarRecentes, resumoPorDia, statusConta, totais, type Totais } from '../lib/calculos'
import {
  fimDaSemana, fimDoMes, formatarData, formatarDataCompleta, hojeISO, inicioDaSemana, inicioDoMes, nomeMes, paraDate, DIAS_SEMANA_CURTO,
} from '../lib/datas'
import { formatarReal } from '../lib/dinheiro'
import { cx } from '../lib/util'
import { Badge, Saldo, Vazio } from '../components/ui'
import { BarrasHorizontais, GraficoRosca, GraficoSaldoDiario } from '../components/Graficos'
import { ItemLancamento } from '../components/ItemLancamento'
import { ModalPagarConta } from '../components/ModalPagarConta'

export function Painel() {
  const { dados, categoriaPorId } = useFinancas()
  const { irPara } = useUI()
  const hoje = hojeISO()
  const [ref, setRef] = useState(hoje)
  const [pagando, setPagando] = useState<Conta | null>(null)
  const L = dados.lancamentos

  const c = useMemo(() => {
    const ini = inicioDoMes(ref)
    const fim = fimDoMes(ref)
    const doMes = noPeriodo(L, ini, fim)
    const saidasMes = doMes.filter((l) => l.tipo === 'saida')
    const entradasMes = doMes.filter((l) => l.tipo === 'entrada')
    const porCat = agruparPor(saidasMes, (l) => l.categoriaId)
    const origens = agruparPor(entradasMes, (l) => l.origemDestino || 'Não informado')
    const futuros = L.filter((l) => l.data > ref)
    return {
      acumulado: totais(L.filter((l) => l.data <= ref)).saldo,
      futuros: totais(futuros),
      dia: totais(noPeriodo(L, ref, ref)),
      semana: totais(noPeriodo(L, inicioDaSemana(ref), fimDaSemana(ref))),
      mes: totais(doMes),
      diario: resumoPorDia(L, ini, fim, true).map((d) => ({
        dia: d.data.slice(8),
        rotulo: `${DIAS_SEMANA_CURTO[paraDate(d.data).getDay()]}, ${formatarData(d.data)}`,
        saldo: d.saldo,
        entradas: d.entradas,
        saidas: d.saidas,
      })),
      categorias: [...porCat.entries()]
        .map(([id, valor]) => ({ nome: categoriaPorId(id).nome, cor: categoriaPorId(id).cor, valor }))
        .sort((a, b) => b.valor - a.valor),
      origens: [...origens.entries()].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor).slice(0, 6),
      recentes: ordenarRecentes(L).slice(0, 5),
    }
  }, [L, ref, categoriaPorId])

  const proximasContas = useMemo(
    () =>
      dados.contas
        .filter((x) => x.status === 'pendente')
        .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
        .slice(0, 6),
    [dados.contas],
  )
  const totalAtrasado = dados.contas.filter((x) => statusConta(x, hoje) === 'atrasada').reduce((a, b) => a + b.valor, 0)

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{ref === hoje ? 'Hoje é' : 'Visualizando'}</p>
          <h1 className="text-2xl font-bold tracking-tight">{formatarDataCompleta(ref)}</h1>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="ref" className="text-xs text-slate-500">Data de referência</label>
          <input id="ref" type="date" className="input w-auto py-2" value={ref} onChange={(e) => e.target.value && setRef(e.target.value)} />
          {ref !== hoje && (
            <button className="btn-fantasma px-3 py-2" onClick={() => setRef(hoje)}>Hoje</button>
          )}
        </div>
      </div>

      {/* Saldo acumulado */}
      <section className="card relative mb-4 overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 text-white dark:from-emerald-700 dark:to-emerald-950 dark:border-emerald-900">
        <Wallet className="absolute -right-4 -bottom-6 h-36 w-36 text-white/10" />
        <p className="text-sm text-emerald-100">Saldo atual acumulado</p>
        <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums">
          {c.acumulado < 0 ? '−' : ''}
          {formatarReal(c.acumulado)}
        </p>
        <p className="mt-1 text-xs text-emerald-100">Todas as entradas menos todas as saídas até {formatarData(ref)}</p>
        {c.futuros.quantidade > 0 && (
          <p className="mt-3 inline-flex rounded-lg bg-white/15 px-2.5 py-1 text-xs">
            + {c.futuros.quantidade} lançamento(s) com data futura · resultado {c.futuros.saldo >= 0 ? '+' : '−'}
            {formatarReal(c.futuros.saldo)}
          </p>
        )}
      </section>

      {/* Dia / Semana / Mês */}
      <div className="mb-4 grid gap-3 md:grid-cols-3 xl:gap-4">
        <CardPeriodo titulo={ref === hoje ? 'Hoje' : 'Dia'} subtitulo={formatarData(ref)} t={c.dia} />
        <CardPeriodo titulo="Esta semana" subtitulo={`${formatarData(inicioDaSemana(ref))} a ${formatarData(fimDaSemana(ref))}`} t={c.semana} />
        <CardPeriodo titulo="Este mês" subtitulo={nomeMes(ref.slice(0, 7))} t={c.mes} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <section className="card p-5 md:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Saldo diário do mês</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Lucro ou prejuízo de cada dia em {nomeMes(ref.slice(0, 7))}</p>
            </div>
            <button className="btn-fantasma px-2 py-1 text-xs" onClick={() => irPara('dias')}>
              Ver dias <ChevronRight size={14} />
            </button>
          </div>
          {c.mes.quantidade ? <GraficoSaldoDiario dados={c.diario} /> : <Vazio icone={<PiggyBank />} titulo="Sem lançamentos neste mês" />}
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Próximas contas</h2>
            <button className="btn-fantasma px-2 py-1 text-xs" onClick={() => irPara('contas')}>
              Todas <ChevronRight size={14} />
            </button>
          </div>
          {totalAtrasado > 0 && (
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
              <AlertTriangle size={16} /> {formatarReal(totalAtrasado)} em contas atrasadas
            </div>
          )}
          {proximasContas.length === 0 ? (
            <Vazio icone={<CalendarClock />} titulo="Nenhuma conta pendente" />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {proximasContas.map((conta) => {
                const st = statusConta(conta, hoje)
                const dias = diasParaVencer(conta, hoje)
                return (
                  <li key={conta.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{conta.nome}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatarData(conta.vencimento)}{' '}
                        {st === 'atrasada' ? (
                          <Badge cor="vermelho">Atrasada</Badge>
                        ) : dias <= 7 ? (
                          <Badge cor="amarelo">{dias === 0 ? 'Vence hoje' : `Em ${dias} dia${dias > 1 ? 's' : ''}`}</Badge>
                        ) : null}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{formatarReal(conta.valor)}</span>
                    <button className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300" onClick={() => setPagando(conta)}>
                      Pagar
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="font-semibold">Gastos por categoria</h2>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">{nomeMes(ref.slice(0, 7))}</p>
          {c.categorias.length ? <GraficoRosca dados={c.categorias} rotuloCentro="Saídas" /> : <Vazio icone={<ArrowDownRight />} titulo="Sem saídas no mês" />}
        </section>

        <section className="card p-5">
          <h2 className="font-semibold">Principais origens de entrada</h2>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">{nomeMes(ref.slice(0, 7))}</p>
          {c.origens.length ? <BarrasHorizontais dados={c.origens} /> : <Vazio icone={<ArrowUpRight />} titulo="Sem entradas no mês" />}
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <h2 className="font-semibold">Últimos lançamentos</h2>
            <button className="btn-fantasma px-2 py-1 text-xs" onClick={() => irPara('lancamentos')}>
              Todos <ChevronRight size={14} />
            </button>
          </div>
          {c.recentes.length ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {c.recentes.map((l) => <ItemLancamento key={l.id} l={l} />)}
            </div>
          ) : (
            <Vazio icone={<PiggyBank />} titulo="Nenhum lançamento ainda" texto="Use o botão “Novo lançamento”." />
          )}
        </section>
      </div>

      <ModalPagarConta conta={pagando} onFechar={() => setPagando(null)} />
    </>
  )
}

function CardPeriodo({ titulo, subtitulo, t }: { titulo: string; subtitulo: string; t: Totais }) {
  return (
    <section className="card p-4 xl:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <h2 className="font-semibold">{titulo}</h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">{subtitulo}</span>
      </div>
      <p className={cx('mt-2 text-2xl font-bold tracking-tight')}>
        <Saldo valor={t.saldo} />
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{t.saldo >= 0 ? 'Lucro' : 'Prejuízo'} no período</p>
      <div className="mt-4 grid grid-cols-2 gap-2 text-[13px] xl:text-sm">
        <div className="rounded-xl bg-emerald-50 px-2.5 py-2 dark:bg-emerald-500/10">
          <p className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300"><ArrowUpRight size={14} /> Entradas</p>
          <p className="whitespace-nowrap font-semibold text-emerald-700 tabular-nums dark:text-emerald-300">{formatarReal(t.entradas)}</p>
        </div>
        <div className="rounded-xl bg-red-50 px-2.5 py-2 dark:bg-red-500/10">
          <p className="flex items-center gap-1 text-xs text-red-700 dark:text-red-300"><ArrowDownRight size={14} /> Saídas</p>
          <p className="whitespace-nowrap font-semibold text-red-700 tabular-nums dark:text-red-300">{formatarReal(t.saidas)}</p>
        </div>
      </div>
    </section>
  )
}
