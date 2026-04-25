import React from 'react';
import { motion } from 'motion/react';
import { PieChart, RefreshCw } from 'lucide-react';
import { ReactECharts } from './ReactECharts';

interface ChartWidgetProps {
  title: React.ReactNode;
  dataLength: number;
  insight?: string | React.ReactNode;
  option?: any;
  delay?: number;
  chartHeight?: string;
  children?: React.ReactNode;
  status?: 'loading' | 'empty' | 'error' | 'success'; 
  onReload?: () => void;
}

export function ChartWidget({ title, dataLength, insight, option, delay = 0, chartHeight = '250px', children, status, onReload }: ChartWidgetProps) {
  // If status is provided, use it, else derive from dataLength
  const currentStatus = status || (dataLength > 0 ? 'success' : 'empty');

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: delay, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel p-5 sm:p-6 flex flex-col relative overflow-hidden h-full shadow-[0_4px_20px_rgba(0,0,0,0.05)]"
    >
      <h3 className="text-[14px] font-semibold text-white mb-4 flex justify-between items-center z-10 shrink-0">
        <span className="flex items-center gap-2">{title}</span>
      </h3>
      
      {currentStatus === 'loading' && (
         <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] gap-4">
             <div className="w-full flex items-end justify-center gap-2 h-32 opacity-20">
                <div className="w-8 bg-slate-500 rounded-t-sm h-1/3 animate-pulse" style={{ animationDelay: '0ms' }} />
                <div className="w-8 bg-slate-500 rounded-t-sm h-2/3 animate-pulse" style={{ animationDelay: '150ms' }} />
                <div className="w-8 bg-slate-500 rounded-t-sm h-full animate-pulse" style={{ animationDelay: '300ms' }} />
                <div className="w-8 bg-slate-500 rounded-t-sm h-1/2 animate-pulse" style={{ animationDelay: '450ms' }} />
             </div>
             <div className="text-sm font-medium text-slate-500 animate-pulse">资源加载中...</div>
         </div>
      )}

      {currentStatus === 'empty' && (
         <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] text-slate-500/50">
           <PieChart className="w-12 h-12 mb-3" />
           <span className="text-sm font-medium text-slate-500">暂无数据展示</span>
         </div>
      )}

      {currentStatus === 'error' && (
         <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] text-rose-500/80 gap-3">
            <span className="text-sm font-medium">数据加载异常</span>
            {onReload && (
               <button onClick={onReload} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/30 hover:bg-rose-500/10 text-xs transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" /> 重新加载
               </button>
            )}
         </div>
      )}

      {currentStatus === 'success' && (
        <div className="flex-1 flex flex-col min-h-0">
          {option || children ? (
            <div className="w-full relative z-10 shrink-0" style={{ height: chartHeight }}>
              {children ? children : <ReactECharts option={option} />}
            </div>
          ) : null}
          
          {insight && insight !== "暂无非公开资产数据" && insight !== "暂无公开市场持仓" && (
            <div className="mt-5 pt-4 border-t border-white/5 relative z-10 flex-1 overflow-y-auto custom-scroll pr-2">
              <h4 className="text-[12px] font-semibold text-slate-400 mb-3 tracking-wide">分析诊断</h4>
              {typeof insight === 'string' ? (
                 <p className="text-sm text-slate-300 leading-relaxed">{insight}</p>
              ) : (
                 insight
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
