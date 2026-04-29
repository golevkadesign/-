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
        className="fixed inset-0 z-[100] flex bg-[#0f1115] text-gray-200 overflow-hidden font-sans"
      >
        {/* Header & Close */}
        <div className="absolute top-0 left-0 right-0 h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#0f1115]/80 backdrop-blur-md z-10">
          <div className="flex items-center space-x-3">
            <Binary className="w-6 h-6 text-dash-gold" />
            <h2 className="text-xl font-bold font-mono tracking-tight text-white">Developer View: Multi-Agent Architecture</h2>
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <button
                onClick={onClearData}
                className="flex items-center gap-2 px-3 py-1.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 hover:text-rose-300 transition-colors text-sm font-medium"
                title="清空当前用户所有资料与进度 (FireStore & LocalStorage)"
              >
                <RefreshCw className="w-4 h-4" /> 彻底清空资料与状态记录
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 mt-16 flex flex-col lg:flex-row w-full h-[calc(100vh-64px)]">
          {/* Left Panel: Flow Visualization */}
          <div className="flex-1 border-r border-white/10 p-4 md:p-8 overflow-y-auto relative bg-[#0f1115] flex items-center justify-center">
             {/* Grid Background */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
            
            <div className="relative w-full max-w-3xl flex flex-col items-center">
              {/* User Input */}
              <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/20 flex items-center justify-center shadow-lg relative z-10">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
                <div className="mt-2 text-sm font-mono text-gray-500">User Query + Context</div>
              </div>

              {/* RAG Memory Node */}
              <button 
                onClick={() => setSelectedNode('rag')}
                className={`relative z-10 w-64 p-4 rounded-xl border ${selectedNode === 'rag' ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-indigo-500/30'} bg-indigo-500/10 hover:bg-indigo-500/20 transition-all flex flex-col items-center shadow-[0_0_30px_rgba(99,102,241,0.1)] mb-8`}
              >
                <Database className="w-8 h-8 text-indigo-400 mb-2" />
                <div className="font-bold text-white">RAG Memory Agent</div>
                <div className="text-xs text-indigo-200/70 mt-1">Profile Extractor</div>
              </button>

              {/* Context Hydrator Node */}
              <ArrowDown className="w-6 h-6 text-white/20 mb-8 -mt-6" />
              
              <button 
                onClick={() => setSelectedNode('hydrator')}
                className={`relative z-10 w-64 p-4 rounded-xl border ${selectedNode === 'hydrator' ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-emerald-500/30'} bg-emerald-500/10 hover:bg-emerald-500/20 transition-all flex flex-col items-center shadow-[0_0_30px_rgba(16,185,129,0.1)] mb-8`}
              >
                <div className="flex space-x-2">
                   <Database className="w-5 h-5 text-emerald-400 mb-2" />
                   <Activity className="w-5 h-5 text-emerald-400 mb-2" />
                </div>
                <div className="font-bold text-white">Context Hydrator</div>
                <div className="text-xs text-emerald-200/70 mt-1">Live Data Provider (Longbridge)</div>
              </button>

              <ArrowDown className="w-6 h-6 text-white/20 mb-8 -mt-6" />

              {/* Orchestrator Node */}
              <button 
                onClick={() => setSelectedNode('orchestrator')}
                className={`relative z-10 w-64 p-4 rounded-xl border ${selectedNode === 'orchestrator' ? 'ring-2 ring-blue-500 border-blue-500' : 'border-blue-500/30'} bg-blue-500/10 hover:bg-blue-500/20 transition-all flex flex-col items-center shadow-[0_0_30px_rgba(59,130,246,0.1)]`}
              >
                <Network className="w-8 h-8 text-blue-400 mb-2" />
                <div className="font-bold text-white">Orchestrator</div>
                <div className="text-xs text-blue-200/70 mt-1">Tier & Routing</div>
              </button>

              {/* Branching Arrows */}
              <div className="flex w-full justify-between items-start mt-8 mb-4 max-w-2xl relative">
                  {/* Lines drawn using borders */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[calc(66.666%-2rem)] h-8 border-t-2 border-l-2 border-r-2 border-white/10 rounded-t-xl"></div>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-8 border-l-2 border-white/10"></div>
              </div>

              {/* Tier Agents */}
              <div className="flex w-full justify-between max-w-3xl relative z-10 gap-4">
                 {/* Debt */}
                 <div className="flex flex-col items-center flex-1">
                    <ArrowDown className="w-5 h-5 text-white/20 mb-2" />
                    <button 
                      onClick={() => setSelectedNode('debt')}
                      className={`w-full p-4 rounded-xl border ${selectedNode === 'debt' ? 'ring-2 ring-red-500 border-red-500' : 'border-red-500/30'} bg-red-500/10 hover:bg-red-500/20 transition-all flex flex-col items-center`}
                    >
                      <ShieldAlert className="w-6 h-6 text-red-400 mb-2" />
                      <div className="font-bold text-sm text-center text-white text-balance">Debt Focus</div>
                    </button>
                 </div>

                 {/* General */}
                 <div className="flex flex-col items-center flex-1">
                    <ArrowDown className="w-5 h-5 text-white/20 mb-2" />
                    <button 
                      onClick={() => setSelectedNode('general')}
                      className={`w-full p-4 rounded-xl border ${selectedNode === 'general' ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-emerald-500/30'} bg-emerald-500/10 hover:bg-emerald-500/20 transition-all flex flex-col items-center`}
                    >
                      <PieChart className="w-6 h-6 text-emerald-400 mb-2" />
                      <div className="font-bold text-sm text-center text-white">General Finance</div>
                    </button>
                 </div>

                 {/* HNWI */}
                 <div className="flex flex-col items-center flex-1">
                    <ArrowDown className="w-5 h-5 text-white/20 mb-2" />
                    <button 
                      onClick={() => setSelectedNode('hnw')}
                      className={`w-full p-4 rounded-xl border ${selectedNode === 'hnw' ? 'ring-2 ring-purple-500 border-purple-500' : 'border-purple-500/30'} bg-purple-500/10 hover:bg-purple-500/20 transition-all flex flex-col items-center`}
                    >
                      <Sparkles className="w-6 h-6 text-purple-400 mb-2" />
                      <div className="font-bold text-sm text-center text-white text-balance">High Net Worth</div>
                    </button>
                 </div>
              </div>

               {/* Parallel Market Agent */}
               <div className="mt-12 flex flex-col items-center relative z-10 w-full max-w-sm">
                  <div className="absolute top-[-48px] left-[75%] w-0 h-12 border-l border-dashed border-dash-gold/40"></div>
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-2 py-1 bg-[#0f1115] text-[10px] text-dash-gold/60 border border-dash-gold/20 rounded-full">
                    Parallel Execution if Market Data
                  </div>
                  
                  <button 
                    onClick={() => setSelectedNode('market')}
                    className={`w-full p-4 rounded-xl border border-dashed ${selectedNode === 'market' ? 'ring-2 ring-dash-gold border-dash-gold' : 'border-dash-gold/40'} bg-dash-gold/5 hover:bg-dash-gold/10 transition-all flex items-center justify-center space-x-4`}
                  >
                    <Activity className="w-8 h-8 text-dash-gold" />
                    <div className="text-left">
                      <div className="font-bold text-white">Market Analysis Agent</div>
                      <div className="text-xs text-dash-gold/70 mt-1">Quantitative Data Analysis</div>
                    </div>
                  </button>
               </div>

               {/* Devil */}
               <div className="mt-6 flex flex-col items-center relative z-10 w-full max-w-sm">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-1 bg-[#0f1115] text-[10px] text-red-500/60 border border-red-500/20 rounded-full">
                    Parallel Execution for Stress Test
                  </div>
                  <button 
                    onClick={() => setSelectedNode('devil')}
                    className={"w-full p-4 rounded-xl border border-dashed " + (selectedNode === 'devil' ? 'ring-2 ring-red-500 border-red-500' : 'border-red-500/40') + " bg-red-500/5 hover:bg-red-500/10 transition-all flex items-center justify-center space-x-4"}
                  >
                    <AlertCircle className="w-8 h-8 text-red-500" />
                    <div className="text-left">
                      <div className="font-bold text-white">Devil's Advocate Agent</div>
                      <div className="text-xs text-red-500/70 mt-1">Extreme Stress Tester</div>
                    </div>
                  </button>
               </div>

                {/* Final Aggregation */}
                <ArrowDown className="w-6 h-6 text-white/20 mt-8 mb-2" />
                <div className="w-64 py-3 px-4 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center space-x-2 text-gray-400">
                  <Cpu className="w-5 h-5" />
                  <span className="font-mono text-sm tracking-wide">Aggregated Response</span>
                </div>
            </div>
          </div>

          {/* Right Panel: Selected Node Details */}
          <div className="w-full lg:w-[450px] xl:w-[500px] bg-[#1a1d24] flex flex-col overflow-y-auto">
            <div className="p-6 border-b border-white/5">
              <div className="flex items-center space-x-3 mb-2">
                <div className={`p-2 rounded-lg border ${activeAgent.color}`}>
                  {activeAgent.icon}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">{activeAgent.name}</h3>
                  <div className="text-sm font-mono text-gray-400 mt-1">{activeAgent.role}</div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Function */}
              <div>
                <h4 className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-3 flex items-center">
                  <Braces className="w-4 h-4 mr-2" /> Logic / Function
                </h4>
                <div className="text-sm text-gray-300 leading-relaxed bg-[#0f1115] p-4 rounded-xl border border-white/5">
                  {activeAgent.function}
                </div>
              </div>

              {/* Prompt Engineering */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs uppercase tracking-wider text-gray-500 font-bold flex items-center">
                    <Database className="w-4 h-4 mr-2" /> {activeAgent.id === 'rag' ? 'RAG JSON Schema' : 'Prompt Engineering (PE)'}
                  </h4>
                  <div className="flex space-x-2">
                    {isEditing ? (
                      <>
                        <button onClick={handleSavePrompt} className="p-1 px-3 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded border border-emerald-500/50 flex flex-row items-center space-x-1">
                           <Save className="w-3 h-3" /> <span>Save</span>
                        </button>
                        <button onClick={() => setIsEditing(false)} className="p-1 px-3 text-xs bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 rounded border border-gray-500/50">
                           Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditContent(activeAgent.pe); setIsEditing(true); }} className="p-1 px-3 text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded flex items-center space-x-1 border border-blue-500/50">
                           <Edit2 className="w-3 h-3" /> <span>Edit</span>
                        </button>
                        <button onClick={handleRestoreDefault} className="p-1 px-3 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded border border-red-500/50 flex flex-row items-center space-x-1" title="Restore to System Default">
                           <RotateCcw className="w-3 h-3" /> <span>Reset</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="relative group">
                  <div className="absolute -inset-[1px] bg-gradient-to-b from-white/10 to-transparent rounded-xl opacity-50 block pointer-events-none"></div>
                  
                  {isEditing ? (
                    <textarea 
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="relative w-full h-96 text-xs leading-loose font-mono text-blue-300/80 bg-[#0A0C10] p-5 rounded-xl border border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
                    />
                  ) : activeAgent.id === 'rag' ? (
                    <div className="relative text-sm text-gray-300 bg-[#0A0C10] p-5 rounded-xl border border-white/5 overflow-x-auto prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeAgent.pe}</ReactMarkdown>
                    </div>
                  ) : (
                    <pre className="relative text-xs leading-loose font-mono text-blue-300/80 bg-[#0A0C10] p-5 rounded-xl border border-white/5 overflow-x-auto whitespace-pre-wrap">
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
