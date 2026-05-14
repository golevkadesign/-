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
4. extractedTickers (string array): Extract valid US/HK/Crypto ticker symbols explicitly mentioned. CRITICAL: NEVER extract generic terms like "A股" as ticker "A". Only extract exact specific companies.
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
       for (const att of attachments) {
          if (att.data && att.data.length > 0) {
              parts.push({ inlineData: { data: att.data, mimeType: att.mimeType } });
          } else if (att.url) {
              try {
                  const res = await fetch(att.url);
                  const arrayBuffer = await res.arrayBuffer();
                  const buffer = Buffer.from(arrayBuffer);
                  parts.push({ inlineData: { data: buffer.toString('base64'), mimeType: att.mimeType } });
              } catch (e) {
                  console.error("Failed to fetch attachment from URL:", e);
              }
          }
       }
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

  const authenticityPact = `【真实性公约】: 你是一个严格的专业财务终端。你必须优先使用下方 \`[实时市场行情 (MARKET_DATA)]\` 中的最新价格进行推演！如果某标的在 \`MARKET_DATA\` 中缺失，再参考 \`[LIVE_PORTFOLIO]\` 中附带的实时价格或市值/数量。严禁虚构任何数字。使用最新数据时请标注来源（如：“根据实时行情及持仓计算（$TSLA: 178.43）...”）。\n\n`;

  const template = settings?.agentPrompts?.orchestrator || DEFAULT_PROMPTS.orchestrator;

  const uiSummaryInstructions = `
========================================
【前端渲染与状态更新契约 (CRITICAL)】
你的任务分为两步，必须严格按顺序输出：
第一步：先输出给用户看的【高情商且犀利的文字回复】(不要带json，使用 markdown 排版)。作为主理人，你需要把专家们提供的核心数据进行综合提炼，给出具体的实操建议，不要说场面话。
第二步：在回答的所有文字结束后，最后输出一个包含 JSON 数据的代码块，用于底层系统的前端渲染 SDUI JSON Schema 更新补丁（Patch）。

核心规则：
- 除必须格式外，所有UI标题（如图表标题）使用中文。
- metrics 中包含 netWorthSummary, liquiditySummary, safetyRatioSummary, fcfSummary 四个字段。
- 对于股票持仓(publicHoldings)：如果有新分析，则在 \`insights.publicText\` 中输出纯文字结论（一只股票一行信息，枚举数量/成本/市值等）；在 \`insights.publicSummary\` 输出总体总结。
- 对于期权(options)：提取并枚举。
- 【严禁捏造Mock假数据】决不允许凭空捏造数值！
- 必须在 \`updateGlobalState.insights.global\` 字段中，输出一段高度提炼、犀利且具有前瞻性的【全局资产战略总结】（不少于 50 字）。这是控制台顶部的核心数据，严禁遗漏！
- 请在 insights 对象中，提供专门负责该板块的Agent的具体客观分析和切实施政建议。
- 重要：**增量更新（Differential Update）**。你只需要在 \`updateGlobalState\` 中返回**需要修改或更新**的字段。前端会将你的输出与当前的 Terminal State 进行合并（Shallow Merge / 深层合并）。对于完全没有变化的板块，**请直接省略该字段**，不要输出空数组/空字符串来覆盖原有的有效数据！！比如：如果你本次分析没有涉及 fixedAssets，那么 updateGlobalState 里面就不要出现 fixedAssets 字段。
- 只做数据的更新，绝不重置旧的有效资产结构。如果在硬核经济策略数据中提到某些数据失效了或被抛售了，那才将其重置为 []。
- 【数组全量替换原则 (CRITICAL)】：当用户提到生活开支(expenses)、负债(liabilities)或资产配置的变更（例如：房贷被抵扣、清仓某只股票）时，你必须在 JSON 中下发**更新后的完整列表**。前端会直接整体替换，切勿只下发增量或直接省略！
- 【严禁捏造市值 (CRITICAL)】：在更新 \`publicHoldings\` 时，\`_livePrice\` 和 \`marketValue\` 必须严格使用 \`[MARKET_DATA]\` 中的真实数据。如果缺少某只股票的最新股价，按原样保留，**绝不许凭空幻觉捏造数值或借用其他股票的价格！**
- 【强制响应原则】：如果你在正文文本中建议了清仓、修改开支，你的 JSON Patch (\`updateGlobalState\`) 中就必须包含对应的字段体现这一变化，不允许口是心非。

当前前端面板状态 (TERMINAL_STATE)：
${JSON.stringify({ 
    metrics: externalData?.contextData?.metrics || {},
    distributions: externalData?.contextData?.distributions || {},
    lifeStrategiesShort: externalData?.contextData?.lifeStrategiesShort || [],
    lifeStrategiesLong: externalData?.contextData?.lifeStrategiesLong || []
}, null, 2)}

注意！你的末尾 JSON Patch 必须符合以下严格结构示例：
\`\`\`json
{
  "sduiSchema": [],
  "updateGlobalState": {
    "metrics": { "netWorth": 1000000, "netWorthSummary": "总结短句..." },
    "userPersona": { "tags": ["稳健型", "高薪资"], "description": "您的核心画像..." },
    "goal": { "name": "核心破局目标", "current": 1000, "target": 5000, "index": 0.2 },
    "distributions": { "liquidity": [{"name": "现金", "value": 100}] },
    "lifeStrategiesShort": [ { "timeNode": "2024-2025", "title": "节点1", "description": "描述" } ],
    "lifeStrategiesLong": [ { "timeNode": "未来 10 年", "title": "高维规划", "description": "描述" } ],
    "insights": { 
      "global": "在这里输出全局资产战略总结...",
      "liquidity": "资金池流动性建议..."
    }
  }
}
\`\`\`
`;

  const summaryPrompt = authenticityPact + template
    .replace('{userTier}', () => userTier)
    .replace('{message}', () => message)
    .replace('{userProfileRAG}', () => JSON.stringify(externalData?.contextData?.userProfile || {}, null, 2))
    .replace('{livePortfolioRAG}', () => JSON.stringify(externalData?.livePortfolio || externalData?.contextData?.distributions?.publicHoldings || [], null, 2))
    .replace('{marketDataRAG}', () => JSON.stringify(externalData?.marketData || {}, null, 2))
    .replace('{agentResults}', () => JSON.stringify(dehydratedResults, null, 2))
    + "\n" + uiSummaryInstructions;

  try {
    // 优先尝试 Pro 模型，但通过 config 覆盖其底层重试机制，使其“只试错1次”，失败立刻跳出！
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3.1-pro-preview", // 注意：如果你有配置，最好用 gemini-2.5-pro 替代这个可能不存在的预览版
      contents: summaryPrompt,
      config: { temperature: 0.1, maxRetries: 1, baseDelay: 300 }
    });
    return responseStream;
  } catch (e: any) {
    console.warn("[降级保护] Pro模型高负载或无响应，毫秒级无缝降级至 Flash 模型...");
    if (onProgress) onProgress(`⚡ [系统提示] 主力模型当前拥挤，已启动闪电节点(Flash)接管输出...`);
    
    try {
        // 无缝切回高并发 Flash 模型
        const responseStream = await ai.models.generateContentStream({
          model: settings?.geminiFastModel || "gemini-2.5-flash",
          contents: summaryPrompt,
          config: { temperature: 0.1 }
        });
        return responseStream;
    } catch (e2: any) {
        console.error("Synthesizer flash model error:", e2);
        throw e2; // 如果 Flash 也挂了，才真正抛出给外层
    }
  }
}
