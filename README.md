# Saifberg Terminal

**[🚀 Live Demo → saifberg-terminal.vercel.app](https://saifberg-terminal.vercel.app)**

A Bloomberg-style financial terminal built with Next.js 15, powered by real market data and AI analysis. Mobile-responsive and fully open source.

## Features

### Market Dashboard (Home)
- **Live Index Tracker** — S&P 500, NASDAQ 100, Dow Jones, Russell 2K, VIX, Gold, Bitcoin
- **Sector Performance** — All 11 S&P sectors with today + 1-month performance bars, click to drill down
- **Market Movers** — Top gainers, losers, and most active stocks with company logos
- **AI Market Brief** — Gemini-powered daily market summary with sector picks and risk alerts
- **Earnings Calendar** — Week-view calendar grouped by Before Open / After Close with logos + search
- **Options Flow** — Unusual options activity with Call/Put sentiment, sortable by premium / volume / Vol-OI
- **Stock Screener** — Filter by sector, market cap, P/E, dividend yield, beta
- **AI Stock Picker** — Gemini-powered stock picks based on current market conditions
- **Macro Dashboard** — Key macroeconomic indicators

### Stock Terminal
Search any ticker to open a Bloomberg-style terminal with 9 panels via command bar:

| Command | Panel | Description |
|---------|-------|-------------|
| `GP` | Chart | Interactive price chart with 1D / 5D / 1M / 3M / 6M / 1Y / 2Y / 5Y ranges |
| `FA` | Fundamentals | Full financials — valuation, margins, balance sheet, growth metrics |
| `AI` | AI Analysis | Gemini deep-dive with verdict, bull/bear case, catalysts, 12M price target |
| `CN` | News | Company news with AI summarization |
| `PEERS` | Peers | Peer comparison heat map with live quotes |
| `ERN` | Earnings | Earnings history + upcoming dates with beat/miss tracking |
| `DVD` | Dividends | Dividend history and yield analysis |
| `TA` | Technical | RSI, MACD, Bollinger Bands, volume analysis |
| `DCF` | Valuation | DCF intrinsic value model |

### Ask AI Analyst (in AI tab)
Chat with Gemini about any stock in natural language:
- *"Why is the stock up today?"*
- *"Will it continue to rally?"*
- *"Should I buy now?"*
- *"What are the biggest risks?"*

### Left Sidebar (per ticker)
- Key metrics: Market Cap, P/E, EPS, Beta, Net Margin, Dividend Yield
- 52-Week range visual
- Analyst consensus with target price
- Peer list with live change %

### Mobile Support
Fully responsive with a bottom tab navigation on mobile:
- **Stats** tab — sidebar metrics
- **Chart** tab — price chart
- **AI** tab — AI analysis + chat
- **News** tab — company news
- **Peers** tab — peer heat map

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Icons | Lucide React |
| Market Data | Financial Modeling Prep (FMP) |
| News / Calendar | Finnhub |
| AI | Google Gemini 2.5 Flash |

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/your-username/saifberg-terminal.git
cd saifberg-terminal
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up API keys

Copy the example env file and fill in your keys:

```bash
cp .env.example .env.local
```

```env
FMP_API_KEY=your_fmp_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
FINNHUB_API_KEY=your_finnhub_api_key_here
```

You can also enter keys directly in the app via **Settings ⚙** without restarting.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Node version:** Requires Node 20+. If using nvm: `nvm use 20`

---

## API Keys

All three APIs have **free tiers** that cover the core features:

| API | Free Tier Covers | Get Key |
|-----|-----------------|---------|
| [Financial Modeling Prep](https://financialmodelingprep.com/developer/docs) | Quotes, fundamentals, chart data, sector performance | [Register →](https://financialmodelingprep.com/register) |
| [Finnhub](https://finnhub.io) | News, earnings calendar, peer lists | [Register →](https://finnhub.io/register) |
| [Google Gemini](https://aistudio.google.com) | AI Analysis, AI chat, AI Picks (Gemini 2.5 Flash) | [Get Key →](https://aistudio.google.com/app/apikey) |

> **Note:** Gainers/Losers/Most Active and Options Flow require an FMP premium plan. The app degrades gracefully when data is unavailable.

---

## Deployment

### Deploy to Vercel (recommended)

1. Push your repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import your repository
3. Add environment variables in the Vercel dashboard:
   - `FMP_API_KEY`
   - `GEMINI_API_KEY`
   - `FINNHUB_API_KEY`
4. Click **Deploy**

> API keys are server-side only — they are never exposed to the browser.

---

## Project Structure

```
src/
├── app/
│   ├── api/                    # API routes (server-side, keys stay secret)
│   │   ├── ai-analysis/        # Gemini stock deep-dive
│   │   ├── ai-chat/            # Ask AI Analyst conversational chat
│   │   ├── ai-market/          # AI market brief
│   │   ├── chart/              # OHLCV price history
│   │   ├── finnhub/            # News, earnings calendar, peers
│   │   ├── fmp/                # Options flow, dividends, DCF, sectors
│   │   ├── fundamentals/       # Company fundamentals
│   │   └── quote/              # Live & batch quotes
│   ├── globals.css             # Design system + Tailwind v4 theme
│   └── page.tsx                # Root layout with mobile/desktop switching
├── components/
│   ├── AIAnalysis.tsx          # AI deep-dive panel + chat interface
│   ├── EarningsCalendar.tsx    # Week-view earnings calendar with AI picks
│   ├── HomeBoard.tsx           # Home dashboard (overview / macro / earnings / options / screener / AI pick)
│   ├── OptionsFlow.tsx         # Options flow table
│   ├── PeersBar.tsx            # Peer comparison heat bar
│   ├── StockDetail.tsx         # Main stock terminal with command bar
│   ├── StockSidebar.tsx        # Key metrics + analyst sidebar
│   ├── TerminalHeader.tsx      # Top navigation header
│   └── ...
└── lib/
    ├── apiClient.ts            # apiFetch() — injects API key headers
    ├── signals.ts              # Buy/sell signal scoring logic
    └── types.ts                # Shared TypeScript types
```

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes
4. Push and open a PR

---

## License

[MIT](LICENSE)

---

*Not financial advice. This is an educational and informational project only.*
