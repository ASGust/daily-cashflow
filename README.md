# Meu Caixa

**Personal and small business cash flow tracker.** Record income and expenses, keep track of bills to pay and see the **profit or loss of each day**, with weekly and monthly summaries.

The interface is in Brazilian Portuguese, amounts are in Brazilian Real (R$) and dates use the DD/MM/YYYY format.

<!-- Screenshot: drag an image into the GitHub editor here to show the app -->

Built with React 18, TypeScript, Vite, Tailwind CSS 4 and Recharts. All data is stored in your own browser (localStorage). There is no server, and nothing you enter is sent anywhere.

## Getting started

Requirement: [Node.js](https://nodejs.org) 18 or newer.

```bash
git clone https://github.com/YOUR-USER/meu-caixa.git
cd meu-caixa
npm install
npm run dev
```

Then open the address shown in the terminal (usually http://localhost:5173).

| Command             | What it does                                               |
| ------------------- | ---------------------------------------------------------- |
| `npm run dev`       | Starts the development server                              |
| `npm run build`     | Type-checks and builds the production version into `dist/` |
| `npm run preview`   | Serves the production build locally                        |
| `npm run typecheck` | Runs only the TypeScript type check                        |

The `dist/` folder is fully static, so it can be published on any static hosting service (GitHub Pages, Netlify, Vercel, etc.).

## Features

- **Dashboard (Painel):** running balance; income, expenses and result for the day, the week (Monday to Sunday) and the month; daily balance chart; spending by category; top income sources; upcoming bills with a quick "pay" button.
- **Transactions (Lançamentos):** create, edit, delete, search and filter by text, type, category, source/destination and date range. Transactions are grouped by day, with each day's balance.
- **Daily result (Resultado do dia):** one card per day, such as *"Dia 1 – Segunda-feira, 02/11/2026"*, listing income, expenses and the **day's balance**, shown in green with "+" or in red with "−". It also counts the profitable days and the days with a loss in each month.
- **Bills to pay (Contas a pagar):** each bill is Pending, Paid or Overdue. Overdue bills are highlighted in red and bills due in the next 7 days in yellow. Paying a bill automatically creates the matching expense. When a recurring (monthly) bill is paid, next month's bill is created. Payments can be undone.
- **Reports (Relatórios):** custom date range or shortcuts (this month, last month, last 7 or 30 days, this year). Shows totals, the daily average, the best and worst day, a month-by-month summary and totals by category.
- **CSV export and import:** files use the Brazilian Excel format (`;` separator, decimal comma, UTF-8) and open directly in Excel. Before importing, the app shows a preview, and it creates any category that doesn't exist yet.
- **Backup:** download all your data as a JSON file and restore it later, or on another device.
- **Settings (Configurações):** light, dark or system theme; manage categories (create, rename, recolor, delete); load or remove the sample data; delete all data.
- **Responsive layout:** a sidebar on desktop, bottom navigation on mobile and a floating **"+ Novo lançamento"** (new transaction) button on every screen.

## Example

Recording a R$ 10.00 income (a service) and a R$ 5.00 expense (bread) on 11/02/2026 gives this card on the daily result screen:

> **Dia 1 – Segunda-feira, 02/11/2026**
> Entradas: R$ 10,00 (serviço realizado)
> Saídas: R$ 5,00 (pão)
> **Saldo do dia: +R$ 5,00**

**Day 1** is the date of your first recorded transaction, and every later date is numbered from it.

### Sample data

On first launch the app includes sample transactions from 11/02/2026 to 11/06/2026 and a few bills (one overdue, some due soon and one recurring bill already paid), so you can explore every screen. To remove them, go to **Configurações → Dados de exemplo** (Settings → Sample data). Only the sample records are deleted; anything you entered yourself stays untouched.

## Project structure

```
meu-caixa/
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
    │   ├── repositorio.ts     # Data layer (interface + localStorage)
    │   ├── exemplo.ts         # Default categories and sample data
    │   └── util.ts            # ids, file download, text normalization
    ├── store/
    │   ├── FinancasContext.tsx  # State and actions (transactions, bills, categories)
    │   └── UIContext.tsx        # Current page, theme, modals, toasts and confirmations
    ├── components/            # Layout, forms, charts and UI components
    └── pages/                 # Dashboard, Transactions, Days, Bills, Reports, Settings
```

### Design decisions

- **Money in cents.** Every amount is stored as an integer (`R$ 5.00 = 500`). Typed text is converted without ever going through a floating-point number, so there are no rounding errors. The amount field fills from the right, like an ATM: typing `5`, `0`, `0` gives R$ 5.00.
- **Dates as `YYYY-MM-DD` strings.** This avoids time zone issues. Dates are converted to DD/MM/YYYY only for display.
- **"Overdue" is computed, not stored.** A pending bill whose due date has passed is shown as overdue automatically.
- **Isolated data layer.** Screens only use `useFinancas()`, and only `FinancasContext` talks to the storage through the `RepositorioFinanceiro` interface.

## Roadmap: cloud sync with login

Because each browser keeps its own data, the natural next step is a backend such as Supabase or Firebase:

1. Create a class that implements `RepositorioFinanceiro` (in `src/lib/repositorio.ts`), with the methods `carregar()` (load), `salvar()` (save) and `limpar()` (clear), reading and writing the logged-in user's `lancamentos`, `contas` and `categorias` tables.
2. Replace `export const repositorio = new RepositorioLocalStorage()` with the new class.
3. Optionally, save incrementally by calling the repository inside each `FinancasContext` action (`adicionarLancamento`, `pagarConta`, etc.). The screens don't need to change.

<!-- If you add a LICENSE file (for example MIT), add a "## License" section here. -->
