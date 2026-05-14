import { useEffect, useRef } from 'react';
import { TerminalState } from '../types/terminal';
import { getSettings } from '../lib/settings';

export const useSentinel = ({ data, commitData }: { data: TerminalState, commitData: any }) => {
  const hasScanned = useRef(false);

  useEffect(() => {
    // 确保有基础数据且本次会话未扫描
    if (!hasScanned.current && data && Object.keys(data.metrics || {}).length > 0) {
      hasScanned.current = true;

      // 静默执行巡检
      const runSentinel = async () => {
        try {
          const res = await fetch('/api/sentinel/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              terminalState: data,
              settings: getSettings()
            })
          });

          if (res.ok) {
            const result = await res.json();
            if (result.triggered && result.cardProps) {
              const newCard = {
                id: "sentinel-alert-" + Date.now(),
                type: "InterventionCard",
                props: result.cardProps
              };

              commitData((prev: TerminalState) => {
                const existingSchema = prev.sduiSchema || [];
                // 防抖：如果已经有同名警告，就不重复添加
                if (existingSchema.some((c: any) => c.type === 'InterventionCard' && c.props?.title === result.cardProps.title)) {
                  return prev;
                }
                return {
                  ...prev,
                  sduiSchema: [newCard, ...existingSchema]
                };
              });
            }
          }
        } catch (e) {
          console.error("Sentinel scan failed:", e);
        }
      };

      // 延迟扫描，不阻塞首屏渲染
      setTimeout(() => {
        runSentinel();
      }, 3000);
    }
  }, [data, commitData]);
};
