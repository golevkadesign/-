import { runAnalysisAgent } from "./agents";
import { getUniversalAiClient } from "../../src/lib/ai-universal";
import { DEFAULT_PROMPTS } from "../../src/lib/defaultPrompts";

// 使用免费、极速的 Flash 模型做第一层意图拦截与提取
export async function analyzeIntentWithFlash(message: string, history: any[], settings?: any) {
  const prompt = `你是一个高效的意图识别与前置处理路由大脑。
分析用户的输入，判断是否需要调用后台极度耗时的重度理财分析矩阵（各路专家Agent联动）。

【用户输入】
${message}

【历史对话】
${JSON.stringify(history.slice(-3))}

任务说明：
1. requiresDeepAnalysis (boolean): 如果用户的输入只是简单的打招呼、闲聊、或只需要你一两句话就能回答的常识问题，请设为 false。如果涉及到他的资产、负债、股票、人生规划、重大决策等需要深度分析的内容，设为 true。
2. quickReply (string): 如果 requiresDeepAnalysis 为 false，请直接在这里给出回复（简短得体，带有一点金融私人管家的调性）。如果为 true，可为空。
3. summarizedIntent (string): 如果为 true，提取这段话中最核心的理财诉求（比如“询问特斯拉前景”，“寻求债务重组方案”），供后台分析师直接使用。
4. extractedTickers (string array): 提取用户提到的所有股票/加密货币/期权的简写代码（例如 TSLA, AAPL, BTC-USD，如果不清楚请猜测雅虎财经支持的代码，只包含代码）。
5. targetModules (string array): 明确用户意图中需要调动哪几个专家引擎来更新或补充大盘对应板块的数据结论。如果用户仅是补充修改某一项，则只包含受影响的引擎。必须从以下列表中严格选择（可多选）：
   ["Debt Focus", "High Net Worth", "General Finance", "Market Analysis", "Devil Advocate"]
   如果不明确，可全选当前层级所需的主引擎组合。只选受新消息影响需要真正重新分析的模块，以免浪费算力。

请严格输出 JSON 格式。`;

  try {
    const ai = getUniversalAiClient(settings);
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { 
        temperature: 0.1,
        responseMimeType: "application/json",
      }
    });

    const output = JSON.parse(response.text || "{}");
    return {
      requiresDeepAnalysis: output.requiresDeepAnalysis ?? true,
      quickReply: output.quickReply || "",
      summarizedIntent: output.summarizedIntent || message,
      extractedTickers: output.extractedTickers || [],
      targetModules: output.targetModules || []
    };
  } catch (e: any) {
    console.error("Flash Intent Analysis Error:", e);
    const isFatal = e.message?.includes('API_KEY_INVALID') || e.message?.includes('API key not valid') || e.message?.includes('exceeded your current quota') || e.message?.includes('Quota exceeded') || e.message?.includes('429') || e.message?.includes('RESOURCE_EXHAUSTED') || e.message?.includes('monthly spending cap');
    if (isFatal) {
      throw e;
    }
    // Fallback to heavy analysis if JSON parsing fails
    return { requiresDeepAnalysis: true, quickReply: "", summarizedIntent: message, extractedTickers: [], targetModules: [] };
  }
}

