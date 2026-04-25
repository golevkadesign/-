import React from 'react';
import { motion } from 'motion/react';

interface CardProps {
  title: string;
  value: string;
  subValue?: string;
  trendGood?: boolean;
  isLongSubText?: boolean;
}

export const Card: React.FC<CardProps> = ({ title, value, subValue, trendGood = true, isLongSubText = false }) => {
  return (
    <div 
      className="glass-panel p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between"
    >
      <div className="relative z-10 flex flex-col h-full">
        <h3 className="text-dash-textSub text-sm mb-4 font-medium tracking-wide">
          {title}
        </h3>
        
        <div className="text-3xl md:text-[32px] font-semibold text-white tracking-tight mb-2">
          {value}
        </div>
        
        {subValue && (
          <div className={`mt-auto flex items-center gap-1 ${isLongSubText ? 'text-xs text-dash-textSub !font-normal' : (trendGood ? 'text-dash-green text-xs font-medium' : 'text-dash-red text-xs font-medium')}`}>
            {!isLongSubText && (trendGood ? <span className="transform -rotate-45">→</span> : <span className="transform rotate-45">→</span>)}
            {subValue}
          </div>
        )}
      </div>
    </div>
  );
};
