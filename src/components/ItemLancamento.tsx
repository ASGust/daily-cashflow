import { Pencil, Receipt, Trash2 } from 'lucide-react'
import type { Lancamento } from '../types'
import { useFinancas } from '../store/FinancasContext'
import { useUI } from '../store/UIContext'
import { formatarData } from '../lib/datas'
import { formatarReal } from '../lib/dinheiro'
import { PontoCor, ValorTipo } from './ui'

/** Linha de lançamento com ações de editar/excluir. */
export function ItemLancamento({ l, mostrarData = true }: { l: Lancamento; mostrarData?: boolean }) {
  const { categoriaPorId, excluirLancamento } = useFinancas()
  const { abrirLancamento, confirmar, avisar } = useUI()
  const cat = categoriaPorId(l.categoriaId)

  async function excluir() {
    const ok = await confirmar({
      titulo: 'Excluir lançamento?',
      mensagem: `"${l.descricao}" de ${formatarReal(l.valor)} será excluído.${l.contaId ? ' A conta vinculada voltará a ficar pendente.' : ''}`,
      botao: 'Excluir',
      perigo: true,
    })
    if (ok) {
      excluirLancamento(l.id)
      avisar('Lançamento excluído.')
    }
  }

  return (
    <div className="group flex items-center gap-3 px-4 py-3">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
        style={{ backgroundColor: cat.cor }}
        aria-hidden
      >
        {cat.nome.slice(0, 1)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-medium">{l.descricao}</p>
          {l.contaId && (
            <span title="Pagamento de conta" className="text-sky-500">
              <Receipt size={14} />
            </span>
          )}
        </div>
        <p className="flex flex-wrap items-center gap-x-1.5 truncate text-xs text-slate-500 dark:text-slate-400">
          <PontoCor cor={cat.cor} />
          <span>{cat.nome}</span>
          {l.origemDestino && <span>· {l.origemDestino}</span>}
          <span>· {l.formaPagamento}</span>
          {mostrarData && <span>· {formatarData(l.data)}</span>}
        </p>
        {l.observacao && <p className="mt-0.5 truncate text-xs italic text-slate-400">{l.observacao}</p>}
      </div>
      <ValorTipo valor={l.valor} tipo={l.tipo} className="whitespace-nowrap text-sm sm:text-base" />
      <div className="flex shrink-0 gap-0.5 sm:opacity-0 sm:transition sm:group-hover:opacity-100 sm:focus-within:opacity-100">
        <button className="btn-icone h-8 w-8" onClick={() => abrirLancamento({ editar: l })} aria-label="Editar">
          <Pencil size={16} />
        </button>
        <button className="btn-icone h-8 w-8 hover:text-red-600" onClick={excluir} aria-label="Excluir">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}
