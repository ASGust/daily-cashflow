import type { Categoria, Conta, DadosFinanceiros, FormaPagamento, Lancamento, TipoLancamento } from '../types'

/** Prefixo dos ids de dados de exemplo — permite apagá-los sem tocar nos dados do usuário. */
export const PREFIXO_EXEMPLO = 'exemplo-'

export const CATEGORIAS_PADRAO: Categoria[] = [
  { id: 'cat-alimentacao', nome: 'Alimentação', tipo: 'saida', cor: '#f97316' },
  { id: 'cat-transporte', nome: 'Transporte', tipo: 'saida', cor: '#0ea5e9' },
  { id: 'cat-servicos', nome: 'Serviços', tipo: 'ambos', cor: '#8b5cf6' },
  { id: 'cat-salario', nome: 'Salário', tipo: 'entrada', cor: '#10b981' },
  { id: 'cat-vendas', nome: 'Vendas', tipo: 'entrada', cor: '#22c55e' },
  { id: 'cat-contas-fixas', nome: 'Contas fixas', tipo: 'saida', cor: '#ef4444' },
  { id: 'cat-outros', nome: 'Outros', tipo: 'ambos', cor: '#64748b' },
]

let seq = 0
function lanc(
  data: string,
  tipo: TipoLancamento,
  valor: number,
  descricao: string,
  categoriaId: string,
  origemDestino: string,
  formaPagamento: FormaPagamento,
  extra: Partial<Lancamento> = {},
): Lancamento {
  seq++
  const ts = `${data}T${String(8 + seq % 10).padStart(2, '0')}:${String(seq).padStart(2, '0')}:00.000Z`
  return {
    id: `${PREFIXO_EXEMPLO}l${seq}`,
    tipo,
    valor,
    data,
    descricao,
    categoriaId,
    origemDestino,
    formaPagamento,
    criadoEm: ts,
    atualizadoEm: ts,
    ...extra,
  }
}

export function dadosExemplo(): Pick<DadosFinanceiros, 'lancamentos' | 'contas'> {
  seq = 0
  const lancamentos: Lancamento[] = [
    // Dia 1 – Segunda-feira, 02/11/2026: +R$ 5,00
    lanc('2026-11-02', 'entrada', 1000, 'Serviço realizado', 'cat-servicos', 'Cliente João', 'Pix'),
    lanc('2026-11-02', 'saida', 500, 'Pão', 'cat-alimentacao', 'Padaria', 'Dinheiro'),
    // 03/11
    lanc('2026-11-03', 'entrada', 25000, 'Venda de produtos', 'cat-vendas', 'Cliente Maria', 'Pix'),
    lanc('2026-11-03', 'entrada', 8000, 'Manutenção de computador', 'cat-servicos', 'Cliente João', 'Dinheiro'),
    lanc('2026-11-03', 'saida', 4590, 'Combustível', 'cat-transporte', 'Posto de combustível', 'Débito'),
    lanc('2026-11-03', 'saida', 3250, 'Almoço', 'cat-alimentacao', 'Restaurante', 'Crédito'),
    lanc('2026-11-03', 'saida', 9990, 'Internet', 'cat-contas-fixas', 'Provedor de internet', 'Pix', {
      contaId: `${PREFIXO_EXEMPLO}c1`,
      observacao: 'Pago a partir de Contas a pagar',
    }),
    // 04/11 — dia com prejuízo
    lanc('2026-11-04', 'entrada', 12000, 'Serviço de instalação', 'cat-servicos', 'Cliente Pedro', 'Transferência'),
    lanc('2026-11-04', 'saida', 30000, 'Compra de material', 'cat-outros', 'Loja de materiais', 'Boleto', {
      observacao: 'Cabos e conectores para próximos serviços',
    }),
    // 05/11
    lanc('2026-11-05', 'entrada', 350000, 'Pró-labore / salário', 'cat-salario', 'Conta bancária', 'Transferência'),
    lanc('2026-11-05', 'saida', 1840, 'Corrida por aplicativo', 'cat-transporte', 'App de transporte', 'Pix'),
    lanc('2026-11-05', 'saida', 2275, 'Café e lanche', 'cat-alimentacao', 'Padaria', 'Débito'),
    // 06/11
    lanc('2026-11-06', 'entrada', 45000, 'Venda de acessórios', 'cat-vendas', 'Cliente Maria', 'Pix'),
    lanc('2026-11-06', 'entrada', 15000, 'Serviço de manutenção', 'cat-servicos', 'Cliente Ana', 'Dinheiro'),
    lanc('2026-11-06', 'saida', 8990, 'Supermercado', 'cat-alimentacao', 'Supermercado', 'Crédito'),
  ]

  const criado = '2026-11-01T12:00:00.000Z'
  const conta = (n: number, c: Omit<Conta, 'id' | 'criadoEm'>): Conta => ({
    id: `${PREFIXO_EXEMPLO}c${n}`,
    criadoEm: criado,
    ...c,
  })
  const contas: Conta[] = [
    conta(1, {
      nome: 'Internet', valor: 9990, vencimento: '2026-11-04', status: 'paga', recorrente: true,
      categoriaId: 'cat-contas-fixas', destino: 'Provedor de internet', pagaEm: '2026-11-03', lancamentoId: `${PREFIXO_EXEMPLO}l7`,
    }),
    conta(2, {
      nome: 'Internet', valor: 9990, vencimento: '2026-12-04', status: 'pendente', recorrente: true,
      categoriaId: 'cat-contas-fixas', destino: 'Provedor de internet',
    }),
    conta(3, {
      nome: 'Energia elétrica', valor: 18990, vencimento: '2026-11-06', status: 'pendente', recorrente: true,
      categoriaId: 'cat-contas-fixas', destino: 'Companhia de energia',
    }),
    conta(4, {
      nome: 'Aluguel', valor: 120000, vencimento: '2026-11-10', status: 'pendente', recorrente: true,
      categoriaId: 'cat-contas-fixas', destino: 'Imobiliária',
    }),
    conta(5, {
      nome: 'Fornecedor de materiais', valor: 45000, vencimento: '2026-10-30', status: 'pendente', recorrente: false,
      categoriaId: 'cat-outros', destino: 'Distribuidora', observacao: 'Boleto da compra de outubro',
    }),
    conta(6, {
      nome: 'Fatura do cartão', valor: 62035, vencimento: '2026-11-15', status: 'pendente', recorrente: true,
      categoriaId: 'cat-outros', destino: 'Banco',
    }),
    conta(7, {
      nome: 'Imposto mensal (DAS)', valor: 7590, vencimento: '2026-11-20', status: 'pendente', recorrente: true,
      categoriaId: 'cat-contas-fixas', destino: 'Receita Federal',
    }),
  ]
  return { lancamentos, contas }
}

export function dadosIniciais(): DadosFinanceiros {
  return { versao: 1, categorias: CATEGORIAS_PADRAO, ...dadosExemplo() }
}

export function ehExemplo(item: { id: string }): boolean {
  return item.id.startsWith(PREFIXO_EXEMPLO)
}
