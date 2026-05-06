import { GoogleGenAI } from "@google/genai";
import { getSettings, saveSettings, AppSettings } from './lib/settings';
import { getUniversalAiClient } from './lib/ai-universal';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from './components/Card';
import { ReactECharts } from './components/ReactECharts';
import { SettingsModal } from './components/SettingsModal';
import { loginWithGoogle, logout, subscribeToAuthChanges, db } from './lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { DeveloperView } from './components/DeveloperView';
import { Drawer } from './components/Drawer';


// Replaced by getUniversalAiClient

const ANALYSIS_PROMPT = `
你是一个顶级 AI 私人财富总监 (Backend-Only Analysis Expert)。
你的任务是深层测算，但不负责最终的排版和UI结构。
你接收多模态内容和第三方系统（如Yahoo牌价、券商API等）及各路顶尖Agent的深度诊断数据。\n严正声明：你会收到各领域Agent通过联网获取到的对某个实体资产/负债（如当地真实房价、按揭利率）的客观市调估值数据，提取关键结论时必须百分百采用这些真实市场市调数据进行财务测算推演，禁止自己凭空捏造数值。
请全面分析当前的净资产、流动性、抗风险以及给定Tier层次的最佳破局点策略。
返回严格彻底的分析纯JSON数据（仅包含核心观点和数据）。不要任何人类语言包裹。
`;

export const UI_SUMMARY_PROMPT = `
你是一个专业的前端 UI 生成引擎与总结文案大师 (Server-Driven UI Builder)。
你接收底层分析师专家输出的硬核经济策略数据，以及当前的 Terminal State。
1. 请生成给用户看的【高情商且犀利的文字回复】(不要带json，纯文字即可)。
2. 将数据组装为一个可用于前端渲染的 SDUI JSON Schema 更新补丁（Patch）。

核心规则：
- 除必须格式外，所有UI标题（如图表标题）使用中文。
- metrics 中包含 netWorthSummary, liquiditySummary, safetyRatioSummary, fcfSummary 四个字段。
- 对于股票持仓(publicHoldings)：如果有新分析，则在 \`insights.publicText\` 中输出纯文字结论（一只股票一行信息，枚举数量/成本/市值等）；在 \`insights.publicSummary\` 输出总体总结。
- 对于期权(options)：提取并枚举。
- 【严禁捏造Mock假数据】决不允许凭空捏造数值！
- 请在 insights 对象中，提供专门负责该板块的Agent的具体客观分析和切实施政建议。
- 重要：**增量更新（Differential Update）**。你只需要在 \`updateGlobalState\` 中返回**需要修改或更新**的字段。前端会将你的输出与当前的 Terminal State 进行合并（Shallow Merge / 深层合并）。对于完全没有变化的板块，**请直接省略该字段**，不要输出空数组/空字符串来覆盖原有的有效数据！！比如：如果你本次分析没有涉及 fixedAssets，那么 updateGlobalState 里面就不要出现 fixedAssets 字段。
- 只做数据的更新，绝不重置旧的有效资产结构。如果在硬核经济策略数据中提到某些数据失效了或被抛售了，那才将其重置为 []。

注意！返回的 JSON 必须符合以下严格结构：
\`\`\`json
{
  "aiReadableReply": "自然语言的解释...",
  "sduiSchema": [],
  "updateGlobalState": {
    "metrics": { "netWorth": 1000000, "netWorthSummary": "总结短句..." },
    "userPersona": { "tags": ["稳健型", "高薪资"], "description": "您的核心画像..." },
    "goal": { "name": "核心破局目标", "current": 1000, "target": 5000, "index": 0.2 },
    "distributions": { "liquidity": [{"name": "现金", "value": 100}] },
    "lifeStrategiesShort": [ { "timeNode": "2024-2025", "title": "节点1", "description": "描述" } ],
    "lifeStrategiesLong": [ { "timeNode": "未来 10 年", "title": "高维规划", "description": "描述" } ],
    "insights": { "liquidity": "资金池流动性建议..." }
  }
}
\`\`\`
`;
import { Sparkles, LogOut, ChevronDown, User, Activity, Loader2, RefreshCw, Cpu, Settings, Bot } from 'lucide-react';
import Markdown from 'react-markdown';
import { ChartWidget } from './components/ChartWidget';

