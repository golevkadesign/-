import { Router } from "express";
import { getUniversalAiClient } from "../utils/ai-universal";
import { DEFAULT_PROMPTS } from "../../src/lib/defaultPrompts";

export const sandboxRouter = Router();

sandboxRouter.post("/chat", async (req, res) => {
  try {
    const { history = [], message, widgetContext, widgetTitle = "局部模块", expertRole = "金融专家", globalState, settings } = req.body;

    let hardCoreMethodology = DEFAULT_PROMPTS.general;
    if (expertRole.includes("量化") || expertRole.includes("宏观") || expertRole.includes("市场")) hardCoreMethodology = DEFAULT_PROMPTS.market;
    else if (expertRole.includes("债务") || expertRole.includes("危机")) hardCoreMethodology = DEFAULT_PROMPTS.debt;
    else if (expertRole.includes("高净值") || expertRole.includes("家族") || expertRole.includes("UHNWI")) hardCoreMethodology = DEFAULT_PROMPTS.hnw;
    else if (expertRole.includes("杠精") || expertRole.includes("压力") || expertRole.includes("黑天鹅")) hardCoreMethodology = DEFAULT_PROMPTS.devil;

    const passedSettings = settings || {};
    const ai = getUniversalAiClient(passedSettings);

    // 数据轻量化脱水
    const cleanGlobalState = { ...globalState };
    delete cleanGlobalState.sduiSchema;
    
    let cleanWidgetContext = widgetContext;
    if (widgetContext && typeof widgetContext === 'object' && 'option' in widgetContext) {
        cleanWidgetContext = { ...widgetContext, option: "[ECharts图表前端渲染配置已脱水]" };
    }

    const systemPrompt = `你现在是负责【${expertRole}】领域的顶尖专家。
【你的核心方法论与纪律】：
${hardCoreMethodology}

【沙盒行动准则】：
用户正在查看其财务大盘的【${widgetTitle}】模块。请结合用户的全局画像以及当前的局部数据，与用户进行轻松、深度的探讨或脑暴。你的回答只需提供纯文本建议、推演或情绪价值，**绝对不要**输出任何用于更新系统的 JSON 代码块，你没有修改系统的权限！

【最高优先级防幻觉指令】：
系统 userProfile 或 insights 中的文字可能是过期的历史记忆。当评估用户的资产、持仓(publicHoldings)或开支时，你必须绝对服从全局大盘 \`distributions\` 数组和 \`metrics\` 对象中的真实客观数字！眼见为实！

【当前全局大盘真实数据 (CRITICAL)】：
${JSON.stringify(cleanGlobalState || {}, null, 2)}

【当前模块聚焦数据】：
${JSON.stringify(cleanWidgetContext || {}, null, 2)}`;

    // Build conversation history
    const contents: any[] = [];

    for (const msg of history) {
      if (msg.role === 'user' || msg.role === 'model') {
        contents.push({
          role: msg.role,
          parts: [{ text: msg.text || msg.content || "" }]
        });
      }
    }

    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const responseStream = await ai.models.generateContentStream({
      model: passedSettings.geminiFastModel || "gemini-2.5-flash",
      contents,
      config: {
         systemInstruction: systemPrompt,
         temperature: 0.4
      }
    });

    for await (const chunk of responseStream) {
       const text = chunk.text;
       if (text) {
         res.write(`data: ${JSON.stringify({ text })}\n\n`);
       }
    }
    
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error: any) {
    console.error("Sandbox chat error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});
