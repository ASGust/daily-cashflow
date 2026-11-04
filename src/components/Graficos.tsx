import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Centavos } from '../types'
import { useUI } from '../store/UIContext'
import { formatarComSinal, formatarReal } from '../lib/dinheiro'
import { PontoCor } from './ui'

const VERDE = '#10b981'
const VERMELHO = '#ef4444'

function useCoresEixo() {
  const { escuro } = useUI()
  return {
    texto: escuro ? '#94a3b8' : '#64748b',
    grade: escuro ? '#1e293b' : '#e2e8f0',
    fundoTooltip: escuro ? '#0f172a' : '#ffffff',
    bordaTooltip: escuro ? '#334155' : '#e2e8f0',
    cursor: escuro ? 'rgba(148,163,184,0.08)' : 'rgba(100,116,139,0.08)',
  }
}

/** "R$ 1,2 mil" para eixos compactos. */
function compacto(centavos: number) {
  const v = centavos / 100
  if (Math.abs(v) >= 1000) return `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

export interface PontoDiario {
  dia: string
  rotulo: string
  saldo: Centavos
  entradas: Centavos
  saidas: Centavos
}

export function GraficoSaldoDiario({ dados }: { dados: PontoDiario[] }) {
  const c = useCoresEixo()
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={dados} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={c.grade} />
        <XAxis dataKey="dia" tick={{ fill: c.texto, fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={4} />
        <YAxis tickFormatter={compacto} tick={{ fill: c.texto, fontSize: 11 }} tickLine={false} axisLine={false} width={52} />
        <ReferenceLine y={0} stroke={c.texto} strokeOpacity={0.4} />
        <Tooltip
          cursor={{ fill: c.cursor }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const p = payload[0].payload as PontoDiario
            return (
              <div className="rounded-xl border px-3 py-2 text-xs shadow-lg" style={{ background: c.fundoTooltip, borderColor: c.bordaTooltip }}>
                <p className="mb-1 font-semibold">{p.rotulo}</p>
                <p className="text-emerald-600 dark:text-emerald-400">Entradas: {formatarReal(p.entradas)}</p>
                <p className="text-red-600 dark:text-red-400">Saídas: {formatarReal(p.saidas)}</p>
                <p className="mt-1 font-semibold">Saldo: {formatarComSinal(p.saldo)}</p>
              </div>
            )
          }}
        />
        <Bar dataKey="saldo" radius={[4, 4, 4, 4]} maxBarSize={28}>
          {dados.map((d) => (
            <Cell key={d.dia} fill={d.saldo >= 0 ? VERDE : VERMELHO} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export interface Fatia {
  nome: string
  valor: Centavos
  cor: string
}

export function GraficoRosca({ dados, rotuloCentro }: { dados: Fatia[]; rotuloCentro: string }) {
  const c = useCoresEixo()
  const total = dados.reduce((a, b) => a + b.valor, 0)
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-52 w-52 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={dados} dataKey="valor" nameKey="nome" innerRadius="64%" outerRadius="100%" paddingAngle={2} stroke="none">
              {dados.map((d) => (
                <Cell key={d.nome} fill={d.cor} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const p = payload[0].payload as Fatia
                return (
                  <div className="rounded-xl border px-3 py-2 text-xs shadow-lg" style={{ background: c.fundoTooltip, borderColor: c.bordaTooltip }}>
                    <p className="font-semibold">{p.nome}</p>
                    <p>
                      {formatarReal(p.valor)} · {((p.valor / total) * 100).toFixed(1).replace('.', ',')}%
                    </p>
                  </div>
                )
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-slate-500 dark:text-slate-400">{rotuloCentro}</span>
          <span className="text-base font-bold tabular-nums">{formatarReal(total)}</span>
        </div>
      </div>
      <ul className="w-full space-y-1.5 text-sm">
        {dados.map((d) => (
          <li key={d.nome} className="flex items-center gap-2">
            <PontoCor cor={d.cor} />
            <span className="flex-1 truncate">{d.nome}</span>
            <span className="text-xs text-slate-500 tabular-nums dark:text-slate-400">
              {((d.valor / total) * 100).toFixed(0)}%
            </span>
            <span className="w-24 text-right font-medium tabular-nums">{formatarReal(d.valor)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Barras horizontais simples (sem Recharts) — mais legíveis para nomes longos no celular. */
export function BarrasHorizontais({ dados, cor = VERDE }: { dados: { nome: string; valor: Centavos }[]; cor?: string }) {
  const max = Math.max(...dados.map((d) => d.valor), 1)
  return (
    <ul className="space-y-3">
      {dados.map((d) => (
        <li key={d.nome}>
          <div className="mb-1 flex justify-between gap-2 text-sm">
            <span className="truncate">{d.nome}</span>
            <span className="font-medium tabular-nums">{formatarReal(d.valor)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-full rounded-full" style={{ width: `${(d.valor / max) * 100}%`, backgroundColor: cor }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
