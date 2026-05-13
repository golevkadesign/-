import { useState } from 'react';
import { getSettings } from '../lib/settings';

export type PlanStatus = 'idle' | 'thinking' | 'done';

export interface PlanState {
  status: PlanStatus;
  result: string;
  thinking: string;
}

export function useStrategyStream() {
  const [nodePlans, setNodePlans] = useState<Record<string, PlanState>>({});

  const executePlan = async (typeStr: string, item: any, isLong: boolean, idx: number) => {
    const contentStr = encodeURIComponent(item.description || item.title || '');
    const contentHash = btoa(contentStr).slice(0, 15);
    const planKey = `${isLong ? 'long' : 'short'}-${idx}-${contentHash}`;

    setNodePlans(prev => ({
      ...prev,
      [planKey]: { status: 'thinking', result: '', thinking: '启动 AI 战略脑...' }
    }));

    const prompt = `你是一个顶尖的人生战略推演系统（配有高级推演核心）。请对以下【${item.timeNode}】阶段的计划进行极度硬核的落地推演。
节点名称：[${item.title}]
节点说明：${item.description}

严格要求：
1. 必须开启思维链，利用 <think> 标签包裹你的所有深层推理、定点分析步骤。
2. <think> 闭合后，严格按照以下三段式输出真正的硬核执行成果（使用精简 Markdown，禁止口水话和废话）：
   - ⚡ 核心执行序列 (列出前3步绝对具体、可衡量的动作)
   - ⚠️ 漏洞与定点风控预警 (指出本项中最容易使目标崩盘的2个隐患)
   - 💎 资源杠杆锚点 (在这个阶段，最应该优先把资金或精力倾注在什么地方)`;

    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          settings: getSettings(),
          customApiKey: localStorage.getItem('custom_gemini_api_key') || undefined
        })
      });

      if (!response.body) throw new Error('No readable stream from /api/plan');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';
      let buffer = '';
      let lastUpdateTime = 0; // 引入节流阀时间戳
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        let hasUpdates = false;

        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.text) {
                accumulatedText += parsed.text;
                hasUpdates = true;
              }
            } catch (e) {
              // Ignore partial JSON parsing errors
            }
          }
        }

        // 核心修复：节流渲染 (Throttling)
        // 将 setNodePlans 移出 for 循环，并且限制至少间隔 60 毫秒才触发一次 React 重绘
        const now = Date.now();
        if (hasUpdates && now - lastUpdateTime > 60) {
            let thinkMatch = accumulatedText.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
            let currentThinkLine = '建立深度推演图谱...';
            
            if (thinkMatch) {
                const thinkContent = thinkMatch[1].trim();
                const thinkLines = thinkContent.split('\n').filter(l => l.trim().length > 0);
                if (thinkLines.length > 0) {
                   let lastLine = thinkLines[thinkLines.length - 1].replace(/[*#`]/g, '').trim();
                   if (lastLine.length > 40) lastLine = lastLine.substring(0, 40) + '...';
                   currentThinkLine = lastLine;
                }
            }
            
            const resText = accumulatedText.replace(/<think>[\s\S]*?(?:<\/think>|$)/, '').trim();

            setNodePlans(prev => ({
              ...prev,
              [planKey]: { status: 'thinking', result: resText, thinking: currentThinkLine }
            }));
            
            lastUpdateTime = now; // 重置节流阀
        }
      }

      // 确保流结束后，进行最后一次完整的高精度数据托底渲染
      let finalThinkMatch = accumulatedText.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
      const finalResText = accumulatedText.replace(/<think>[\s\S]*?(?:<\/think>|$)/, '').trim();
      setNodePlans(prev => ({
        ...prev,
        [planKey]: { status: 'done', result: finalResText, thinking: '推演执行完毕' }
      }));

    } catch (e: any) {
      let errMsg = e.message;
      if (errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE')) {
         errMsg = "API 当前负载较高 (503 Service Unavailable)。需求激增通常是暂时的，请稍后再试。";
      } else if (errMsg.includes('API key not valid') || errMsg.includes('API_KEY_INVALID')) {
         errMsg = "获取到的 API Key 无效。请点击此环境的 Settings（设置） -> Secrets 面板，检查并清除或更新您自定义的 API_KEY。";
      } else if (errMsg.includes('exceeded your current quota') || errMsg.includes('rate limits') || errMsg.includes('Quota exceeded') || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('monthly spending cap')) {
         errMsg = "API 额度已耗尽 (Resource Exhausted - Quota Exceeded)。您配置的 API Key 免费额度/速率或可用资金余额已达上限，请稍微重试或检查计费层级。";
      } else if (errMsg.includes('{')) {
          try {
              const parsed = JSON.parse(errMsg.substring(errMsg.indexOf('{')));
              if (parsed.error?.message) errMsg = parsed.error.message;
          } catch {}
      }
      setNodePlans(prev => ({
        ...prev,
        [planKey]: { status: 'done', result: `⚠️ 推演中断: ${errMsg}`, thinking: 'Neural Link Disconnected' }
      }));
    }
  };

  const clearNodePlans = () => setNodePlans({});

  return { nodePlans, executePlan, clearNodePlans };
}
