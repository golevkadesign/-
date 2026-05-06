import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

export async function queryYahooFinance(symbols: string[]) {
  const results: any = {};
  for (const sym of symbols) {
    try {
      const quote: any = await Promise.race([
        yahooFinance.quote(sym),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Yahoo Finance Timeout')), 4000))
      ]);
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
