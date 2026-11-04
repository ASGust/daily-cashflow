import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, Pencil, Plus, Repeat, RotateCcw, Trash2 } from 'lucide-react'
import type { Conta } from '../types'
import { useFinancas, type NovaConta } from '../store/FinancasContext'
import { useUI } from '../store/UIContext'
import { diasParaVencer, statusConta, venceEmBreve } from '../lib/calculos'
import { formatarData, hojeISO, inicioDoMes, fimDoMes, diaDaSemana } from '../lib/datas'
import { formatarReal } from '../lib/dinheiro'
import { cx } from '../lib/util'
import { Badge, Cabecalho, CampoDinheiro, Modal, PontoCor, Vazio } from '../components/ui'
import { ModalPagarConta } from '../components/ModalPagarConta'

type Aba = 'abertas' | 'pagas' | 'todas'

export function Contas() {
  const { dados, categoriaPorId, excluirConta, desfazerPagamento } = useFinancas()
  const { confirmar, avisar } = useUI()
  const hoje = hojeISO()
  const [aba, setAba] = useState<Aba>('abertas')
  const [pagando, setPagando] = useState<Conta | null>(null)
  const [editando, setEditando] = useState<Conta | 'nova' | null>(null)

  const resumo = useMemo(() => {
    const atrasadas = dados.contas.filter((c) => statusConta(c, hoje) === 'atrasada')
    const breve = dados.contas.filter((c) => venceEmBreve(c, hoje))
    const pendentes = dados.contas.filter((c) => c.status === 'pendente')
    const pagasMes = dados.contas.filter((c) => c.status === 'paga' && c.pagaEm && c.pagaEm >= inicioDoMes(hoje) && c.pagaEm <= fimDoMes(hoje))
    const soma = (l: Conta[]) => l.reduce((a, b) => a + b.valor, 0)
    return {
      atrasadas: { n: atrasadas.length, v: soma(atrasadas) },
      breve: { n: breve.length, v: soma(breve) },
      pendentes: { n: pendentes.length, v: soma(pendentes) },
      pagasMes: { n: pagasMes.length, v: soma(pagasMes) },
    }
  }, [dados.contas, hoje])

  const lista = useMemo(() => {
    const l = dados.contas.filter((c) => (aba === 'abertas' ? c.status === 'pendente' : aba === 'pagas' ? c.status === 'paga' : true))
    return aba === 'pagas'
      ? l.sort((a, b) => (b.pagaEm ?? '').localeCompare(a.pagaEm ?? ''))
      : l.sort((a, b) => a.vencimento.localeCompare(b.vencimento))
  }, [dados.contas, aba])

  async function excluir(c: Conta) {
    const ok = await confirmar({
      titulo: 'Excluir conta?',
      mensagem: `A conta "${c.nome}" será excluída.${c.status === 'paga' ? ' O lançamento de pagamento já registrado será mantido.' : ''}`,
      botao: 'Excluir',
      perigo: true,
    })
    if (ok) {
      excluirConta(c.id)
      avisar('Conta excluída.')
    }
  }

  async function desfazer(c: Conta) {
    const ok = await confirmar({
      titulo: 'Desfazer pagamento?',
      mensagem: `A conta "${c.nome}" voltará a ficar pendente e o lançamento de saída de ${formatarReal(c.valor)} será removido.`,
      botao: 'Desfazer',
    })
    if (ok) {
      desfazerPagamento(c.id)
      avisar('Pagamento desfeito.')
    }
  }

  return (
    <>
      <Cabecalho
        titulo="Contas a pagar"
        subtitulo="Vencimentos, pagamentos e contas recorrentes"
        acoes={
          <button className="btn-secundario" onClick={() => setEditando('nova')}>
            <Plus size={16} /> Nova conta
          </button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CardResumo icone={<AlertTriangle size={18} />} cor="vermelho" titulo="Atrasadas" n={resumo.atrasadas.n} v={resumo.atrasadas.v} />
        <CardResumo icone={<Clock size={18} />} cor="amarelo" titulo="Vencem em 7 dias" n={resumo.breve.n} v={resumo.breve.v} />
        <CardResumo icone={<CalendarClock size={18} />} cor="cinza" titulo="Total pendente" n={resumo.pendentes.n} v={resumo.pendentes.v} />
        <CardResumo icone={<CheckCircle2 size={18} />} cor="verde" titulo="Pagas neste mês" n={resumo.pagasMes.n} v={resumo.pagasMes.v} />
      </div>

      <div className="mb-4 inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {([['abertas', 'Em aberto'], ['pagas', 'Pagas'], ['todas', 'Todas']] as const).map(([id, nome]) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={cx(
              'rounded-lg px-4 py-1.5 text-sm font-medium transition',
              aba === id ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200',
            )}
          >
            {nome}
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <section className="card">
          <Vazio
            icone={<CalendarClock />}
            titulo={aba === 'pagas' ? 'Nenhuma conta paga' : 'Nenhuma conta em aberto'}
            acao={<button className="btn-primario" onClick={() => setEditando('nova')}>Cadastrar conta</button>}
          />
        </section>
      ) : (
        <div className="space-y-2">
          {lista.map((c) => {
            const st = statusConta(c, hoje)
            const dias = diasParaVencer(c, hoje)
            const breve = venceEmBreve(c, hoje)
            const cat = categoriaPorId(c.categoriaId)
            return (
              <div
                key={c.id}
                className={cx(
                  'card flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap',
                  st === 'atrasada' && 'border-red-300 bg-red-50/60 dark:border-red-500/40 dark:bg-red-500/5',
                  breve && 'border-amber-300 bg-amber-50/60 dark:border-amber-500/40 dark:bg-amber-500/5',
                )}
              >
                <div className="min-w-0 flex-1 basis-48">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{c.nome}</p>
                    {st === 'paga' && <Badge cor="verde">Paga</Badge>}
                    {st === 'pendente' && <Badge cor={breve ? 'amarelo' : 'cinza'}>Pendente</Badge>}
                    {st === 'atrasada' && <Badge cor="vermelho">Atrasada</Badge>}
                    {c.recorrente && <Badge cor="azul"><Repeat size={11} /> Mensal</Badge>}
                  </div>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <PontoCor cor={cat.cor} /> {cat.nome}
                    {c.destino && <span>· {c.destino}</span>}
                    <span>· Vence {diaDaSemana(c.vencimento).toLowerCase()}, {formatarData(c.vencimento)}</span>
                  </p>
                  <p className="mt-0.5 text-xs font-medium">
                    {st === 'paga' && c.pagaEm && <span className="text-emerald-600 dark:text-emerald-400">Paga em {formatarData(c.pagaEm)}</span>}
                    {st === 'atrasada' && <span className="text-red-600 dark:text-red-400">Atrasada há {-dias} dia{-dias > 1 ? 's' : ''}</span>}
                    {st === 'pendente' && breve && (
                      <span className="text-amber-700 dark:text-amber-300">{dias === 0 ? 'Vence hoje' : `Vence em ${dias} dia${dias > 1 ? 's' : ''}`}</span>
                    )}
                  </p>
                  {c.observacao && <p className="mt-0.5 text-xs italic text-slate-400">{c.observacao}</p>}
                </div>
                <p className="text-lg font-bold tabular-nums">{formatarReal(c.valor)}</p>
                <div className="flex items-center gap-1">
                  {c.status === 'pendente' ? (
                    <button className="btn-primario px-3 py-2" onClick={() => setPagando(c)}>
                      <CheckCircle2 size={16} /> Pagar
                    </button>
                  ) : (
                    <button className="btn-icone" title="Desfazer pagamento" onClick={() => desfazer(c)}>
                      <RotateCcw size={16} />
                    </button>
                  )}
                  <button className="btn-icone" aria-label="Editar" onClick={() => setEditando(c)}>
                    <Pencil size={16} />
                  </button>
                  <button className="btn-icone hover:text-red-600" aria-label="Excluir" onClick={() => excluir(c)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ModalPagarConta conta={pagando} onFechar={() => setPagando(null)} />
      <FormConta estado={editando} onFechar={() => setEditando(null)} />
    </>
  )
}

function CardResumo({ icone, cor, titulo, n, v }: { icone: ReactNode; cor: 'vermelho' | 'amarelo' | 'cinza' | 'verde'; titulo: string; n: number; v: number }) {
  const cores = {
    vermelho: 'text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400',
    amarelo: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400',
    cinza: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300',
    verde: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400',
  }
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <span className={cx('rounded-lg p-1.5', cores[cor])}>{icone}</span>
        <p className="text-xs text-slate-500 dark:text-slate-400">{titulo}</p>
      </div>
      <p className="mt-2 text-lg font-bold tabular-nums">{formatarReal(v)}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{n} conta(s)</p>
    </div>
  )
}

function FormConta({ estado, onFechar }: { estado: Conta | 'nova' | null; onFechar: () => void }) {
  const { dados, adicionarConta, atualizarConta } = useFinancas()
  const { avisar } = useUI()
  const editar = estado && estado !== 'nova' ? estado : null
  const vazio: NovaConta = {
    nome: '', valor: 0, vencimento: hojeISO(), recorrente: false, categoriaId: 'cat-contas-fixas', destino: '', observacao: '',
  }
  const [c, setC] = useState<NovaConta>(vazio)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!estado) return
    setErro('')
    setC(
      editar
        ? { nome: editar.nome, valor: editar.valor, vencimento: editar.vencimento, recorrente: editar.recorrente, categoriaId: editar.categoriaId, destino: editar.destino, observacao: editar.observacao ?? '' }
        : { ...vazio, categoriaId: dados.categorias.find((x) => x.id === 'cat-contas-fixas')?.id ?? dados.categorias[0]?.id ?? '' },
    )
  }, [estado])

  const set = <K extends keyof NovaConta>(k: K, v: NovaConta[K]) => setC((x) => ({ ...x, [k]: v }))

  function salvar() {
    if (!c.nome.trim()) return setErro('Informe o nome da conta.')
    if (c.valor <= 0) return setErro('Informe um valor maior que zero.')
    if (!c.vencimento) return setErro('Informe o vencimento.')
    const registro = { ...c, nome: c.nome.trim(), destino: c.destino.trim(), observacao: c.observacao?.trim() || undefined }
    if (editar) {
      atualizarConta(editar.id, registro)
      avisar('Conta atualizada.')
    } else {
      adicionarConta(registro)
      avisar('Conta cadastrada.')
    }
    onFechar()
  }

  return (
    <Modal
      aberto={!!estado}
      titulo={editar ? 'Editar conta' : 'Nova conta a pagar'}
      onFechar={onFechar}
      rodape={
        <>
          <button className="btn-secundario" onClick={onFechar}>Cancelar</button>
          <button className="btn-primario" onClick={salvar}>Salvar</button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); salvar() }}>
        <div>
          <label className="label" htmlFor="c-nome">Nome da conta</label>
          <input id="c-nome" className="input" placeholder="Ex.: Energia elétrica" value={c.nome} onChange={(e) => set('nome', e.target.value)} autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="c-valor">Valor</label>
            <CampoDinheiro id="c-valor" valor={c.valor} onChange={(v) => set('valor', v)} />
          </div>
          <div>
            <label className="label" htmlFor="c-venc">Vencimento</label>
            <input id="c-venc" type="date" className="input h-[46px]" value={c.vencimento} onChange={(e) => set('vencimento', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="c-cat">Categoria</label>
            <select id="c-cat" className="input" value={c.categoriaId} onChange={(e) => set('categoriaId', e.target.value)}>
              {dados.categorias.filter((x) => x.tipo !== 'entrada').map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="c-dest">Pagar para</label>
            <input id="c-dest" className="input" placeholder="Ex.: Companhia de energia" value={c.destino} onChange={(e) => set('destino', e.target.value)} />
          </div>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-emerald-600" checked={c.recorrente} onChange={(e) => set('recorrente', e.target.checked)} />
          <span>
            <span className="block text-sm font-medium">Conta recorrente (mensal)</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">Ao pagar, a conta do mês seguinte é criada automaticamente.</span>
          </span>
        </label>
        <div>
          <label className="label" htmlFor="c-obs">Observação (opcional)</label>
          <textarea id="c-obs" rows={2} className="input resize-none" value={c.observacao} onChange={(e) => set('observacao', e.target.value)} />
        </div>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
