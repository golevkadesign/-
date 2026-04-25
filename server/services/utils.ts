export function extractTickers(text: string): string[] {
  // A simple regex to find typical US/HK stock symbols (e.g. AAPL, TSLA, 0700.HK)
  const matches = text.match(/\b([A-Z]{1,5}(?:\.[A-Z]{2})?)\b/g);
  if (!matches) return [];
  
  // Filter out common non-ticker capitals and duplicates
  const ignoreList = new Set(["AI", "USA", "RMB", "CNY", "USD", "ETF", "JSON", "FCF"]);
  const unique = Array.from(new Set(matches)).filter(s => !ignoreList.has(s) && s.length > 0);
  return unique.slice(0, 5); // Limit free queries
}
