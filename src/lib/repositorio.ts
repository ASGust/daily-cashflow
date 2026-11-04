import type { DadosFinanceiros } from '../types'

/**
 * Camada de persistência isolada.
 *
 * O restante do app só conhece esta interface. Para migrar para Supabase/Firebase,
 * basta criar outra implementação (ex.: `RepositorioSupabase`) que leia/grave
 * as tabelas `lancamentos`, `contas` e `categorias` do usuário logado, e trocá-la
 * em `repositorio` no fim deste arquivo. Os métodos já são assíncronos por isso.
 */
export interface RepositorioFinanceiro {
  /** Retorna os dados salvos, ou null se nunca houve dados (primeiro acesso). */
  carregar(): Promise<DadosFinanceiros | null>
  salvar(dados: DadosFinanceiros): Promise<void>
  limpar(): Promise<void>
}

const CHAVE = 'financas:dados:v1'

export class RepositorioLocalStorage implements RepositorioFinanceiro {
  async carregar(): Promise<DadosFinanceiros | null> {
    try {
      const bruto = localStorage.getItem(CHAVE)
      if (!bruto) return null
      return validarDados(JSON.parse(bruto))
    } catch (e) {
      console.error('Falha ao ler dados salvos', e)
      return null
    }
  }

  async salvar(dados: DadosFinanceiros): Promise<void> {
    localStorage.setItem(CHAVE, JSON.stringify(dados))
  }

  async limpar(): Promise<void> {
    localStorage.removeItem(CHAVE)
  }
}

/** Valida (de forma leve) uma estrutura vinda do armazenamento ou de um backup JSON. */
export function validarDados(obj: unknown): DadosFinanceiros {
  const o = obj as Partial<DadosFinanceiros>
  if (!o || typeof o !== 'object') throw new Error('Arquivo inválido.')
  if (!Array.isArray(o.lancamentos) || !Array.isArray(o.contas) || !Array.isArray(o.categorias)) {
    throw new Error('O arquivo não parece ser um backup deste aplicativo.')
  }
  for (const l of o.lancamentos) {
    if (!Number.isInteger(l.valor) || !/^\d{4}-\d{2}-\d{2}$/.test(l.data) || !['entrada', 'saida'].includes(l.tipo)) {
      throw new Error(`Lançamento inválido no backup: ${JSON.stringify(l).slice(0, 80)}`)
    }
  }
  for (const c of o.contas) {
    if (!Number.isInteger(c.valor) || !/^\d{4}-\d{2}-\d{2}$/.test(c.vencimento)) {
      throw new Error(`Conta inválida no backup: ${JSON.stringify(c).slice(0, 80)}`)
    }
  }
  return { versao: 1, lancamentos: o.lancamentos, contas: o.contas, categorias: o.categorias }
}

export const repositorio: RepositorioFinanceiro = new RepositorioLocalStorage()
