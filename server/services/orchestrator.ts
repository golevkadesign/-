import { runAnalysisAgent } from "./agents";
import { getUniversalAiClient } from "../utils/ai-universal";
import { DEFAULT_PROMPTS } from "../../src/lib/defaultPrompts";

// 使用免费、极速的 Flash 模型做第一层意图拦截与提取
export async function analyzeIntentWithFlash(message: string, history: any[], settings?: any, userTier: string = "General", userProfile: any = {}, ragSchema: string = "", attachments: any[] = []) {
  const prompt = `You are the RAG Memory Agent and Gateway for a top-tier AI Financial Advisor system.

【User Tier】
${userTier}

【User Input】
${message}

【History】
${JSON.stringify(history.slice(-3))}

【User Profile】
${JSON.stringify(userProfile, null, 2)}

Task:
1. requiresDeepAnalysis (boolean): Determine if this message requires full multi-agent deep analysis. Simple greetings, thank yous, daily pleasantries, or non-financial chatting should NOT trigger deep analysis.
2. quickReply (string): If it DOES NOT need deep analysis, provide a friendly quick reply (less than 60 words).
3. summarizedIntent (string): If it DOES need deep analysis, summarize the core financial question/intent into a clean instruction for the expert agents.
4. extractedTickers (string array): Extract ALL stock/crypto/option ticker symbols mentioned (e.g., TSLA, AAPL, BTC-USD). Guess Yahoo Finance supported symbols if unclear.
5. targetModules (string array): Which expert engines are needed? From: ["Debt Focus", "High Net Worth", "General Finance", "Market Analysis", "Devil Advocate"].
6. updatedProfile (object): Update the user's permanent profile based on ANY new information in the message.
   - Using the following definition schema:
   ${ragSchema}
   - RETURN the FULL, structurally sound updated profile (incorporating both new info and preserving the old info).

Respond MUST strictly be JSON matching this structure:
{
  "requiresDeepAnalysis": boolean,
  "summary": "...",
  "quickReply": "...",
  "extractedTickers": ["TSLA", "AAPL"],
  "targetModules": ["Market Analysis", ...],
  "updatedProfile": { ... }
}`;

  try {
    const ai = getUniversalAiClient(settings);
    let parts: any[] = [{ text: prompt }];
    if (attachments && attachments.length > 0) {
       attachments.forEach((att: any) => {
          if (att.data) parts.push({ inlineData: { data: att.data, mimeType: att.mimeType } });
       });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts }],
      config: { 
        temperature: 0.1,
        responseMimeType: "application/json",
      }
    });

    let text = response.text || "{}";
    text = text.replace(/```(?:json)?\n?/gi, '').replace(/```\n?/g, '').trim();
    const output = JSON.parse(text);
    return {
      requiresDeepAnalysis: output.requiresDeepAnalysis ?? true,
      quickReply: output.quickReply || "",
      summary: output.summarizedIntent || output.summary || message,
      extractedTickers: output.extractedTickers || [],
      targetModules: output.targetModules || [],
      updatedProfile: output.updatedProfile || userProfile
    };
  } catch (e: any) {
    console.error("Flash Intent Analysis Error:", e);
    const isFatal = e.message?.includes('API_KEY_INVALID') || e.message?.includes('API key not valid') || e.message?.includes('exceeded your current quota') || e.message?.includes('Quota exceeded') || e.message?.includes('429') || e.message?.includes('RESOURCE_EXHAUSTED') || e.message?.includes('monthly spending cap');
    if (isFatal) {
      throw e;
    }
    // Fallback to heavy analysis if JSON parsing fails
    return { requiresDeepAnalysis: true, quickReply: "", summary: message, extractedTickers: [], targetModules: [], updatedProfile: userProfile };
  }
}

