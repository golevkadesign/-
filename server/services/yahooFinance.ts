import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

export async function queryYahooFinance(symbols: string[]) {
  const results: any = {};
  for (const sym of symbols) {
    try {
      const quote: any = await yahooFinance.quote(sym);
      if (quote) {
        results[sym] = {
          price: quote.regularMarketPrice,
          change: quote.regularMarketChangePercent,
          high52: quote.fiftyTwoWeekHigh,
          low52: quote.fiftyTwoWeekLow,
        };
      } else {
        console.warn(`Yahoo Finance fetch returned no data for ${sym}`);
      }
    } catch (e: any) {
      console.warn(`Yahoo Finance fetch failed for ${sym}:`, e.message);
    }
  }
  return results;
}
