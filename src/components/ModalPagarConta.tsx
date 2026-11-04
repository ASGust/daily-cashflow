import { useEffect, useState } from 'react'
import { FORMAS_PAGAMENTO, type Conta, type FormaPagamento } from '../types'
import { useFinancas } from '../store/FinancasContext'
import { useUI } from '../store/UIContext'
import { formatarData, hojeISO, somarMeses } from '../lib/datas'
import { formatarReal } from '../lib/dinheiro'
import { Modal } from './ui'

/** Confirma o pagamento de uma conta, gerando o lançamento de saída correspondente. */
export function ModalPagarConta({ conta, onFechar }: { conta: Conta | null; onFechar: () => void }) {
  const { pagarConta } = useFinancas()
  const { avisar } = useUI()
  const [data, setData] = useState(hojeISO())
  const [forma, setForma] = useState<FormaPagamento>('Pix')

  useEffect(() => {
    if (conta) {
      setData(hojeISO())
      setForma('Pix')
    }
  }, [conta])

  function confirmar() {
    if (!conta) return
    pagarConta(conta.id, { data, formaPagamento: forma })
    avisar(`"${conta.nome}" paga — saída de ${formatarReal(conta.valor)} lançada em ${formatarData(data)}.`)
    onFechar()
  }

  return (
    <Modal
      aberto={!!conta}
      titulo="Marcar conta como paga"
      onFechar={onFechar}
      largura="max-w-md"
      rodape={
        <>
          <button className="btn-secundario" onClick={onFechar}>Cancelar</button>
          <button className="btn-primario" onClick={confirmar}>Confirmar pagamento</button>
        </>
      }
    >
      {conta && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
            <p className="text-sm text-slate-500 dark:text-slate-400">{conta.nome}</p>
            <p className="text-2xl font-bold text-red-600 tabular-nums dark:text-red-400">{'−'}{formatarReal(conta.valor)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Vencimento: {formatarData(conta.vencimento)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="p-data">Data do pagamento</label>
              <input id="p-data" type="date" className="input" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="p-forma">Forma de pagamento</label>
              <select id="p-forma" className="input" value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}>
                {FORMAS_PAGAMENTO.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Será criado automaticamente um lançamento de <b>saída</b> nesta data.
            {conta.recorrente && <> Como a conta é recorrente, a próxima ({formatarData(somarMeses(conta.vencimento, 1))}) será criada.</>}
          </p>
        </div>
      )}
    </Modal>
  )
}
