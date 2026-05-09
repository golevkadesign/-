import { getRealTimeQuotes } from "./marketData";
import { extractTickers } from "./utils";

import * as crypto from 'crypto';

interface DataProviderParams {
    message: string;
    contextData: any;
    settings: any;
    userId?: string;
    extractedTickers?: string[];
}

export interface DataProvider {
    name: string;
    fetch(params: DataProviderParams): Promise<{ source: string, payload: any }>;
}

const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map<string, { timestamp: number, data: any }>();

class MarketDataProvider implements DataProvider {
    name = "MarketData";
    
    async fetch({ message, contextData, extractedTickers }: DataProviderParams) {
        let symbolsToFetch = extractedTickers || [];
        if (!symbolsToFetch || symbolsToFetch.length === 0) {
            const allText = message + JSON.stringify(contextData?.distributions?.publicHoldings || []);
            symbolsToFetch = extractTickers(allText);
        }
        
        if (symbolsToFetch.length === 0) return { source: this.name, payload: null };
        
        const cacheKey = `market_${symbolsToFetch.sort().join('_')}`;
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return { source: `${this.name} (Cache)`, payload: cached.data };
        }
        
        try {
            const data = await getRealTimeQuotes(symbolsToFetch);
            cache.set(cacheKey, { timestamp: Date.now(), data });
            return { source: this.name, payload: data };
        } catch (e) {
            console.error("MarketData fetch error:", e);
            return { source: this.name, payload: null };
        }
    }
}

class LongbridgeLiveProvider implements DataProvider {
    name = "LongbridgeLive";
    
    async fetch({ settings, userId }: any) {
        // According to architecture, Longbridge API Key should be stored in Firestore's private user config.
        // We'd load it here using Firebase Admin SDK: `const userSettings = await admin.firestore().collection('userPrivate').doc(userId).get();`
        // Fallback to client provided settings or env var.
        let accessToken = (settings?.longbridgeKey || '').trim();
        let appKey = (settings?.longbridgeAppKey || '').trim();
        let appSecret = (settings?.longbridgeAppSecret || '').trim();
        
        if (!accessToken) {
            return { source: this.name, payload: null };
        }
        
        const cacheKey = `longbridge_${accessToken.substring(0,8)}`;
        const cached = cache.get(cacheKey);
        // We always try to use cache if within TTL to avoid hitting API limits
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return { source: `${this.name} (Cache)`, payload: cached.data.payload, raw: cached.data.raw, cleaned: cached.data.payload };
        }
        
        try {
            let headers: any = {
                'Content-Type': 'application/json'
            };
            
            // Determine Auth Mode based on presence of appKey and appSecret
            if (appKey && appSecret) {
                // HMAC Signature Mode (API Key Mode) uses a complex signature scheme
                const timestamp = Date.now().toString();
                const method = 'GET';
                const path = '/v1/asset/stock';
                const query = '';
                const body = '';
                
                const signedHeaders = 'authorization;x-api-key;x-timestamp';
                const signedValues = `authorization:${accessToken}\nx-api-key:${appKey}\nx-timestamp:${timestamp}\n`;
                let strToSign = `${method}|${path}|${query}|${signedValues}|${signedHeaders}|`;
                if (body) {
                   strToSign += crypto.createHash('sha1').update(body, 'utf8').digest('hex');
                }
                const strToSignHash = crypto.createHash('sha1').update(strToSign, 'utf8').digest('hex');
                const finalStrToSign = `HMAC-SHA256|${strToSignHash}`;
                const signature = crypto.createHmac('sha256', appSecret).update(finalStrToSign).digest('hex');
                
                headers['Authorization'] = accessToken;
                headers['X-Api-Key'] = appKey;
                headers['X-Timestamp'] = timestamp;
                headers['X-Api-Signature'] = `HMAC-SHA256 SignedHeaders=${signedHeaders}, Signature=${signature}`;
            } else {
                // OAuth 2.0 Auth Bearer Mode
                headers['Authorization'] = `Bearer ${accessToken}`;
            }

            // Fetch live stock positions from Longbridge Open API
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            let response;
            try {
              response = await fetch("https://openapi.longbridgeapp.com/v1/asset/stock", {
                method: 'GET',
                headers,
                signal: controller.signal
              });
            } finally {
              clearTimeout(timeoutId);
            }
            const lbData = await response.json();
            
            let livePortfolio = [];
            
            if (lbData.code === 0) {
                // Parse standard LivePortfolio payload
                // Assuming typical return structure based on Open API
                const dataObj = lbData.data || {};
                const channels = dataObj.channels || [];
                const list = Array.isArray(dataObj) ? dataObj : (dataObj.list || []);

                if (channels.length > 0) {
                    for (const channel of channels) {
                        for (const pos of (channel.positions || [])) {
                             livePortfolio.push({
                                 symbol: pos.symbol || pos.stock_info?.symbol,
                             name: pos.symbolName || pos.name || pos.stock_info?.name || pos.symbol || pos.stock_info?.symbol,
                             quantity: Number(pos.quantity || 0),
                             cost: Number(pos.costPrice || pos.cost_price || 0) * Number(pos.quantity || 0),
                             marketValue: Number(pos.marketValue || pos.market_value || parseFloat(String(pos.marketValue || 0)) || (Number(pos.costPrice || pos.cost_price || 0) * Number(pos.quantity || 0))), // use actual if available
                             floatingPL: Number(pos.floatingPL || pos.floating_pl || 0)
                             });
                        }
                    }
                } else if (list.length > 0) {
                    for (const pos of list) {
        // Sometimes the API returns stock_info as an array of positions within the channel/account
        if (Array.isArray(pos.stock_info)) {
            for (const stock of pos.stock_info) {
                const qty = Number(stock.quantity);
                const cost = Number(stock.cost_price || stock.costPrice || 0) * qty;
                const mktValRaw = Number(stock.market_value || stock.marketValue || 0);
                livePortfolio.push({
                    symbol: stock.symbol,
                    name: stock.symbol_name || stock.name || stock.symbol,
                    quantity: qty,
                    cost: cost,
                    marketValue: mktValRaw > 0 ? mktValRaw : cost,
                    floatingPL: Number(stock.floating_pl || stock.floatingPL || 0)
                });
            }
        } else {
             const qty = Number(pos.quantity);
             const cost = Number(pos.costPrice || pos.cost_price || 0) * qty;
             const mktValRaw = Number(pos.marketValue || pos.market_value || 0);
             livePortfolio.push({
                 symbol: pos.symbol || pos.stock_info?.symbol,
                 name: pos.name || pos.symbolName || pos.symbol_name || pos.stock_info?.name || pos.stock_info?.symbol_name || pos.symbol || pos.stock_info?.symbol,
                 quantity: qty,
                 cost: cost,
                 marketValue: mktValRaw > 0 ? mktValRaw : cost,
                 floatingPL: Number(pos.floatingPL || pos.floating_pl || 0)
             });
        }
                    }
                }

                const normalizedData = { livePortfolio };

                cache.set(cacheKey, { timestamp: Date.now(), data: { payload: normalizedData } });
                return { source: this.name, payload: normalizedData };
            } else {
                 console.log("Longbridge Open API returned error code:", lbData.code, "message:", lbData.message, "data:", lbData.data);
                 return { source: this.name, payload: null, raw: lbData };
            }
        } catch(e) {
             console.error("Longbridge fetch error:", e);
             return { source: this.name, payload: null, raw: String(e) };
        }
    }
}

