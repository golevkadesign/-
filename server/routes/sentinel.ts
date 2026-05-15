import { Router } from "express";
import { getUniversalAiClient } from "../utils/ai-universal";

export const sentinelRouter = Router();
const clients = new Set<any>();

let lastTriggerTime = 0;
const COOLDOWN_MS = 3600000; // 1小时冷却

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
  const now = Date.now();
  if (now - lastTriggerTime < COOLDOWN_MS) {
    return res.json({ success: true, triggered: false, reason: "Sentinel is cooling down to save costs." });
  }

  try {
    const { terminalState, settings } = req.body;
    
    const passedSettings = settings || {};
    const ai = getUniversalAiClient(passedSettings);
    const targetModel = passedSettings.geminiFastModel || "gemini-2.5-flash";

    const prompt = `你是一个冷酷、敏锐的系统级守护进程（Sentinel）。你的唯一任务是基于传入的用户终端资产状态数据（JSON），执行极速的安全与异动巡检。

【巡检逻辑】：
分析流动性枯竭风险、期权高杠杆、严重负债等。当期权/非流动资产占比过高，或发现危及系统安全的严重风险时，必须触发警报！如果整体健康，则保持静默。

【Generative UI 契约 (CRITICAL)】：
如果决定触发警报，你必须现场设计一张视觉冲击力极强的 UI 卡片。
可用原子组件：
- Box: props 包含 bg (如 danger-muted), border (如 danger), padding (lg), className (如 flex flex-col gap-4 rounded-2xl)
- Badge: props 包含 intent (critical, warning), text
- Typography: props 包含 variant (h3-serif, body), color (danger, text-muted), text
- ActionButton: props 包含 variant (danger, primary), label, actionIntent (极其重要，这是点击后发给全局大脑的指令)

强制输出严格的 JSON 结构：
{
  "triggered": true,
  "reason": "触发原因",
  "generativeUI": {
    "type": "Box",
    "props": { "bg": "danger-muted", "border": "danger", "padding": "lg", "className": "rounded-2xl flex flex-col gap-4 shadow-xl" },
    "children": [
       // 在这里组装 Badge, Typography, ActionButton
    ]
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

    if (jsonResult.triggered && jsonResult.generativeUI) {
      lastTriggerTime = Date.now(); // 💥 记录触发时间，进入 1 小时冷却
      
      // 💥 核心：将 AI 实时生成的 UI 积木，通过 SSE 广播给所有在线终端！
      const sseData = `data: ${JSON.stringify({ type: 'alert', payload: jsonResult.generativeUI })}\n\n`;
      clients.forEach(client => client.write(sseData));
    }

    res.json({ success: true, triggered: jsonResult.triggered, reason: jsonResult.reason });
  } catch (error: any) {
    console.error("Sentinel scan error:", error);
    res.json({ triggered: false, reason: "Error evaluating risk: " + error.message });
  }
});
