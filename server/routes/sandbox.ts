import { Router } from "express";
import { getUniversalAiClient } from "../utils/ai-universal";

export const sandboxRouter = Router();

sandboxRouter.post("/chat", async (req, res) => {
  try {
    const { history = [], message, widgetContext, expertRole = "金融专家", userProfile, settings } = req.body;

    const passedSettings = settings || {};
    const ai = getUniversalAiClient(passedSettings);

    const systemPrompt = `你现在是负责【${expertRole}】领域的顶尖专家。用户正在查看其财务大盘的局部卡片。请结合用户的全局画像以及当前的局部数据，与用户进行轻松、深度的探讨或脑暴。你的回答只需提供纯文本建议、推演或情绪价值，**绝对不要**输出任何用于更新系统的 JSON 代码块，你没有修改系统的权限。

全局画像：
${JSON.stringify(userProfile || {}, null, 2)}

局部卡片数据：
${JSON.stringify(widgetContext || {}, null, 2)}`;

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
