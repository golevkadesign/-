import { useEffect } from 'react';

export function useSentinel(commitData: any) {
  useEffect(() => {
    const eventSource = new EventSource('/api/sentinel/stream');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'alert' && data.payload) {
          // 收到后台推送的原子 UI，强行插入到战术干预层
          commitData((prev: any) => ({
            ...prev,
            dynamicWidgets: [data.payload, ...(prev.dynamicWidgets || [])]
          }));
        }
      } catch (e) {
        console.error("Sentinel parse error:", e);
      }
    };

    return () => eventSource.close();
  }, [commitData]);
}
