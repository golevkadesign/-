import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Network, Cpu, User, Activity, PieChart, ShieldAlert, ArrowDown, Binary, Braces, Sparkles, Database, RefreshCw, Edit2, Save, RotateCcw , AlertCircle } from 'lucide-react';
import { getSettings, saveSettings, AppSettings } from '../lib/settings';
import { DEFAULT_PROMPTS, DEFAULT_RAG_SCHEMA } from '../lib/defaultPrompts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface DeveloperViewProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
  onClearData?: () => void;
}

export const DeveloperView: React.FC<DeveloperViewProps> = ({ isOpen, onClose, user, onClearData }) => {
  const [selectedNode, setSelectedNode] = useState<string | null>("rag");
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSettings(getSettings());
      setIsEditing(false);
    }
  }, [isOpen, selectedNode]);

  const AGENTS = useMemo(() => [
    {
      id: "rag",
      name: "RAG Memory Agent",
      role: "Context Guardian & Profile Updater",
      icon: <Database className="w-6 h-6 text-indigo-400" />,
      color: "border-indigo-500/50 bg-indigo-500/10",
      function: "Intercepts every message to update the persistent user profile with new life facts (Career, Financials, etc). Uses a strict JSON RAG schema.",
      pe: settings.ragSchema || DEFAULT_RAG_SCHEMA,
    },
    {
      id: "hydrator",
      name: "Context Hydrator (Live Data Layer)",
      role: "Real-time API integration layer",
      icon: <Activity className="w-6 h-6 text-emerald-400" />,
      color: "border-emerald-500/50 bg-emerald-500/10",
      function: "Decoupled adapter layer that fetches and injects live API data (e.g. Longbridge Live Portfolio, Yahoo Finance) directly into the prompting context without blocking the LLM.",
      pe: "Not an LLM prompt. This is a deterministic Node.js adapter layer that normalizes standard [LIVE_PORTFOLIO] payload for Expert Matrix."
    },
    {
      id: "orchestrator",
      name: "Orchestrator & Synthesizer",
      role: "Traffic Controller & Result Synthesizer",
      icon: <Network className="w-6 h-6 text-blue-400" />,
      color: "border-blue-500/50 bg-blue-500/10",
      function: "Analyzes user tier and context data to route the request to the appropriate expert agents. Maintains conversational session history for context memory. Synthesizes sub-agent results into a cohesive final strategy with actionable next steps.",
      pe: settings.agentPrompts?.orchestrator || DEFAULT_PROMPTS.orchestrator,
    },
    {
      id: "debt",
      name: "Debt Focus Agent",
      role: "Debt Crisis Intervention Advisor",
      icon: <ShieldAlert className="w-6 h-6 text-red-400" />,
      color: "border-red-500/50 bg-red-500/10",
      function: "Helps users get out of debt spirals, rebuild cash flow, and manage psychological stress. Distinguishes consumer vs strategic debt.",
      pe: settings.agentPrompts?.debt || DEFAULT_PROMPTS.debt
    },
    {
      id: "general",
      name: "General Finance Agent",
      role: "Comprehensive Financial Advisor (CFP)",
      icon: <PieChart className="w-6 h-6 text-emerald-400" />,
      color: "border-emerald-500/50 bg-emerald-500/10",
      function: "Dynamically adapts to students, mid-class families, and near-retirees. Balances growth, asset moats, and cash flow.",
      pe: settings.agentPrompts?.general || DEFAULT_PROMPTS.general
    },
    {
      id: "hnw",
      name: "High Net Worth Agent",
      role: "Family Office Wealth Manager",
      icon: <Sparkles className="w-6 h-6 text-purple-400" />,
      color: "border-purple-500/50 bg-purple-500/10",
      function: "Focuses on New vs Old Money differentiation, asset allocation, tax harvesting, inheritance, and tail risk mitigation.",
      pe: settings.agentPrompts?.hnw || DEFAULT_PROMPTS.hnw
    },
    {
      id: "market",
      name: "Market Analysis Agent",
      role: "Wall Street Quantitative Analyst",
      icon: <Activity className="w-6 h-6 text-dash-gold" />,
      color: "border-dash-gold/50 bg-dash-gold/10",
      function: "Performs technical and fundamental analysis based on fetched market data with tier-adjusted risk tolerance bounds.",
      pe: settings.agentPrompts?.market || DEFAULT_PROMPTS.market
    },
    {
      id: "devil",
      name: "Devil Advocate",
      role: "Pessimistic Stress Tester",
      icon: <AlertCircle className="w-6 h-6 text-red-500" />,
      color: "border-red-500/50 bg-red-500/10",
      function: "Specializes in finding flaws, predicting black swan events, and applying extreme stress testing.",
      pe: settings.agentPrompts?.devil || DEFAULT_PROMPTS.devil
    }
  ], [settings]);

  if (!isOpen) return null;

  const activeAgent = AGENTS.find(a => a.id === selectedNode) || AGENTS[0];

  const handleSavePrompt = () => {
    const newSettings = { ...settings };
    if (activeAgent.id === 'rag') {
      newSettings.ragSchema = editContent;
    } else {
      newSettings.agentPrompts = {
        ...(newSettings.agentPrompts || {}),
        [activeAgent.id]: editContent
      };
    }
    setSettings(newSettings);
    saveSettings(newSettings);
    setIsEditing(false);
  };

  const handleRestoreDefault = () => {
    const newSettings = { ...settings };
    if (activeAgent.id === 'rag') {
      newSettings.ragSchema = DEFAULT_RAG_SCHEMA;
    } else {
      if (newSettings.agentPrompts) {
        delete newSettings.agentPrompts[activeAgent.id];
      }
    }
    setSettings(newSettings);
    saveSettings(newSettings);
    setIsEditing(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed inset-0 z-[100] flex bg-dash-base text-dash-primary overflow-hidden font-sans"
      >
        {/* Header & Close */}
        <div className="absolute top-0 left-0 right-0 h-16 border-b border-dash-subtle flex items-center justify-between px-6 bg-dash-base/90 backdrop-blur-md z-10 shadow-sm">
          <div className="flex items-center space-x-3">
            <Binary className="w-6 h-6 text-dash-gold" />
            <h2 className="text-lg font-semibold tracking-tight text-white">Developer View: Multi-Agent Architecture</h2>
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <button
                onClick={onClearData}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dash-red/10 text-dash-red border border-dash-red/20 hover:bg-dash-red/20 hover:text-red-300 transition-colors text-xs font-semibold tracking-tight uppercase"
                title="清空当前用户所有资料与进度 (FireStore & LocalStorage)"
              >
                <RefreshCw className="w-3.5 h-3.5" /> 彻底清空资料与状态记录
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-dash-tertiary hover:text-dash-primary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 mt-16 flex flex-col lg:flex-row w-full h-[calc(100vh-64px)]">
          {/* Left Panel: Flow Visualization */}
          <div className="flex-1 border-r border-dash-subtle p-4 md:p-8 overflow-y-auto relative bg-dash-base flex items-center justify-center">
             {/* Grid Background */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
            
            <div className="relative w-full max-w-3xl flex flex-col items-center py-10">
              {/* User Input */}
              <div className="flex flex-col items-center mb-10">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-lg relative z-10 backdrop-blur-sm">
                  <User className="w-8 h-8 text-dash-secondary" />
                </div>
                <div className="mt-3 text-xs font-mono text-dash-tertiary tracking-widest uppercase">User Query + Context</div>
              </div>

              {/* RAG Memory Node */}
              <button 
                onClick={() => setSelectedNode('rag')}
                className={`relative z-10 w-64 p-5 rounded-2xl border ${selectedNode === 'rag' ? 'ring-2 ring-indigo-500/50 border-indigo-500' : 'border-indigo-500/30'} bg-indigo-500/10 hover:bg-indigo-500/20 transition-all flex flex-col items-center shadow-[0_4px_24px_-4px_rgba(99,102,241,0.2)] mb-10 backdrop-blur-md`}
              >
                <Database className="w-6 h-6 text-indigo-400 mb-3" />
                <div className="font-semibold tracking-tight text-white">RAG Memory Agent</div>
                <div className="text-[11px] text-indigo-300 mt-1 uppercase tracking-wider font-semibold">Profile Extractor</div>
              </button>

              {/* Context Hydrator Node */}
              <ArrowDown className="w-6 h-6 text-dash-subtle mb-10 -mt-7" />
              
              <button 
                onClick={() => setSelectedNode('hydrator')}
                className={`relative z-10 w-64 p-5 rounded-2xl border ${selectedNode === 'hydrator' ? 'ring-2 ring-emerald-500/50 border-emerald-500' : 'border-emerald-500/30'} bg-emerald-500/10 hover:bg-emerald-500/20 transition-all flex flex-col items-center shadow-[0_4px_24px_-4px_rgba(16,185,129,0.2)] mb-10 backdrop-blur-md`}
              >
                <div className="flex space-x-2">
                   <Database className="w-5 h-5 text-emerald-400 mb-3" />
                   <Activity className="w-5 h-5 text-emerald-400 mb-3" />
                </div>
                <div className="font-semibold tracking-tight text-white">Context Hydrator</div>
                <div className="text-[11px] text-emerald-300 mt-1 uppercase tracking-wider font-semibold">Live Data Provider</div>
              </button>

              <ArrowDown className="w-6 h-6 text-dash-subtle mb-10 -mt-7" />

              {/* Orchestrator Node */}
              <button 
                onClick={() => setSelectedNode('orchestrator')}
                className={`relative z-10 w-64 p-5 rounded-2xl border ${selectedNode === 'orchestrator' ? 'ring-2 ring-blue-500/50 border-blue-500' : 'border-blue-500/30'} bg-blue-500/10 hover:bg-blue-500/20 transition-all flex flex-col items-center shadow-[0_4px_24px_-4px_rgba(59,130,246,0.2)] backdrop-blur-md`}
              >
                <Network className="w-6 h-6 text-blue-400 mb-3" />
                <div className="font-semibold tracking-tight text-white">Orchestrator</div>
                <div className="text-[11px] text-blue-300 mt-1 uppercase tracking-wider font-semibold">Tier & Routing</div>
              </button>

              {/* Branching Arrows */}
              <div className="flex w-full justify-between items-start mt-8 mb-6 max-w-2xl relative">
                  {/* Lines drawn using borders */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[calc(66.666%-2rem)] h-10 border-t border-l border-r border-dash-subtle rounded-t-xl"></div>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-10 border-l border-dash-subtle"></div>
              </div>

              {/* Tier Agents */}
              <div className="flex w-full justify-between max-w-3xl relative z-10 gap-4">
                 {/* Debt */}
                 <div className="flex flex-col items-center flex-1">
                    <ArrowDown className="w-5 h-5 text-dash-subtle mb-3" />
                    <button 
                      onClick={() => setSelectedNode('debt')}
                      className={`w-full p-4 rounded-xl border ${selectedNode === 'debt' ? 'ring-2 ring-dash-red/50 border-dash-red' : 'border-dash-red/30'} bg-dash-red/10 hover:bg-dash-red/20 transition-all flex flex-col items-center backdrop-blur-md`}
                    >
                      <ShieldAlert className="w-5 h-5 text-dash-red mb-2" />
                      <div className="font-semibold text-sm text-center text-white text-balance tracking-tight">Debt Focus</div>
                    </button>
                 </div>

                 {/* General */}
                 <div className="flex flex-col items-center flex-1">
                    <ArrowDown className="w-5 h-5 text-dash-subtle mb-3" />
                    <button 
                      onClick={() => setSelectedNode('general')}
                      className={`w-full p-4 rounded-xl border ${selectedNode === 'general' ? 'ring-2 ring-dash-green/50 border-dash-green' : 'border-dash-green/30'} bg-dash-green/10 hover:bg-dash-green/20 transition-all flex flex-col items-center backdrop-blur-md`}
                    >
                      <PieChart className="w-5 h-5 text-dash-green mb-2" />
                      <div className="font-semibold text-sm text-center text-white tracking-tight">General Finance</div>
                    </button>
                 </div>

                 {/* HNWI */}
                 <div className="flex flex-col items-center flex-1">
                    <ArrowDown className="w-5 h-5 text-dash-subtle mb-3" />
                    <button 
                      onClick={() => setSelectedNode('hnw')}
                      className={`w-full p-4 rounded-xl border ${selectedNode === 'hnw' ? 'ring-2 ring-purple-500/50 border-purple-500' : 'border-purple-500/30'} bg-purple-500/10 hover:bg-purple-500/20 transition-all flex flex-col items-center backdrop-blur-md`}
                    >
                      <Sparkles className="w-5 h-5 text-purple-400 mb-2" />
                      <div className="font-semibold text-sm text-center text-white text-balance tracking-tight">High Net Worth</div>
                    </button>
                 </div>
              </div>

               {/* Parallel Market Agent */}
               <div className="mt-14 flex flex-col items-center relative z-10 w-full max-w-sm">
                  <div className="absolute top-[-56px] left-[75%] w-0 h-14 border-l border-dashed border-dash-gold/30"></div>
                  <div className="absolute -top-14 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-dash-surface text-[10px] text-dash-gold font-semibold uppercase tracking-wider border border-dash-gold/20 rounded-full shadow-sm">
                    Parallel Execution if Market Data
                  </div>
                  
                  <button 
                    onClick={() => setSelectedNode('market')}
                    className={`w-full p-5 rounded-xl border border-dashed ${selectedNode === 'market' ? 'ring-2 ring-dash-gold/50 border-dash-gold' : 'border-dash-gold/40'} bg-dash-gold/5 hover:bg-dash-gold/10 transition-all flex items-center justify-center space-x-4 backdrop-blur-md`}
                  >
                    <Activity className="w-6 h-6 text-dash-gold" />
                    <div className="text-left">
                      <div className="font-semibold tracking-tight text-white">Market Analysis Agent</div>
                      <div className="text-[11px] text-dash-gold/80 mt-1 font-semibold uppercase tracking-wider">Quantitative Data</div>
                    </div>
                  </button>
               </div>

               {/* Devil */}
               <div className="mt-8 flex flex-col items-center relative z-10 w-full max-w-sm">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-dash-surface text-[10px] text-dash-red font-semibold uppercase tracking-wider border border-dash-red/20 rounded-full shadow-sm">
                    Parallel Execution for Stress Test
                  </div>
                  <button 
                    onClick={() => setSelectedNode('devil')}
                    className={`w-full p-5 rounded-xl border border-dashed ${selectedNode === 'devil' ? 'ring-2 ring-dash-red/50 border-dash-red' : 'border-dash-red/40'} bg-dash-red/5 hover:bg-dash-red/10 transition-all flex items-center justify-center space-x-4 backdrop-blur-md`}
                  >
                    <AlertCircle className="w-6 h-6 text-dash-red" />
                    <div className="text-left">
                      <div className="font-semibold tracking-tight text-white">Devil's Advocate Agent</div>
                      <div className="text-[11px] text-dash-red/80 mt-1 font-semibold uppercase tracking-wider">Extreme Stress Tester</div>
                    </div>
                  </button>
               </div>

                {/* Final Aggregation */}
                <ArrowDown className="w-6 h-6 text-dash-subtle mt-10 mb-3" />
                <div className="w-64 py-4 px-4 rounded-xl bg-dash-surface border border-dash-subtle flex items-center justify-center space-x-2 text-dash-tertiary shadow-sm">
                  <Cpu className="w-5 h-5" />
                  <span className="font-mono text-xs uppercase tracking-widest font-semibold">Aggregated Response</span>
                </div>
            </div>
          </div>

          {/* Right Panel: Selected Node Details */}
          <div className="w-full lg:w-[450px] xl:w-[500px] bg-dash-surface flex flex-col overflow-y-auto">
            <div className="p-8 border-b border-dash-subtle bg-dash-surface-hover/30">
              <div className="flex items-center space-x-4 mb-3">
                <div className={`p-3 rounded-xl border ${activeAgent.color} shadow-sm bg-dash-base`}>
                  {activeAgent.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-white">{activeAgent.name}</h3>
                  <div className="text-xs font-mono uppercase tracking-widest text-dash-tertiary mt-1 font-semibold">{activeAgent.role}</div>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-10">
              {/* Function */}
              <div>
                <h4 className="text-[11px] uppercase tracking-widest text-dash-secondary font-bold mb-4 flex items-center">
                  <Braces className="w-4 h-4 mr-2" /> Logic / Function
                </h4>
                <div className="text-sm text-dash-primary leading-relaxed bg-dash-base p-5 rounded-xl border border-dash-subtle shadow-inner font-medium">
                  {activeAgent.function}
                </div>
              </div>

              {/* Prompt Engineering */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[11px] uppercase tracking-widest text-dash-secondary font-bold flex items-center">
                    <Database className="w-4 h-4 mr-2" /> {activeAgent.id === 'rag' ? 'RAG JSON Schema' : 'Prompt Engineering (PE)'}
                  </h4>
                  <div className="flex space-x-2">
                    {isEditing ? (
                      <>
                        <button onClick={handleSavePrompt} className="px-3 py-1.5 text-xs bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-md border border-emerald-500/30 flex items-center space-x-1 font-semibold tracking-tight uppercase">
                           <Save className="w-3 h-3" /> <span>Save</span>
                        </button>
                        <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-xs bg-dash-base text-dash-secondary hover:bg-dash-surface-hover rounded-md border border-dash-subtle font-semibold tracking-tight uppercase">
                           Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditContent(activeAgent.pe); setIsEditing(true); }} className="px-3 py-1.5 text-xs bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-md flex items-center space-x-1 border border-blue-500/30 font-semibold tracking-tight uppercase">
                           <Edit2 className="w-3 h-3" /> <span>Edit</span>
                        </button>
                        <button onClick={handleRestoreDefault} className="px-3 py-1.5 text-xs bg-dash-red/10 text-dash-red hover:bg-dash-red/20 rounded-md border border-dash-red/30 flex items-center space-x-1 font-semibold tracking-tight uppercase" title="Restore to System Default">
                           <RotateCcw className="w-3 h-3" /> <span>Reset</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="relative group">
                  <div className="absolute -inset-[1px] bg-gradient-to-b from-dash-subtle to-transparent rounded-xl opacity-50 block pointer-events-none"></div>
                  
                  {isEditing ? (
                    <textarea 
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="relative w-full h-96 text-xs leading-loose font-mono text-dash-primary bg-dash-base p-6 rounded-xl border border-dash-subtle focus:outline-none focus:ring-1 focus:ring-dash-green resize-y shadow-inner"
                    />
                  ) : activeAgent.id === 'rag' ? (
                    <div className="relative text-sm text-dash-primary bg-dash-base p-6 rounded-xl border border-dash-subtle overflow-x-auto prose prose-invert prose-sm max-w-none shadow-inner">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeAgent.pe}</ReactMarkdown>
                    </div>
                  ) : (
                    <pre className="relative text-xs leading-relaxed font-mono text-blue-300 bg-dash-base p-6 rounded-xl border border-dash-subtle overflow-x-auto whitespace-pre-wrap shadow-inner">
                      {activeAgent.pe}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
