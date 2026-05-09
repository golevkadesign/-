import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface ReactEChartsProps {
  option: any;
  style?: React.CSSProperties;
}

export const ReactECharts: React.FC<ReactEChartsProps> = ({ option, style }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    let chartInstance = echarts.getInstanceByDom(chartRef.current);
    if (!chartInstance) {
      chartInstance = echarts.init(chartRef.current, 'dark', { renderer: 'canvas' });
    }

    chartInstance.setOption({
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'Inter, sans-serif' },
      ...option,
      tooltip: { 
        backgroundColor: '#1e293b', 
        borderColor: '#334155', 
        textStyle: { color: '#f8fafc' },
        ...(option.tooltip || {})
      }
    }, true);

    const handleResize = () => chartInstance.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance?.dispose();
    };
  }, [option]);

  return <div ref={chartRef} style={{ width: '100%', height: '100%', ...style }} />;
};
