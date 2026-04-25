import { runAnalysisAgent } from "./agents.ts";
import { getUniversalAiClient } from "../../src/lib/ai-universal.ts";

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
      extractedTickers: output.extractedTickers || []
    };
  } catch (e: any) {
    console.error("Flash Intent Analysis Error:", e);
    if (e.message?.includes('API_KEY_INVALID') || e.message?.includes('API key not valid')) {
      throw e;
    }
    // Fallback to heavy analysis if JSON parsing fails
    return { requiresDeepAnalysis: true, quickReply: "", summarizedIntent: message, extractedTickers: [] };
  }
}

// 根据用户层级和输入，编排并调用对应的子Agent
export async function evaluateWealthStatus(userTier: string, message: string, history: any[], externalData: any, onProgress?: (msg: string) => void, settings?: any) {
  let agentTasks: Promise<any>[] = [];
  let agentResults: Record<string, string> = {};

  const ai = getUniversalAiClient(settings);

  console.log(`[Orchestrator] 开始评估用户财务状态. Tier: ${userTier}`);
  if (onProgress) onProgress(`[Orchestrator] 开始基于 ${userTier} 层级进行资源分配...`);

  // 根据Tier和上下文，并行调用不同的专家Agent分析各个板块
  if (userTier === "Debt Focus") {
    if (onProgress) onProgress(`唤醒 Debt Crisis Intervention Advisor 专属通道...`);
    agentTasks.push(
      runAnalysisAgent(userTier, externalData, history, "Debt Focus", message, settings).then((res: any) => { 
        agentResults['债务与现金流诊断'] = res; 
        if (onProgress) onProgress(`✔ 债务专家评估完成。`);
      })
    );
  } else if (userTier === "High Net Worth Individual") {
    if (onProgress) onProgress(`拉起 UHNWI 家族办公室专属资源...`);
    agentTasks.push(
      runAnalysisAgent(userTier, externalData, history, "High Net Worth", message, settings).then((res: any) => { 
        agentResults['家族财富与资产配置'] = res; 
        if (onProgress) onProgress(`✔ 家族理财评估完成。`);
      })
    );
  } else {
    if (onProgress) onProgress(`连通 CFP 全栖财务规划师节点...`);
    agentTasks.push(
      runAnalysisAgent(userTier, externalData, history, "General Finance", message, settings).then((res: any) => { 
        agentResults['综合理财规划'] = res; 
        if (onProgress) onProgress(`✔ 个人综合财务评估完成。`);
      })
    );
  }

  // 如果有市场数据（股票等），额外拉起市场分析Agent
  if (externalData?.marketData && Object.keys(externalData.marketData).length > 0) {
    if (onProgress) onProgress(`请求外部数据交汇汇流，唤醒华尔街量化节点...`);
    agentTasks.push(
      runAnalysisAgent(userTier, externalData, history, "Market Analysis", "请帮我分析我持有的或提到的这些标的", settings).then((res: any) => { 
        agentResults['市场与标的分析'] = res; 
        if (onProgress) onProgress(`✔ 量化趋势推演完成。`);
      })
    );
  }

  // 等待所有专家Agent得出结论
  await Promise.all(agentTasks);

  console.log("[Orchestrator] 子Agent执行完毕，启动Synthesizer汇总...");
  if (onProgress) onProgress(`各节点数据已回流，启动 CEO 级全局 Synthesizer...`);

  try {
    const summaryPrompt = `
你是一个顶级的首席财富总监（CEO/Synthesizer Agent）。
你需要根据我们系统内多个领域专家Agent的分析结果，为这名用户生成一个结构化的高维全盘结论。

当前用户的人群层级画像: ${userTier}
用户的深层诉求与信息: ${message}

各路领域专家的原始分析结果：
${JSON.stringify(agentResults, null, 2)}

【全局统筹要求】：
1. 降维总结：不要机械重复专家的废话，提取高度凝练的【战略方针】。
2. 矛盾化解：如果不同专家给出矛盾建议（如宏观激进 vs 理财保守），你需要基于用户Tier做出最终裁决。
3. 落地执行：在结尾给出“今日核心三件事（Top 3 Actions）”，也就是用户关掉页面后立刻就能做的三件事。
输出要求：限制在300-400字内，极度精炼、高维穿透地解决用户痛点。
`;

    let retries = 3;
    let response;
    while (retries > 0) {
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: summaryPrompt,
          config: { temperature: 0.1 }
        });
        break;
      } catch (e: any) {
        if (retries === 1 || !(e.message?.includes('503') || e.message?.includes('UNAVAILABLE') || e.message?.includes('high demand'))) {
          throw e;
        }
        console.warn(`[Orchestrator] 503 from Synthesizer, retrying... (${retries} left)`);
        await new Promise(r => setTimeout(r, 2000));
        retries--;
      }
    }

    agentResults['综合统筹结论'] = response?.text || "";
  } catch(e: any) {
    console.error("Synthesizer error:", e);
    if (e.message?.includes('API_KEY_INVALID') || e.message?.includes('API key not valid')) {
      throw e;
    }
  }

  // 汇总编排最终报告
  return agentResults;
}
