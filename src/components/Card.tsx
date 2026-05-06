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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay || 0 }}
      className={`glass-panel p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between ${className}`}
    >
      <div className="relative z-10 flex flex-col h-full">
        <h3 className="text-dash-textSub text-sm mb-4 font-medium tracking-wide flex justify-between items-center gap-2">
          {title}
          {badge}
        </h3>
        
        {value !== undefined && (
          <div className="text-3xl md:text-[32px] font-semibold text-white tracking-tight mb-2">
            {value}
          </div>
        )}
        
        {children}
        
        {subValue && (
          <div className={`mt-auto flex items-center gap-1 ${isLongSubText ? 'text-xs text-dash-textSub !font-normal' : (trendGood ? 'text-dash-green text-xs font-medium' : 'text-dash-red text-xs font-medium')}`}>
            {!isLongSubText && (trendGood ? <span className="transform -rotate-45">→</span> : <span className="transform rotate-45">→</span>)}
            {subValue}
          </div>
        )}
      </div>
    </motion.div>
  );
};
