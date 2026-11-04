import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Database, Download, FileDown, FileUp, TrendingDown, TrendingUp, Upload } from 'lucide-react'
import { useFinancas } from '../store/FinancasContext'
import { useUI } from '../store/UIContext'
import { agruparPor, noPeriodo, resumoPorDia, totais, type ResumoDia } from '../lib/calculos'
import { diferencaDias, fimDoMes, formatarData, formatarDataCompleta, hojeISO, inicioDoMes, nomeMes, somarDias, somarMeses } from '../lib/datas'
import { formatarReal } from '../lib/dinheiro'
import { csvParaLancamentos, lancamentosParaCSV, type ResultadoImportacao } from '../lib/csv'
import { validarDados } from '../lib/repositorio'
import { baixarArquivo, cx, lerArquivoTexto } from '../lib/util'
import { Cabecalho, Modal, PontoCor, Saldo, Vazio } from '../components/ui'

export function Relatorios() {
  const { dados, categoriaPorId } = useFinancas()
  const hoje = hojeISO()
  const [de, setDe] = useState(inicioDoMes(hoje))
  const [ate, setAte] = useState(fimDoMes(hoje))

  const presets: [string, string, string][] = [
    ['Este mês', inicioDoMes(hoje), fimDoMes(hoje)],
    ['Mês passado', inicioDoMes(somarMeses(hoje, -1)), fimDoMes(somarMeses(hoje, -1))],
    ['Últimos 7 dias', somarDias(hoje, -6), hoje],
    ['Últimos 30 dias', somarDias(hoje, -29), hoje],
    ['Este ano', `${hoje.slice(0, 4)}-01-01`, `${hoje.slice(0, 4)}-12-31`],
  ]

  const r = useMemo(() => {
    const doPeriodo = noPeriodo(dados.lancamentos, de, ate)
    const dias = resumoPorDia(dados.lancamentos, de, ate)
    const t = totais(doPeriodo)
    const melhor = dias.reduce<ResumoDia | null>((m, d) => (!m || d.saldo > m.saldo ? d : m), null)
    const pior = dias.reduce<ResumoDia | null>((m, d) => (!m || d.saldo < m.saldo ? d : m), null)
    const nDias = Math.max(1, diferencaDias(de, ate) + 1)

    // Resumo por mês dentro do período
    const meses: { mes: string; t: ReturnType<typeof totais>; melhor: ResumoDia | null; pior: ResumoDia | null }[] = []
    for (let m = inicioDoMes(de); m <= ate; m = somarMeses(m, 1)) {
      const ini = m < de ? de : m
      const fim = fimDoMes(m) > ate ? ate : fimDoMes(m)
      const dm = dias.filter((d) => d.data >= ini && d.data <= fim)
      if (!dm.length) continue
      meses.push({
        mes: m.slice(0, 7),
        t: totais(dm.flatMap((d) => d.lancamentos)),
        melhor: dm.reduce((a, b) => (b.saldo > a.saldo ? b : a)),
        pior: dm.reduce((a, b) => (b.saldo < a.saldo ? b : a)),
      })
    }

    const cat = (tipo: 'entrada' | 'saida') =>
      [...agruparPor(doPeriodo.filter((l) => l.tipo === tipo), (l) => l.categoriaId).entries()]
        .map(([id, v]) => ({ cat: categoriaPorId(id), v }))
        .sort((a, b) => b.v - a.v)

    return {
      doPeriodo, t, melhor, pior, meses,
      mediaDiaria: Math.round(t.saldo / nDias),
      diasLucro: dias.filter((d) => d.saldo > 0).length,
      diasPrejuizo: dias.filter((d) => d.saldo < 0).length,
      catEntradas: cat('entrada'),
      catSaidas: cat('saida'),
    }
  }, [dados.lancamentos, de, ate, categoriaPorId])

  return (
    <>
      <Cabecalho titulo="Relatórios" subtitulo="Resumo por período, exportação e backup" />

      <section className="card mb-4 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label" htmlFor="r-de">De</label>
            <input id="r-de" type="date" className="input" value={de} onChange={(e) => e.target.value && setDe(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="r-ate">Até</label>
            <input id="r-ate" type="date" className="input" value={ate} onChange={(e) => e.target.value && setAte(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {presets.map(([nome, a, b]) => (
              <button
                key={nome}
                onClick={() => { setDe(a); setAte(b) }}
                className={cx(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                  de === a && ate === b
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                    : 'border-slate-300 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300',
                )}
              >
                {nome}
              </button>
            ))}
          </div>
        </div>
        {de > ate && <p className="mt-2 text-sm text-red-600">A data inicial é maior que a final.</p>}
      </section>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi titulo="Total de entradas"><span className="text-emerald-600 dark:text-emerald-400">{formatarReal(r.t.entradas)}</span></Kpi>
        <Kpi titulo="Total de saídas"><span className="text-red-600 dark:text-red-400">{formatarReal(r.t.saidas)}</span></Kpi>
        <Kpi titulo={r.t.saldo >= 0 ? 'Lucro no período' : 'Prejuízo no período'}><Saldo valor={r.t.saldo} /></Kpi>
        <Kpi titulo="Média por dia" extra={`${r.t.quantidade} lançamento(s)`}><Saldo valor={r.mediaDiaria} /></Kpi>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <DiaDestaque titulo="Melhor dia" icone={<TrendingUp className="text-emerald-500" />} d={r.melhor} extra={`${r.diasLucro} dia(s) com lucro`} />
        <DiaDestaque titulo="Pior dia" icone={<TrendingDown className="text-red-500" />} d={r.pior} extra={`${r.diasPrejuizo} dia(s) com prejuízo`} />
      </div>

      <section className="card mb-4 overflow-hidden">
        <h2 className="px-5 pt-5 pb-3 font-semibold">Resumo mensal</h2>
        {r.meses.length === 0 ? (
          <Vazio icone={<FileDown />} titulo="Sem lançamentos no período" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-2 font-medium">Mês</th>
                  <th className="px-3 py-2 text-right font-medium">Entradas</th>
                  <th className="px-3 py-2 text-right font-medium">Saídas</th>
                  <th className="px-3 py-2 text-right font-medium">Lucro/Prejuízo</th>
                  <th className="px-3 py-2 font-medium">Melhor dia</th>
                  <th className="px-5 py-2 font-medium">Pior dia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {r.meses.map((m) => (
                  <tr key={m.mes}>
                    <td className="px-5 py-2.5 font-medium">{nomeMes(m.mes)}</td>
                    <td className="px-3 py-2.5 text-right text-emerald-600 tabular-nums dark:text-emerald-400">{formatarReal(m.t.entradas)}</td>
                    <td className="px-3 py-2.5 text-right text-red-600 tabular-nums dark:text-red-400">{formatarReal(m.t.saidas)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold"><Saldo valor={m.t.saldo} /></td>
                    <td className="px-3 py-2.5 text-xs">{m.melhor && <>{formatarData(m.melhor.data)} · <Saldo valor={m.melhor.saldo} /></>}</td>
                    <td className="px-5 py-2.5 text-xs">{m.pior && <>{formatarData(m.pior.data)} · <Saldo valor={m.pior.saldo} /></>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <TabelaCategorias titulo="Entradas por categoria" itens={r.catEntradas} total={r.t.entradas} />
        <TabelaCategorias titulo="Saídas por categoria" itens={r.catSaidas} total={r.t.saidas} />
      </div>

      <Dados periodo={{ de, ate, lancamentos: r.doPeriodo }} />
    </>
  )
}

function Kpi({ titulo, extra, children }: { titulo: string; extra?: string; children: ReactNode }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-slate-500 dark:text-slate-400">{titulo}</p>
      <p className="mt-1 text-lg font-bold tabular-nums sm:text-xl">{children}</p>
      {extra && <p className="text-xs text-slate-500 dark:text-slate-400">{extra}</p>}
    </div>
  )
}

function DiaDestaque({ titulo, icone, d, extra }: { titulo: string; icone: ReactNode; d: ResumoDia | null; extra: string }) {
  return (
    <div className="card flex items-center gap-4 p-4">
      <div className="rounded-xl bg-slate-100 p-2.5 dark:bg-slate-800">{icone}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500 dark:text-slate-400">{titulo} · {extra}</p>
        {d ? (
          <>
            <p className="truncate font-medium">{formatarDataCompleta(d.data)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Entradas {formatarReal(d.entradas)} · Saídas {formatarReal(d.saidas)}
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-400">—</p>
        )}
      </div>
      {d && <p className="text-xl font-bold"><Saldo valor={d.saldo} /></p>}
    </div>
  )
}

function TabelaCategorias({ titulo, itens, total }: { titulo: string; itens: { cat: { nome: string; cor: string }; v: number }[]; total: number }) {
  return (
    <section className="card p-5">
      <h2 className="mb-3 font-semibold">{titulo}</h2>
      {itens.length === 0 ? (
        <p className="text-sm text-slate-400">Nada no período.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {itens.map(({ cat, v }) => (
            <li key={cat.nome} className="flex items-center gap-2">
              <PontoCor cor={cat.cor} />
              <span className="flex-1 truncate">{cat.nome}</span>
              <span className="text-xs text-slate-500 tabular-nums">{((v / total) * 100).toFixed(0)}%</span>
              <span className="w-28 text-right font-medium tabular-nums">{formatarReal(v)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Exportar/importar CSV e backup/restauração JSON. */
function Dados({ periodo }: { periodo: { de: string; ate: string; lancamentos: ReturnType<typeof noPeriodo> } }) {
  const { dados, importarLancamentos, restaurarBackup } = useFinancas()
  const { avisar, confirmar } = useUI()
  const csvRef = useRef<HTMLInputElement>(null)
  const jsonRef = useRef<HTMLInputElement>(null)
  const [previa, setPrevia] = useState<ResultadoImportacao | null>(null)

  const exportarCSV = (todos: boolean) => {
    const lista = todos ? dados.lancamentos : periodo.lancamentos
    if (!lista.length) return avisar('Não há lançamentos para exportar.', 'erro')
    const nome = todos ? 'lancamentos-todos.csv' : `lancamentos_${periodo.de}_a_${periodo.ate}.csv`
    baixarArquivo(nome, lancamentosParaCSV(lista, dados.categorias), 'text/csv;charset=utf-8')
    avisar(`${lista.length} lançamento(s) exportado(s).`)
  }

  const backup = () => {
    baixarArquivo(`backup-financas_${hojeISO()}.json`, JSON.stringify({ ...dados, exportadoEm: new Date().toISOString() }, null, 2), 'application/json')
    avisar('Backup gerado.')
  }

  async function lerCSVArquivo(arq: File) {
    try {
      setPrevia(csvParaLancamentos(await lerArquivoTexto(arq), dados.categorias))
    } catch {
      avisar('Não foi possível ler o arquivo.', 'erro')
    }
  }

  async function restaurar(arq: File) {
    try {
      const novo = validarDados(JSON.parse(await lerArquivoTexto(arq)))
      const ok = await confirmar({
        titulo: 'Restaurar backup?',
        mensagem: `Os dados atuais serão SUBSTITUÍDOS pelo backup (${novo.lancamentos.length} lançamentos, ${novo.contas.length} contas, ${novo.categorias.length} categorias). Recomendo gerar um backup dos dados atuais antes.`,
        botao: 'Substituir dados',
        perigo: true,
      })
      if (ok) {
        restaurarBackup(novo)
        avisar('Backup restaurado.')
      }
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Arquivo de backup inválido.', 'erro')
    }
  }

  return (
    <section className="card p-5">
      <h2 className="font-semibold">Exportar, importar e backup</h2>
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
        O CSV usa “;” e vírgula decimal — abre direto no Excel, LibreOffice ou Google Planilhas.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <button className="btn-secundario justify-start" onClick={() => exportarCSV(false)}>
          <FileDown size={16} /> Exportar período (CSV/Excel)
        </button>
        <button className="btn-secundario justify-start" onClick={() => exportarCSV(true)}>
          <FileDown size={16} /> Exportar tudo (CSV/Excel)
        </button>
        <button className="btn-secundario justify-start" onClick={() => csvRef.current?.click()}>
          <FileUp size={16} /> Importar de CSV
        </button>
        <button className="btn-secundario justify-start" onClick={backup}>
          <Download size={16} /> Fazer backup (JSON)
        </button>
        <button className="btn-secundario justify-start" onClick={() => jsonRef.current?.click()}>
          <Upload size={16} /> Restaurar backup (JSON)
        </button>
      </div>
      <input ref={csvRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) lerCSVArquivo(f); e.target.value = '' }} />
      <input ref={jsonRef} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) restaurar(f); e.target.value = '' }} />

      <Modal
        aberto={!!previa}
        titulo="Importar CSV"
        onFechar={() => setPrevia(null)}
        rodape={
          <>
            <button className="btn-secundario" onClick={() => setPrevia(null)}>Cancelar</button>
            <button
              className="btn-primario"
              disabled={!previa?.lancamentos.length}
              onClick={() => {
                if (!previa) return
                const n = importarLancamentos(previa)
                avisar(`${n} lançamento(s) importado(s).`)
                setPrevia(null)
              }}
            >
              Importar {previa?.lancamentos.length ?? 0} lançamento(s)
            </button>
          </>
        }
      >
        {previa && (
          <div className="space-y-3 text-sm">
            <p className="flex items-center gap-2"><Database size={16} /> {previa.lancamentos.length} lançamento(s) válidos encontrados.</p>
            {previa.lancamentos.length > 0 && (
              <p className="text-slate-600 dark:text-slate-300">
                Entradas: <b className="text-emerald-600">{formatarReal(totais(previa.lancamentos).entradas)}</b> · Saídas:{' '}
                <b className="text-red-600">{formatarReal(totais(previa.lancamentos).saidas)}</b>
              </p>
            )}
            {previa.novasCategorias.length > 0 && <p>Novas categorias que serão criadas: <b>{previa.novasCategorias.join(', ')}</b></p>}
            {previa.erros.length > 0 && (
              <div className="rounded-xl bg-amber-50 p-3 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                <p className="mb-1 font-medium">{previa.erros.length} linha(s) ignorada(s):</p>
                <ul className="max-h-32 list-disc overflow-y-auto pl-5 text-xs">
                  {previa.erros.slice(0, 50).map((e) => <li key={e}>{e}</li>)}
                </ul>
              </div>
            )}
            <p className="text-xs text-slate-500">Colunas reconhecidas: Data; Tipo; Valor; Descrição; Categoria; Origem/Destino; Forma de pagamento; Observação.</p>
          </div>
        )}
      </Modal>
    </section>
  )
}
