import { FORMAS_PAGAMENTO, type Categoria, type FormaPagamento, type Lancamento } from '../types'
import { formatarData, textoParaISO } from './datas'
import { centavosParaTexto, textoParaCentavos } from './dinheiro'
import { normalizar } from './util'

/**
 * CSV no padrão do Excel brasileiro: separador ";", vírgula decimal, UTF-8 com BOM.
 * Abre direto no Excel/LibreOffice/Google Planilhas com acentos corretos.
 */
const CABECALHO = ['Data', 'Tipo', 'Valor', 'Descrição', 'Categoria', 'Origem/Destino', 'Forma de pagamento', 'Observação']

function escapar(campo: string): string {
  return /[";\n\r]/.test(campo) ? `"${campo.replace(/"/g, '""')}"` : campo
}

export function lancamentosParaCSV(lancamentos: Lancamento[], categorias: Categoria[]): string {
  const nomeCat = new Map(categorias.map((c) => [c.id, c.nome]))
  const linhas = [...lancamentos]
    .sort((a, b) => a.data.localeCompare(b.data) || a.criadoEm.localeCompare(b.criadoEm))
    .map((l) =>
      [
        formatarData(l.data),
        l.tipo === 'entrada' ? 'Entrada' : 'Saída',
        centavosParaTexto(l.valor),
        l.descricao,
        nomeCat.get(l.categoriaId) ?? '',
        l.origemDestino,
        l.formaPagamento,
        l.observacao ?? '',
      ]
        .map(escapar)
        .join(';'),
    )
  return '﻿' + [CABECALHO.join(';'), ...linhas].join('\r\n')
}

/** Parser de CSV com suporte a aspas, quebras de linha em campos e separador ; ou ,. */
export function lerCSV(texto: string): string[][] {
  const t = texto.replace(/^﻿/, '')
  const primeiraLinha = t.split(/\r?\n/, 1)[0] ?? ''
  const sep = (primeiraLinha.match(/;/g)?.length ?? 0) >= (primeiraLinha.match(/,/g)?.length ?? 0) ? ';' : ','
  const linhas: string[][] = []
  let linha: string[] = []
  let campo = ''
  let aspas = false
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (aspas) {
      if (c === '"' && t[i + 1] === '"') { campo += '"'; i++ }
      else if (c === '"') aspas = false
      else campo += c
    } else if (c === '"') aspas = true
    else if (c === sep) { linha.push(campo); campo = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++
      linha.push(campo); campo = ''
      if (linha.some((x) => x.trim() !== '')) linhas.push(linha)
      linha = []
    } else campo += c
  }
  linha.push(campo)
  if (linha.some((x) => x.trim() !== '')) linhas.push(linha)
  return linhas
}

export interface ResultadoImportacao {
  lancamentos: Omit<Lancamento, 'id' | 'criadoEm' | 'atualizadoEm'>[]
  /** Categorias citadas no CSV que ainda não existem (serão criadas). */
  novasCategorias: string[]
  erros: string[]
}

/**
 * Converte o CSV em lançamentos. Reconhece colunas pelo nome do cabeçalho
 * (sem diferenciar acentos/maiúsculas), então aceita o arquivo exportado pelo app
 * ou planilhas próprias com as mesmas colunas em qualquer ordem.
 */
export function csvParaLancamentos(texto: string, categorias: Categoria[]): ResultadoImportacao {
  const linhas = lerCSV(texto)
  const erros: string[] = []
  if (linhas.length < 2) return { lancamentos: [], novasCategorias: [], erros: ['Arquivo vazio ou sem linhas de dados.'] }

  const cab = linhas[0].map(normalizar)
  const col = (...nomes: string[]) => cab.findIndex((c) => nomes.some((n) => c.startsWith(n)))
  const iData = col('data')
  const iTipo = col('tipo')
  const iValor = col('valor')
  const iDesc = col('descricao')
  const iCat = col('categoria')
  const iOrig = col('origem', 'destino')
  const iForma = col('forma')
  const iObs = col('observacao', 'obs')
  if (iData < 0 || iValor < 0) {
    return { lancamentos: [], novasCategorias: [], erros: ['Cabeçalho precisa ter ao menos as colunas "Data" e "Valor".'] }
  }

  const porNome = new Map(categorias.map((c) => [normalizar(c.nome), c]))
  const novas = new Map<string, string>()
  const resultado: ResultadoImportacao['lancamentos'] = []

  linhas.slice(1).forEach((l, idx) => {
    const n = idx + 2
    const get = (i: number) => (i >= 0 ? (l[i] ?? '').trim() : '')
    const data = textoParaISO(get(iData))
    if (!data) return erros.push(`Linha ${n}: data inválida "${get(iData)}".`)
    let valor = textoParaCentavos(get(iValor))
    if (valor === null || valor === 0) return erros.push(`Linha ${n}: valor inválido "${get(iValor)}".`)

    const tipoTxt = normalizar(get(iTipo))
    let tipo: Lancamento['tipo']
    if (tipoTxt.startsWith('s') || tipoTxt.startsWith('d')) tipo = 'saida' // Saída / Despesa / Débito
    else if (tipoTxt.startsWith('e') || tipoTxt.startsWith('r') || tipoTxt.startsWith('c')) tipo = 'entrada' // Entrada / Receita / Crédito
    else tipo = valor < 0 ? 'saida' : 'entrada'
    valor = Math.abs(valor)

    const nomeCat = get(iCat) || 'Outros'
    let categoriaId = porNome.get(normalizar(nomeCat))?.id
    if (!categoriaId) {
      const chave = normalizar(nomeCat)
      if (!novas.has(chave)) novas.set(chave, nomeCat)
      categoriaId = `nova:${nomeCat}`
    }

    const formaTxt = normalizar(get(iForma))
    const forma: FormaPagamento =
      FORMAS_PAGAMENTO.find((f) => normalizar(f) === formaTxt) ?? (formaTxt.includes('pix') ? 'Pix' : 'Dinheiro')

    resultado.push({
      tipo,
      valor,
      data,
      descricao: get(iDesc) || '(sem descrição)',
      categoriaId,
      origemDestino: get(iOrig),
      formaPagamento: forma,
      observacao: get(iObs) || undefined,
    })
  })

  return { lancamentos: resultado, novasCategorias: [...novas.values()], erros }
}
