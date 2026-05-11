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
    
    // If a custom API key is passed and we want to allow it:
    // This is optional if your backend manages logic
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: { temperature: 0.3 }
    });

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