// 根据用户层级和输入，编排并调用对应的子Agent
export async function evaluateWealthStatus(userTier: string, message: string, history: any[], externalData: any, onProgress?: (msg: string) => void, settings?: any, targetModules: string[] = []) {
  let agentTasks: Promise<any>[] = [];
  let agentResults: Record<string, string> = {};

  const ai = getUniversalAiClient(settings);

  console.log(`[Orchestrator] 开始评估用户财务状态. Tier: ${userTier}`);
  if (onProgress) onProgress(`⏳ [阶段 3.1] Orchestrator 核心调度：基于 ${userTier} 分发并行分析线程...`);

  // 根据Tier和上下文，并行调用不同的专家Agent分析各个板块
  const shouldRun = (moduleName: string) => targetModules.length === 0 || targetModules.includes(moduleName);

  if (userTier === "Debt Focus" && shouldRun("Debt Focus")) {
    if (onProgress) onProgress(`⏳ [子节点派发] 唤醒 Debt Crisis Intervention Advisor 专属通道...`);
    agentTasks.push(
      runAnalysisAgent(userTier, externalData, history, "Debt Focus", message, settings).then((res: any) => { 
        agentResults['债务与现金流诊断'] = res; 
        if (onProgress) onProgress(`\n✅ **[阶段 3.x] [债务专家评估完成]**\n${res}\n\n---\n`);
      }).catch(e => {
        if (onProgress) onProgress(`\n❌ **[阶段 3.x] [债务专家评估失败]**: ${e.message}\n`);
        throw e;
      })
    );
  } else if (userTier === "High Net Worth Individual" && shouldRun("High Net Worth")) {
    if (onProgress) onProgress(`⏳ [子节点派发] 拉起 UHNWI 家族办公室专属资源...`);
    agentTasks.push(
      runAnalysisAgent(userTier, externalData, history, "High Net Worth", message, settings).then((res: any) => { 
        agentResults['家族财富与资产配置'] = res; 
        if (onProgress) onProgress(`\n✅ **[阶段 3.x] [家族理财评估完成]**\n${res}\n\n---\n`);
      }).catch(e => {
        if (onProgress) onProgress(`\n❌ **[阶段 3.x] [家族理财评估失败]**: ${e.message}\n`);
        throw e;
      })
    );
  } else if (userTier !== "Debt Focus" && userTier !== "High Net Worth Individual" && shouldRun("General Finance")) {
    if (onProgress) onProgress(`⏳ [子节点派发] 连通 CFP 全栖财务规划师节点...`);
    agentTasks.push(
      runAnalysisAgent(userTier, externalData, history, "General Finance", message, settings).then((res: any) => { 
        agentResults['综合理财规划'] = res; 
        if (onProgress) onProgress(`\n✅ **[阶段 3.x] [个人综合财务评估完成]**\n${res}\n\n---\n`);
      }).catch(e => {
        if (onProgress) onProgress(`\n❌ **[阶段 3.x] [个人综合财务评估失败]**: ${e.message}\n`);
        throw e;
      })
    );
  }

  // 如果有市场数据（股票等），额外拉起市场分析Agent
  if (shouldRun("Market Analysis") && ((externalData?.marketData && Object.keys(externalData.marketData).length > 0) ||
      (externalData?.livePortfolio && externalData.livePortfolio.length > 0))) {
    if (onProgress) onProgress(`⏳ [子节点派发] 请求外部数据交汇汇流，唤醒华尔街量化分析节点...`);
    agentTasks.push(
      runAnalysisAgent(userTier, externalData, history, "Market Analysis", "请帮我分析我持有的或提到的这些标的", settings).then((res: any) => { 
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
      runAnalysisAgent(userTier, externalData, history, "Devil Advocate", message, settings).then((res: any) => { 
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

  console.log("[Orchestrator] 子Agent执行完毕，启动Synthesizer汇总...");
  if (onProgress) onProgress(`⏳ [阶段 3.8] 各节点数据已回流，启动 CEO 级全局 Synthesizer 结论汇总...`);

  try {
    const template = settings?.agentPrompts?.orchestrator || DEFAULT_PROMPTS.orchestrator;
    const summaryPrompt = template
      .replace('{userTier}', userTier)
      .replace('{message}', message)
      .replace('{userProfileRAG}', JSON.stringify(externalData?.contextData?.userProfile || {}, null, 2))
      .replace('{livePortfolioRAG}', JSON.stringify(externalData?.livePortfolio || externalData?.contextData?.distributions?.publicHoldings || [], null, 2))
      .replace('{agentResults}', JSON.stringify(agentResults, null, 2));

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: summaryPrompt,
        config: { temperature: 0.1 }
      });
    } catch (e: any) {
      console.error("Synthesizer pro model error, falling back to flash:", e);
      if (onProgress) onProgress(`⚠️ [阶段 3.9] Pro模型高负载，降级至Flash模型进行全局汇总...`);
      response = await ai.models.generateContent({
        model: "gemini-3-flash-preview", // Use flash preview
        contents: summaryPrompt,
        config: { temperature: 0.1 }
      });
    }

    agentResults['综合统筹结论'] = response?.text || "";
    if (onProgress) onProgress(`✅ [阶段 3.9] Synthesizer 全局汇总成功输出！`);
  } catch(e: any) {
    console.error("Synthesizer error:", e);
    if (onProgress) onProgress(`❌ [阶段 3.9] Synthesizer 全局汇总遭遇阻塞: ${e.message}`);
    const isFatal = e.message?.includes('API_KEY_INVALID') || e.message?.includes('API key not valid') || e.message?.includes('exceeded your current quota') || e.message?.includes('Quota exceeded') || e.message?.includes('429') || e.message?.includes('RESOURCE_EXHAUSTED') || e.message?.includes('monthly spending cap');
    if (isFatal) {
      throw e;
    }
  }

  // 汇总编排最终报告
  return agentResults;
}
