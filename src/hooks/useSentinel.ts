import { useEffect } from 'react';
import { TerminalState } from '../types/terminal';
import { getSettings } from '../lib/settings';

export function useSentinel(data: any, commitData: any) {
  useEffect(() => {
    const eventSource = new EventSource('/api/sentinel/stream');

    eventSource.onmessage = (event) => {
      try {
        const payloadData = JSON.parse(event.data);
        if (payloadData.type === 'alert' && payloadData.payload) {
          // 收到后台推送的原子 UI，强行插入到战术干预层
          commitData((prev: any) => ({
            ...prev,
            dynamicWidgets: [payloadData.payload, ...(prev.dynamicWidgets || [])]
          }));
        }
      } catch (e) {
        console.error("Sentinel parse error:", e);
      }
    };

    return () => eventSource.close();
  }, [commitData]);

  useEffect(() => {
    if (!data || Object.keys(data.metrics || {}).length === 0) return;

    const runSentinel = async () => {
      try {
        await fetch('/api/sentinel/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ terminalState: data, settings: getSettings() })
        });
      } catch (e) {
        console.error("Sentinel heartbeat failed:", e);
      }
    };

    // 初始延迟 5 秒执行第一次
    const initialTimer = setTimeout(() => runSentinel(), 5000);
    // 之后每 30 秒执行一次心跳巡检
    const intervalTimer = setInterval(() => runSentinel(), 30000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, [data]);
}
