// Shared news importance tagging utility (keyword-based, runs client-side, zero API cost)

export interface NewsTag {
  label: string;
  color: string;
  bg: string;
}

const TAG_RULES: Array<{ keywords: string[]; tag: NewsTag }> = [
  {
    keywords: ['war', 'attack', 'crisis', 'collapse', 'resign', 'fired', 'hack', 'emergency', 'invasion', 'sanction', 'default', 'bankrupt', 'crash', 'explosion', 'killed', 'shooting'],
    tag: { label: 'BREAKING', color: '#ef4444', bg: '#ef444420' },
  },
  {
    keywords: ['fed', 'federal reserve', 'powell', 'fomc', 'rate cut', 'rate hike', 'interest rate', 'quantitative', 'monetary policy', 'basis points', 'hawkish', 'dovish'],
    tag: { label: 'FED', color: '#f97316', bg: '#f9731620' },
  },
  {
    keywords: ['gdp', 'unemployment', 'jobs report', 'nonfarm', 'inflation', 'cpi', 'pce', 'recession', 'economic growth', 'consumer price', 'producer price', 'payrolls'],
    tag: { label: 'MACRO', color: '#38bdf8', bg: '#38bdf820' },
  },
  {
    keywords: ['earnings', 'quarterly', 'revenue', 'profit', 'eps', 'beat', 'miss', 'guidance', 'outlook', 'results', ' q1 ', ' q2 ', ' q3 ', ' q4 ', 'annual report', 'fiscal'],
    tag: { label: 'EARNINGS', color: '#4ade80', bg: '#4ade8020' },
  },
  {
    keywords: ['merger', 'acquisition', 'acquire', 'buyout', 'takeover', 'deal', ' ipo ', 'spinoff', 'divest', 'stake', 'bid for', 'bought by', 'to buy'],
    tag: { label: 'DEAL', color: '#f472b6', bg: '#f472b620' },
  },
  {
    keywords: ['tariff', 'trade war', 'regulation', 'ban', 'lawsuit', 'antitrust', 'sec charges', 'fine', 'penalty', 'investigation', 'subpoena', 'probe'],
    tag: { label: 'POLICY', color: '#a78bfa', bg: '#a78bfa20' },
  },
  {
    keywords: ['ai ', 'artificial intelligence', 'chatgpt', 'openai', 'nvidia', 'chip', 'semiconductor', 'launch', 'breakthrough', 'model', 'llm'],
    tag: { label: 'TECH', color: '#06b6d4', bg: '#06b6d420' },
  },
];

export function tagNews(headline: string, summary?: string): NewsTag | null {
  const text = `${headline} ${summary || ''}`.toLowerCase();
  for (const rule of TAG_RULES) {
    if (rule.keywords.some(kw => text.includes(kw))) {
      return rule.tag;
    }
  }
  return null;
}
