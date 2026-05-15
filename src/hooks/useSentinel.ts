import { useEffect, useRef } from 'react';
import { TerminalState } from '../types/terminal';
import { getSettings } from '../lib/settings';

export function useSentinel(data: any, commitData: any) {
  const hasScanned = useRef(false);
  const latestData = useRef(data);
  
  // 💥 修复 1：使用 ref 永远保持最新状态引用，而不触发 re-render 监听
  useEffect(() => {
    latestData.current = data;
  }, [data]);

  useEffect(() => {
    const eventSource = new EventSource('/api/sentinel/stream');

    eventSource.onmessage = (event) => {
      try {
        const payloadData = JSON.parse(event.data);
        if (payloadData.type === 'alert' && payloadData.payload) {
          commitData((prev: any) => {
            const existingWidgets = prev.dynamicWidgets || [];
            
            // 💥 终极防重墙：检查是否已经存在类似警报。如果已经有同为 Box 且内部包含同样文本的警报，或者短时间内重复推送，则直接丢弃
            const isDuplicate = existingWidgets.some((widget: any) => {
               // 简单的深度检测：如果之前有过警报卡，暂时不重复弹。或者你可以根据某种唯一特征（比如 actionIntent 相同）来判断。
               return JSON.stringify(widget).includes(payloadData.payload?.children?.[1]?.props?.text || "never");
            });

            if (isDuplicate) {
               console.warn("Sentinel: 拦截到重复推送的警报卡片，已抛弃。");
               return prev; 
            }

            return {
              ...prev,
              dynamicWidgets: [payloadData.payload, ...existingWidgets]
            };
          });
        }
      } catch (e) {
        console.error("Sentinel parse error:", e);
      }
    };

    return () => eventSource.close();
  }, [commitData]);

  useEffect(() => {
    // 💥 修复 2：只在组件首次挂载且有基础指标时才启动，后续依赖项为空数组 []，绝不重绑
    if (hasScanned.current) return;
    
    // 确保有初始数据才启动
    if (!latestData.current || Object.keys(latestData.current.metrics || {}).length === 0) return;
    
    hasScanned.current = true;

    const runSentinel = async () => {
      try {
        await fetch('/api/sentinel/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // 每次发送时都去拿 ref 里的最新数据
          body: JSON.stringify({ terminalState: latestData.current, settings: getSettings() })
        });
      } catch (e) {
        console.error("Sentinel heartbeat failed:", e);
      }
    };

    // 初始延迟 10 秒执行第一次（避开首屏加载高峰）
    const initialTimer = setTimeout(() => runSentinel(), 10000);
    // 之后每 3 分钟 (180000ms) 执行一次心跳，降低烧 Token 的速度
    const intervalTimer = setInterval(() => runSentinel(), 180000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
      hasScanned.current = false;
    };
  }, []); // 💥 核心：依赖项为空！只绑一次！
}
