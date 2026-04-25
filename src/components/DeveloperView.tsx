import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Network, Cpu, User, Activity, PieChart, ShieldAlert, ArrowDown, Binary, Braces, Sparkles, Database, RefreshCw } from 'lucide-react';

interface DeveloperViewProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
  onClearData?: () => void;
}

const AGENTS = [
  {
    id: "orchestrator",
    name: "Orchestrator & Synthesizer",
    role: "Traffic Controller & Result Synthesizer",
    icon: <Network className="w-6 h-6 text-blue-400" />,
    color: "border-blue-500/50 bg-blue-500/10",
    function: "Analyzes user tier and context data to route the request to the appropriate expert agents. Maintains conversational session history for context memory. Synthesizes sub-agent results into a cohesive final strategy with actionable next steps.",
    pe: `// Rules-based routing & Synthesis (orchestrator.ts)\nPasses history = req.body.history to Agents\n...\nconst summaryPrompt = "你是一个顶级的首席财富总监...\n【全局统筹要求】：\n1. 降维总结：提取高度凝练战略方针\n2. 矛盾化解：基于User Tier做最终裁决\n3. 落地执行：给出立即能做的 Top 3 Actions"`,
  },
  {
    id: "debt",
    name: "Debt Focus Agent",
    role: "Debt Crisis Intervention Advisor",
    icon: <ShieldAlert className="w-6 h-6 text-red-400" />,
    color: "border-red-500/50 bg-red-500/10",
    function: "Helps users get out of debt spirals, rebuild cash flow, and manage psychological stress. Distinguishes consumer vs strategic debt.",
    pe: `【核心策略】\n1. 细分债务类型（消费型需立即斩断 vs 经营型需展期）\n2. 心理建设：同理心、不道德审判，先安抚再给极料理性方案\n3. 行动方案：雪崩法/雪球法的明确第一步。\n输出包含：现状穿透诊断、30天极速止血方案、12个月重组路线图。`
  },
  {
    id: "general",
    name: "General Finance Agent",
    role: "Comprehensive Financial Advisor (CFP)",
    icon: <PieChart className="w-6 h-6 text-emerald-400" />,
    color: "border-emerald-500/50 bg-emerald-500/10",
    function: "Dynamically adapts to students, mid-class families, and near-retirees. Balances growth, asset moats, and cash flow.",
    pe: `【人群画像适配】\n- 初入职场：人力资本投资、强制储蓄、宽基定投\n- 核心中产：抗脆弱（寿险/医疗险）、教育养老基金、房贷压力测试\n- 准退休：资产保防、红利固收策略对冲医疗支出\n【哲理】：理财就是理生活，提升控制感。`
  },
  {
    id: "hnw",
    name: "High Net Worth Agent",
    role: "Family Office Wealth Manager",
    icon: <Sparkles className="w-6 h-6 text-purple-400" />,
    color: "border-purple-500/50 bg-purple-500/10",
    function: "Focuses on New vs Old Money differentiation, asset allocation, tax harvesting, inheritance, and tail risk mitigation.",
    pe: `【核心侧重】\n1. 人群细分：新贵（税务期权集中度）vs 企业主（家企资产混同）vs 守成一代\n2. 高维策略：降维打击局限视角。全球配置、家族信托、税务筹划、另类投资(PE/VC)\n3. 风险对冲：防御宏观周期与黑天鹅事件。\n语气：沉稳、克制、老钱质感。`
  },
  {
    id: "market",
    name: "Market Analysis Agent",
    role: "Wall Street Quantitative Analyst",
    icon: <Activity className="w-6 h-6 text-dash-gold" />,
    color: "border-dash-gold/50 bg-dash-gold/10",
    function: "Performs technical and fundamental analysis based on fetched market data with tier-adjusted risk tolerance bounds.",
    pe: `【核心职能】\n1. 风险适配：结合用户层级（负债人群不建议炒作，HNWI建议对冲）\n2. 数据穿透：雅虎财经数据流的基本面与技术面双重共振\n3. 动态博弈：给出具体入场防守点位与盈亏比预估，告别平庸“持仓”结论。\n语气：冰冷客观，一针见血。`
  }
];

export const DeveloperView: React.FC<DeveloperViewProps> = ({ isOpen, onClose, user, onClearData }) => {
  const [selectedNode, setSelectedNode] = useState<string | null>("orchestrator");

  if (!isOpen) return null;

  const activeAgent = AGENTS.find(a => a.id === selectedNode) || AGENTS[0];

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
                <h4 className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-3 flex items-center">
                  <Database className="w-4 h-4 mr-2" /> Prompt Engineering (PE) Config
                </h4>
                <div className="relative group">
                  <div className="absolute -inset-[1px] bg-gradient-to-b from-white/10 to-transparent rounded-xl opacity-50 block"></div>
                  <pre className="relative text-xs leading-loose font-mono text-blue-300/80 bg-[#0A0C10] p-5 rounded-xl border border-white/5 overflow-x-auto whitespace-pre-wrap">
                    {activeAgent.pe}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
