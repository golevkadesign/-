import React, { useMemo } from 'react';
import { Card } from '../components/Card';
import { ReactECharts } from '../components/ReactECharts';
import { Sparkles, Activity, AlertTriangle, Zap, ArrowRight, ShieldAlert } from 'lucide-react';
import { getSDUIPieOption } from '../components/chart-configs';
import { ChartWidget } from '../components/ChartWidget';
import { SDUIComponent } from '../types/terminal';

export const ComponentRegistry: Record<string, React.FC<any>> = {
  Grid: ({ columns = 1, gap = 4, children, className = "" }) => {
    const colClass = columns === 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 
                     columns === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 
                     columns === 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1';
    return (
      <div className={`grid ${colClass} gap-${gap} ${className}`}>
        {children}
      </div>
    );
  },
  Flex: ({ direction = 'col', justify, align, gap = 4, children, className = "" }) => {
    const justifyClass = justify ? `justify-${justify}` : '';
    const alignClass = align ? `items-${align}` : '';
    return (
      <div className={`flex flex-${direction} gap-${gap} ${justifyClass} ${alignClass} ${className}`}>
        {children}
      </div>
    );
  },
  MetricCard: (props) => <Card {...props} />,
  DynamicChart: (props) => <ChartWidget {...props} />,
  ChartWidget: (props) => <ChartWidget {...props} />,
  MetricsCard: ({ title, value }) => <Card title={title} value={
    typeof value === 'number' ? `$${value.toLocaleString()}` : value
  } />,
  EChartsPie: ({ data }) => {
    const option = useMemo(() => getSDUIPieOption(data), [data]);

    if (!data || data.length === 0) {
      return (
        <div className="bg-dash-surface-hover rounded-3xl border border-dash-subtle p-6 h-[350px] shadow-sm flex flex-col items-center justify-center animate-pulse">
          <div className="w-40 h-40 rounded-full border-8 border-dash-subtle/30 border-t-dash-subtle/60 animate-spin" />
          <div className="mt-6 h-3 w-24 bg-dash-subtle/50 rounded-full" />
        </div>
      );
    }
    return (
      <div className="bg-dash-surface-hover rounded-3xl border border-dash-subtle p-6 h-[350px] shadow-sm flex flex-col">
         <div className="flex-1 min-h-0">
            <ReactECharts option={option} />
         </div>
      </div>
    );
  },
  Timeline12X: ({ title, nodes }) => {
    if (!nodes || nodes.length === 0) {
      return (
         <div className="bg-dash-surface-hover rounded-3xl border border-dash-subtle p-6 shadow-sm relative overflow-hidden animate-pulse">
            <div className="h-6 w-48 bg-dash-subtle/50 rounded-lg mb-8" />
            <div className="relative border-l border-dash-subtle ml-4 space-y-10 my-4">
               {[1,2,3].map(i => (
                 <div key={i} className="pl-8 relative">
                    <div className="absolute w-4 h-4 bg-dash-subtle rounded-full -left-[8.5px] top-1" />
                    <div className="h-5 w-20 bg-dash-subtle/50 rounded-md mb-3" />
                    <div className="h-6 w-1/3 bg-dash-subtle/50 rounded mb-2" />
                    <div className="h-20 w-full bg-dash-surface rounded-2xl" />
                 </div>
               ))}
            </div>
         </div>
      );
    }
    return (
      <div className="bg-dash-surface-hover rounded-3xl border border-dash-subtle p-6 shadow-sm relative overflow-hidden">
        <h3 className="text-xl font-bold text-dash-primary mb-6 flex items-center gap-2 tracking-tight">
            <Sparkles className="w-5 h-5 text-dash-primary" /> {title}
        </h3>
        <div className="relative border-l border-dash-subtle ml-4 space-y-10 my-4">
           {nodes?.map((item: any, idx: number) => (
             <div key={idx} className="pl-8 relative">
                 <div className="absolute w-4 h-4 bg-dash-primary rounded-full -left-[8.5px] top-1 ring-4 ring-dash-base shadow-sm" />
                 <div className="inline-block bg-dash-surface text-dash-primary font-mono font-semibold text-xs px-3 py-1 rounded-md mb-3 border border-dash-subtle">
                   {item.timeNode}
                 </div>
                 <h4 className="text-lg font-bold text-dash-primary mb-2">{item.title}</h4>
                 <p className="text-sm text-dash-secondary leading-relaxed bg-dash-surface p-4 rounded-2xl border border-dash-subtle">
                   {item.description}
                 </p>
             </div>
           ))}
        </div>
      </div>
    );
  },
  SystemAlert: ({ message }) => (
    <div className="p-4 bg-dash-red/10 text-dash-red text-sm font-medium rounded-xl border border-dash-red/20 my-4 flex items-center gap-3">
      <Activity className="w-5 h-5 shrink-0" />
      {message}
    </div>
  ),
  InterventionCard: ({ title, description, level = 'warning', actions = [] }) => {
    const isCritical = level === 'critical';
    
    return (
      <div className={`relative overflow-hidden rounded-3xl border p-6 shadow-xl w-full
        ${isCritical ? 'bg-red-950/20 border-red-500/50 shadow-red-900/20' : 'bg-amber-950/20 border-amber-500/50 shadow-amber-900/20'}
      `}>
         {/* visual flair like a breathing light or corner accent */}
         {isCritical && (
           <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none">
             <div className="w-32 h-32 bg-red-500 blur-3xl rounded-full mix-blend-screen animate-pulse" />
           </div>
         )}
         {!isCritical && (
           <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none">
             <div className="w-32 h-32 bg-amber-500 blur-3xl rounded-full mix-blend-screen" />
           </div>
         )}
         
         <div className="relative z-10 flex items-start gap-4">
            <div className={`mt-1 shrink-0 ${isCritical ? 'text-red-500 animate-pulse' : 'text-amber-500'}`}>
               {isCritical ? <ShieldAlert className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
            </div>
            <div className="flex-1">
               <h3 className={`text-xl font-bold mb-2 tracking-tight ${isCritical ? 'text-red-400' : 'text-amber-400'}`}>
                  {title}
               </h3>
               <p className="text-sm text-dash-secondary leading-relaxed mb-6">
                  {description}
               </p>
               
               {actions?.length > 0 && (
                 <div className="flex flex-wrap gap-3">
                   {actions.map((action: any, idx: number) => {
                     const isPrimary = action.type === 'primary';
                     return (
                       <button
                         key={idx}
                         onClick={() => window.dispatchEvent(new CustomEvent('trigger-ai-drawer', { detail: action.prompt }))}
                         className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200
                           ${isPrimary 
                             ? (isCritical ? 'bg-red-500/20 text-red-100 hover:bg-red-500/40 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-amber-500/20 text-amber-100 hover:bg-amber-500/40 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]') 
                             : 'bg-black/40 text-dash-tertiary hover:text-dash-primary border border-dash-subtle hover:bg-black/60'}
                         `}
                       >
                         {isPrimary && <Zap className="w-4 h-4" />}
                         {action.label}
                         {isPrimary && <ArrowRight className="w-4 h-4 ml-1 opacity-50" />}
                       </button>
                     );
                   })}
                 </div>
               )}
            </div>
         </div>
      </div>
    );
  },
  ActionGroup: ({ buttons = [] }) => {
    if (!buttons || buttons.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-dash-subtle/50">
        {buttons.map((btn: any, idx: number) => {
          const isPrimary = btn.type === 'primary';
          return (
             <button
               key={idx}
               onClick={() => window.dispatchEvent(new CustomEvent('trigger-ai-drawer', { detail: btn.prompt }))}
               className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200
                 ${isPrimary 
                   ? 'bg-dash-primary/20 text-dash-primary hover:bg-dash-primary/30 border border-dash-primary/30' 
                   : 'bg-dash-surface text-dash-secondary hover:text-dash-primary border border-dash-subtle hover:bg-dash-surface-hover'}
               `}
             >
               {isPrimary && <Zap className="w-4 h-4" />}
               {btn.label}
               {isPrimary && <ArrowRight className="w-4 h-4 opacity-50" />}
             </button>
          )
        })}
      </div>
    );
  }
};

export const SDUIRenderer = ({ schema }: { schema?: SDUIComponent[] }) => {
  if (!schema || !Array.isArray(schema)) return null;

  return (
    <>
      {schema.map((block, i) => {
        const Component = ComponentRegistry[block.type] || ComponentRegistry[(block as any).component];
        if (!Component) {
           return (
             <div key={block.id || i} className="p-4 border border-dash-subtle rounded-xl bg-dash-surface text-dash-tertiary text-sm mb-4 border-dashed">
               Unknown Component: {block.type || (block as any).component}
             </div>
           );
        }
        return (
           <Component key={block.id || i} {...block.props}>
              {block.children && <SDUIRenderer schema={block.children} />}
           </Component>
        );
      })}
    </>
  );
};
