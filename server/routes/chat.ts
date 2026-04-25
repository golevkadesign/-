import { Router } from "express";
import { queryYahooFinance } from "../services/yahooFinance.ts";
import { extractTickers } from "../services/utils.ts";
import { evaluateWealthStatus } from "../services/orchestrator.ts";
import { getUniversalAiClient } from "../../src/lib/ai-universal.ts";

export const chatRouter = Router();

// Existing legacy route (We keep this intact to avoid breaking anything)
chatRouter.post("/", async (req, res) => {

  try {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    });

    const sendProgress = (msg: string) => {
      res.write(`data: ${JSON.stringify({ type: 'progress', message: msg })}\n\n`);
      // Vercel / Cloud Run standard flush if available
      if ('flush' in res && typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    };

    const sendResult = (data: any) => {
      res.write(`data: ${JSON.stringify({ type: 'result', data })}\n\n`);
      res.end();
    };

    sendProgress("已接收通讯矩阵指令...");
    const { message, contextData, history = [], customApiKey, settings, userProfile = {} } = req.body;
    
    const passedSettings = settings || {};
    if (customApiKey && !passedSettings.geminiKey) passedSettings.geminiKey = customApiKey;
    
    const ai = getUniversalAiClient(passedSettings);

    // Determine Tier
    const netWorth = contextData?.metrics?.netWorth || 0;
    let userTier = "General";
    if (netWorth < 0) userTier = "Debt Focus";
    else if (netWorth > 10000000) userTier = "High Net Worth Individual";
    else if (netWorth > 1000000) userTier = "Middle Class";

    // 1. Intent Recognition and Summarization using lightweight model (gemini-3.1-flash)
    console.log("[Intent] Assessing message intent using Flash...");
    sendProgress("启动高速闪电意图网络及 RAG 记忆...");
    const intentPrompt = `
You are the RAG Memory Agent and Gateway for a top-tier AI Financial Advisor system.
User Tier: ${userTier}
User's message: "${message}"

User's current permanent profile (JSON):
${JSON.stringify(userProfile, null, 2)}

Task:
1. Determine if this message requires full multi-agent deep analysis. Simple greetings, thank yous, daily pleasantries, or non-financial chatting should NOT trigger deep analysis.
2. If it DOES NOT need deep analysis, provide a friendly quick reply (less than 60 words).
3. If it DOES need deep analysis, summarize the core financial question/intent into a clean instruction for the expert agents.
4. IMPORTANT: Update the user's permanent profile based on ANY new information in the message (career, financial status, personal goals, dependants, risk tolerance, etc). 
   - Keep the structure extensible but strictly categorical. 
   - DO NOT endlessly invent new top-level schema keys. Categorize into existing logical buckets: \`financial\`, \`career\`, \`personal\`, \`preferences\`.
   - If there is qualitative info that doesn't fit a stat, add it to an \`insights\` array inside the relevant category.
   - Return the FULL, structurally sound updated profile.

Respond strictly in JSON:
{
  "requiresDeepAnalysis": boolean,
  "summary": "...",
  "quickReply": "...",
  "updatedProfile": {
    "financial": { "netWorth": number, "incomeStreams": [], "assets": {}, "liabilities": {}, "riskTolerance": "" },
    "career": { "currentRole": "", "industry": "", "skills": [], "goals": [] },
    "personal": { "age": number, "location": "", "dependents": number, "lifeGoals": [] },
    "preferences": { "investmentStyle": "", "communicationStyle": "" }
  }
}
`;

    let intentResult = { requiresDeepAnalysis: true, summary: message, quickReply: "", updatedProfile: userProfile };
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: intentPrompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        }
      });
      if (response.text) {
        intentResult = JSON.parse(response.text);
      }
    } catch (e: any) {
      console.error("[Intent] parsing failed, falling back to full analysis", e);
      if (e.message?.includes('API_KEY_INVALID') || e.message?.includes('API key not valid')) {
        throw e;
      }
    }
    
    // We update the aggregated data to include the new user profile so expert agents can use it.
    if (intentResult.updatedProfile) {
      contextData.userProfile = intentResult.updatedProfile;
    }

    if (!intentResult.requiresDeepAnalysis && intentResult.quickReply) {
       console.log("[Intent] Simple query detected, returning fast response.");
       sendResult({ 
         userTier, 
         externalData: { marketData: {} }, 
         expertAnalysis: { '快速回应': intentResult.quickReply },
         isQuickReply: true,
         updatedProfile: intentResult.updatedProfile
       });
       return;
    }

    // 2. Yahoo Finance
    sendProgress("扫描文本 Ticker，请求 Yahoo Finance RAG 节点...");
    const allText = message + JSON.stringify(contextData?.distributions?.publicHoldings || []);
    const symbolsToFetch = extractTickers(allText);
    let marketData = {};
    if (symbolsToFetch.length > 0) {
      try {
        marketData = await queryYahooFinance(symbolsToFetch);
        sendProgress(`✔ 成功获得金融标记 (${symbolsToFetch.join(',')}) 的实时数据`);
      } catch(e) {
        sendProgress(`⚠️ 获取指标流 (${symbolsToFetch.join(',')}) 失败，正在降级...`);
      }
    } else {
      sendProgress(`无需调取额外外部接口。`);
    }

    const aggregatedData = { marketData, contextData };
    
    // 3. Call Orchestrator to route to sub-agents and get expert analysis
    // Pass the summarized intent instead of the raw message
    const processedMessage = intentResult.summary || message;
    const expertAnalysis = await evaluateWealthStatus(userTier, processedMessage, history, aggregatedData, sendProgress, passedSettings);

    sendResult({ userTier, externalData: { marketData }, expertAnalysis, updatedProfile: intentResult.updatedProfile });
  } catch (error: any) {
    console.error("Context Gather Error:", error);
    if (!res.writableEnded) {
       res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
       res.end();
    }
  }
});
