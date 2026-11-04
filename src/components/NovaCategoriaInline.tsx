import { useState } from 'react'
import { Check, X } from 'lucide-react'
import type { Categoria, TipoLancamento } from '../types'
import { useFinancas } from '../store/FinancasContext'
import { useUI } from '../store/UIContext'
import { normalizar } from '../lib/util'

export const PALETA_CATEGORIAS = [
  '#f97316', '#0ea5e9', '#8b5cf6', '#10b981', '#22c55e', '#ef4444', '#64748b',
  '#06b6d4', '#d946ef', '#eab308', '#14b8a6', '#f43f5e', '#6366f1', '#84cc16',
]

/** Campo compacto para criar uma categoria sem sair do formulário atual. */
export function NovaCategoriaInline({
  tipo,
  onCriada,
  onCancelar,
}: {
  tipo: TipoLancamento | 'ambos'
  onCriada: (c: Categoria) => void
  onCancelar: () => void
}) {
  const { dados, adicionarCategoria } = useFinancas()
  const { avisar } = useUI()
  const [nome, setNome] = useState('')

  function criar() {
    const n = nome.trim()
    if (!n) return
    const existente = dados.categorias.find((c) => normalizar(c.nome) === normalizar(n))
    if (existente) {
      onCriada(existente)
      return
    }
    const cor = PALETA_CATEGORIAS[dados.categorias.length % PALETA_CATEGORIAS.length]
    const c = adicionarCategoria({ nome: n, tipo, cor })
    avisar(`Categoria "${n}" criada.`)
    onCriada(c)
  }

  return (
    <div className="flex gap-1">
      <input
        autoFocus
        className="input"
        placeholder="Nome da categoria"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            criar()
          }
          if (e.key === 'Escape') {
            e.stopPropagation()
            onCancelar()
          }
        }}
      />
      <button type="button" className="btn-icone h-[42px] w-[42px] text-emerald-600" onClick={criar} aria-label="Criar categoria">
        <Check size={18} />
      </button>
      <button type="button" className="btn-icone h-[42px] w-[42px]" onClick={onCancelar} aria-label="Cancelar">
        <X size={18} />
      </button>
    </div>
  )
}
