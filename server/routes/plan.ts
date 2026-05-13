import express, { Request, Response } from 'express';
import { getUniversalAiClient } from '../utils/ai-universal';

const router = express.Router();

router.post('/', async (req: Request, res: Response) => {
  const { prompt, settings, customApiKey } = req.body;

  // Use custom API key if provided
  if (customApiKey) {
    if (!settings.geminiKey && settings.provider === 'gemini') {
      settings.geminiKey = customApiKey;
    } else if (!settings.openaiKey && settings.provider === 'openai') {
      settings.openaiKey = customApiKey;
    } else if (!settings.provider) {
       // fallback
       settings.geminiKey = customApiKey;
    }
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const ai = getUniversalAiClient(settings);
    let responseStream;

    try {
      // 1. 优先尝试高智商 Pro 模型，设置极速失败策略 (重试 1 次，延迟 300ms)
      responseStream = await ai.models.generateContentStream({
        model: settings?.provider === 'openai' ? (settings?.openaiAdvancedModel || 'gpt-4o') : 'gemini-3.1-pro-preview',
        contents: prompt,
        config: { temperature: 0.3, maxRetries: 1, baseDelay: 300 }
      });
    } catch (e: any) {
      console.warn("[Plan Route] 主力模型拥挤，降级至 Flash 模型接管...");
      // 2. 拥挤时无缝切回高并发 Flash 模型
      responseStream = await ai.models.generateContentStream({
        model: settings?.provider === 'openai' ? (settings?.openaiFastModel || 'gpt-4o-mini') : (settings?.geminiFastModel || 'gemini-2.5-flash'),
        contents: prompt,
        config: { temperature: 0.3 }
      });
    }

    // 3. 开始推流
    for await (const chunk of responseStream) {
      const textChunk = chunk.text;
      res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
      if ('flush' in res && typeof (res as any).flush === 'function') {
         (res as any).flush();
      }
    }
  } catch (error: any) {
    console.error("Plan route error:", error);
    res.write(`data: ${JSON.stringify({ error: error.message || String(error) })}\n\n`);
  } finally {
    res.write(`data: [DONE]\n\n`);
    res.end();
  }
});

export default router;
