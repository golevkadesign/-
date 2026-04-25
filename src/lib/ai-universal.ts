import { getSettings } from './settings.js';
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
  const getS = () => passedSettings || getSettings();

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
             msgs.push({ role: 'system', content: config.systemInstruction });
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
          targetModel = model.includes('flash') ? settings.geminiFastModel : settings.geminiAdvancedModel;
          const apiKey = settings.geminiKey || process.env.GEMINI_API_KEY;
          if (!apiKey) throw new Error("缺少 Gemini API Key");
          const ai = new GoogleGenAI({ apiKey });
          return ai.models.generateContentStream({ model: targetModel, contents, config });
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
             msgs.push({ role: 'system', content: config.systemInstruction });
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
          return fetchOpenAI(apiKey, targetModel, msgs, config?.temperature ?? 0.3, isJsonMode);
        } else {
          targetModel = model.includes('flash') ? settings.geminiFastModel : settings.geminiAdvancedModel;
          const apiKey = settings.geminiKey || process.env.GEMINI_API_KEY;
          if (!apiKey) throw new Error("缺少 Gemini API Key");
          const ai = new GoogleGenAI({ apiKey });
          return ai.models.generateContent({ model: targetModel, contents, config });
        }
      }
    }
  };
};
