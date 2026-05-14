import { Router } from "express";
import { getUniversalAiClient } from "../utils/ai-universal";

export const profileRouter = Router();

profileRouter.post("/generate", async (req, res) => {
  try {
    const { settings, contextData = {} } = req.body;
    
    // Default to gemini-2.5-flash as requested
    const passedSettings = settings || {};
    passedSettings.provider = "gemini";
    // We override model if we can, but let's just make sure we request flash
    const ai = getUniversalAiClient(passedSettings);
    
    const prompt = `你是一个客观且专业的第三人称资产管理分析旁白。你的任务是基于传入的 JSON 数据，生成一份格式化的自然语言长线记忆报告。
报告需严格包含以下板块：
1. 核心画像与性格
2. 职业与履历现状
3. 资产结构总览
4. 长短线战略目标记录

【严格约束】
- 纯粹的翻译任务（JSON -> 自然语言），严禁凭空捏造数据或给出投资建议。
- 必须 100% 忠实于传入的 JSON 数据。
- 输出纯 Markdown 格式。

【JSON 数据】
${JSON.stringify(contextData, null, 2)}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    res.json({ content: response.text });
  } catch (error: any) {
    console.error("Profile generation error:", error);
    res.status(500).json({ error: error.message });
  }
});
