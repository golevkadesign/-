import { Router } from "express";
import { queryYahooFinance } from "../services/yahooFinance";
import { extractTickers } from "../services/utils";
import { evaluateWealthStatus } from "../services/orchestrator";
import { hydrateContext } from "../services/hydrator";
import { getUniversalAiClient } from "../utils/ai-universal";

import { DEFAULT_RAG_SCHEMA } from "../../src/lib/defaultPrompts";

export const chatRouter = Router();

// Existing legacy route (We keep this intact to avoid breaking anything)
chatRouter.post("/", async (req, res) => {
  let isResponseEnded = false;
  let requestAborted = false;
  let keepAlive: NodeJS.Timeout | undefined;

  res.on('close', () => {
    requestAborted = true;
    console.log("[chat] Client disconnected or response closed. Aborting backend tasks.");
    if (keepAlive) clearInterval(keepAlive);
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
    if (customApiKey) {
      if (!passedSettings.geminiKey && passedSettings.provider === 'gemini') {
        passedSettings.geminiKey = customApiKey;
      } else if (!passedSettings.openaiKey && passedSettings.provider === 'openai') {
        passedSettings.openaiKey = customApiKey;
      } else if (!passedSettings.provider) {
        passedSettings.geminiKey = customApiKey;
      }
    }
    
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

      let intentResult = { requiresDeepAnalysis: true, summary: message, quickReply: "", updatedProfile: userProfile, targetModules: [] as string[], extractedTickers: [] as string[] };
      
      try {
        const { analyzeIntentWithFlash } = await import("../services/orchestrator");
        intentResult = await analyzeIntentWithFlash(message, history, passedSettings, userTier, userProfile, ragSchema, attachments);
        sendProgress(`✅ [阶段 1] 意图网络分析完成。`);
        if (intentResult.targetModules?.length > 0) sendProgress(`🔍 [锁定分析模块]: ${intentResult.targetModules.join(', ')}`);
        if (intentResult.extractedTickers?.length > 0) sendProgress(`📦 [提取到标的资产]: ${intentResult.extractedTickers.join(', ')}`);
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
    
    if (requestAborted) {
        console.log("Request aborted, exiting route");
        return;
    }

    // We do NOT call res.end() yet via sendResult. First we stream the synthesis chunk by chunk.
    sendProgress("⏳ [阶段 3.8] 正在启动最终总结与渲染模型...");
    
    // Send the partial result (this tells the client we have the raw expertAnalysis)
    // We send it directly without res.end()
    if (!isResponseEnded) {
       res.write(`data: ${JSON.stringify({ 
           type: 'partial_result', 
           data: {
               userTier, 
               externalData: { marketData: hydratedData.marketData || {}, livePortfolio: hydratedData.livePortfolio }, 
               expertAnalysis, 
               updatedProfile: intentResult.updatedProfile 
           } 
       })}\n\n`);
       if ('flush' in res && typeof (res as any).flush === 'function') {
         (res as any).flush();
       }
    }

    try {
        const { streamSynthesis } = await import("../services/orchestrator");
        const synthesisStream = await streamSynthesis(userTier, processedMessage, aggregatedData, expertAnalysis, passedSettings, sendProgress);
        
        let synthesizedText = "";
        for await (const chunk of synthesisStream) {
            if (requestAborted) break;
            let textChunk = "";
            try {
               textChunk = chunk.text || "";
            } catch (e) {
               if (chunk.candidates?.[0]?.content?.parts) {
                  textChunk = chunk.candidates[0].content.parts.map((p: any) => p.text || "").join('');
               }
            }
            if (!textChunk) continue;
            synthesizedText += textChunk;
            
            // 保持正常推流
            res.write(`data: ${JSON.stringify({ type: 'summary_chunk', text: textChunk })}\n\n`);
            if ('flush' in res && typeof (res as any).flush === 'function') {
                (res as any).flush();
            }
        }
        
        expertAnalysis['综合统筹结论'] = synthesizedText;
        sendProgress("✅ [阶段 3.9] 终端总结流式输出完成！");

    } catch (streamError: any) {
        // 关键修复：如果在推流途中网络断裂或服务器 503 崩溃
        console.error("流式读取被强制阻断:", streamError.stack || streamError);
        
        // 不要抛出异常！而是向前端推送一条“优雅的终端提示”并结束流
        const fallbackText = "\n\n> ⚠️ **数据流中断**：由于当前 AI 推理集群需求激增（503），流式输出被截断。上方为已生成的安全结论，您可稍后点击重试重新生成完整报告。";
        res.write(`data: ${JSON.stringify({ type: 'summary_chunk', text: fallbackText })}\n\n`);
        
        // 记录已生成的部分，防止全盘丢失
        expertAnalysis['综合统筹结论'] = (expertAnalysis['综合统筹结论'] || '') + fallbackText;
    }

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
