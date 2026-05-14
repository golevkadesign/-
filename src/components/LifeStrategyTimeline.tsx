import React from 'react';
import { motion } from 'motion/react';
import { Loader2, RefreshCw, Activity, Cpu } from 'lucide-react';
import Markdown from 'react-markdown';

interface LifeStrategyTimelineProps {
  lifeStrategiesShort?: any[];
  lifeStrategiesLong?: any[];
  nodePlans: Record<string, any>;
  handleInlineNodePlan: (typeStr: string, item: any, isLong: boolean, idx: number) => void;
}

export function LifeStrategyTimeline({
  lifeStrategiesShort,
  lifeStrategiesLong,
  nodePlans,
  handleInlineNodePlan
}: LifeStrategyTimelineProps) {
  return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-10">
         {/* 短线 */}
         <motion.div 
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ type: "spring", stiffness: 400, damping: 25, staggerChildren: 0.1 }}
           className="bg-dash-surface border border-dash-subtle rounded-3xl p-6 sm:p-8 relative overflow-hidden group shadow-sm transition-colors hover:bg-dash-surface-hover"
         >
           <h3 className="text-[11px] font-semibold text-dash-secondary mb-8 flex items-center gap-2 uppercase tracking-[0.1em] block w-full">
             Short-Term Strategy <span className="text-dash-tertiary ml-auto">12 Months</span>
           </h3>
           {(!lifeStrategiesShort || lifeStrategiesShort.length === 0) ? (
              <div className="text-dash-tertiary text-[11px] flex items-center justify-center h-24 border border-dash-subtle rounded-2xl bg-dash-surface-hover font-semibold uppercase tracking-widest">No Data</div>
           ) : (
              <div className="relative border-l border-dash-subtle ml-4 space-y-12 my-4">
                {lifeStrategiesShort.map((item: any, idx: number) => {
                   const contentStr = encodeURIComponent(item.description || item.title || '');
                   const contentHash = btoa(contentStr).slice(0, 15);
                   const planKey = `short-${idx}-${contentHash}`;
                   const plan = nodePlans[planKey];
                   return (
                   <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 400, damping: 25, delay: idx * 0.1 }} key={idx} className="pl-6 sm:pl-8 relative group/item">
                      <div className="absolute w-3 h-3 bg-dash-primary rounded-full -left-[6.5px] top-2 ring-4 ring-dash-base shadow-sm" />
                      <div className="inline-block bg-dash-surface-hover text-dash-primary font-mono text-[10px] sm:text-xs px-3 py-1.5 rounded-lg mb-3 tracking-wide border border-dash-subtle tabular-nums font-semibold">
                        {item.timeNode}
                      </div>
                      <div className="flex justify-between items-start mb-3 gap-2">
                         <h4 className="text-[15px] sm:text-lg font-semibold text-dash-primary leading-tight tracking-tight pr-0">{item.title}</h4>
                         <button 
                           onClick={() => plan?.status === 'thinking' ? null : handleInlineNodePlan('短线策略', item, false, idx)}
                           disabled={plan?.status === 'thinking'}
                           className="shrink-0 text-[10px] uppercase font-semibold border border-dash-subtle hover:border-dash-primary bg-dash-surface-hover hover:bg-white text-dash-primary hover:text-dash-base px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed tracking-widest shadow-sm"
                         >
                           {plan?.status === 'thinking' ? <Loader2 className="w-3 h-3 animate-spin" /> : (plan?.status === 'done' ? <RefreshCw className="w-3 h-3" /> : <Activity className="w-3 h-3"/> )}
                           {plan?.status === 'thinking' ? 'Wait' : (plan?.status === 'done' ? 'Retry' : 'Analyze')}
                         </button>
                      </div>
                      <p className="text-[13px] text-dash-secondary leading-relaxed p-4 rounded-2xl border border-dash-subtle bg-dash-surface-hover">
                        {item.description}
                      </p>
                      {plan && (
                         <div className="mt-4 bg-dash-base border border-dash-subtle rounded-2xl overflow-hidden text-xs sm:text-sm shadow-inner">
                            {plan.status === 'thinking' && (
                               <div className="flex items-center gap-2 px-4 py-3 text-dash-primary font-semibold tracking-wide text-[10px] sm:text-xs border-b border-dash-subtle bg-dash-surface-hover">
                                  <Cpu className="w-3.5 h-3.5 animate-pulse shrink-0" />
                                  <span className="truncate">{plan.thinking || 'Connecting...'}</span>
                               </div>
                            )}
                            {plan.result && (
                               <div className="p-4 sm:p-5 text-dash-primary markdown-body leading-relaxed text-[13px]">
                                  <Markdown>{plan.result}</Markdown>
                               </div>
                            )}
                         </div>
                      )}
                   </motion.div>
                )})}
              </div>
           )}
         </motion.div>

         {/* 长线 */}
         <motion.div 
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ type: "spring", stiffness: 400, damping: 25, staggerChildren: 0.1, delay: 0.2 }}
           className="bg-dash-surface border border-dash-subtle rounded-3xl p-6 sm:p-8 relative overflow-hidden group shadow-sm transition-colors hover:bg-dash-surface-hover"
         >
           <h3 className="text-[11px] font-semibold text-dash-secondary mb-8 flex items-center gap-2 uppercase tracking-[0.1em] block w-full">
             Long-Term Strategy <span className="text-dash-tertiary ml-auto">10+ Years</span>
           </h3>
           {(!lifeStrategiesLong || lifeStrategiesLong.length === 0) ? (
              <div className="text-dash-tertiary text-[11px] flex items-center justify-center h-24 border border-dash-subtle rounded-2xl bg-dash-surface-hover font-semibold uppercase tracking-widest">No Data</div>
           ) : (
              <div className="relative border-l border-dash-subtle ml-4 space-y-12 my-4">
                {lifeStrategiesLong.map((item: any, idx: number) => {
                   const contentStr = encodeURIComponent(item.description || item.title || '');
                   const contentHash = btoa(contentStr).slice(0, 15);
                   const planKey = `long-${idx}-${contentHash}`;
                   const plan = nodePlans[planKey];
                   return (
                   <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 400, damping: 25, delay: idx * 0.1 }} key={idx} className="pl-6 sm:pl-8 relative group/item">
                      <div className="absolute w-3 h-3 bg-dash-primary rounded-full -left-[6.5px] top-2 ring-4 ring-dash-base shadow-sm" />
                      <div className="inline-block bg-dash-surface-hover text-dash-primary font-mono text-[10px] sm:text-xs px-3 py-1.5 rounded-lg mb-3 tracking-wide border border-dash-subtle tabular-nums font-semibold">
                        {item.timeNode}
                      </div>
                      <div className="flex justify-between items-start mb-3 gap-2">
                         <h4 className="text-[15px] sm:text-lg font-semibold text-dash-primary leading-tight tracking-tight pr-0">{item.title}</h4>
                         <button 
                           onClick={() => plan?.status === 'thinking' ? null : handleInlineNodePlan('长线策略', item, true, idx)}
                           disabled={plan?.status === 'thinking'}
                           className="shrink-0 text-[10px] uppercase font-semibold border border-dash-subtle hover:border-dash-primary bg-dash-surface-hover hover:bg-white text-dash-primary hover:text-dash-base px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed tracking-widest shadow-sm"
                         >
                           {plan?.status === 'thinking' ? <Loader2 className="w-3 h-3 animate-spin" /> : (plan?.status === 'done' ? <RefreshCw className="w-3 h-3" /> : <Activity className="w-3 h-3"/> )}
                           {plan?.status === 'thinking' ? 'Wait' : (plan?.status === 'done' ? 'Retry' : 'Analyze')}
                         </button>
                      </div>
                      <p className="text-[13px] text-dash-secondary leading-relaxed p-4 rounded-2xl border border-dash-subtle bg-dash-surface-hover">
                        {item.description}
                      </p>
                      {plan && (
                         <div className="mt-4 bg-dash-base border border-dash-subtle rounded-2xl overflow-hidden text-xs sm:text-sm shadow-inner">
                            {plan.status === 'thinking' && (
                               <div className="flex items-center gap-2 px-4 py-3 text-dash-primary font-semibold tracking-wide text-[10px] sm:text-xs border-b border-dash-subtle bg-dash-surface-hover">
                                  <Cpu className="w-3.5 h-3.5 animate-pulse shrink-0" />
                                  <span className="truncate">{plan.thinking || 'Connecting...'}</span>
                               </div>
                            )}
                            {plan.result && (
                               <div className="p-4 sm:p-5 text-dash-primary markdown-body leading-relaxed text-[13px]">
                                  <Markdown>{plan.result}</Markdown>
                               </div>
                            )}
                         </div>
                      )}
                   </motion.div>
                )})}
              </div>
           )}
         </motion.div>
      </div>
  );
}
