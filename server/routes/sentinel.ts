import { Router } from "express";
import { getUniversalAiClient } from "../utils/ai-universal";

export const sentinelRouter = Router();

sentinelRouter.post("/scan", async (req, res) => {
  try {
    const { terminalState, settings } = req.body;
    
    const passedSettings = settings || {};
    passedSettings.provider = "gemini";
    const ai = getUniversalAiClient(passedSettings);

    const prompt = `你是一个冷酷、敏锐的系统级守护进程（Sentinel 守护进程）。你的唯一任务是基于传入的用户终端资产状态数据（JSON），执行极速的安全与异动巡检。

【巡检逻辑】：
分析资产集中度、流动性枯竭风险、极度高风险标的（如期权占比是否过高、非流动资产是否超过 60% 等）、严重负债等问题。当期权/非流动资产占比超过 60% 时，强制触发降杠杆干预。如果发现任何危及系统账户基础安全的严重风险点，强制唤起主动干预卡片。如果整体健康，则保持静默。

强制输出严格的 JSON 结构：
\`\`\`json
{
  "triggered": boolean,
  "reason": "触发内部判定逻辑的简要原因",
  "cardProps": {
    "title": "🚨 警报标题",
    "description": "...",
    "level": "critical" | "warning",
    "actions": [ { "label": "...", "prompt": "...", "type": "primary" } ]
  }
}
\`\`\`

【终端资产状态数据】：
${JSON.stringify(terminalState, null, 2)}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const outputText = response.text || "{}";
    let jsonResult;
    try {
      jsonResult = JSON.parse(outputText);
    } catch (e) {
      const match = outputText.match(/```json\n([\s\S]*?)\n```/);
      if (match) {
        jsonResult = JSON.parse(match[1]);
      } else {
        throw new Error("Failed to parse JSON response");
      }
    }

    res.json(jsonResult);
  } catch (error: any) {
    console.error("Sentinel scan error:", error);
    res.json({ triggered: false, reason: "Error evaluating risk: " + error.message });
  }
});
