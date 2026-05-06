import React from 'react';
import { motion } from 'motion/react';

interface CardProps {
  title: string;
  value?: string | number;
  subValue?: string;
  trendGood?: boolean;
  isLongSubText?: boolean;
  children?: React.ReactNode;
  delay?: number;
  className?: string;
  badge?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, value, subValue, trendGood = true, isLongSubText = false, children, delay, className = "", badge }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25, delay: delay || 0 }}
      className={`bg-dash-surface border border-dash-subtle rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between shadow-sm transition-all hover:bg-dash-surface-hover ${className}`}
    >
      <div className="relative z-10 flex flex-col h-full">
        <h3 className="text-dash-secondary text-[11px] uppercase tracking-widest font-semibold mb-4 flex justify-between items-center gap-2">
          {title}
          {badge}
        </h3>
        
        {value !== undefined && (
          <div className="text-[32px] md:text-[36px] font-sans tracking-tight font-medium text-dash-primary mb-2 leading-none">
            {value}
          </div>
        )}
        
        {children}
        
        {subValue && (
          <div className={`mt-auto flex items-center gap-1.5 ${isLongSubText ? 'text-xs text-dash-tertiary pt-2' : (trendGood ? 'text-dash-green text-[13px] font-semibold' : 'text-dash-red text-[13px] font-semibold')}`}>
            {!isLongSubText && (trendGood ? <span className="transform -rotate-45">→</span> : <span className="transform rotate-45">→</span>)}
            {subValue}
          </div>
        )}
      </div>
    </motion.div>
  );
};
