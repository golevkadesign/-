import { getUniversalAiClient } from "../utils/ai-universal";
import { DEFAULT_PROMPTS } from "../../src/lib/defaultPrompts";

export async function runAnalysisAgent(userTier: string, contextData: any, history: any[], section: string, query: string, settings?: any, attachments: any[] = []) {
  const ai = getUniversalAiClient(settings);
  
  let systemPrompt = "";
  const customPrompts = settings?.agentPrompts || {};

  // 精心设计的各个子Agent的Prompt Engineering
  switch (section) {
    case "Debt Focus":
      systemPrompt = customPrompts.debt || DEFAULT_PROMPTS.debt;
      break;
    case "High Net Worth":
      systemPrompt = customPrompts.hnw || DEFAULT_PROMPTS.hnw;
      break;
    case "Market Analysis":
      systemPrompt = customPrompts.market || DEFAULT_PROMPTS.market;
      break;
    case "Devil Advocate":
      systemPrompt = customPrompts.devil || DEFAULT_PROMPTS.devil;
      break;
    default:
      systemPrompt = customPrompts.general || DEFAULT_PROMPTS.general;
      break;
  }

  const authenticityPact = `【真实性公约】: 你是一个严格的专业财务终端。你只能使用下面提供的 \`上下文数据\` (涵盖 marketData 或 livePortfolio) 中的实时数值。如果数据中没有某个标的的当前股价，你必须回答『无法获取该标的的实时行情』，严禁基于历史记忆猜测或虚构任何数字（尤其是股价和涨跌幅）。若使用了数据，请必须标注数据来源，例如：“根据长桥实时行情（$TSLA: 178.43）...”。\n\n`;

  try {
    let parts: any[] = [{ text: `${authenticityPact}系统设定：\n${systemPrompt}\n\n当前用户所处层级：${userTier}\n\n历史对话记录：\n${JSON.stringify(history)}\n\n上下文数据：\n${JSON.stringify(contextData)}\n\n用户的需求/提问：\n${query}` }];
    if (attachments && attachments.length > 0) {
       attachments.forEach((att: any) => {
          if (att.data) parts.push({ inlineData: { data: att.data, mimeType: att.mimeType } });
       });
    }

    let timeoutId: any;
    const response = await Promise.race([
      ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts
          }
        ],
        config: {
          temperature: 0.2, // 保持专业性和稳定性
          tools: [{ googleSearch: {} }],
        }
      }),
      new Promise<any>((_, reject) => { timeoutId = setTimeout(() => reject(new Error('Agent AI Timeout')), 60000); })
    ]).finally(() => clearTimeout(timeoutId));
    return response.text;
  } catch (error: any) {
    console.error(`Agent Error (${section}):`, error);
    const isFatal = error.message?.includes('API_KEY_INVALID') || error.message?.includes('API key not valid') || error.message?.includes('exceeded your current quota') || error.message?.includes('Quota exceeded') || error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('monthly spending cap');
    if (isFatal) {
      throw error;
    }
    return `[专家分析服务异常] 无法获取 ${section} 板块的结论。`;
  }
}
