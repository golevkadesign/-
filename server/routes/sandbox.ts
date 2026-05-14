import { Router } from "express";
import { getUniversalAiClient } from "../utils/ai-universal";

export const sandboxRouter = Router();

sandboxRouter.post("/chat", async (req, res) => {
  try {
    const { history = [], message, widgetContext, widgetTitle = "局部模块", expertRole = "金融专家", globalState, settings } = req.body;

    const passedSettings = settings || {};
    const ai = getUniversalAiClient(passedSettings);

    // 数据轻量化脱水
    const cleanGlobalState = { ...globalState };
    delete cleanGlobalState.sduiSchema;
    
    let cleanWidgetContext = widgetContext;
    if (widgetContext && typeof widgetContext === 'object' && 'option' in widgetContext) {
        cleanWidgetContext = { ...widgetContext, option: "[ECharts图表前端渲染配置已脱水]" };
    }

    const systemPrompt = `你现在是负责【${expertRole}】领域的顶尖专家。用户正在查看其财务大盘的【${widgetTitle}】模块。

【当前全局大盘真实数据 (CRITICAL)】：
${JSON.stringify(cleanGlobalState || {}, null, 2)}

【当前模块聚焦数据】：
${JSON.stringify(cleanWidgetContext || {}, null, 2)}

【核心任务与行为铁律】：
1. 请基于全局大盘的真实持仓、数据，结合聚焦模块，与用户进行深度的探讨。你的回答只需提供纯文本建议，**绝对不要**输出 JSON 代码块。
2. 【最高优先级防幻觉指令】：系统 userProfile 或 insights 中的文字可能是过期的历史记忆。当评估用户的资产、持仓(publicHoldings)或开支时，**你必须绝对服从 \`distributions\` 数组和 \`metrics\` 对象中的真实客观数字！**绝不能根据历史文本脑补用户清仓或全仓了某只股票，眼见为实！`;

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
