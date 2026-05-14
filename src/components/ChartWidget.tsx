import React from 'react';
import { motion } from 'motion/react';
import { PieChart, RefreshCw } from 'lucide-react';
import { ReactECharts } from './ReactECharts';
import { useInteractionStore } from '../hooks/useInteractionStore';

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
  badge?: React.ReactNode;
}

export function ChartWidget({ title, dataLength, insight, option, delay = 0, chartHeight = '250px', children, status, onReload, badge }: ChartWidgetProps) {
  // If status is provided, use it, else derive from dataLength
  const currentStatus = status || (dataLength > 0 ? 'success' : 'empty');

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25, delay: delay }}
      className="bg-dash-surface border border-dash-subtle rounded-3xl p-6 sm:p-8 flex flex-col relative overflow-hidden h-full shadow-sm group hover:bg-dash-surface-hover transition-colors"
    >
      <h3 className="text-[11px] font-semibold text-dash-secondary mb-6 flex justify-between items-start z-10 shrink-0 uppercase tracking-widest">
        <span className="flex items-center gap-2">{title}</span>
        <div className="flex items-center gap-2">
          {badge && <div>{badge}</div>}
          <button
             className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-dash-primary/10 text-dash-primary border border-dash-primary/20 hover:bg-dash-primary/20 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm"
             onClick={() => useInteractionStore.getState().openCopilot(title as string, { insight }, '数据分析专家')}
             title="专家探讨"
          >
             ✨ 空中脑暴
          </button>
        </div>
      </h3>
      
      {currentStatus === 'loading' && (
         <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] gap-4">
             <div className="w-full flex items-end justify-center gap-2 h-32 opacity-30 skeleton-shimmer bg-clip-text">
                <div className="w-8 bg-dash-surface-hover rounded-t-sm h-1/3 border-t border-x border-dash-subtle" />
                <div className="w-8 bg-dash-surface-hover rounded-t-sm h-2/3 border-t border-x border-dash-subtle" />
                <div className="w-8 bg-dash-surface-hover rounded-t-sm h-full border-t border-x border-dash-subtle" />
                <div className="w-8 bg-dash-surface-hover rounded-t-sm h-1/2 border-t border-x border-dash-subtle" />
             </div>
             <div className="text-[11px] uppercase tracking-widest font-semibold text-dash-tertiary loading-dots">Resource Loading</div>
         </div>
      )}

      {currentStatus === 'empty' && (
         <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] text-dash-tertiary">
           <PieChart className="w-10 h-10 mb-4 opacity-30" />
           <span className="text-[11px] uppercase tracking-widest font-semibold">No Data Available</span>
         </div>
      )}

      {currentStatus === 'error' && (
         <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] text-dash-red gap-3">
            <span className="text-[11px] uppercase tracking-widest font-semibold">Data Load Error</span>
            {onReload && (
               <button onClick={onReload} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-dash-red/20 hover:bg-dash-red/10 text-xs font-semibold transition-colors mt-2">
                  <RefreshCw className="w-3.5 h-3.5" /> Retry
               </button>
            )}
         </div>
      )}

      {currentStatus === 'success' && (
        <div className="flex-1 flex flex-col min-h-0">
          {option || children ? (
            <div className="w-full relative z-10 shrink-0 mb-6" style={{ height: chartHeight }}>
              {children ? children : <ReactECharts option={option} />}
            </div>
          ) : null}
          
          {insight && insight !== "暂无非公开资产数据" && insight !== "暂无公开市场持仓" && (
            <div className="mt-auto pt-6 border-t border-dash-subtle relative z-10 flex-1 overflow-y-auto custom-scroll pr-2">
              <h4 className="text-[11px] font-semibold text-dash-tertiary mb-3 tracking-[0.1em] uppercase block w-full">Terminal Diagnostics</h4>
              {typeof insight === 'string' ? (
                 <p className="text-[13px] text-dash-primary leading-relaxed bg-dash-surface-hover p-4 rounded-2xl border border-dash-subtle">{insight}</p>
              ) : (
                 <div className="bg-dash-surface-hover p-4 rounded-2xl border border-dash-subtle text-[13px] text-dash-primary leading-relaxed">{insight}</div>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

