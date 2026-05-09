import { useState, useRef, useEffect } from 'react';
import { getDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getSettings } from '../lib/settings';
import { Attachment } from '../App';

export function useAiAgent({ user, data, commitData, setSduiState, setIsSynthesizing }: any) {
  const [inputMsg, setInputMsg] = useState('');
  const [syncProfile, setSyncProfile] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isChatLoaded = useRef(false);

  const [chatHistory, setChatHistory] = useState<{ user: string, ai: string, attachments: Attachment[], thinking?: string, isThinkingExpanded?: boolean, hasMemoryUpdate?: boolean, _liveSources?: string[], timeTaken?: number }[]>([]);

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
     } else {
        isChatLoaded.current = false;
        setChatHistory([]);
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
                    data: att.data.length > 100000 ? "" : att.data,
                    isTruncated: att.data.length > 100000
               })) || [];
               Object.keys(newC).forEach(key => (newC as any)[key] === undefined && delete (newC as any)[key]);
               return newC;
           });
           setDoc(doc(db, "userProfiles", user.uid), { chatHistory: chatToSync }, { merge: true }).catch(e => console.error("Failed to save chat to firestore:", e));
       }, 2000);
       return () => clearTimeout(timeoutId);
    }
  }, [chatHistory, user?.uid]);
  
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
    const startTime = Date.now();
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
      // 1. Gather Context from BFF & Strip heavy data
      const stripHeavyData = (obj: any): any => {
         if (!obj || typeof obj !== 'object') return obj;
         if (Array.isArray(obj)) return obj.map(stripHeavyData);
         const newObj: any = {};
         for (const key in obj) {
            if (key === 'chartOptions' || (typeof obj[key] === 'string' && obj[key].startsWith('data:image/'))) {
               newObj[key] = '[Stripped for Agent Payload]';
            } else {
               newObj[key] = stripHeavyData(obj[key]);
            }
         }
         return newObj;
      };
      
      const cleanedContextData = stripHeavyData(data);

      const contextRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
           message: userMsg,
           history: chatHistory.map(c => ({ user: c.user, ai: c.ai })),
           contextData: cleanedContextData,
           settings: getSettings(),
           userId: user?.uid,
           customApiKey: localStorage.getItem('custom_gemini_api_key') || undefined,
           attachments: attsToSend,
           skipMemoryUpdate: !syncProfile
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
      let streamedAi = "";
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
                            newHist[newHist.length - 1].isThinkingExpanded = false;
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
                      if (parsed.data.updatedProfile && Object.keys(parsed.data.updatedProfile).length > 0) {
                          setChatHistory(prev => {
                             const newHist = [...prev];
                             newHist[newHist.length - 1].hasMemoryUpdate = true;
                             return newHist;
                          });
                      }
                   } else if (parsed.type === 'result') {
                      bffData = parsed.data;
                   } else if (parsed.type === 'summary_chunk') {
                      streamedAi += parsed.text;
                      let displayText = streamedAi;
                      const jsonMatch = streamedAi.indexOf('```json');
                      if (jsonMatch !== -1) {
                         displayText = streamedAi.substring(0, jsonMatch).trim();
                      }
                      setChatHistory(prev => {
                         const newHist = [...prev];
                         newHist[newHist.length - 1].ai = displayText;
                         return newHist;
                      });
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
      if (bffData.updatedProfile && Object.keys(bffData.updatedProfile).length > 0 && syncProfile) {
          try {
              if (user?.uid) {
                  await setDoc(doc(db, "userProfiles", user.uid), { userProfile: bffData.updatedProfile }, { merge: true });
                  commitData((prev: any) => ({ ...prev, userProfile: bffData.updatedProfile }));
              }
          } catch(e) {
              console.error("Failed to commit profile updates:", e);
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
      
      // 3. 全量 JSON 解析 (仅在收到最终 result 后执行)
      const txt = streamedAi || bffData.expertAnalysis?.['综合统筹结论'] || "";

      let sduiPayload: any = null;
      try {
        let cleanedTxt = txt;
        const jsonMatch = txt.match(/```(?:json)?\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
           cleanedTxt = jsonMatch[1];
        } else {
           cleanedTxt = txt.replace(/```(?:json)?\n?/gi, '').replace(/```\n?/g, '').trim();
        }
        
        const startIdx = cleanedTxt.indexOf('{');
        const endIdx = cleanedTxt.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1) {
           sduiPayload = JSON.parse(cleanedTxt.substring(startIdx, endIdx + 1));
        }
      } catch(e) { 
        console.error("Parse SDUI error:", e); 
      }

      setChatHistory(prev => {
        const newHist = [...prev];
        const displayAi = txt.substring(0, txt.indexOf('```json') !== -1 ? txt.indexOf('```json') : txt.length).trim();
        newHist[newHist.length - 1].ai = displayAi || (sduiPayload ? "SDUI 状态已更新" : `JSON 解析失败: \n${txt}`);
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
      const endTime = Date.now();
      const diff = endTime - startTime;
      setChatHistory(prev => {
        const newHist = [...prev];
        if (newHist.length > 0) {
           newHist[newHist.length - 1].timeTaken = diff;
        }
        return newHist;
      });
      setIsLoading(false);
      setIsSynthesizing?.(false);
      abortControllerRef.current = null;
    }
  };

  return {
    inputMsg,
    setInputMsg,
    syncProfile,
    setSyncProfile,
    isLoading,
    attachments,
    setAttachments,
    chatHistory,
    setChatHistory,
    handleStop,
    handleRegenerate,
    handleAiSubmit,
  };
}
