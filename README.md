# Meu Caixa — Personal / small business cash flow tracker

A web app in Brazilian Portuguese for recording income and expenses, tracking bills to pay and seeing the **profit or loss of each day**, with weekly and monthly summaries. Amounts are in Brazilian Real (R$) and dates use the DD/MM/YYYY format.

Built with React 18 + TypeScript + Vite + Tailwind CSS 4 + Recharts. Data is stored in the browser (localStorage).

## Installing and running

Requirement: [Node.js](https://nodejs.org) 18 or newer.

```bash
cd site_financas
npm install
npm run dev
```

Open the address shown in the terminal (usually http://localhost:5173).

Other commands:

| Command             | What it does                                                  |
| ------------------- | ------------------------------------------------------------- |
| `npm run build`     | Type-checks and builds the production version into `dist/`    |
| `npm run preview`   | Serves the production build locally                           |
| `npm run typecheck` | Only runs the TypeScript type check                           |

The `dist/` folder is static, so it can be published on any static hosting service (Netlify, Vercel, GitHub Pages, etc.).

## Features

- **Dashboard (Painel)**: running balance; income, expenses and result for the day, the week (Monday to Sunday) and the month; chart of the daily balance for the month; donut chart of spending by category; top income sources; upcoming bills, with a button to pay them.
- **Transactions (Lançamentos)**: create, edit, delete, search and filter by text, type, category, source/destination and date range. The list is grouped by day, with each day's balance.
- **Daily result (Resultado do dia)**: cards in the format *"Dia 1 – Segunda-feira, 02/11/2026"* ("Day 1 – Monday, 11/02/2026") listing income, expenses (with their descriptions) and the **day's balance**, in green with "+" or in red with "−". It also shows how many days in the month were profitable and how many had a loss.
- **Bills to pay (Contas a pagar)**: status Pending, Paid or Overdue. Overdue bills appear in red and bills due within the next 7 days in yellow. When a bill is **paid**, the app automatically creates an expense transaction. **Recurring** (monthly) bills create next month's bill when paid. Payments can also be undone.
- **Reports (Relatórios)**: custom date range or shortcuts (this month, last month, last 7 or 30 days, this year). Shows totals, daily average, best and worst day, a month-by-month summary and totals by category.
- **Export/Import**: CSV in the Brazilian Excel format (`;` separator, decimal comma, UTF-8), which opens directly in Excel. Import accepts the app's own exported CSV or spreadsheets with the same columns, shows a preview and creates any categories that don't exist yet.
- **Backup**: downloads a JSON file with all data and can restore from it.
- **Settings (Configurações)**: light, dark or system theme; create, rename, recolor and delete categories; load or delete the sample data; delete all data.
- Floating **"+ Novo lançamento"** ("+ New transaction") button on every screen. Responsive layout, with a sidebar on desktop and bottom navigation on mobile.

### Sample data

On first launch the app comes with transactions from 11/02/2026 to 11/06/2026 and a few bills: one overdue, a few due soon and one recurring bill already paid. Under **Configurações → Dados de exemplo** (Settings → Sample data) you can delete only the sample records; anything you entered yourself stays untouched. The day 11/02/2026 reproduces the requested example: a R$ 10.00 service and R$ 5.00 of bread, with a balance of **+R$ 5.00**.

### How "Day N" is counted

**Day 1** is the date of the first recorded transaction. The remaining days are numbered from it: the next day is Day 2, and so on.

## Project structure

```
site_financas/
├── index.html                 # Base HTML (lang pt-BR, applies the theme before loading)
├── vite.config.ts             # Vite + React + Tailwind
└── src/
    ├── types.ts               # Domain types: Lancamento, Conta, Categoria, DadosFinanceiros
    ├── main.tsx / App.tsx     # Entry point and page switching (#hash routes)
    ├── index.css              # Tailwind + utility classes (card, input, btn-*)
    ├── lib/                   # Pure logic, no React
    │   ├── dinheiro.ts        # Cents ⇄ text, R$ formatting and +/− signs
    │   ├── datas.ts           # ISO dates, DD/MM/YYYY, weekday, week/month
    │   ├── calculos.ts        # Totals, daily summary, bill status
    │   ├── csv.ts             # CSV export/import
    │   ├── repositorio.ts     # ⇦ DATA LAYER (interface + localStorage)
    │   ├── exemplo.ts         # Default categories and sample data
    │   └── util.ts            # ids, file download, text normalization
    ├── store/
    │   ├── FinancasContext.tsx  # State and actions (transactions, bills, categories)
    │   └── UIContext.tsx        # Current page, theme, modals, toasts and confirmations
    ├── components/            # Layout, forms, charts and UI components
    └── pages/                 # Dashboard, Transactions, Days, Bills, Reports, Settings
```

### Key decisions

- **Money in cents.** Every amount is an integer (`R$ 5.00 = 500`). The amount field works like an ATM: typing `5`, `0`, `0` gives R$ 5.00. Text conversion never goes through a decimal number (`float`), so there are no rounding errors.
- **Dates as `YYYY-MM-DD` strings.** This avoids time zone issues; dates are formatted as DD/MM/YYYY only for display.
- **"Overdue" status is computed**, not stored: a pending bill whose due date is before today is shown as overdue.
- **Isolated data layer.** Screens only use `useFinancas()`, and only `FinancasContext` talks to `RepositorioFinanceiro`.

### Migrating to Supabase/Firebase (with login)

1. Create a class that implements `RepositorioFinanceiro` (in `src/lib/repositorio.ts`), with the methods `carregar()` (load), `salvar()` (save) and `limpar()` (clear), reading and writing the logged-in user's `lancamentos`, `contas` and `categorias` tables.
2. Replace the line `export const repositorio = new RepositorioLocalStorage()` with the new class.
3. To save incrementally (instead of the whole document), call the repository inside each `FinancasContext` action (`adicionarLancamento`, `pagarConta`, etc.). The screens don't need to change.

## Acceptance criteria (verified)

- Recording a R$ 5.00 expense (bread) and a R$ 10.00 income (service) on 11/02/2026 → **"Dia 1 – Segunda-feira, 02/11/2026"** with a balance of **+R$ 5.00**.
- Marking a bill as paid → the balance goes down and the expense appears in the transactions for the payment date.
- Data persists after closing and reopening the browser (localStorage). Use the JSON backup to move data to another browser or computer.