// Component Registry for Server-Driven UI (SDUI)
const ComponentRegistry: Record<string, React.FC<any>> = {
  MetricsCard: ({ title, value }) => <Card title={title} value={value} />,
  EChartsPie: ({ data }) => {
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
            <ReactECharts option={{ tooltip: { trigger: 'item' }, series: [{ type: 'pie', data, radius: ['40%', '70%'] }] }} />
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

export interface Attachment {
  mimeType: string;
  data: string;
  name: string;
}

const EMPTY_STATE = {
  userPersona: { tags: [], description: "唤起总监生成您的个人资产画像模型" },
  userProfile: {},
  metrics: { 
    netWorth: 0, 
    liquidity: 0, 
    safetyRatio: 0, 
    safetyRatioSummary: '当前流动性支撑乘数',
    fcf: 0,
    fcfSummary: '测算月结余'
  },
  distributions: { liquidity: [], expenses: [], privateAssets: [], publicHoldings: [], fixedAssets: [], options: [] },
  goal: { name: '等待设定目标', current: 0, target: 1, index: 0 },
  insights: { global: "等待数据注入...", private: "暂无非公开资产数据" },
  lifeStrategiesShort: [],
  lifeStrategiesLong: []
};

const formatMoney = (val: number | undefined | null) =>
  val == null ? '-' : `¥${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [data, setData] = useState<any>(EMPTY_STATE);

  const [sduiState, setSduiState] = useState<any[]>([]);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showDeveloperView, setShowDeveloperView] = useState(false);
  const [nodePlans, setNodePlans] = useState<Record<string, { status: 'idle'|'thinking'|'done', result: string, thinking: string }>>({});
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (u) => {
      setUser(u);
      if (u) {
         let localState = EMPTY_STATE;
         const stored = localStorage.getItem(`ai_terminal_data_${u.uid}`);
         if (stored) {
             try { localState = JSON.parse(stored); } catch { localState = EMPTY_STATE; }
         } else {
             const oldStored = localStorage.getItem('ai_terminal_data');
             if (oldStored) {
                 try { 
                     localState = JSON.parse(oldStored);
                     localStorage.setItem(`ai_terminal_data_${u.uid}`, oldStored);
                     localStorage.removeItem('ai_terminal_data');
                 } catch { localState = EMPTY_STATE; }
             }
         }

         // Fetch userProfile and appData from Firestore
         try {
           const profileSnap = await getDoc(doc(db, "userProfiles", u.uid));
           if (profileSnap.exists()) {
              const fsData = profileSnap.data();
              if (fsData.appData && Object.keys(fsData.appData).length > 0) {
                 localState = { ...localState, ...fsData.appData };
                 localStorage.setItem(`ai_terminal_data_${u.uid}`, JSON.stringify(localState));
              }
              if (fsData.userProfile) {
                 localState = { ...localState, userProfile: fsData.userProfile };
              } else if (!fsData.appData && !fsData.chatHistory) {
                 localState = { ...localState, userProfile: fsData };
              }
           } else {
              localState = { ...localState, userProfile: {} };
           }
         } catch(e: any) {
           if (e.message && e.message.includes('offline')) {
             console.log("Offline mode: using local state for profile.");
           } else {
             console.error("Failed to load user profile from firestore:", e);
           }
           localState = { ...localState, userProfile: {} };
         }
         
         setData(localState);
      } else {
         setData(EMPTY_STATE);
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const commitData = (newDataOrUpdater: any) => {
    setData((prev: any) => {
      const newData = typeof newDataOrUpdater === 'function' ? newDataOrUpdater(prev) : newDataOrUpdater;
      if (user?.uid) {
          localStorage.setItem(`ai_terminal_data_${user.uid}`, JSON.stringify(newData));
          const appDataToSave = { ...newData };
          delete appDataToSave.userProfile; // RAG profile saved separately
          setDoc(doc(db, "userProfiles", user.uid), { appData: appDataToSave }, { merge: true }).catch(e => console.error("Failed to commit appData to firestore:", e));
      }
      return newData;
    });
  };

  const donutOption = useMemo(() => {
    const arr = data.distributions?.liquidity || [];
    return {
      tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
      legend: { orient: 'vertical', left: 'left', textStyle: { color: '#94a3b8' }, top: 'middle' },
      color: ['#14b8a6', '#0ea5e9', '#3b82f6', '#0284c7', '#0369a1'],
      series: [{
        type: 'pie', radius: ['50%', '70%'], center: ['70%', '50%'],
        itemStyle: { borderRadius: 6, borderColor: '#0B0D0F', borderWidth: 2 },
        label: { show: false }, data: arr.length ? arr : [{ name: '无数据', value: 0 }]
      }]
    };
  }, [data.distributions?.liquidity]);

  const expenseOption = useMemo(() => {
    const arr = data.distributions?.expenses || [];
    return {
      tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
      legend: { orient: 'vertical', left: 'left', textStyle: { color: '#94a3b8' }, top: 'middle' },
      color: ['#0d9488', '#0891b2', '#2563eb', '#1e40af', '#115e59', '#1e3a8a'],
      series: [{
        type: 'pie', radius: ['50%', '70%'], center: ['70%', '50%'],
        itemStyle: { borderRadius: 6, borderColor: '#0B0D0F', borderWidth: 2 },
        label: { show: false }, data: arr.length ? arr : [{ name: '无数据', value: 0 }]
      }]
    };
  }, [data.distributions?.expenses]);

  const waterfallOption = useMemo(() => {
    const arr = data.distributions?.privateAssets || [];
    const names = arr.map((v: any) => v.name).concat(['总净现值']);
    const total = arr.reduce((sum: number, v: any) => sum + v.value, 0);

    let currentSum = 0;
    const helpData = arr.map((v: any) => { const start = currentSum; currentSum += v.value; return start; }).concat([0]);
    const mainData = arr.map((v: any) => v.value).concat([total]);

    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: any) => p[1].name + ' : ¥' + (p[1].value?.toLocaleString() || 0) },
      grid: { left: '3%', right: '4%', bottom: '15%', top: '15%', containLabel: true },
      xAxis: { type: 'category', splitLine: { show: false }, data: names.length > 1 ? names : ['无数据'], axisLabel: { color: '#94a3b8', interval: 0, formatter: (val: string) => val.length > 4 ? val.slice(0, 4) + '...' : val } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1A1D21', type: 'dashed' } }, axisLabel: { show: false } },
      series: [
        { type: 'bar', stack: 'Total', itemStyle: { borderColor: 'transparent', color: 'transparent' }, data: helpData },
        {
          type: 'bar', stack: 'Total', label: { show: true, position: 'top', formatter: (p: any) => (p.value / 10000).toFixed(0) + 'w', color: '#FFFFFF', fontSize: 10 },
          itemStyle: { color: (p: any) => p.dataIndex === names.length - 1 ? '#FFFFFF' : '#0ea5e9', borderRadius: [4, 4, 0, 0] }, data: mainData.length ? mainData : [0]
        }
      ]
    };
  }, [data.distributions?.privateAssets]);

  const holdingsOption = useMemo(() => {
    const arr = data.distributions?.publicHoldings || [];
    // Sort array by value to make horizontal chart look better (descending)
    const sortedArr = [...arr].sort((a: any, b: any) => (a.value ?? a.marketValue ?? 0) - (b.value ?? b.marketValue ?? 0));
    
    const symbols = sortedArr.map((v: any) => v.name || v.symbol || '未知');
    const values = sortedArr.map((v: any) => v.value ?? v.marketValue ?? 0);
    
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: any) => p[0].name + ' : ¥' + (p[0].value?.toLocaleString() || 0) },
      grid: { left: '3%', right: '15%', bottom: '5%', top: '5%', containLabel: true },
      dataZoom: [
        {
          type: 'inside',
          yAxisIndex: 0,
          start: sortedArr.length > 8 ? Math.floor((1 - 8 / sortedArr.length) * 100) : 0, 
          end: 100
        },
        {
          type: 'slider',
          yAxisIndex: 0,
          show: sortedArr.length > 8,
          width: 12,
          right: 0,
          borderColor: 'transparent',
          backgroundColor: '#1E293B',
          fillerColor: '#38BDF855',
          handleSize: '100%',
        }
      ],
      xAxis: [{ type: 'value', splitLine: { lineStyle: { color: '#1A1D21', type: 'dashed' } }, axisLabel: { show: false } }],
      yAxis: [{ type: 'category', data: symbols.length ? symbols : ['无数据'], axisLabel: { color: '#94a3b8', interval: 0, width: 80, overflow: 'truncate' } }],
      series: [{ 
        type: 'bar', 
        label: { show: true, position: 'right', formatter: (p: any) => (p.value / 10000).toFixed(0) + 'w', color: '#14b8a6', fontSize: 10 }, 
        barWidth: '60%', 
        data: values.length ? values : [0], 
        itemStyle: { color: '#14b8a6', borderRadius: [0, 4, 4, 0] } 
      }]
    };
  }, [data.distributions?.publicHoldings]);

  const optionsOption = useMemo(() => {
    const arr = data.distributions?.options || [];
    const symbols = arr.map((v: any) => v.name || v.symbol || '未知');
    const values = arr.map((v: any) => v.value ?? v.marketValue ?? 0);
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: any) => p[0].name + ' : ¥' + (p[0].value?.toLocaleString() || 0) },
      grid: { left: '3%', right: '4%', bottom: '15%', top: '15%', containLabel: true },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: arr.length > 5 ? Math.floor((5 / arr.length) * 100) : 100
        },
        {
          type: 'slider',
          show: arr.length > 5,
          height: 12,
          bottom: 0,
          borderColor: 'transparent',
          backgroundColor: '#1E293B',
          fillerColor: '#38BDF855',
          handleSize: '100%',
        }
      ],
      xAxis: [{ type: 'category', data: symbols.length ? symbols : ['无数据'], axisLabel: { color: '#94a3b8', interval: 0, rotate: symbols.length > 4 ? 30 : 0 } }],
      yAxis: [{ type: 'value', splitLine: { lineStyle: { color: '#1A1D21', type: 'dashed' } }, axisLabel: { show: false } }],
      series: [{ type: 'bar', label: { show: true, position: 'top', formatter: (p: any) => (p.value / 10000).toFixed(0) + 'w', color: '#0369a1', fontSize: 10 }, barWidth: '40%', data: values.length ? values : [0], itemStyle: { color: '#0369a1', borderRadius: [4, 4, 0, 0] } }]
    };
  }, [data.distributions?.options]);

  const goalPercent = Math.min((data.goal?.index || 0) * 100, 100);

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

  const handleInlineNodePlan = async (typeStr: string, item: any, isLong: boolean, idx: number) => {
    const contentStr = encodeURIComponent(item.description || item.title || '');
    const contentHash = btoa(contentStr).slice(0, 15);
    const planKey = `${isLong ? 'long' : 'short'}-${idx}-${contentHash}`;

    setNodePlans(prev => ({
      ...prev,
      [planKey]: { status: 'thinking', result: '', thinking: '启动 AI 战略脑...' }
    }));

    const prompt = `你是一个顶尖的人生战略推演系统（配有高级推演核心）。请对以下【${item.timeNode}】阶段的计划进行极度硬核的落地推演。
节点名称：[${item.title}]
节点说明：${item.description}

严格要求：
1. 必须开启思维链，利用 <think> 标签包裹你的所有深层推理、定点分析步骤。
2. <think> 闭合后，严格按照以下三段式输出真正的硬核执行成果（使用精简 Markdown，禁止口水话和废话）：
   - ⚡ 核心执行序列 (列出前3步绝对具体、可衡量的动作)
   - ⚠️ 漏洞与定点风控预警 (指出本项中最容易使目标崩盘的2个隐患)
   - 💎 资源杠杆锚点 (在这个阶段，最应该优先把资金或精力倾注在什么地方)`;

    try {
      const ai = getUniversalAiClient();
      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: { temperature: 0.3 }
      });

      let accumulatedText = '';
      
      for await (const chunk of await responseStream) {
        accumulatedText += chunk.text;
        
        let thinkMatch = accumulatedText.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
        let currentThinkLine = '建立深度推演图谱...';
        
        if (thinkMatch) {
            const thinkContent = thinkMatch[1].trim();
            const lines = thinkContent.split('\n').filter(l => l.trim().length > 0);
            if (lines.length > 0) {
               let lastLine = lines[lines.length - 1].replace(/[*#`]/g, '').trim();
               if (lastLine.length > 40) lastLine = lastLine.substring(0, 40) + '...';
               currentThinkLine = lastLine;
            }
        }
        
        const resText = accumulatedText.replace(/<think>[\s\S]*?(?:<\/think>|$)/, '').trim();

        setNodePlans(prev => ({
          ...prev,
          [planKey]: { status: 'thinking', result: resText, thinking: currentThinkLine }
        }));
      }

      setNodePlans(prev => ({
        ...prev,
        [planKey]: { ...prev[planKey], status: 'done' }
      }));

    } catch (e: any) {
      let errMsg = e.message;
      if (errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE')) {
         errMsg = "API 当前负载较高 (503 Service Unavailable)。需求激增通常是暂时的，请稍后再试。";
      } else if (errMsg.includes('API key not valid') || errMsg.includes('API_KEY_INVALID')) {
         errMsg = "获取到的 API Key 无效。请点击此环境的 Settings（设置） -> Secrets 面板，检查并清除或更新您自定义的 API_KEY。";
      } else if (errMsg.includes('exceeded your current quota') || errMsg.includes('rate limits') || errMsg.includes('Quota exceeded') || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('monthly spending cap')) {
         errMsg = "API 额度已耗尽 (Resource Exhausted - Quota Exceeded)。您配置的 API Key 免费额度/速率或可用资金余额已达上限，请稍微重试或检查计费层级。";
      } else if (errMsg.includes('{')) {
          try {
              const parsed = JSON.parse(errMsg.substring(errMsg.indexOf('{')));
              if (parsed.error?.message) errMsg = parsed.error.message;
          } catch {}
      }
      setNodePlans(prev => ({
        ...prev,
        [planKey]: { status: 'done', result: `⚠️ 推演中断: ${errMsg}`, thinking: 'Neural Link Disconnected' }
      }));
    }
  };

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
      
      setData(EMPTY_STATE);
      setSduiState([]);
      setNodePlans({});
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

      <header className="sticky top-0 z-40 bg-dash-bg/80 backdrop-blur-xl border-b border-dash-subtle mb-6 md:mb-8 transition-all">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 md:h-20 flex justify-between items-center">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="bg-dash-surface border border-dash-subtle shadow-inner w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-dash-primary/20 to-transparent opacity-20"></div>
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-dash-primary shadow-[0_0_10px_rgba(255,255,255,0.3)]"></div>
            </div>
            <div className="truncate flex flex-col justify-center">
              <h1 className="text-xl sm:text-2xl font-sans font-medium tracking-tight text-dash-primary leading-none">
                Arbitra <span className="text-dash-tertiary">Terminal</span>
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
            <button
              onClick={() => setShowDeveloperView(true)}
              className="flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-dash-surface border border-dash-subtle text-dash-secondary hover:text-dash-primary hover:bg-dash-surface-hover transition-colors font-mono text-[10px] sm:text-xs uppercase tracking-widest font-semibold shadow-sm"
              title="开发者视图 / Developer View"
            >
              <Cpu className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Developer</span>
            </button>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsDrawerOpen(true)} 
              className="hidden md:flex items-center gap-2 px-6 py-2.5 rounded-[12px] text-[13px] font-bold bg-dash-primary text-dash-base hover:bg-white transition-colors shadow-sm"
            >
              <Sparkles className="w-4 h-4" /> Initialize
            </motion.button>

            {/* Mobile simplified AI button */}
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsDrawerOpen(true)} 
              className="flex md:hidden items-center justify-center w-10 h-10 rounded-[12px] bg-dash-primary text-dash-base hover:bg-white transition-colors shadow-sm"
            >
              <Sparkles className="w-5 h-5" />
            </motion.button>

            <div className="h-6 md:h-8 w-px bg-dash-subtle mx-1"></div>

            <div className="flex items-center gap-3 group relative cursor-pointer">
               <div className="w-10 h-10 rounded-[12px] bg-dash-surface-hover border border-dash-subtle hover:border-dash-primary/30 flex items-center justify-center overflow-hidden shrink-0 transition-colors shadow-sm">
                 <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
               </div>
               <div className="absolute right-0 top-12 scale-0 group-hover:scale-100 origin-top-right transition-all duration-200 bg-dash-surface border border-dash-subtle rounded-2xl p-2 shadow-xl z-50 w-56 backdrop-blur-xl">
                  <div className="px-3 py-3 border-b border-dash-subtle mb-2">
                    <p className="text-[13px] font-bold text-dash-primary truncate">{user.displayName}</p>
                    <p className="text-[11px] font-mono tracking-wide text-dash-tertiary truncate">{user.email}</p>
                  </div>
                  <button onClick={() => setShowSettingsModal(true)} className="w-full flex items-center gap-2 text-dash-secondary hover:text-dash-primary hover:bg-dash-surface-hover p-2.5 rounded-xl text-xs font-semibold transition-colors mb-1 uppercase tracking-wide">
                    <Settings className="w-4 h-4" /> Settings
                  </button>
                  <button onClick={logout} className="w-full flex items-center gap-2 text-dash-textSub hover:bg-dash-red/10 text-dash-secondary hover:text-dash-red p-2.5 rounded-xl text-xs font-semibold transition-colors uppercase tracking-wide">
                    <LogOut className="w-4 h-4" /> Disconnect
                  </button>
               </div>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-[1600px] mx-auto px-4 md:px-6">
        {/* Top Feature: AI Strategic Overview */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="bg-dash-surface border border-dash-subtle rounded-3xl p-6 sm:p-8 relative overflow-hidden group mt-6 mb-6 md:mb-10 shadow-sm transition-colors hover:bg-dash-surface-hover"
        >
          <h2 className="relative z-10 flex items-center gap-2 text-dash-tertiary text-[11px] font-semibold uppercase tracking-[0.15em] mb-4">
             <Activity className="w-4 h-4 text-dash-primary"/> Strategic Overview
          </h2>
          <p className="relative z-10 text-dash-primary text-[15px] sm:text-xl font-medium tracking-tight leading-relaxed">
             {data.insights?.global || "Waiting for deep financial sync..."}
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-0 mb-8"
        >
          <Card title="总净资产 (Net Worth)" value={formatMoney(data.metrics?.netWorth)} subValue={data.metrics?.netWorthSummary} isLongSubText />
          <Card title="可用现金池 (Liquidity)" value={formatMoney(data.metrics?.liquidity)} subValue={data.metrics?.liquiditySummary} isLongSubText />
          <Card title="抗风险系数 (Safety Ratio)" value={data.metrics?.safetyRatio?.toFixed(2) || '0.00'} subValue={data.metrics?.safetyRatioSummary || '当前流动性支撑乘数'} isLongSubText />
          <Card title="月自由现金流 (FCF)" value={formatMoney(data.metrics?.fcf)} subValue={data.metrics?.fcfSummary || '测算月结余'} isLongSubText />
        </motion.div>

      {sduiState.length > 0 && (
        <div className="mb-10 w-full">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {sduiState.map((block, i) => {
               const Component = ComponentRegistry[block.component];
               return Component ? <Component key={i} {...block.props} /> : null;
             })}
           </div>
        </div>
      )}

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

      {/* Adaptive Widget System: 核心图表与洞察 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6 mb-8">

        {/* 流动资金库 */}
        {data.distributions?.liquidity?.length > 0 && (
          <ChartWidget 
            status={isSynthesizing ? "loading" : undefined}
            title="流动资金池"
            dataLength={data.distributions?.liquidity?.length || 0}
            insight={data.insights?.liquidity}
            option={donutOption}
            delay={0.1}
          />
        )}

        {/* 公开市场持仓分析 (Text Card) */}
        {data.insights?.publicText && data.distributions?.publicHoldings?.length > 0 && (
          <Card 
            title="公开市场持仓评估" 
            delay={0.15} 
            className="border-[#8b5cf6]/30 bg-[#1A1D21]/50 backdrop-blur-md"
            badge={data._liveSources?.includes('longbridge') ? <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">Live Source</span> : <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">RAG Memory</span>}
          >
            <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap p-2 markdown-body">
               <Markdown>{data.insights.publicText}</Markdown>
            </div>
          </Card>
        )}

        {/* 公开市场持仓横向图表 (Chart Card) */}
        {(data.distributions?.publicHoldings?.length > 0) && (
          <ChartWidget 
            status={isSynthesizing ? "loading" : undefined}
            title="公开市场持仓视图"
            dataLength={data.distributions?.publicHoldings?.length || 0}
            insight={data.insights?.publicSummary}
            option={holdingsOption}
            delay={0.2}
            chartHeight="300px"
          />
        )}

        {/* 期权及衍生品 */}
        {data.distributions?.options?.length > 0 && (
          <ChartWidget 
            status={isSynthesizing ? "loading" : undefined}
            title="衍生品及期权"
            dataLength={data.distributions?.options?.length || 0}
            insight={data.insights?.options}
            option={optionsOption}
            delay={0.3}
            chartHeight="200px"
          />
        )}

        {/* 非公开资产 */}
        {(data.distributions?.privateAssets?.length > 0 || (data.insights?.private && data.insights.private !== "暂无非公开资产数据")) && (
          <ChartWidget 
            status={isSynthesizing ? "loading" : undefined}
            title="非公开资产估值"
            dataLength={data.distributions?.privateAssets?.length || (data.insights?.private && data.insights.private !== "暂无非公开资产数据" ? 1 : 0)}
            insight={data.insights?.private}
            option={waterfallOption}
            delay={0.4}
            chartHeight="200px"
          />
        )}

        {/* 预估固定资产 */}
        {data.distributions?.fixedAssets?.length > 0 && (
          <ChartWidget 
            status={isSynthesizing ? "loading" : undefined}
            title="固定资产与负债估值"
            dataLength={data.distributions?.fixedAssets?.length || 0}
            insight={data.insights?.fixedAssets}
            delay={0.5}
            chartHeight="100%"
          >
            <div className="grid grid-cols-1 gap-4 max-h-[300px] overflow-y-auto custom-scroll pr-2">
              {data.distributions?.fixedAssets?.map((asset: any, idx: number) => (
                 <div key={idx} className="bg-dash-surface-hover border border-dash-subtle rounded-3xl p-5 sm:p-6 shrink-0 shadow-sm">
                    <div className="font-semibold text-dash-primary mb-4 text-sm sm:text-[15px] flex justify-between items-start tracking-tight">
                      {asset.name}
                    </div>
                    <div className="flex justify-between items-center text-[13px] mb-3">
                       <span className="text-dash-secondary font-mono tracking-wide">Estimated Value</span>
                       <span className="text-dash-primary font-mono font-bold tracking-tight">¥{(asset.marketValue ?? asset.value ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-[13px] mb-2">
                       <span className="text-dash-secondary font-mono tracking-wide">Debt / Cost</span>
                       <span className="text-dash-red font-mono font-bold tracking-tight">¥{(asset.holdingCost ?? 0).toLocaleString()}</span>
                    </div>
                 </div>
              ))}
            </div>
          </ChartWidget>
        )}

        {/* 开支结构 */}
        {data.distributions?.expenses?.length > 0 && (
          <ChartWidget 
            status={isSynthesizing ? "loading" : undefined}
            title="开支结构分析"
            dataLength={data.distributions?.expenses?.length || 0}
            insight={data.insights?.expenses}
            option={expenseOption}
            delay={0.6}
          />
        )}

      </div>

      {/* 阶段性人生策略建议 (Life Strategies Timeline) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-10">
         {/* 短线 */}
         <motion.div 
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ type: "spring", stiffness: 400, damping: 25, staggerChildren: 0.1 }}
           className="bg-dash-surface border border-dash-subtle rounded-3xl p-6 sm:p-8 relative overflow-hidden group shadow-sm transition-colors hover:bg-dash-surface-hover"
         >
           <h3 className="text-[11px] font-semibold text-dash-secondary mb-8 flex items-center gap-2 uppercase tracking-[0.1em] block w-full">
             Short-Term Strategy <span className="text-dash-tertiary ml-auto">12 Months</span>
           </h3>
           {(!data.lifeStrategiesShort || data.lifeStrategiesShort.length === 0) ? (
              <div className="text-dash-tertiary text-[11px] flex items-center justify-center h-24 border border-dash-subtle rounded-2xl bg-dash-surface-hover font-semibold uppercase tracking-widest">No Data</div>
           ) : (
              <div className="relative border-l border-dash-subtle ml-4 space-y-12 my-4">
                {data.lifeStrategiesShort.map((item: any, idx: number) => {
                   const contentStr = encodeURIComponent(item.description || item.title || '');
                   const contentHash = btoa(contentStr).slice(0, 15);
                   const planKey = `short-${idx}-${contentHash}`;
                   const plan = nodePlans[planKey];
                   return (
                   <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 400, damping: 25, delay: idx * 0.1 }} key={idx} className="pl-6 sm:pl-8 relative group/item">
                      <div className="absolute w-3 h-3 bg-dash-primary rounded-full -left-[6.5px] top-2 ring-4 ring-dash-base shadow-sm" />
                      <div className="inline-block bg-dash-surface-hover text-dash-primary font-mono text-[10px] sm:text-xs px-3 py-1.5 rounded-lg mb-3 tracking-wide border border-dash-subtle tabular-nums font-semibold">
                        {item.timeNode}
                      </div>
                      <div className="flex justify-between items-start mb-3 gap-2">
                         <h4 className="text-[15px] sm:text-lg font-semibold text-dash-primary leading-tight tracking-tight pr-0">{item.title}</h4>
                         <button 
                           onClick={() => plan?.status === 'thinking' ? null : handleInlineNodePlan('短线策略', item, false, idx)}
                           disabled={plan?.status === 'thinking'}
                           className="shrink-0 text-[10px] uppercase font-semibold border border-dash-subtle hover:border-dash-primary bg-dash-surface-hover hover:bg-white text-dash-primary hover:text-dash-base px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed tracking-widest shadow-sm"
                         >
                           {plan?.status === 'thinking' ? <Loader2 className="w-3 h-3 animate-spin" /> : (plan?.status === 'done' ? <RefreshCw className="w-3 h-3" /> : <Activity className="w-3 h-3"/> )}
                           {plan?.status === 'thinking' ? 'Wait' : (plan?.status === 'done' ? 'Retry' : 'Analyze')}
                         </button>
                      </div>
                      <p className="text-[13px] text-dash-secondary leading-relaxed p-4 rounded-2xl border border-dash-subtle bg-dash-surface-hover">
                        {item.description}
                      </p>
                      {plan && (
                         <div className="mt-4 bg-dash-base border border-dash-subtle rounded-2xl overflow-hidden text-xs sm:text-sm shadow-inner">
                            {plan.status === 'thinking' && (
                               <div className="flex items-center gap-2 px-4 py-3 text-dash-primary font-semibold tracking-wide text-[10px] sm:text-xs border-b border-dash-subtle bg-dash-surface-hover">
                                  <Cpu className="w-3.5 h-3.5 animate-pulse shrink-0" />
                                  <span className="truncate">{plan.thinking || 'Connecting...'}</span>
                               </div>
                            )}
                            {plan.result && (
                               <div className="p-4 sm:p-5 text-dash-primary markdown-body leading-relaxed text-[13px]">
                                  <Markdown>{plan.result}</Markdown>
                               </div>
                            )}
                         </div>
                      )}
                   </motion.div>
                )})}
              </div>
           )}
         </motion.div>

         {/* 长线 */}
         <motion.div 
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ type: "spring", stiffness: 400, damping: 25, staggerChildren: 0.1, delay: 0.2 }}
           className="bg-dash-surface border border-dash-subtle rounded-3xl p-6 sm:p-8 relative overflow-hidden group shadow-sm transition-colors hover:bg-dash-surface-hover"
         >
           <h3 className="text-[11px] font-semibold text-dash-secondary mb-8 flex items-center gap-2 uppercase tracking-[0.1em] block w-full">
             Long-Term Strategy <span className="text-dash-tertiary ml-auto">10+ Years</span>
           </h3>
           {(!data.lifeStrategiesLong || data.lifeStrategiesLong.length === 0) ? (
              <div className="text-dash-tertiary text-[11px] flex items-center justify-center h-24 border border-dash-subtle rounded-2xl bg-dash-surface-hover font-semibold uppercase tracking-widest">No Data</div>
           ) : (
              <div className="relative border-l border-dash-subtle ml-4 space-y-12 my-4">
                {data.lifeStrategiesLong.map((item: any, idx: number) => {
                   const contentStr = encodeURIComponent(item.description || item.title || '');
                   const contentHash = btoa(contentStr).slice(0, 15);
                   const planKey = `long-${idx}-${contentHash}`;
                   const plan = nodePlans[planKey];
                   return (
                   <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 400, damping: 25, delay: idx * 0.1 }} key={idx} className="pl-6 sm:pl-8 relative group/item">
                      <div className="absolute w-3 h-3 bg-dash-primary rounded-full -left-[6.5px] top-2 ring-4 ring-dash-base shadow-sm" />
                      <div className="inline-block bg-dash-surface-hover text-dash-primary font-mono text-[10px] sm:text-xs px-3 py-1.5 rounded-lg mb-3 tracking-wide border border-dash-subtle tabular-nums font-semibold">
                        {item.timeNode}
                      </div>
                      <div className="flex justify-between items-start mb-3 gap-2">
                         <h4 className="text-[15px] sm:text-lg font-semibold text-dash-primary leading-tight tracking-tight pr-0">{item.title}</h4>
                         <button 
                           onClick={() => plan?.status === 'thinking' ? null : handleInlineNodePlan('长线策略', item, true, idx)}
                           disabled={plan?.status === 'thinking'}
                           className="shrink-0 text-[10px] uppercase font-semibold border border-dash-subtle hover:border-dash-primary bg-dash-surface-hover hover:bg-white text-dash-primary hover:text-dash-base px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed tracking-widest shadow-sm"
                         >
                           {plan?.status === 'thinking' ? <Loader2 className="w-3 h-3 animate-spin" /> : (plan?.status === 'done' ? <RefreshCw className="w-3 h-3" /> : <Activity className="w-3 h-3"/> )}
                           {plan?.status === 'thinking' ? 'Wait' : (plan?.status === 'done' ? 'Retry' : 'Analyze')}
                         </button>
                      </div>
                      <p className="text-[13px] text-dash-secondary leading-relaxed p-4 rounded-2xl border border-dash-subtle bg-dash-surface-hover">
                        {item.description}
                      </p>
                      {plan && (
                         <div className="mt-4 bg-dash-base border border-dash-subtle rounded-2xl overflow-hidden text-xs sm:text-sm shadow-inner">
                            {plan.status === 'thinking' && (
                               <div className="flex items-center gap-2 px-4 py-3 text-dash-primary font-semibold tracking-wide text-[10px] sm:text-xs border-b border-dash-subtle bg-dash-surface-hover">
                                  <Cpu className="w-3.5 h-3.5 animate-pulse shrink-0" />
                                  <span className="truncate">{plan.thinking || 'Connecting...'}</span>
                               </div>
                            )}
                            {plan.result && (
                               <div className="p-4 sm:p-5 text-dash-primary markdown-body leading-relaxed text-[13px]">
                                  <Markdown>{plan.result}</Markdown>
                               </div>
                            )}
                         </div>
                      )}
                   </motion.div>
                )})}
              </div>
           )}
         </motion.div>
      </div>

      {/* 底部目标追踪卡片 (Goal Tracker) */}
      {data.goal?.name && data.goal.name !== '等待设定目标' && (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="bg-dash-surface border border-dash-subtle rounded-3xl p-6 sm:p-8 relative overflow-hidden group mb-10 shadow-sm transition-colors hover:bg-dash-surface-hover"
      >
        <div className="relative z-10 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 sm:gap-8 mb-6 sm:mb-8">
          <div className="flex-1">
            <h3 className="text-xl sm:text-2xl font-sans tracking-tight font-medium text-dash-primary break-words">{data.goal?.name || "战略目标"}</h3>
            <p className="text-[13px] text-dash-tertiary mt-2 font-mono break-all sm:break-normal font-medium tracking-wide">
              PROGRESS TARGET <span className="text-dash-secondary ml-2 font-semibold">¥{(data.goal?.current || 0).toLocaleString()} <span className="text-dash-subtle mx-1">/</span> ¥{(data.goal?.target || 0).toLocaleString()}</span>
            </p>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-[10px] text-dash-tertiary uppercase mb-2 tracking-widest font-semibold font-sans">Achievement Index</div>
            <div className={`text-4xl sm:text-5xl font-mono tabular-nums tracking-tighter ${data.goal?.index >= 1 ? 'text-dash-green' : 'text-dash-primary'}`}>
              {(data.goal?.index || 0).toFixed(4)}
            </div>
          </div>
        </div>
        <div className="relative z-10 w-full h-3 sm:h-4 bg-dash-surface border border-dash-subtle rounded-full overflow-hidden shadow-inner">
          <div className={`h-full relative z-10 transition-all duration-1000 ${data.goal?.index >= 1 ? 'bg-dash-green' : 'bg-dash-primary'}`} style={{ width: `${goalPercent}%` }}>
          </div>
        </div>
      </motion.div>
      )}
      </main>

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

      <Drawer 
        isDrawerOpen={isDrawerOpen} 
        setIsDrawerOpen={setIsDrawerOpen} 
        user={user} 
        data={data} 
        setSduiState={setSduiState} 
        setIsSynthesizing={setIsSynthesizing}
        commitData={commitData}
      />
    </div>
  );
}
