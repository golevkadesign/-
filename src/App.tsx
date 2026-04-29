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


// Replaced by getUniversalAiClient

const ANALYSIS_PROMPT = `
你是一个顶级 AI 私人财富总监 (Backend-Only Analysis Expert)。
你的任务是深层测算，但不负责最终的排版和UI结构。
你接收多模态内容和第三方系统（如Yahoo牌价、券商API等）及各路顶尖Agent的深度诊断数据。\n严正声明：你会收到各领域Agent通过联网获取到的对某个实体资产/负债（如当地真实房价、按揭利率）的客观市调估值数据，提取关键结论时必须百分百采用这些真实市场市调数据进行财务测算推演，禁止自己凭空捏造数值。
请全面分析当前的净资产、流动性、抗风险以及给定Tier层次的最佳破局点策略。
返回严格彻底的分析纯JSON数据（仅包含核心观点和数据）。不要任何人类语言包裹。
`;

const UI_SUMMARY_PROMPT = `
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
import { X, Sparkles, Send, LogOut, ChevronDown, Building2, User, FileText, Upload, PieChart, Activity, Loader2, RefreshCw, Cpu, Settings, Bot } from 'lucide-react';
import Markdown from 'react-markdown';
import { useChat } from '@ai-sdk/react';
import { ChatList, ChatInput } from './components/ui/chat-ui';
import { ChartWidget } from './components/ChartWidget';

// Component Registry for Server-Driven UI (SDUI)
const ComponentRegistry: Record<string, React.FC<any>> = {
  MetricsCard: ({ title, value }) => <Card title={title} value={value} />,
  EChartsPie: ({ data }) => (
    <div className="bg-dash-card rounded-xl border border-slate-700/50 p-6 h-[350px] shadow-lg flex flex-col">
       <div className="flex-1 min-h-0">
          <ReactECharts option={{ tooltip: { trigger: 'item' }, series: [{ type: 'pie', data, radius: ['40%', '70%'] }] }} />
       </div>
    </div>
  ),
  Timeline12X: ({ title, nodes }) => (
    <div className="bg-dash-card rounded-xl border border-slate-700/50 p-6 shadow-lg relative overflow-hidden">
        <h3 className="text-xl font-bold text-dash-gold mb-6 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-dash-gold" /> {title}
        </h3>
        <div className="relative border-l-2 border-slate-700 ml-4 space-y-10 my-4">
           {nodes?.map((item: any, idx: number) => (
             <div key={idx} className="pl-8 relative">
                 <div className="absolute w-4 h-4 bg-emerald-500 rounded-full -left-[9px] top-1 ring-4 ring-slate-900 border-2 border-slate-900 shadow-xl" />
                 <div className="inline-block bg-slate-800 text-emerald-400 font-mono text-xs px-3 py-1 rounded-full mb-3 border border-slate-700/80">
                   {item.timeNode}
                 </div>
                 <h4 className="text-lg font-bold text-white mb-2">{item.title}</h4>
                 <p className="text-sm text-dash-textSub leading-relaxed bg-slate-800/30 p-4 rounded border border-slate-700/30">
                   {item.description}
                 </p>
             </div>
           ))}
        </div>
    </div>
  ),
  SystemAlert: ({ message }) => (
    <div className="p-4 bg-red-900/40 text-red-400 rounded-lg border border-red-800 my-4">{message}</div>
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

const fileToBase64 = (file: File): Promise<Attachment> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
       const result = reader.result as string;
       const [mimeInfo, baseData] = result.split(",");
       const mimeType = mimeInfo.split(":")[1].split(";")[0];
       resolve({ mimeType, data: baseData, name: file.name });
    };
    reader.onerror = reject;
  });

const Drawer = ({ isDrawerOpen, setIsDrawerOpen, user, data, setSduiState, setIsSynthesizing, commitData }: any) => {
  const [inputMsg, setInputMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [displayMax, setDisplayMax] = useState(10);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [showDrawerClearConfirm, setShowDrawerClearConfirm] = useState(false);
  const isChatLoaded = useRef(false);

  // UI state for multi-turn dialog
  const [chatHistory, setChatHistory] = useState<{ user: string, ai: string, attachments: Attachment[], thinking?: string, isThinkingExpanded?: boolean }[]>([]);

  useEffect(() => {
    const handleClearChat = () => {
        setChatHistory([]);
    };
    window.addEventListener('clear-chat-history', handleClearChat);
    return () => window.removeEventListener('clear-chat-history', handleClearChat);
  }, []);

  useEffect(() => {
     if (user?.uid) {
        const loadHistory = async () => {
           try {
              const snap = await getDoc(doc(db, "userProfiles", user.uid));
              if (snap.exists() && snap.data().chatHistory) {
                  setChatHistory(snap.data().chatHistory);
                  localStorage.setItem(`ai_terminal_chat_${user.uid}`, JSON.stringify(snap.data().chatHistory));
                  isChatLoaded.current = true;
                  return;
              }
           } catch(e: any) { 
              if (e.message && e.message.includes('offline')) {
                 console.log("Offline mode: using local cache for chat history.");
              } else {
                 console.error("Failed to load chat history from firestore:", e);
              }
           }

           // Fallback to localStorage if not found in Firestore
           const stored = localStorage.getItem(`ai_terminal_chat_${user.uid}`);
           let targetStored = stored;
           
           if (!stored) {
              const oldStored = localStorage.getItem('ai_terminal_chat');
              if (oldStored) {
                  targetStored = oldStored;
                  localStorage.setItem(`ai_terminal_chat_${user.uid}`, oldStored);
                  localStorage.removeItem('ai_terminal_chat');
              }
           }

           if (targetStored) {
              try {
                const parsed = JSON.parse(targetStored);
                setChatHistory(parsed.map((item: any) => ({
                  ...item,
                  attachments: item.attachments ? item.attachments : (item.img ? [{ mimeType: 'image/jpeg', data: item.img.split(',')[1], name: 'legacy_img.jpg' }] : [])
                })));
              } catch { setChatHistory([]); }
           } else {
              setChatHistory([]);
           }
           isChatLoaded.current = true;
        };
        loadHistory();
     }
  }, [user?.uid]);

  useEffect(() => {
    if (user?.uid && isChatLoaded.current) {
       localStorage.setItem(`ai_terminal_chat_${user.uid}`, JSON.stringify(chatHistory));
       const timeoutId = setTimeout(() => {
           // Prevent Firestore 1MB document size limit by stripping very large attachments and truncating thinking logs
           const chatToSync = chatHistory.map(c => {
               const newC = { ...c };
               if (newC.thinking) {
                   newC.thinking = newC.thinking.substring(0, 5000) + (newC.thinking.length > 5000 ? '\n...[truncated]' : '');
               }
               newC.attachments = newC.attachments?.map(att => ({
                    ...att,
                    // If attachment is larger than 100KB, remove its raw data from persistent storage to save space, keeping just metadata
                    data: att.data.length > 100000 ? "" : att.data
               })) || [];
               Object.keys(newC).forEach(key => (newC as any)[key] === undefined && delete (newC as any)[key]);
               return newC;
           });
           setDoc(doc(db, "userProfiles", user.uid), { chatHistory: chatToSync }, { merge: true }).catch(e => console.error("Failed to save chat to firestore:", e));
       }, 2000);
       return () => clearTimeout(timeoutId);
    }
  }, [chatHistory, user?.uid]);

  useEffect(() => {
    if (isDrawerOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView();
    }
  }, [chatHistory, isDrawerOpen]);
  
  const handlePaste = async (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      const files = Array.from(e.clipboardData.files);
      const newAtts = await Promise.all(files.map(file => fileToBase64(file)));
      setAttachments(prev => [...prev, ...newAtts]);
    }
  };

  useEffect(() => {
    const handleTrigger = (e: any) => {
      const msg = e.detail;
      handleAiSubmit(msg);
    };
    const handleAddAttachment = (e: any) => {
      const att = e.detail;
      setAttachments(prev => [...prev, att]);
    };
    window.addEventListener('trigger-ai-drawer', handleTrigger);
    window.addEventListener('add-attachment', handleAddAttachment);
    return () => {
       window.removeEventListener('trigger-ai-drawer', handleTrigger);
       window.removeEventListener('add-attachment', handleAddAttachment);
    };
  }, [chatHistory, attachments, isLoading, data, user]);

  const handleStop = () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
      }
      setIsLoading(false);
  };

  const handleRegenerate = () => {
      if (isLoading) return;
      setChatHistory(prev => {
         const h = [...prev];
         if (h.length === 0) return h;
         const last = h.pop();
         if (last && last.user) {
             setTimeout(() => handleAiSubmit(last.user, last.attachments), 50);
         }
         return h;
      });
  };

  const handleAiSubmit = async (overrideMsg?: string, overrideAtts?: Attachment[]) => {
    const actualMsg = typeof overrideMsg === 'string' ? overrideMsg : inputMsg;
    const attsToSend = overrideAtts || [...attachments];

    if (!actualMsg.trim() && attsToSend.length === 0) return;

    const userMsg = actualMsg;
    
    setChatHistory(prev => [...prev, { user: userMsg, ai: '', attachments: attsToSend }]);
    if (typeof overrideMsg !== 'string') setInputMsg('');
    setAttachments([]);
    setIsLoading(true);

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      // 1. Gather Context from BFF
      const contextRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
           message: userMsg,
           history: chatHistory.map(c => ({ user: c.user, ai: c.ai })),
           contextData: data,
           settings: getSettings(),
           userId: user?.uid,
           customApiKey: localStorage.getItem('custom_gemini_api_key') || undefined
        }),
        signal
      });

      if (!contextRes.ok) {
         const errText = await contextRes.text();
         throw new Error(`BFF Request Failed (${contextRes.status}): ${errText}`);
      }
      
      let bffData: any = null;
      let serverError: string | null = null;
      let thinkingProgress = "";
      const reader = contextRes.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      
      if (reader) {
        let buffer = '';
        while (true) {
          if (signal.aborted) throw new Error('AbortError');
          const { done, value } = await reader.read();
          
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
          
          for (const line of lines) {
             if (line.startsWith('data: ')) {
                const dataStr = line.trim().slice(6);
                if (!dataStr) continue;
                try {
                   const parsed = JSON.parse(dataStr);
                   if (parsed.type === 'progress') {
                      thinkingProgress += parsed.message + '\n';
                      if (parsed.message.includes("各节点数据已回流") || parsed.message.includes("CEO 级全局 Synthesizer")) {
                          setIsSynthesizing?.(true);
                      }
                      setChatHistory(prev => {
                         const newHist = [...prev];
                         newHist[newHist.length - 1].thinking = thinkingProgress.trim();
                         if (newHist[newHist.length - 1].isThinkingExpanded === undefined) {
                            newHist[newHist.length - 1].isThinkingExpanded = true;
                         }
                         return newHist;
                      });
                   } else if (parsed.type === 'partial_result') {
                      bffData = { ...bffData, ...parsed.data };
                      // Eagerly merge Live Portfolio to bypass AI latency and ensure badge
                      if (parsed.data.externalData?.livePortfolio && parsed.data.externalData.livePortfolio.length > 0) {
                          commitData((prevData: any) => ({
                              ...prevData,
                              distributions: {
                                  ...prevData.distributions,
                                  publicHoldings: parsed.data.externalData.livePortfolio
                              },
                              _liveSources: ['longbridge']
                          }));
                      }
                   } else if (parsed.type === 'result') {
                      bffData = parsed.data;
                   } else if (parsed.type === 'error') {
                      serverError = parsed.error;
                   }
                } catch(e) {
                   console.error("SSE JSON Parse Error for line:", dataStr, e);
                }
             }
          }
        }
      }

      if (signal.aborted) throw new Error('AbortError');
      if (serverError) throw new Error(serverError);
      if (!bffData) throw new Error("未能从服务器获取核心分析数据。(Timeout or Stream Empty)");

      // 1.5 Handle permanent RAG profile updates
      if (bffData.updatedProfile && Object.keys(bffData.updatedProfile).length > 0) {
          try {
              if (user?.uid) {
                  await setDoc(doc(db, "userProfiles", user.uid), { userProfile: bffData.updatedProfile }, { merge: true });
                  commitData({ ...data, userProfile: bffData.updatedProfile });
              }
          } catch(e) {
              console.error("Failed to save profile to Firestore:", e);
          }
      }
      
      // 1.6 Eagerly merge Live Portfolio to bypass AI latency and ensure badge
      if (bffData.externalData?.livePortfolio && bffData.externalData.livePortfolio.length > 0) {
          // Merge it early so it renders instantly
          commitData((prevData: any) => ({
              ...prevData,
              distributions: {
                  ...prevData.distributions,
                  publicHoldings: bffData.externalData.livePortfolio
              },
              _liveSources: ['longbridge']
          }));
      }

      // If it's a quick reply, short circuit
      if (bffData.isQuickReply) {
         setChatHistory(prev => {
           const newHist = [...prev];
           newHist[newHist.length - 1].ai = bffData.expertAnalysis['快速回应'];
           return newHist;
         });
         setIsLoading(false);
         return;
      }
      
      // 2. Client-side Analysis Agent Execution
      const parts: any[] = [];
      if (attsToSend && attsToSend.length > 0) {
        for (const file of attsToSend) {
          parts.push({
            inlineData: { mimeType: file.mimeType, data: file.data }
          });
        }
      }
      
      const contextStr = JSON.stringify({
         history: chatHistory.map(c => ({ user: c.user, ai: c.ai })),
         currentNetWorthTier: bffData.userTier,
         marketQuotesYahooRAG: bffData.externalData.marketData,
         livePortfolioRAG: bffData.externalData.livePortfolio,
         expertAnalysis: bffData.expertAnalysis,
         userProfileRAG: bffData.updatedProfile || data.userProfile,
         terminalState: data,
         userMessage: userMsg
      });
      
      parts.push({ text: `请根据以下综合金融切片进行深度核心策略演算：\n\n${contextStr}` });

      const ai = getUniversalAiClient();
      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3.1-pro-preview",
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction: ANALYSIS_PROMPT,
          temperature: 0.2
        }
      });
      
      const initialThinking = thinkingProgress.trim();
      let analysisText = '';
      for await (const chunk of responseStream) {
         if (signal.aborted) throw new Error('AbortError');
         analysisText += chunk.text;
         const thinkMatch = analysisText.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
         if (thinkMatch) {
            setChatHistory(prev => {
               const newHist = [...prev];
               newHist[newHist.length - 1].thinking = initialThinking + '\n\n' + thinkMatch[1].trim();
               return newHist;
            });
         }
      }
      
      if (signal.aborted) throw new Error('AbortError');

      // 3. Client-side UI Summary Agent
      const summaryInput = `Tier: ${bffData.userTier}\nUserMsg: ${userMsg}\nHardcore Analysis Result:\n${analysisText}\n\nCurrent Terminal State (SDUI JSON):\n${JSON.stringify(data, null, 2)}`;
      const summaryResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: summaryInput,
        config: {
          systemInstruction: UI_SUMMARY_PROMPT,
          temperature: 0.3
        }
      });
      
      if (signal.aborted) throw new Error('AbortError');
      
      const txt = summaryResponse.text || "";
      const jsonMatch = txt.match(/```json\n([\s\S]*?)\n```/);
      let sduiPayload: any = null;
      if (jsonMatch && jsonMatch[1]) {
        try {
          sduiPayload = JSON.parse(jsonMatch[1]);
        } catch(e) { console.error("Parse SDUI error:", e); }
      }

      setChatHistory(prev => {
        const newHist = [...prev];
        newHist[newHist.length - 1].ai = sduiPayload?.aiReadableReply || `JSON 解析失败: \n${txt}`;
        return newHist;
      });

      if (sduiPayload?.sduiSchema) {
         setSduiState(sduiPayload.sduiSchema);
      }
      
      if (sduiPayload?.updateGlobalState) {
         commitData((prevData: any) => ({ 
            ...prevData, 
            ...sduiPayload.updateGlobalState, 
            metrics: { ...prevData.metrics, ...(sduiPayload.updateGlobalState.metrics || {}) },
            distributions: { 
                ...prevData.distributions, 
                ...(sduiPayload.updateGlobalState.distributions || {}),
                // Ensure AI doesn't accidentally overwrite deterministic live portfolio
                ...(bffData.externalData?.livePortfolio ? { publicHoldings: bffData.externalData.livePortfolio } : {})
            },
            insights: { ...prevData.insights, ...(sduiPayload.updateGlobalState.insights || {}) },
            goal: sduiPayload.updateGlobalState.goal || prevData.goal,
            _liveSources: bffData.externalData?.livePortfolio ? ['longbridge'] : []
         }));
      }

    } catch (error: any) {
      if (error.message === 'AbortError' || error.name === 'AbortError') {
          console.log('AI Generation Stopped.');
          return;
      }
      setChatHistory(prev => {
        const newHist = [...prev];
        let errMsg = error.message;
        if (errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE')) {
           errMsg = "API 当前负载较高 (503 Service Unavailable)。需求激增通常是暂时的，请您稍后重试。";
        } else if (errMsg.includes('API key not valid') || errMsg.includes('API_KEY_INVALID')) {
           errMsg = "获取到的 API Key 无效。请点击环境的 Settings -> Secrets 面板，检查并清除或同步更新您自定义的 API_KEY。";
        } else if (errMsg.includes('exceeded your current quota') || errMsg.includes('rate limits') || errMsg.includes('Quota exceeded') || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('monthly spending cap')) {
           errMsg = "API 额度已耗尽 (Resource Exhausted - Quota Exceeded)。您配置的 API Key 免费额度/速率或可用资金余额已达上限，请检查计费层级或更换 Key 后重试。";
        } else if (errMsg.includes('{')) {
            try {
                const parsed = JSON.parse(errMsg.substring(errMsg.indexOf('{')));
                if (parsed.error?.message) errMsg = parsed.error.message;
            } catch {}
        }
        newHist[newHist.length - 1].ai = `⚠️ **通信中断**: ${errMsg}`;
        return newHist;
      });
    } finally {
      setIsLoading(false);
      setIsSynthesizing?.(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className={`fixed inset-y-0 right-0 w-full sm:w-[500px] md:w-[600px] bg-dash-bg border-l border-[#2A2B2D] z-50 transform transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-2xl flex flex-col ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      
      <div className="p-4 sm:p-6 border-b border-[#2A2B2D] flex justify-between items-center bg-dash-card relative z-10">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-xl bg-[#111315] flex items-center justify-center border border-[#2A2B2D]">
              <div className="w-4 h-4 rounded-full bg-dash-green"></div>
           </div>
           <div>
              <h2 className="text-lg font-semibold text-white leading-tight">Smart Agent</h2>
              <p className="text-[10px] text-dash-textSub font-mono uppercase tracking-widest mt-0.5">Terminal AI</p>
           </div>
        </div>
        <div className="flex items-center gap-2">
           {chatHistory.length > 0 && (
              <div className="relative">
                 <button 
                   onClick={() => setShowDrawerClearConfirm(true)} 
                   className="text-[11px] text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:border-rose-500/50 hover:bg-rose-500/10 transition-all flex items-center gap-1.5 font-medium"
                 >
                   <RefreshCw className="w-3.5 h-3.5" /> 清除屏显
                 </button>
                 
                 {showDrawerClearConfirm && (
                   <>
                     <div className="fixed inset-0 z-40" onClick={() => setShowDrawerClearConfirm(false)}></div>
                     <div className="absolute right-0 top-full mt-2 w-64 bg-[#111315] border border-rose-500/30 rounded-xl p-4 shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
                        <p className="text-xs text-dash-textMain mb-3 leading-relaxed">此操作仅清除屏幕显示，系统仍保有长期记忆。确认清除？</p>
                        <div className="flex justify-end gap-2">
                           <button onClick={() => setShowDrawerClearConfirm(false)} className="px-3 py-1.5 bg-white/5 border border-white/10 text-dash-textSub text-xs rounded hover:bg-white/10 hover:text-white transition-colors">取消</button>
                           <button onClick={() => { setChatHistory([]); setShowDrawerClearConfirm(false); }} className="px-3 py-1.5 bg-rose-600/20 text-rose-500 border border-rose-500/30 text-xs rounded hover:bg-rose-600 hover:text-white transition-colors">确认清除</button>
                        </div>
                     </div>
                   </>
                 )}
              </div>
           )}
           <button onClick={() => setIsDrawerOpen(false)} className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg transition-colors text-dash-textSub hover:text-white ml-2 shadow-sm">
             <X className="w-5 h-5" />
           </button>
        </div>
      </div>

      <ChatList 
        messages={chatHistory.flatMap((c, i) => {
           const msgs = [];
           if (c.user || (c.attachments && c.attachments.length > 0)) {
              msgs.push({ role: 'user', content: c.user || '', attachments: c.attachments });
           }
           if (c.ai || (i === chatHistory.length - 1 && isLoading) || c.thinking) {
              msgs.push({ role: 'assistant', content: c.ai || '', thinking: c.thinking });
           }
           return msgs;
        })} 
        isTyping={isLoading} 
        onRegenerate={chatHistory.length > 0 ? handleRegenerate : undefined}
        onQuickPrompt={(prompt: string) => handleAiSubmit(prompt)}
      />

      <div className="fixed bottom-0 left-0 right-0 z-40 pb-0 w-full border-t border-white/5 bg-[#0B0D0F]/70 backdrop-saturate-[180%] backdrop-blur-[20px]">
        <div className="max-w-4xl mx-auto flex flex-col p-4 sm:p-6 pb-8 sm:pb-6 relative transition-all ease-[cubic-bezier(0.4,0,0.2,1)] duration-300">
            {attachments.length > 0 && (
               <div className="flex flex-wrap gap-2 mb-3">
                 {attachments.map((att, i) => (
                    <div key={i} className="relative group animate-in zoom-in duration-200">
                      {att.mimeType.startsWith('image/') ? (
                         <img src={`data:${att.mimeType};base64,${att.data}`} alt="upload" className="w-16 h-16 object-cover rounded-2xl border border-white/10 shadow-lg" />
                      ) : (
                         <div className="w-16 h-16 bg-[#1A1D21] rounded-2xl border border-white/10 flex flex-col items-center justify-center p-1 text-[10px] text-dash-textSub font-sans shadow-lg">
                            <FileText className="w-6 h-6 mb-1 text-dash-textSub" />
                            <span className="truncate w-full text-center px-1 font-medium">{att.name}</span>
                         </div>
                      )}
                      <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 opacity-100 hover:scale-110 transition-transform shadow-md">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                 ))}
               </div>
            )}

            <div className="flex items-end gap-2 w-full relative">
               <button onClick={() => fileInputRef.current?.click()} className="flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 bg-transparent rounded-2xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all shadow-sm flex items-center justify-center mb-1 active:scale-95">
                 <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
               </button>
               <input type="file" multiple accept="image/*,.pdf,.txt" ref={fileInputRef} onChange={async e => {
                 if (e.target.files) {
                   const files = Array.from(e.target.files);
                   const newAtts = await Promise.all(files.map(file => fileToBase64(file)));
                   setAttachments(prev => [...prev, ...newAtts]);
                   if (fileInputRef.current) fileInputRef.current.value = '';
                 }
               }} className="hidden" />

               <div className="flex-1 w-full relative">
                 <ChatInput 
                   input={inputMsg} 
                   handleInputChange={(e: any) => setInputMsg(e.target.value)} 
                   handleSubmit={(e: any) => {
                      e?.preventDefault();
                      handleAiSubmit();
                   }} 
                   isLoading={isLoading} 
                   onStop={handleStop}
                   onPaste={handlePaste}
                   hasAttachments={attachments.length > 0}
                 />
               </div>
            </div>
        </div>
      </div>
    </div>
  );
};

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
    return <div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-dash-gold">Initializing Security Context...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dash-bg relative overflow-hidden px-4">
         <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8, ease: "easeOut" }}
           className="glass-panel p-8 sm:p-12 border border-[#2A2B2D] max-w-md w-full text-center"
         >
            <div className="bg-[#181A1C] w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 sm:mb-8 border border-[#2A2B2D]">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-dash-green" />
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">Arbitra <span className="font-normal text-dash-textSub">Terminal</span></h1>
            <p className="text-dash-textSub mb-8 text-sm leading-relaxed">Secure data sync. Authenticate to access.</p>
            
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={loginWithGoogle}
              className="w-full py-4 px-6 bg-white text-slate-900 rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg transition-all"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
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

      <header className="sticky top-0 z-40 bg-dash-bg border-b border-[#2A2B2D] mb-6 md:mb-8 transition-all">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 md:h-20 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-[#181A1C] p-1.5 sm:p-2 rounded-lg border border-[#2A2B2D]">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-dash-green"></div>
            </div>
            <div className="truncate flex items-center">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white mb-0">
                <span className="font-normal text-dash-textMain mr-1 hidden sm:inline">Arbitra</span> 
                Terminal
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
            <button
              onClick={() => setShowDeveloperView(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all font-mono text-[11px] sm:text-xs"
              title="开发者视图 / Developer View"
            >
              <Cpu className="w-4 h-4" />
              <span className="hidden sm:inline font-semibold">开发者</span>
            </button>

            <motion.button 
              whileHover={{ scale: 1.05 }}

              whileTap={{ scale: 0.95 }}
              onClick={() => setIsDrawerOpen(true)} 
              className="hidden md:flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium bg-dash-green text-slate-900 hover:bg-[#3be589] transition-all"
            >
              <Activity className="w-4 h-4" /> New action
            </motion.button>

            {/* Mobile simplified AI button */}
            <motion.button 
              whileTap={{ scale: 0.90 }}
              onClick={() => setIsDrawerOpen(true)} 
              className="flex md:hidden items-center justify-center w-9 h-9 rounded-full bg-dash-green text-slate-900 hover:bg-[#3be589] transition-all"
            >
              <Activity className="w-5 h-5" />
            </motion.button>

            <div className="h-6 md:h-8 w-px bg-white/10"></div>

            <div className="flex items-center gap-3 group relative cursor-pointer">
               <img src={user.photoURL} alt="Profile" className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-transparent hover:border-dash-green transition-colors object-cover" />
               <div className="absolute right-0 top-10 md:top-12 scale-0 group-hover:scale-100 origin-top-right transition-all duration-200 bg-dash-card border border-[#2A2B2D] rounded-xl p-2 shadow-2xl z-50 w-48 sm:w-56">
                  <div className="px-3 py-2 border-b border-white/5 mb-2">
                    <p className="text-sm font-bold text-white truncate">{user.displayName}</p>
                    <p className="text-xs text-dash-textSub truncate">{user.email}</p>
                  </div>
                  <button onClick={() => setShowSettingsModal(true)} className="w-full flex items-center gap-2 text-dash-textSub hover:bg-white/5 p-2.5 rounded-lg text-sm font-medium transition-colors mb-1">
                    <Settings className="w-4 h-4" /> 设置中心 (Settings)
                  </button>
                  <button onClick={logout} className="w-full flex items-center gap-2 text-dash-textSub hover:bg-white/5 p-2.5 rounded-lg text-sm font-medium transition-colors">
                    <LogOut className="w-4 h-4" /> 退出登录 (LogOut)
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
          transition={{ duration: 0.5 }}
          className="glass-panel p-6 sm:p-8 relative overflow-hidden group mt-6 mb-6 md:mb-10"
        >
          <h2 className="relative z-10 flex items-center gap-2 text-dash-textSub text-sm font-medium mb-3 tracking-wide">
             <Activity className="w-4 h-4 text-dash-green"/> 战略概览 (Strategic Overview)
          </h2>
          <p className="relative z-10 text-white text-base sm:text-xl font-medium tracking-tight">
             {data.insights?.global || "Waiting for deep financial sync..."}
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-6 mb-8 md:mb-10"
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
      <div className="glass-panel p-6 md:p-8 mb-8">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2 tracking-tight">
          <User className="w-5 h-5 text-dash-textSub" /> 核心画像模型与诊断
        </h3>
        <p className="text-dash-textSub text-sm leading-relaxed mb-5">
          {data.userPersona?.description || "当前信息不足以建立高精度画像..."}
        </p>
        <div className="flex flex-wrap gap-2">
          {(data.userPersona?.tags || []).map((tag: string, idx: number) => (
             <span key={idx} className="bg-[#111315] text-dash-textMain px-3 py-1.5 rounded-full text-xs font-medium border border-[#2A2B2D]">
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
                 <div key={idx} className="bg-dash-bg border border-[#2A2B2D] rounded-xl p-5 sm:p-6 shrink-0">
                    <div className="font-semibold text-white mb-4 text-sm sm:text-base flex justify-between items-start">
                      {asset.name}
                    </div>
                    <div className="flex justify-between items-center text-xs sm:text-sm mb-2">
                       <span className="text-slate-400 font-mono">预估价值</span>
                       <span className="text-white font-mono font-medium">¥{(asset.marketValue ?? asset.value ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs sm:text-sm mb-3">
                       <span className="text-slate-400 font-mono">结余成本/负债</span>
                       <span className="text-rose-400 font-mono font-medium">¥{(asset.holdingCost ?? 0).toLocaleString()}</span>
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
         <div className="glass-panel p-5 sm:p-6 md:p-8 relative overflow-hidden group">
           <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
             短期战略 <span className="text-dash-textSub text-sm font-normal">(12 Months)</span>
           </h3>
           {(!data.lifeStrategiesShort || data.lifeStrategiesShort.length === 0) ? (
              <div className="text-dash-textSub text-xs sm:text-sm flex items-center justify-center h-24 border border-[#2A2B2D] rounded-xl bg-transparent font-mono">暂无数据</div>
           ) : (
              <div className="relative border-l border-[#2A2B2D] ml-4 space-y-10 my-4">
                {data.lifeStrategiesShort.map((item: any, idx: number) => {
                   const contentStr = encodeURIComponent(item.description || item.title || '');
                   const contentHash = btoa(contentStr).slice(0, 15);
                   const planKey = `short-${idx}-${contentHash}`;
                   const plan = nodePlans[planKey];
                   return (
                   <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }} key={idx} className="pl-6 sm:pl-8 relative group/item">
                      <div className="absolute w-2.5 h-2.5 bg-dash-green rounded-full -left-[5px] top-2" />
                      <div className="inline-block bg-[#111315] text-dash-textSub font-mono text-[10px] sm:text-xs px-2 sm:px-3 py-1 rounded-md mb-2 sm:mb-3 border border-[#2A2B2D]">
                        {item.timeNode}
                      </div>
                      <div className="flex justify-between items-start mb-2 sm:mb-3">
                         <h4 className="text-base sm:text-lg font-semibold text-white mb-0 pr-4">{item.title}</h4>
                         <button 
                           onClick={() => plan?.status === 'thinking' ? null : handleInlineNodePlan('短线策略', item, false, idx)}
                           disabled={plan?.status === 'thinking'}
                           className="shrink-0 text-[10px] sm:text-xs font-mono font-medium bg-[#111315] border border-[#2A2B2D] hover:border-dash-green text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
                         >
                           {plan?.status === 'thinking' ? <Loader2 className="w-3 h-3 animate-spin"/> : (plan?.status === 'done' ? <RefreshCw className="w-3 h-3" /> : <Activity className="w-3 h-3"/> )}
                           {plan?.status === 'thinking' ? '推演中...' : (plan?.status === 'done' ? '重新推演' : '深度推演')}
                         </button>
                      </div>
                      <p className="text-sm text-dash-textSub leading-relaxed">
                        {item.description}
                      </p>
                      {plan && (
                         <div className="mt-4 bg-[#111315] border border-[#2A2B2D] rounded-xl overflow-hidden text-xs sm:text-sm">
                            {plan.status === 'thinking' && (
                               <div className="flex items-center gap-2 px-3 py-2 text-dash-green font-mono text-[10px] sm:text-xs border-b border-[#2A2B2D]">
                                  <Cpu className="w-3 h-3 animate-pulse flex-shrink-0" />
                                  <span className="truncate opacity-90">{plan.thinking || 'Connecting...'}</span>
                               </div>
                            )}
                            {plan.result && (
                               <div className="p-4 sm:p-5 text-dash-textMain markdown-body">
                                  <Markdown>{plan.result}</Markdown>
                               </div>
                            )}
                         </div>
                      )}
                   </motion.div>
                )})}
              </div>
           )}
         </div>

         {/* 长线 */}
         <div className="glass-panel p-5 sm:p-6 md:p-8 relative overflow-hidden group">
           <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
             长期战略 <span className="text-dash-textSub text-sm font-normal">(10+ Years)</span>
           </h3>
           {(!data.lifeStrategiesLong || data.lifeStrategiesLong.length === 0) ? (
              <div className="text-dash-textSub text-xs sm:text-sm flex items-center justify-center h-24 border border-[#2A2B2D] rounded-xl bg-transparent font-mono">暂无数据</div>
           ) : (
              <div className="relative border-l border-[#2A2B2D] ml-4 space-y-10 my-4">
                {data.lifeStrategiesLong.map((item: any, idx: number) => {
                   const contentStr = encodeURIComponent(item.description || item.title || '');
                   const contentHash = btoa(contentStr).slice(0, 15);
                   const planKey = `long-${idx}-${contentHash}`;
                   const plan = nodePlans[planKey];
                   return (
                   <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }} key={idx} className="pl-6 sm:pl-8 relative group/item">
                      <div className="absolute w-2.5 h-2.5 bg-dash-green rounded-full -left-[5px] top-2" />
                      <div className="inline-block bg-[#111315] text-dash-textSub font-mono text-[10px] sm:text-xs px-2 sm:px-3 py-1 rounded-md mb-2 sm:mb-3 border border-[#2A2B2D]">
                        {item.timeNode}
                      </div>
                      <div className="flex justify-between items-start mb-2 sm:mb-3">
                         <h4 className="text-base sm:text-lg font-semibold text-white mb-0 pr-4">{item.title}</h4>
                         <button 
                           onClick={() => plan?.status === 'thinking' ? null : handleInlineNodePlan('长线策略', item, true, idx)}
                           disabled={plan?.status === 'thinking'}
                           className="shrink-0 text-[10px] sm:text-xs font-mono font-medium bg-[#111315] border border-[#2A2B2D] hover:border-dash-green text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
                         >
                           {plan?.status === 'thinking' ? <Loader2 className="w-3 h-3 animate-spin"/> : (plan?.status === 'done' ? <RefreshCw className="w-3 h-3" /> : <Activity className="w-3 h-3"/> )}
                           {plan?.status === 'thinking' ? '推演中...' : (plan?.status === 'done' ? '重新推演' : '深度推演')}
                         </button>
                      </div>
                      <p className="text-sm text-dash-textSub leading-relaxed">
                        {item.description}
                      </p>
                      {plan && (
                         <div className="mt-4 bg-[#111315] border border-[#2A2B2D] rounded-xl overflow-hidden text-xs sm:text-sm">
                            {plan.status === 'thinking' && (
                               <div className="flex items-center gap-2 px-3 py-2 text-dash-green font-mono text-[10px] sm:text-xs border-b border-[#2A2B2D]">
                                  <Cpu className="w-3 h-3 animate-pulse flex-shrink-0" />
                                  <span className="truncate opacity-90">{plan.thinking || '连接中...'}</span>
                               </div>
                            )}
                            {plan.result && (
                               <div className="p-4 sm:p-5 text-dash-textMain markdown-body">
                                  <Markdown>{plan.result}</Markdown>
                               </div>
                            )}
                         </div>
                      )}
                   </motion.div>
                )})}
              </div>
           )}
         </div>
      </div>

      {/* 底部目标追踪卡片 (Goal Tracker) */}
      {data.goal?.name && data.goal.name !== '等待设定目标' && (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-panel p-6 sm:p-8 relative overflow-hidden group mb-10"
      >
        <div className="relative z-10 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 sm:gap-8 mb-6 sm:mb-8">
          <div className="flex-1">
            <h3 className="text-xl sm:text-2xl font-semibold text-white break-words">{data.goal?.name || "战略目标"}</h3>
            <p className="text-xs sm:text-sm text-dash-textSub mt-2 font-mono break-all sm:break-normal">
              当前进度: <span className="text-white">¥{data.goal?.current?.toLocaleString() || 0}</span> / ¥{data.goal?.target?.toLocaleString() || 0}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-[10px] sm:text-xs text-dash-textSub uppercase mb-1 tracking-widest">达成指数</div>
            <div className={`text-4xl sm:text-5xl font-bold tabular-nums tracking-tighter ${data.goal?.index >= 1 ? 'text-dash-green' : 'text-white'}`}>
              {data.goal?.index?.toFixed(2) || "0.00"}
            </div>
          </div>
        </div>
        <div className="w-full h-4 sm:h-5 bg-[#111315] rounded-full relative overflow-hidden border border-[#2A2B2D]">
          <div className={`h-full relative z-10 transition-all duration-1000 ${data.goal?.index >= 1 ? 'bg-dash-green' : 'bg-dash-green opacity-80'}`} style={{ width: `${goalPercent}%` }}>
          </div>
        </div>
      </motion.div>
      )}
      </main>

      {/* Confirm Clear Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 shadow-[0_0_40px_rgba(244,63,94,0.15)] rounded-2xl w-full max-w-md overflow-hidden relative p-6">
            <h3 className="text-xl font-bold text-rose-500 mb-2">🚨 高危操作警告</h3>
            <p className="text-dash-textSub mb-6 text-sm leading-relaxed">
              此操作将彻底抹除当前账户的所有AI推演进度与资产切片记录，无法恢复。是否继续？
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-slate-800 text-dash-textMain rounded-lg font-medium hover:bg-slate-700 transition"
              >
                取消
              </button>
              <button 
                onClick={confirmClearData}
                className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-500 transition shadow-[0_0_15px_rgba(244,63,94,0.3)]"
              >
                确认清空
              </button>
            </div>
          </div>
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
