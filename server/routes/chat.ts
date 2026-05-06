import { Router } from "express";
import { queryYahooFinance } from "../services/yahooFinance";
import { extractTickers } from "../services/utils";
import { evaluateWealthStatus } from "../services/orchestrator";
import { hydrateContext } from "../services/hydrator";
import { getUniversalAiClient } from "../../src/lib/ai-universal";

import { DEFAULT_RAG_SCHEMA } from "../../src/lib/defaultPrompts";

export const chatRouter = Router();

// Existing legacy route (We keep this intact to avoid breaking anything)
chatRouter.post("/", async (req, res) => {
  let isResponseEnded = false;
  let requestAborted = false;
  let keepAlive: NodeJS.Timeout | undefined;

  req.on('close', () => {
    requestAborted = true;
    console.log("[chat] Client disconnected. Aborting backend tasks.");
  });

  const sendProgress = (msg: string) => {
    if (!isResponseEnded) {
      res.write(`data: ${JSON.stringify({ type: 'progress', message: msg })}\n\n`);
      // Vercel / Cloud Run standard flush if available
      if ('flush' in res && typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    }
  };

  const sendPartialResult = (data: any) => {
    if (!isResponseEnded) {
      res.write(`data: ${JSON.stringify({ type: 'partial_result', data })}\n\n`);
      if ('flush' in res && typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    }
  };

  const sendResult = (data: any) => {
    if (!isResponseEnded) {
      isResponseEnded = true;
      clearInterval(keepAlive);
      res.write(`data: ${JSON.stringify({ type: 'result', data })}\n\n`);
      res.end();
    }
  };

  try {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    });

    keepAlive = setInterval(() => {
      if (!isResponseEnded) {
        res.write(`data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`);
        if ('flush' in res && typeof (res as any).flush === 'function') {
          (res as any).flush();
        }
      }
    }, 5000);

    sendProgress("⏳ [阶段 0] 已接收通讯矩阵指令与上下文凭证...");
    const { message, contextData = {}, history = [], customApiKey, settings, userProfile = {}, userId, attachments = [], skipMemoryUpdate = false } = req.body;
    
    const passedSettings = settings || {};
    if (customApiKey && !passedSettings.geminiKey) passedSettings.geminiKey = customApiKey;
    
    const ai = getUniversalAiClient(passedSettings);

    // Determine Tier
    const netWorth = contextData?.metrics?.netWorth || 0;
    let userTier = "General";
    if (netWorth < 0) userTier = "Debt Focus";
    else if (netWorth > 10000000) userTier = "High Net Worth Individual";
    else if (netWorth > 1000000) userTier = "Emerging Wealth";

    // 1. Intent Recognition and Summarization using lightweight model (gemini-3.1-flash)
    console.log("[Intent] Assessing message intent using Flash...");
    sendProgress("⏳ [阶段 1] 侧翼调度：启动高速闪电意图网络及 RAG 记忆...");
    const ragSchema = passedSettings?.ragSchema || DEFAULT_RAG_SCHEMA;
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
4. targetModules (string array): 明确需要调动哪几个专家引擎来更新或补充旧的大盘数据。如果用户仅是补充修改某一项，则只包含受影响的引擎。必须从以下列表中严格选择（可多选）：["Debt Focus", "High Net Worth", "General Finance", "Market Analysis", "Devil Advocate"]。如果不明确，可全选。只选受新消息影响需要重新分析的模块，以免浪费算力。
5. IMPORTANT: Update the user's permanent profile based on ANY new information in the message (career, financial status, personal goals, dependants, risk tolerance, etc). 
   - Keep the structure extensible. Use the base fixed logical buckets defined in the schema (financial, career, personal, preferences, etc).
   - DYNAMIC EXTENSION: If you discover new dimensions, specific unique assets, or personal scenarios that don't fit the base categories, you are ENCOURAGED to dynamically create new top-level keys and nested structures.
   - If there is qualitative info that doesn't fit a stat, add it to an \`insights\` array inside the relevant category.
   - Return the FULL, structurally sound updated profile including base fields and newly dynamically extended fields.

Respond strictly in JSON matching this structure:
{
  "requiresDeepAnalysis": boolean,
  "summary": "...",
  "quickReply": "...",
  "targetModules": ["..."],
  "updatedProfile": {
     // FILL IN ACCORDING TO THIS MARKDOWN SCHEMA:
     /* 
${ragSchema} 
     */
  }
}
`;

    let intentResult = { requiresDeepAnalysis: true, summary: message, quickReply: "", updatedProfile: userProfile, targetModules: [], extractedTickers: [] };
    
    let intentParts: any[] = [{ text: intentPrompt }];
    if (attachments && attachments.length > 0) {
       attachments.forEach((att: any) => {
          if (att.data) intentParts.push({ inlineData: { data: att.data, mimeType: att.mimeType } });
       });
    }

    try {
      let timeoutId: any;
      const timeoutPromise = new Promise<any>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Agent AI Timeout (Intent Analysis)')), 15000);
      });
      const response = await Promise.race([
        ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ role: "user", parts: intentParts }],
          config: {
            temperature: 0.1,
          }
        }),
        timeoutPromise
      ]).finally(() => clearTimeout(timeoutId));
      
      if (response.text) {
        let text = response.text.replace(/```(?:json)?\n?/gi, '').replace(/```\n?/g, '').trim();
        if (text.startsWith('{')) {
          intentResult = JSON.parse(text);
        } else {
          throw new Error("Invalid format from intent model");
        }
        sendProgress(`✅ [阶段 1] 意图网络分析完成。`);
        if (intentResult.targetModules?.length > 0) sendProgress(`🔍 [锁定分析模块]: ${intentResult.targetModules.join(', ')}`);
        if (intentResult.extractedTickers?.length > 0) sendProgress(`📦 [提取到标的资产]: ${intentResult.extractedTickers.join(', ')}`);
      }
    } catch (e: any) {
      console.error("[Intent] parsing failed", e);
      const isFatal = e.message?.includes('API_KEY_INVALID') || e.message?.includes('API key not valid') || e.message?.includes('exceeded your current quota') || e.message?.includes('Quota exceeded') || e.message?.includes('429') || e.message?.includes('RESOURCE_EXHAUSTED') || e.message?.includes('monthly spending cap');
      
      if (isFatal) {
         sendProgress(`❌ [阶段 1] 意图网络判定异常：API 额度或鉴权失败 (${e.message}...)，系统将阻断后续调用以保护系统。`);
         throw e;
      } else {
         sendProgress(`❌ [阶段 1] 降级：意图网络判定异常 (${e.message}...)，结构解析失败，自动 fallback 至全局满载分析。`);
      }
    }
    
    // We update the aggregated data to include the new user profile so expert agents can use it.
    if (intentResult.updatedProfile && !skipMemoryUpdate) {
      contextData.userProfile = intentResult.updatedProfile;
    } else if (skipMemoryUpdate) {
      intentResult.updatedProfile = {};
    }

    if (!intentResult.requiresDeepAnalysis && intentResult.quickReply) {
       console.log("[Intent] Simple query detected, returning fast response.");
       sendProgress("✅ 拦截成功：判定为日常交互，无需动用高阶 Agent 矩阵。直接呈递结果。");
       sendResult({ 
         userTier, 
         externalData: { marketData: {} }, 
         expertAnalysis: { '快速回应': intentResult.quickReply },
         isQuickReply: true,
         updatedProfile: intentResult.updatedProfile
       });
       return;
    }

    // 2. Data Hydration Layer (Yahoo, Longbridge, etc)
    sendProgress("⏳ [阶段 2] 开始上下文 Hydration：接入外部三方数据及实时源...");
    const hydratedData = await hydrateContext(message, contextData, passedSettings, sendProgress, userId, intentResult.extractedTickers);
    sendProgress("✅ [阶段 2] 上下文 Hydration 注水拼装完成并已传导至下文。");
    
    // SEND PARTIAL RESULT: immediately update the UI with fresh numerical data
    sendPartialResult({
        userTier,
        externalData: { marketData: hydratedData.marketData || {}, livePortfolio: hydratedData.livePortfolio },
        updatedProfile: intentResult.updatedProfile
    });
    
    // 3. Call Orchestrator to route to sub-agents and get expert analysis
    // Pass the summarized intent instead of the raw message
    const processedMessage = intentResult.summary || message;
    
    // We pass hydratedData which includes marketData, livePortfolio, etc.
    const aggregatedData = hydratedData;
    
    // Make sure we carry forward contextData base to aggregatedData for backward compatibility in orchestrator
    aggregatedData.contextData = contextData;

    sendProgress("⏳ [阶段 3] 移交总控台：开始深度金融领域解析...");
    const expertAnalysis = await evaluateWealthStatus(userTier, processedMessage, history, aggregatedData, sendProgress, passedSettings, intentResult.targetModules || [], attachments);
    
    if (requestAborted) return;

    sendProgress("✅ [阶段 4] 本地推流阻断释放，将 Agent 数据全阵列推送回客户端。");

    sendResult({ 
        userTier, 
        externalData: { marketData: hydratedData.marketData || {}, livePortfolio: hydratedData.livePortfolio }, 
        expertAnalysis, 
        updatedProfile: intentResult.updatedProfile 
    });
  } catch (error: any) {
    if (keepAlive) clearInterval(keepAlive);
    isResponseEnded = true;
    console.error("Context Gather Error:", error);
    if (!res.writableEnded) {
       sendProgress(`❌ [全局异常] 流程抛锚：${error.message}`);
       res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
       res.end();
    }
  }
});
