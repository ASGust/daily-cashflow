import { useEffect, useMemo, useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle, Plus } from 'lucide-react'
import { FORMAS_PAGAMENTO, type FormaPagamento, type TipoLancamento } from '../types'
import { useFinancas } from '../store/FinancasContext'
import { useUI } from '../store/UIContext'
import { hojeISO } from '../lib/datas'
import { formatarReal } from '../lib/dinheiro'
import { cx } from '../lib/util'
import { CampoDinheiro, Modal } from './ui'
import { NovaCategoriaInline } from './NovaCategoriaInline'

const ORIGENS_PADRAO = ['Cliente', 'Padaria', 'Pix', 'Dinheiro', 'Cartão', 'Conta bancária', 'Supermercado']

interface Campos {
  tipo: TipoLancamento
  valor: number
  data: string
  descricao: string
  categoriaId: string
  origemDestino: string
  formaPagamento: FormaPagamento
  observacao: string
}

export function FormLancamento() {
  const { formLancamento, fecharLancamento, avisar } = useUI()
  const { dados, adicionarLancamento, atualizarLancamento } = useFinancas()
  const editar = formLancamento?.editar

  const vazio = (tipo: TipoLancamento = 'saida', data = hojeISO()): Campos => ({
    tipo,
    valor: 0,
    data,
    descricao: '',
    categoriaId: '',
    origemDestino: '',
    formaPagamento: 'Pix',
    observacao: '',
  })

  const [c, setC] = useState<Campos>(vazio())
  const [erros, setErros] = useState<Record<string, string>>({})
  const [novaCat, setNovaCat] = useState(false)

  // Reinicia o formulário sempre que ele é aberto.
  useEffect(() => {
    if (!formLancamento) return
    setErros({})
    setNovaCat(false)
    if (editar) {
      setC({
        tipo: editar.tipo,
        valor: editar.valor,
        data: editar.data,
        descricao: editar.descricao,
        categoriaId: editar.categoriaId,
        origemDestino: editar.origemDestino,
        formaPagamento: editar.formaPagamento,
        observacao: editar.observacao ?? '',
      })
    } else {
      setC(vazio(formLancamento.tipo, formLancamento.data))
    }
  }, [formLancamento])

  const categorias = useMemo(
    () => dados.categorias.filter((x) => x.tipo === 'ambos' || x.tipo === c.tipo || x.id === editar?.categoriaId),
    [dados.categorias, c.tipo, editar],
  )

  // Garante uma categoria válida para o tipo escolhido.
  useEffect(() => {
    if (!formLancamento) return
    if (!categorias.some((x) => x.id === c.categoriaId)) {
      const padrao = categorias.find((x) => x.tipo === c.tipo) ?? categorias[0]
      setC((v) => ({ ...v, categoriaId: padrao?.id ?? '' }))
    }
  }, [categorias, c.categoriaId, c.tipo, formLancamento])

  const sugestoes = useMemo(() => {
    const origens = new Set(ORIGENS_PADRAO)
    const descricoes = new Set<string>()
    for (const l of dados.lancamentos) {
      if (l.origemDestino) origens.add(l.origemDestino)
      descricoes.add(l.descricao)
    }
    return { origens: [...origens].sort(), descricoes: [...descricoes].sort() }
  }, [dados.lancamentos])

  const set = <K extends keyof Campos>(k: K, v: Campos[K]) => setC((x) => ({ ...x, [k]: v }))

  function salvar(continuar: boolean) {
    const e: Record<string, string> = {}
    if (c.valor <= 0) e.valor = 'Informe um valor maior que zero.'
    if (!c.descricao.trim()) e.descricao = 'Descreva o lançamento.'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c.data)) e.data = 'Data inválida.'
    if (!c.categoriaId) e.categoriaId = 'Escolha uma categoria.'
    setErros(e)
    if (Object.keys(e).length) return

    const registro = {
      ...c,
      descricao: c.descricao.trim(),
      origemDestino: c.origemDestino.trim(),
      observacao: c.observacao.trim() || undefined,
    }
    if (editar) {
      atualizarLancamento(editar.id, registro)
      avisar('Lançamento atualizado.')
      fecharLancamento()
    } else {
      adicionarLancamento(registro)
      avisar(`${c.tipo === 'entrada' ? 'Entrada' : 'Saída'} de ${formatarReal(c.valor)} registrada.`)
      if (continuar) setC({ ...vazio(c.tipo, c.data), categoriaId: c.categoriaId, formaPagamento: c.formaPagamento })
      else fecharLancamento()
    }
  }

  return (
    <Modal
      aberto={!!formLancamento}
      titulo={editar ? 'Editar lançamento' : 'Novo lançamento'}
      onFechar={fecharLancamento}
      rodape={
        <>
          {!editar && (
            <button className="btn-fantasma hidden sm:inline-flex" onClick={() => salvar(true)}>
              Salvar e adicionar outro
            </button>
          )}
          <button className="btn-secundario" onClick={fecharLancamento}>
            Cancelar
          </button>
          <button className="btn-primario" onClick={() => salvar(false)}>
            Salvar
          </button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          salvar(false)
        }}
      >
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
          {(['entrada', 'saida'] as const).map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => set('tipo', t)}
              className={cx(
                'flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition',
                c.tipo === t
                  ? t === 'entrada'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-red-600 text-white shadow'
                  : 'text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-slate-700',
              )}
            >
              {t === 'entrada' ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
              {t === 'entrada' ? 'Entrada' : 'Saída'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="f-valor">Valor</label>
            <CampoDinheiro id="f-valor" valor={c.valor} onChange={(v) => set('valor', v)} autoFocus={!editar} />
            {erros.valor && <p className="mt-1 text-xs text-red-600">{erros.valor}</p>}
          </div>
          <div>
            <label className="label" htmlFor="f-data">Data</label>
            <input id="f-data" type="date" className="input h-[46px]" value={c.data} onChange={(e) => set('data', e.target.value)} />
            {erros.data && <p className="mt-1 text-xs text-red-600">{erros.data}</p>}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="f-desc">Descrição</label>
          <input
            id="f-desc"
            className="input"
            placeholder={c.tipo === 'entrada' ? 'Ex.: Serviço de manutenção' : 'Ex.: Pão'}
            value={c.descricao}
            list="sugestoes-descricao"
            onChange={(e) => set('descricao', e.target.value)}
          />
          <datalist id="sugestoes-descricao">
            {sugestoes.descricoes.map((d) => <option key={d} value={d} />)}
          </datalist>
          {erros.descricao && <p className="mt-1 text-xs text-red-600">{erros.descricao}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="label mb-0" htmlFor="f-cat">Categoria</label>
              <button type="button" className="flex items-center gap-0.5 text-xs font-medium text-emerald-600 hover:underline" onClick={() => setNovaCat((v) => !v)}>
                <Plus size={14} /> Nova
              </button>
            </div>
            {novaCat ? (
              <NovaCategoriaInline
                tipo={c.tipo}
                onCriada={(cat) => {
                  set('categoriaId', cat.id)
                  setNovaCat(false)
                }}
                onCancelar={() => setNovaCat(false)}
              />
            ) : (
              <select id="f-cat" className="input" value={c.categoriaId} onChange={(e) => set('categoriaId', e.target.value)}>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.nome}</option>
                ))}
              </select>
            )}
            {erros.categoriaId && <p className="mt-1 text-xs text-red-600">{erros.categoriaId}</p>}
          </div>
          <div>
            <label className="label" htmlFor="f-orig">{c.tipo === 'entrada' ? 'Origem do dinheiro' : 'Destino do dinheiro'}</label>
            <input
              id="f-orig"
              className="input"
              placeholder={c.tipo === 'entrada' ? 'Ex.: Cliente João' : 'Ex.: Padaria'}
              list="sugestoes-origem"
              value={c.origemDestino}
              onChange={(e) => set('origemDestino', e.target.value)}
            />
            <datalist id="sugestoes-origem">
              {sugestoes.origens.map((o) => <option key={o} value={o} />)}
            </datalist>
          </div>
        </div>

        <div>
          <span className="label">Forma de pagamento</span>
          <div className="flex flex-wrap gap-2">
            {FORMAS_PAGAMENTO.map((f) => (
              <button
                type="button"
                key={f}
                onClick={() => set('formaPagamento', f)}
                className={cx(
                  'rounded-full border px-3 py-1.5 text-sm transition',
                  c.formaPagamento === f
                    ? 'border-emerald-600 bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                    : 'border-slate-300 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300',
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="f-obs">Observação (opcional)</label>
          <textarea id="f-obs" rows={2} className="input resize-none" value={c.observacao} onChange={(e) => set('observacao', e.target.value)} />
        </div>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
