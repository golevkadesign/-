import { getSettings, saveSettings, AppSettings } from './lib/settings';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getDonutOption, getExpenseOption, getWaterfallOption, getHoldingsOption, getOptionsOption, getCurrencySymbol } from './components/chart-configs';
import { Card } from './components/Card';
import { ReactECharts } from './components/ReactECharts';
import { SettingsModal } from './components/SettingsModal';
import { loginWithGoogle, logout, db } from './lib/firebase';
import { motion } from 'motion/react';
import { DeveloperView } from './components/DeveloperView';
import { Drawer } from './components/Drawer';
import { useTerminalSync, EMPTY_STATE } from './hooks/useTerminalSync';
import { useStrategyStream } from './hooks/useStrategyStream';
import { useSentinel } from './hooks/useSentinel';
import { useInteractionStore } from './hooks/useInteractionStore';


// Replaced by getUniversalAiClient

import { Sparkles, LogOut, ChevronDown, User, Activity, Loader2, RefreshCw, Cpu, Settings, Bot, Database } from 'lucide-react';
import Markdown from 'react-markdown';
import { ChartWidget } from './components/ChartWidget';
import { ProfileReportView } from './components/ProfileReportView';
import { WidgetCopilot } from './components/WidgetCopilot';
import { TerminalHeader } from './components/TerminalHeader';
import { LifeStrategyTimeline } from './components/LifeStrategyTimeline';
import { GoalTracker } from './components/GoalTracker';

import { ComponentRegistry, SDUIRenderer } from './lib/sdui-registry';

export interface Attachment {
  mimeType: string;
  data: string;
  name: string;
  url?: string;
  isTruncated?: boolean;
}