// 根据用户层级和输入，编排并调用对应的子Agent
export async function evaluateWealthStatus(userTier: string, message: string, history: any[], externalData: any, onProgress?: (msg: string) => void, settings?: any, targetModules: string[] = [], attachments: any[] = []) {
  let agentTasks: Promise<any>[] = [];
  let agentResults: Record<string, string> = {};

  const ai = getUniversalAiClient(settings);

  console.log(`[Orchestrator] 开始评估用户财务状态. Tier: ${userTier}`);
  if (onProgress) onProgress(`⏳ [阶段 3.1] Orchestrator 核心调度：基于 ${userTier} 分发并行分析线程...`);

  // 根据Tier和上下文，并行调用不同的专家Agent分析各个板块
  if ((targetModules.length === 0 && userTier === "Debt Focus") || (targetModules.length > 0 && targetModules.includes("Debt Focus"))) {
    if (onProgress) onProgress(`⏳ [子节点派发] 唤醒 Debt Crisis Intervention Advisor 专属通道...`);
    agentTasks.push(
      runAnalysisAgent(userTier, externalData, history, "Debt Focus", message, settings, attachments).then((res: any) => { 
        agentResults['债务与现金流诊断'] = res; 
        if (onProgress) onProgress(`\n✅ **[阶段 3.x] [债务专家评估完成]**\n${res}\n\n---\n`);
      }).catch(e => {
        if (onProgress) onProgress(`\n❌ **[阶段 3.x] [债务专家评估失败]**: ${e.message}\n`);
        throw e;
      })
    );
  } 
  
  if ((targetModules.length === 0 && userTier === "High Net Worth Individual") || (targetModules.length > 0 && targetModules.includes("High Net Worth"))) {
    if (onProgress) onProgress(`⏳ [子节点派发] 拉起 UHNWI 家族办公室专属资源...`);
    agentTasks.push(
      runAnalysisAgent(userTier, externalData, history, "High Net Worth", message, settings, attachments).then((res: any) => { 
        agentResults['家族财富与资产配置'] = res; 
        if (onProgress) onProgress(`\n✅ **[阶段 3.x] [家族理财评估完成]**\n${res}\n\n---\n`);
      }).catch(e => {
        if (onProgress) onProgress(`\n❌ **[阶段 3.x] [家族理财评估失败]**: ${e.message}\n`);
        throw e;
      })
    );
  } 
  
  if ((targetModules.length === 0 && userTier !== "Debt Focus" && userTier !== "High Net Worth Individual") || (targetModules.length > 0 && targetModules.includes("General Finance"))) {
    if (onProgress) onProgress(`⏳ [子节点派发] 连通 CFP 全栖财务规划师节点...`);
    agentTasks.push(
      runAnalysisAgent(userTier, externalData, history, "General Finance", message, settings, attachments).then((res: any) => { 
        agentResults['综合理财规划'] = res; 
        if (onProgress) onProgress(`\n✅ **[阶段 3.x] [个人综合财务评估完成]**\n${res}\n\n---\n`);
      }).catch(e => {
        if (onProgress) onProgress(`\n❌ **[阶段 3.x] [个人综合财务评估失败]**: ${e.message}\n`);
        throw e;
      })
    );
  }

  const shouldRun = (moduleName: string) => targetModules.length === 0 || targetModules.includes(moduleName);

  // 如果有市场数据（股票等），额外拉起市场分析Agent
  if (shouldRun("Market Analysis") && ((externalData?.marketData && Object.keys(externalData.marketData).length > 0) ||
      (externalData?.livePortfolio && externalData.livePortfolio.length > 0))) {
    if (onProgress) onProgress(`⏳ [子节点派发] 请求外部数据交汇汇流，唤醒华尔街量化分析节点...`);
    agentTasks.push(
      runAnalysisAgent(userTier, externalData, history, "Market Analysis", "请帮我分析我持有的或提到的这些标的", settings, attachments).then((res: any) => { 
        agentResults['市场与标的分析'] = res; 
        if (onProgress) onProgress(`\n✅ **[阶段 3.x] [量化趋势推演完成]**\n${res}\n\n---\n`);
      }).catch(e => {
        if (onProgress) onProgress(`\n❌ **[阶段 3.x] [量化趋势推演失败]**: ${e.message}\n`);
        throw e;
      })
    );
  }

  if (shouldRun("Devil Advocate")) {
    if (onProgress) onProgress(`⏳ [子节点派发] 唤醒 Devil's Advocate (杠精节点) 进行抗脆性黑天鹅压测...`);
    agentTasks.push(
      runAnalysisAgent(userTier, externalData, history, "Devil Advocate", message, settings, attachments).then((res: any) => { 
        agentResults['极端压力测试与黑天鹅警告'] = res; 
        if (onProgress) onProgress(`\n✅ **[阶段 3.x] [黑天鹅杠精压测完成]**\n${res}\n\n---\n`);
      }).catch(e => {
        if (onProgress) onProgress(`\n❌ **[阶段 3.x] [黑天鹅杠精压测失败]**: ${e.message}\n`);
        throw e;
      })
    );
  }

  // 等待所有专家Agent得出结论
  try {
    await Promise.all(agentTasks);
  } catch (e: any) {
    if (onProgress) onProgress(`❌ [阶段 3 (Error)] Orchestrator 核心调度遭遇子节点致命坍塌: ${e.message}`);
    throw e;
  }

  if (onProgress) onProgress(`✅ [阶段 3.8] 各节点数据已回流完毕，准备进行前端交互引擎渲染...`);
  
  // 综合分析已经包含在 agentResults 中，交给前端的 UI Builder 进一步组装和流式输出
  return agentResults;
}

export async function streamSynthesis(userTier: string, message: string, externalData: any, agentResults: any, settings?: any, onProgress?: (msg: string) => void) {
  const ai = getUniversalAiClient(settings);
  if (onProgress) onProgress(`⏳ [阶段 3.8] 各节点数据已回流，启动 CEO 级全局 Synthesizer 流式结论汇总...`);

  // 上下文脱水：手动剔除 ECharts 配置等过长的渲染源码，仅保留分析结论
  const dehydratedResults: Record<string, string> = { ...agentResults };
  for (const key in dehydratedResults) {
    if (typeof dehydratedResults[key] === 'string') {
      // 一定程度上剔除代码块以减少 Token 大小
      dehydratedResults[key] = dehydratedResults[key].replace(/```(?:json|javascript|echarts)?\s*[\s\S]*?\s*```/g, "[图表配置源码已脱水]");
    }
  }

  const template = settings?.agentPrompts?.orchestrator || DEFAULT_PROMPTS.orchestrator;
  const summaryPrompt = template
    .replace('{userTier}', () => userTier)
    .replace('{message}', () => message)
    .replace('{userProfileRAG}', () => JSON.stringify(externalData?.contextData?.userProfile || {}, null, 2))
    .replace('{livePortfolioRAG}', () => JSON.stringify(externalData?.livePortfolio || externalData?.contextData?.distributions?.publicHoldings || [], null, 2))
    .replace('{agentResults}', () => JSON.stringify(dehydratedResults, null, 2));

  try {
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3.1-pro-preview",
      contents: summaryPrompt,
      config: { temperature: 0.1 }
    });
    return responseStream;
  } catch (e: any) {
    console.error("Synthesizer pro model error, falling back to flash:", e);
    if (onProgress) onProgress(`⚠️ [阶段 3.9] Pro模型高负载，降级至Flash模型进行全局汇总...`);
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: summaryPrompt,
      config: { temperature: 0.1 }
    });
    return responseStream;
  }
}
