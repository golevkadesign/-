import React, { useMemo } from 'react';
import { Card } from '../components/Card';
import { ReactECharts } from '../components/ReactECharts';
import { Sparkles, Activity } from 'lucide-react';
import { getSDUIPieOption } from '../components/chart-configs';
import { ChartWidget } from '../components/ChartWidget';
import { SDUIComponent } from '../types/terminal';

export const ComponentRegistry: Record<string, React.FC<any>> = {
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
  )
};

export const SDUIRenderer = ({ schema }: { schema?: SDUIComponent[] }) => {
  if (!schema || !Array.isArray(schema)) return null;

  return (
    <>
      {schema.map((block, i) => {
        const Component = ComponentRegistry[block.type] || ComponentRegistry[block.component];
        if (!Component) {
           return (
             <div key={block.id || i} className="p-4 border border-dash-subtle rounded-xl bg-dash-surface text-dash-tertiary text-sm mb-4 border-dashed">
               Unknown Component: {block.type || block.component}
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
