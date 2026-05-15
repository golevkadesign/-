import { Router } from "express";
import { getUniversalAiClient } from "../utils/ai-universal";

export const sentinelRouter = Router();
const clients = new Set<any>();

sentinelRouter.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  clients.add(res);
  req.on('close', () => { clients.delete(res); });
});

sentinelRouter.post('/evaluate', async (req, res) => {
  // 模拟后台大模型发现了极其严重的宏观异动，生成了 Generative UI 警报
  const alertPayload = {
    type: "Box",
    props: { bg: "danger-muted", border: "danger", padding: "lg", className: "rounded-2xl flex flex-col gap-4 shadow-2xl animate-in fade-in slide-in-from-top-4" },
    children: [
      { type: "Badge", props: { intent: "critical", text: "Sentinel 主动防御预警" } },
      { type: "Typography", props: { variant: "h3-serif", color: "danger", text: "检测到核心持仓发生剧烈异动" } },
      { type: "Typography", props: { variant: "body", color: "text-muted", text: "系统后台监控到您的科技股底仓在盘前出现 >8% 的剧烈回撤，流动性风险骤增。" } },
      { type: "ActionButton", props: { variant: "danger", label: "⚡️ 唤醒债务与量化专家进行深度对冲评估", actionIntent: "请帮我针对盘前科技股大跌，制定具体的债务重组和资产对冲方案" } }
    ]
  };

  const sseData = `data: ${JSON.stringify({ type: 'alert', payload: alertPayload })}\n\n`;
  clients.forEach(client => client.write(sseData));
  
  res.json({ success: true, broadcastCount: clients.size });
});

sentinelRouter.post("/scan", async (req, res) => {
  try {
    const { terminalState, settings } = req.body;
    
    const passedSettings = settings || {};
    const ai = getUniversalAiClient(passedSettings);
    const targetModel = passedSettings.geminiFastModel || "gemini-2.5-flash";

    const prompt = `你是一个冷酷、敏锐的系统级守护进程（Sentinel 守护进程）。你的唯一任务是基于传入的用户终端资产状态数据（JSON），执行极速的安全与异动巡检。

【巡检逻辑】：
分析资产集中度、流动性枯竭风险、极度高风险标的（如期权占比是否过高、非流动资产是否超过 60% 等）、严重负债等问题。当期权/非流动资产占比超过 60% 时，强制触发降杠杆干预。如果发现任何危及系统账户基础安全的严重风险点，强制唤起主动干预卡片。如果整体健康，则保持静默。

强制输出严格的 JSON 结构：
{
  "triggered": true,
  "reason": "触发内部判定逻辑的简要原因",
  "cardProps": {
    "title": "🚨 警报标题",
    "description": "...",
    "level": "critical",
    "actions": [ { "label": "...", "prompt": "...", "type": "primary" } ]
  }
}

【终端资产状态数据】：
${JSON.stringify(terminalState, null, 2)}`;

    const response = await ai.models.generateContent({
      model: targetModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const outputText = response.text || "{}";
    let jsonResult;
    try {
      // Clean up markdown if it was added by the model despite responseMimeType
      const cleanedText = outputText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      jsonResult = JSON.parse(cleanedText);
    } catch (e) {
      const match = outputText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (match) {
        try {
          jsonResult = JSON.parse(match[1].trim());
        } catch (innerE) {
          throw new Error("Failed to parse JSON response: " + outputText);
        }
      } else {
        throw new Error("Failed to parse JSON response: " + outputText);
      }
    }

    res.json(jsonResult);
  } catch (error: any) {
    console.error("Sentinel scan error:", error);
    res.json({ triggered: false, reason: "Error evaluating risk: " + error.message });
  }
});
