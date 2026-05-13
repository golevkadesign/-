import { GoogleGenAI } from '@google/genai';

// Simple polyfill for generateContentStream for OpenAI
async function* fetchOpenAIStream(apiKey: string, model: string, messages: any[], temperature: number) {
  const rs = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      stream: true,
    })
  });
  
  if (!rs.ok) {
    const errorBody = await rs.text();
    throw new Error(`OpenAI API error (${rs.status}): ${errorBody}`);
  }
  
  if (!rs.body) throw new Error("No body in response");
  
  const reader = rs.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        try {
          const parsed = JSON.parse(line.slice(6));
          const text = parsed.choices?.[0]?.delta?.content || '';
          if (text) {
             yield { text };
          }
        } catch (e) {}
      }
    }
  }
}

async function fetchOpenAI(apiKey: string, model: string, messages: any[], temperature: number, jsonMode: boolean = false) {
  const rs = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      stream: false,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {})
    })
  });
  
  if (!rs.ok) {
    const errorBody = await rs.text();
    throw new Error(`OpenAI API error (${rs.status}): ${errorBody}`);
  }
  
  const dat = await rs.json();
  return { text: dat.choices?.[0]?.message?.content || '' };
}

export const getUniversalAiClient = (passedSettings?: any) => {
  const getS = () => passedSettings || {};

  const retryOperation = async (operation: () => Promise<any>, maxRetries = 3, baseDelay = 1000) => {
    let attempt = 0;
    while (true) {
      try {
        return await operation();
      } catch (error: any) {
        attempt++;
        const errMessage = error?.message || String(error);
        const errStatus = error?.status || error?.code || (error?.response?.status);
        const errJsonString = JSON.stringify(error) || '';
        
        // 识别是否是可恢复的瞬时错误 (503 拥挤, 网路重置等)
        const isTransient = errMessage.includes('503') || errMessage.includes('UNAVAILABLE') || 
                            errMessage.includes('fetch failed') || errMessage.includes('ECONNRESET') || 
                            errStatus === 503 || errStatus === 'UNAVAILABLE' || errJsonString.includes('503');
        
        if (!isTransient || attempt > maxRetries) {
          throw error; // 额度耗尽(429)或非瞬时错误，或超限，立刻向上抛出交由降级策略处理
        }
        
        // 核心修复：指数退避 (1s, 2s, 4s...) + 随机抖动 (防止并发请求同时再次重试)
        const delay = baseDelay * Math.pow(2, attempt - 1) + (Math.random() * 500);
        console.log(`[AI Retry] 模型处于高负载 (503)，退避重试 (${attempt}/${maxRetries}) 延时 ${Math.round(delay)}ms...`);
        await new Promise(res => setTimeout(res, delay));
      }
    }
  };

  return {
    models: {
      generateContentStream: async ({ model, contents, config }: any) => {
        const settings = getS();
        
        let targetModel = model;
        if (settings.provider === 'openai') {
          // map model to user choice
          targetModel = model.includes('flash') ? settings.openaiFastModel : settings.openaiAdvancedModel;
          const apiKey = settings.openaiKey || process.env.OPENAI_API_KEY;
          if (!apiKey) throw new Error("缺少 OpenAI API Key");
          
          let msgs = [];
          if (config?.systemInstruction) {
             const sysInst = config.systemInstruction + "\n[System Environment Notice: You do NOT have a live search tool connected. Please rely on provided context or estimate reasonably, and do NOT fail just because you cannot search online.]";
             msgs.push({ role: 'system', content: sysInst });
          }
          
          // format contents
          if (Array.isArray(contents)) {
            for (const c of contents) {
               if (c.role === 'user') {
                 msgs.push({ role: 'user', content: c.parts.map((p:any) => p.text).join('\n') });
               } else if (c.role === 'model') {
                 msgs.push({ role: 'assistant', content: c.parts.map((p:any) => p.text).join('\n') });
               }
            }
          } else if (typeof contents === 'string') {
            msgs.push({ role: 'user', content: contents });
          } else if (contents?.role) {
             msgs.push({ role: contents.role === 'model' ? 'assistant' : 'user', content: contents.parts.map((p:any) => p.text).join('\n') });
          }
          
          return fetchOpenAIStream(apiKey, targetModel, msgs, config?.temperature ?? 0.3);
        } else {
          targetModel = model.includes('flash') ? (settings.geminiFastModel || 'gemini-2.5-flash') : (settings.geminiAdvancedModel || 'gemini-2.5-pro');
          const apiKey = settings.geminiKey || process.env.GEMINI_API_KEY;
          if (!apiKey) throw new Error("缺少 Gemini API Key");
          const ai = new GoogleGenAI({ apiKey });

          let overrideConfig = { ...config };
          const maxR = overrideConfig.maxRetries !== undefined ? overrideConfig.maxRetries : undefined;
          const baseD = overrideConfig.baseDelay !== undefined ? overrideConfig.baseDelay : undefined;
          delete overrideConfig.maxRetries;
          delete overrideConfig.baseDelay;
          
          return retryOperation(() => ai.models.generateContentStream({ model: targetModel, contents, config: overrideConfig }), maxR, baseD);
        }
      },
      generateContent: async ({ model, contents, config }: any) => {
        const settings = getS();
        
        let targetModel = model;
        if (settings.provider === 'openai') {
          targetModel = model.includes('flash') ? settings.openaiFastModel : settings.openaiAdvancedModel;
          const apiKey = settings.openaiKey || process.env.OPENAI_API_KEY;
          if (!apiKey) throw new Error("缺少 OpenAI API Key");
          
          let msgs = [];
          if (config?.systemInstruction) {
             const sysInst = config.systemInstruction + "\n[System Environment Notice: You do NOT have a live search tool connected. Please rely on provided context or estimate reasonably, and do NOT fail just because you cannot search online.]";
             msgs.push({ role: 'system', content: sysInst });
          }
          
          if (Array.isArray(contents)) {
            for (const c of contents) {
               if (c.role === 'user') {
                 msgs.push({ role: 'user', content: c.parts.map((p:any) => p.text).join('\n') });
               } else if (c.role === 'model') {
                 msgs.push({ role: 'assistant', content: c.parts.map((p:any) => p.text).join('\n') });
               }
            }
          } else if (typeof contents === 'string') {
            msgs.push({ role: 'user', content: contents });
          } else if (contents?.role) {
             msgs.push({ role: contents.role === 'model' ? 'assistant' : 'user', content: contents.parts.map((p:any) => p.text).join('\n') });
          }
          
          const isJsonMode = config?.responseMimeType === 'application/json';
          return retryOperation(() => fetchOpenAI(apiKey, targetModel, msgs, config?.temperature ?? 0.3, isJsonMode));
        } else {
          targetModel = model.includes('flash') ? (settings.geminiFastModel || 'gemini-2.5-flash') : (settings.geminiAdvancedModel || 'gemini-2.5-pro');
          const apiKey = settings.geminiKey || process.env.GEMINI_API_KEY;
          if (!apiKey) throw new Error("缺少 Gemini API Key");
          const ai = new GoogleGenAI({ apiKey });
          
          let overrideConfig = { ...config };
          const maxR = overrideConfig.maxRetries !== undefined ? overrideConfig.maxRetries : undefined;
          const baseD = overrideConfig.baseDelay !== undefined ? overrideConfig.baseDelay : undefined;
          delete overrideConfig.maxRetries;
          delete overrideConfig.baseDelay;
          
          return retryOperation(() => ai.models.generateContent({ model: targetModel, contents, config: overrideConfig }), maxR, baseD);
        }
      }
    }
  };
};