const formatMoney = (val: number | undefined | null, curr: string = '¥') =>
  val == null ? '-' : `${curr}${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export default function App() {
  const { user, data, loadingAuth, commitData } = useTerminalSync();
  const globalCurrencyOption = data?.distributions?.liquidity?.[0]?.currency || 'CNY';
  const globalCurSymbol = getCurrencySymbol(globalCurrencyOption);
  const { nodePlans, executePlan, clearNodePlans } = useStrategyStream();
  const { isDrawerOpen, setDrawerOpen, copilotConfig, closeCopilot, openCopilot, openDrawerWithIntent } = useInteractionStore();

  useSentinel(data, commitData);

  const [sduiState, setSduiState] = useState<any[]>([]);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [showDeveloperView, setShowDeveloperView] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showProfileReport, setShowProfileReport] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const donutOption = useMemo(() => getDonutOption(data), [data?.distributions?.liquidity]);

  const expenseOption = useMemo(() => getExpenseOption(data), [data?.distributions?.expenses]);

  const waterfallOption = useMemo(() => getWaterfallOption(data), [data?.distributions?.privateAssets]);

  const holdingsOption = useMemo(() => getHoldingsOption(data), [data?.distributions?.publicHoldings]);

  const optionsOption = useMemo(() => getOptionsOption(data), [data?.distributions?.options]);

  if (loadingAuth) {
    return <div className="min-h-screen flex items-center justify-center bg-dash-bg text-dash-primary font-mono tracking-widest text-[13px] uppercase font-semibold">Initializing Security Context...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dash-bg relative overflow-hidden px-4">
         <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ type: "spring", stiffness: 400, damping: 25 }}
           className="bg-dash-surface border border-dash-subtle rounded-[32px] p-8 sm:p-12 max-w-md w-full text-center shadow-lg backdrop-blur-xl"
         >
            <div className="bg-dash-base w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-dash-subtle shadow-inner">
              <div className="w-10 h-10 rounded-full bg-dash-primary shadow-[0_0_20px_rgba(255,255,255,0.4)]" />
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-sans tracking-tight font-medium text-dash-primary mb-3">Arbitra <span className="text-dash-tertiary">Terminal</span></h1>
            <p className="text-dash-secondary mb-10 text-[11px] leading-relaxed uppercase tracking-widest font-semibold">Secure Authentication Required</p>
            
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={loginWithGoogle}
              className="w-full py-4 px-6 bg-dash-primary text-dash-base rounded-[20px] font-bold flex items-center justify-center gap-3 transition-colors hover:bg-white border border-transparent shadow-sm"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 bg-white rounded-full p-0.5" />
              Continue with Google
            </motion.button>
         </motion.div>
      </div>
    )
  }

  const hasPublicInsights = Array.isArray(data.insights?.public) && data.insights.public.length > 0;

  const handleInlineNodePlan = async (typeStr: string, item: any, isLong: boolean, idx: number) => { return executePlan(typeStr, item, isLong, idx); };

  const handleClearDataClick = () => {
    setShowClearConfirm(true);
  };

  const confirmClearData = async () => {
    if (user?.uid) {
      try {
        const { deleteDoc, doc } = await import('firebase/firestore');
        await deleteDoc(doc(db, "userProfiles", user.uid));
      } catch (e) {
        console.error("Failed to delete user profile:", e);
      }
      localStorage.removeItem(`ai_terminal_data_${user.uid}`);
      localStorage.removeItem(`ai_terminal_chat_${user.uid}`);
      
      commitData(EMPTY_STATE);
      setSduiState([]);
      clearNodePlans();
      setShowClearConfirm(false);
      window.dispatchEvent(new Event('clear-chat-history'));
    }
  };

  return (
    <div className="min-h-screen text-dash-textMain font-sans bg-dash-bg pb-20">
      <DeveloperView 
        isOpen={showDeveloperView} 
        onClose={() => setShowDeveloperView(false)} 
        user={user}
        onClearData={handleClearDataClick}
      />

      {/* Top Header */}

      <TerminalHeader 
        user={user}
        setShowProfileReport={setShowProfileReport}
        setShowDeveloperView={setShowDeveloperView}
        setDrawerOpen={setDrawerOpen}
        setShowSettingsModal={setShowSettingsModal}
      />
      
      <main className="max-w-[1600px] mx-auto px-4 md:px-6">
        {/* Top Feature: AI Strategic Overview */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="bg-dash-surface border border-dash-subtle rounded-3xl p-6 sm:p-8 relative overflow-hidden group mt-6 mb-6 md:mb-10 shadow-sm transition-colors hover:bg-dash-surface-hover"
        >
          <div className="flex justify-between items-start mb-4">
            <h2 className="relative z-10 flex items-center gap-2 text-dash-tertiary text-[11px] font-semibold uppercase tracking-[0.15em]">
               <Activity className="w-4 h-4 text-dash-primary"/> Strategic Overview
            </h2>
            <button
               className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-dash-primary/10 text-dash-primary border border-dash-primary/20 hover:bg-dash-primary/20 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 z-20 shadow-sm"
               onClick={() => openCopilot('Strategic Overview', data.insights?.global, '首席宏观策略师')}
            >
               <Bot className="w-3.5 h-3.5" /> 专家探讨
            </button>
          </div>
          <p className="relative z-10 text-dash-primary text-[15px] sm:text-xl font-medium tracking-tight leading-relaxed">
             {data.insights?.global || "Waiting for deep financial sync..."}
          </p>
        </motion.div>

      {/* 新增: 用户画像 (User Persona) */}
      {(data.userPersona?.description && !data.userPersona.description.includes("当前信息不足以")) && (
      <div className="bg-dash-surface border border-dash-subtle rounded-3xl p-6 md:p-8 mb-8 shadow-sm">
        <h3 className="text-lg font-bold text-dash-primary mb-4 flex items-center gap-2 tracking-tight">
          <User className="w-5 h-5 text-dash-secondary" /> User Persona
        </h3>
        <p className="text-dash-secondary text-[13px] leading-relaxed mb-6 font-medium">
          {data.userPersona?.description || "Insufficient data for detailed persona..."}
        </p>
        <div className="flex flex-wrap gap-2">
          {(data.userPersona?.tags || []).map((tag: string, idx: number) => (
             <span key={idx} className="bg-dash-surface-hover text-dash-primary px-3 py-1.5 rounded-lg text-[11px] uppercase tracking-wider font-semibold border border-dash-subtle">
               {tag}
             </span>
          ))}
        </div>
      </div>
      )}

      {/* AI 战术干预层 (警报、临时操作区) */}
      {data.dynamicWidgets && data.dynamicWidgets.length > 0 && (
         <div className="mb-8 w-full"><SDUIRenderer schema={data.dynamicWidgets} globalData={data} /></div>
      )}

      {/* 战略基座层 (指标卡与核心图表) */}
      <SDUIRenderer schema={data.dashboardSchema} globalData={data} />

      {/* 阶段性人生策略建议 (Life Strategies Timeline) */}
      <LifeStrategyTimeline 
         lifeStrategiesShort={data.lifeStrategiesShort}
         lifeStrategiesLong={data.lifeStrategiesLong}
         nodePlans={nodePlans}
         handleInlineNodePlan={handleInlineNodePlan}
      />

      {/* 底部目标追踪卡片 (Goal Tracker) */}
      {data.goal?.name && data.goal.name !== '等待设定目标' && (
         <GoalTracker goal={data.goal} globalCurSymbol={globalCurSymbol} />
      )}
      </main>

      {/* Footer Version */}
      <footer className="text-center pb-8 pt-4">
        <span className="text-[10px] font-mono text-dash-tertiary uppercase tracking-widest opacity-50">
          Terminal Build v1.0.3
        </span>
      </footer>

      {/* Confirm Clear Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-dash-bg/80 backdrop-blur-xl z-50 flex justify-center items-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-dash-surface border border-dash-red/30 shadow-lg rounded-[24px] w-full max-w-md overflow-hidden relative p-8">
            <h3 className="text-[15px] font-bold text-dash-red mb-3 uppercase tracking-widest flex items-center gap-2">
               Reset Workspace
            </h3>
            <p className="text-dash-secondary mb-8 text-[13px] leading-relaxed font-medium">
              This action will permanently erase all AI analysis history and workspace artifacts for the current user. This action cannot be undone. Do you wish to proceed?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-3 bg-dash-surface text-dash-primary border border-dash-subtle rounded-xl text-[13px] font-semibold hover:bg-dash-surface-hover transition-colors uppercase tracking-widest shadow-sm"
              >
                Cancel
              </button>
              <button 
                onClick={confirmClearData}
                className="flex-1 px-4 py-3 bg-dash-red text-white border border-dash-red/50 rounded-xl text-[13px] font-bold hover:bg-red-500 transition-colors shadow-sm uppercase tracking-widest"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
      <ProfileReportView isOpen={showProfileReport} onClose={() => setShowProfileReport(false)} data={data} commitData={commitData} />
      <WidgetCopilot 
        isOpen={copilotConfig.isOpen}
        onClose={closeCopilot}
        widgetTitle={copilotConfig.title}
        widgetData={copilotConfig.data}
        expertRole={copilotConfig.role}
        globalData={data}
        onPromoteIntent={openDrawerWithIntent}
      />

      <Drawer 
        isDrawerOpen={isDrawerOpen} 
        setIsDrawerOpen={setDrawerOpen} 
        user={user} 
        data={data} 
        setSduiState={setSduiState} 
        setIsSynthesizing={setIsSynthesizing}
        commitData={commitData}
      />
    </div>
  );
}