class FirebaseStaticProvider implements DataProvider {
    name = "FirebaseStatic";
    async fetch({ contextData }: any) {
         // This can handle custom logic for formatting existing RAG static profiles if needed
         return { source: this.name, payload: contextData?.userProfile || null };
    }
}

// Registry of providers to allow easy plug-and-play decoupling
export const dataProviders: DataProvider[] = [
    new FirebaseStaticProvider(),
    new MarketDataProvider(),
    new LongbridgeLiveProvider()
];

export async function hydrateContext(message: string, contextData: any, settings: any, onProgress?: (msg: string) => void, userId?: string, extractedTickers: string[] = []) {
    if (onProgress) onProgress("⏳ [阶段 2.1] 启动 Context Hydrator 进行子节点并发提取调度...");
    
    // Run all providers concurrently
    const results = await Promise.all(
        dataProviders.map(p => p.fetch({ message, contextData, settings, userId, extractedTickers }))
    );
    
    const hydratedData: any = { marketData: {} };
    const sources: string[] = [];
    
    for (const res of results) {
        if (res.payload) {
            sources.push(res.source);
            if (res.source.startsWith("MarketData")) {
                hydratedData.marketData = res.payload;
            } else if (res.source.startsWith("LongbridgeLive")) {
                hydratedData.livePortfolio = res.payload.livePortfolio;
            } else if (res.source.includes("FirebaseStatic")) {
                 hydratedData.staticProfile = res.payload;
            }
        }
    }
    
    // Auto-sync market prices into portfolio if available
    let workingPortfolio = hydratedData.livePortfolio;
    if (!workingPortfolio || workingPortfolio.length === 0) {
        if (contextData?.distributions?.publicHoldings?.length > 0) {
            workingPortfolio = JSON.parse(JSON.stringify(contextData.distributions.publicHoldings));
        }
    }
    
    if (workingPortfolio && workingPortfolio.length > 0 && hydratedData.marketData) {
        for (const pos of workingPortfolio) {
            const sym = pos.symbol || pos.name || '';
            let mData = hydratedData.marketData[sym];
            if (!mData) {
                const foundKey = Object.keys(hydratedData.marketData).find(k => k.includes(sym) || sym.includes(k));
                if (foundKey) mData = hydratedData.marketData[foundKey];
            }
            if (mData && mData.price) {
                const quantity = Number(pos.quantity || 0);
                if (quantity > 0) {
                    pos.marketValue = Number((mData.price * quantity).toFixed(3));
                } else if (pos.marketValue > 0) {
                    pos.quantity = Number((pos.marketValue / mData.price).toFixed(3));
                }
                pos._livePrice = mData.price;
            }
        }
        hydratedData.livePortfolio = workingPortfolio;
    }
    
    if (sources.length > 0 && onProgress) {
        onProgress(`✅ [阶段 2.3] 数据注水完成，激活聚合数据源: ${sources.join(', ')}`);
    }
    
    return hydratedData;
}
