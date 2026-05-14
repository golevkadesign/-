import React from 'react';
import { motion } from 'motion/react';

interface GoalTrackerProps {
  goal: any;
  globalCurSymbol: string;
}

export function GoalTracker({ goal, globalCurSymbol }: GoalTrackerProps) {
  const goalPercent = Math.min((goal?.index || 0) * 100, 100);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="bg-dash-surface border border-dash-subtle rounded-3xl p-6 sm:p-8 relative overflow-hidden group mb-10 shadow-sm transition-colors hover:bg-dash-surface-hover"
    >
      <div className="relative z-10 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 sm:gap-8 mb-6 sm:mb-8">
        <div className="flex-1">
          <h3 className="text-xl sm:text-2xl font-sans tracking-tight font-medium text-dash-primary break-words">{goal?.name || "战略目标"}</h3>
          <p className="text-[13px] text-dash-tertiary mt-2 font-mono break-all sm:break-normal font-medium tracking-wide">
            PROGRESS TARGET <span className="text-dash-secondary ml-2 font-semibold">{globalCurSymbol}{(goal?.current || 0).toLocaleString()} <span className="text-dash-subtle mx-1">/</span> {globalCurSymbol}{(goal?.target || 0).toLocaleString()}</span>
          </p>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-[10px] text-dash-tertiary uppercase mb-2 tracking-widest font-semibold font-sans">Achievement Index</div>
          <div className={`text-4xl sm:text-5xl font-mono tabular-nums tracking-tighter ${goal?.index >= 1 ? 'text-dash-green' : 'text-dash-primary'}`}>
            {(goal?.index || 0).toFixed(4)}
          </div>
        </div>
      </div>
      <div className="relative z-10 w-full h-3 sm:h-4 bg-dash-surface border border-dash-subtle rounded-full overflow-hidden shadow-inner">
        <div className={`h-full relative z-10 transition-all duration-1000 ${goal?.index >= 1 ? 'bg-dash-green' : 'bg-dash-primary'}`} style={{ width: `${goalPercent}%` }}>
        </div>
      </div>
    </motion.div>
  );
}
