import { useState } from 'react'
import { Plus, Sparkles, Trash2 } from 'lucide-react'
import type { Categoria } from '../types'
import { useFinancas } from '../store/FinancasContext'
import { useUI } from '../store/UIContext'
import { ehExemplo } from '../lib/exemplo'
import { Cabecalho } from '../components/ui'
import { SeletorTema } from '../components/Layout'
import { NovaCategoriaInline, PALETA_CATEGORIAS } from '../components/NovaCategoriaInline'

const TIPOS: { id: Categoria['tipo']; nome: string }[] = [
  { id: 'ambos', nome: 'Entradas e saídas' },
  { id: 'entrada', nome: 'Entradas' },
  { id: 'saida', nome: 'Saídas' },
]

export function Configuracoes() {
  const { dados, atualizarCategoria, excluirCategoria, carregarExemplo, apagarExemplo, apagarTudo } = useFinancas()
  const { confirmar, avisar } = useUI()
  const [criando, setCriando] = useState(false)
  const qtdExemplo = dados.lancamentos.filter(ehExemplo).length + dados.contas.filter(ehExemplo).length

  async function excluirCat(c: Categoria) {
    const usos = dados.lancamentos.filter((l) => l.categoriaId === c.id).length + dados.contas.filter((x) => x.categoriaId === c.id).length
    const ok = await confirmar({
      titulo: `Excluir categoria "${c.nome}"?`,
      mensagem: usos ? `${usos} lançamento(s)/conta(s) usam esta categoria e serão movidos para "Outros".` : 'Nenhum lançamento usa esta categoria.',
      botao: 'Excluir',
      perigo: true,
    })
    if (ok) {
      excluirCategoria(c.id)
      avisar('Categoria excluída.')
    }
  }

  return (
    <>
      <Cabecalho titulo="Configurações" subtitulo="Aparência, categorias e dados" />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-semibold">Aparência</h2>
          <SeletorTema />
        </section>

        <section className="card p-5">
          <h2 className="font-semibold">Dados de exemplo</h2>
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            {qtdExemplo
              ? `Há ${qtdExemplo} registro(s) de exemplo (novembro/2026). Apagá-los não afeta o que você cadastrou.`
              : 'Nenhum dado de exemplo carregado.'}
          </p>
          <div className="flex flex-wrap gap-2">
            {qtdExemplo > 0 ? (
              <button
                className="btn-secundario"
                onClick={async () => {
                  if (await confirmar({ titulo: 'Apagar dados de exemplo?', mensagem: 'Os lançamentos e contas de exemplo serão removidos. Seus próprios registros serão mantidos.', botao: 'Apagar exemplo', perigo: true })) {
                    apagarExemplo()
                    avisar('Dados de exemplo apagados.')
                  }
                }}
              >
                <Trash2 size={16} /> Apagar dados de exemplo
              </button>
            ) : (
              <button className="btn-secundario" onClick={() => { carregarExemplo(); avisar('Dados de exemplo carregados.') }}>
                <Sparkles size={16} /> Carregar dados de exemplo
              </button>
            )}
          </div>
        </section>

        <section className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Categorias</h2>
            {!criando && (
              <button className="btn-secundario px-3 py-2" onClick={() => setCriando(true)}>
                <Plus size={16} /> Nova categoria
              </button>
            )}
          </div>
          {criando && (
            <div className="mb-3">
              <NovaCategoriaInline tipo="ambos" onCriada={() => setCriando(false)} onCancelar={() => setCriando(false)} />
            </div>
          )}
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {dados.categorias.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 py-2.5">
                <label className="relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-lg" style={{ backgroundColor: c.cor }} title="Alterar cor">
                  <input
                    type="color"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    value={c.cor}
                    list="paleta"
                    onChange={(e) => atualizarCategoria(c.id, { cor: e.target.value })}
                  />
                </label>
                <input
                  className="input min-w-40 flex-1 py-2"
                  value={c.nome}
                  onChange={(e) => atualizarCategoria(c.id, { nome: e.target.value })}
                  aria-label="Nome da categoria"
                />
                <select
                  className="input w-auto py-2"
                  value={c.tipo}
                  onChange={(e) => atualizarCategoria(c.id, { tipo: e.target.value as Categoria['tipo'] })}
                  aria-label="Usada em"
                >
                  {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
                <button className="btn-icone hover:text-red-600" onClick={() => excluirCat(c)} aria-label={`Excluir ${c.nome}`} disabled={dados.categorias.length <= 1}>
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
          <datalist id="paleta">{PALETA_CATEGORIAS.map((p) => <option key={p} value={p} />)}</datalist>
        </section>

        <section className="card border-red-200 p-5 lg:col-span-2 dark:border-red-500/30">
          <h2 className="font-semibold text-red-600 dark:text-red-400">Zona de perigo</h2>
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            Os dados ficam salvos apenas neste navegador (localStorage). Faça backups em Relatórios.
          </p>
          <button
            className="btn-perigo"
            onClick={async () => {
              if (await confirmar({ titulo: 'Apagar TODOS os dados?', mensagem: 'Todos os lançamentos, contas e categorias personalizadas serão apagados. Esta ação não pode ser desfeita.', botao: 'Apagar tudo', perigo: true })) {
                apagarTudo()
                avisar('Todos os dados foram apagados.')
              }
            }}
          >
            <Trash2 size={16} /> Apagar todos os dados
          </button>
        </section>
      </div>
    </>
  )
}
