import * as crypto from 'crypto';
import { queryYahooFinance } from "./yahooFinance";

function getLongbridgeSignature(params: { method: string, path: string, query: string, body: string, accessToken: string, appKey: string, appSecret: string, timestamp: string }) {
    const { method, path, query, body, accessToken, appKey, appSecret, timestamp } = params;
    const signedHeaders = 'authorization;x-api-key;x-timestamp';
    const signedValues = `authorization:${accessToken}\nx-api-key:${appKey}\nx-timestamp:${timestamp}\n`;
    let strToSign = `${method}|${path}|${query}|${signedValues}|${signedHeaders}|`;
    if (body) {
        strToSign += crypto.createHash('sha1').update(body, 'utf8').digest('hex');
    }
    const strToSignHash = crypto.createHash('sha1').update(strToSign, 'utf8').digest('hex');
    const finalStrToSign = `HMAC-SHA256|${strToSignHash}`;
    const signature = crypto.createHmac('sha256', appSecret).update(finalStrToSign).digest('hex');
    return signature;
}

export async function getRealTimeQuotes(tickers: string[]) {
    if (!tickers || tickers.length === 0) return {};

    const appKey = process.env.LONGBRIDGE_APP_KEY?.trim();
    const appSecret = process.env.LONGBRIDGE_APP_SECRET?.trim();
    const accessToken = process.env.LONGBRIDGE_ACCESS_TOKEN?.trim();

    if (appKey && appSecret && accessToken) {
        try {
            // Try fetching from Longbridge
            const method = 'GET';
            // According to Longbridge API, it's /v1/quote/quote
            const path = '/v1/quote/quote';
            const query = `symbol=${tickers.join(',')}`;
            const timestamp = Date.now().toString();

            const signature = getLongbridgeSignature({ method, path, query, body: '', accessToken, appKey, appSecret, timestamp });

            const headers: any = {
                'Content-Type': 'application/json',
                'Authorization': accessToken,
                'X-Api-Key': appKey,
                'X-Timestamp': timestamp,
                'X-Api-Signature': `HMAC-SHA256 SignedHeaders=authorization;x-api-key;x-timestamp, Signature=${signature}`
            };

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);
            
            const response = await fetch(`https://openapi.longbridgeapp.com${path}?${query}`, {
                method,
                headers,
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const lbData: any = await response.json();
            
            if (lbData.code === 0 && lbData.data && lbData.data.length > 0) {
                const results: any = {};
                for (const quote of lbData.data) {
                    if (quote.last_done) {
                        results[quote.symbol] = {
                            price: Number(quote.last_done),
                            change: Number(quote.change_rate),
                            high: Number(quote.high || 0),
                            low: Number(quote.low || 0),
                            source: 'Longbridge'
                        };
                    }
                }
                if (Object.keys(results).length > 0) {
                    return results;
                }
            }
            throw new Error(`Longbridge API returned empty or error: ${JSON.stringify(lbData)}`);
        } catch (e: any) {
            console.error("Longbridge fetch failed, falling back to YahooFinance:", e.message);
            // Fallback to YahooFinance!
            return await queryYahooFinance(tickers);
        }
    }

    // Default to Yahoo Finance
    return await queryYahooFinance(tickers);
}
