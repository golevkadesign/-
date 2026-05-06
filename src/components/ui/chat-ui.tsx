import React, { useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Send, FileText, Bot, User as UserIcon, Loader2, Activity, ChevronDown, Sparkles, StopCircle, Check, Copy, RefreshCw, MessageSquare, X, Mic, Maximize2 } from 'lucide-react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

export function ChatList({ messages, isTyping, onRegenerate, onQuickPrompt }: { messages: any[], isTyping: boolean, onRegenerate?: () => void, onQuickPrompt?: (p: string) => void }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const [expandedThinking, setExpandedThinking] = React.useState<Record<number, boolean>>({});
  const [expandedUserMsg, setExpandedUserMsg] = React.useState<Record<number, boolean>>({});
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);
  const [fullScreenCode, setFullScreenCode] = React.useState<{ code: string, language: string } | null>(null);
  
  const isAtBottomRef = React.useRef(true);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 150;
    }
  };

  React.useEffect(() => {
    if (chatEndRef.current && (isAtBottomRef.current || messages.length <= 1)) {
      chatEndRef.current.scrollIntoView({ behavior: isTyping ? 'auto' : 'smooth', block: 'end' });
    }
  }, [messages, isTyping]);

  const quickPrompts = [
    "解析我的核心开支并在大盘中找出现金流最优打法",
    "利用我的现有被动收入做二次风险对冲",
    "提供未来一年基于当前行情的防御型资产配置计划",
    "审查我的非公开投资并给出清退或加码建议"
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-10 custom-scroll pb-40 sm:pb-48" ref={containerRef} onScroll={handleScroll}>
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-10 px-4">
          <Bot className="w-12 h-12 mb-6 text-dash-textSub" />
          <p className="text-sm font-mono tracking-widest mb-8 text-dash-textSub">INITIALIZE INTELLIGENCE PROMPT...</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => onQuickPrompt?.(prompt)}
                className="text-left p-4 rounded-xl border border-[#2A2B2D] hover:border-dash-textSub bg-[#111315] transition-all text-sm flex items-start gap-3 group"
              >
                <MessageSquare className="w-4 h-4 text-dash-textSub mt-0.5 flex-shrink-0 transition-colors" />
                <span className="text-slate-300 group-hover:text-dash-textMain transition-colors">{prompt}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        messages.map((msg, i) => (
          <div key={i} className={cn("flex w-full items-start gap-3 sm:gap-4 transition-all duration-300 relative", msg.role === 'user' ? "justify-end" : "justify-start")}>
            {msg.role !== 'user' && (
               <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-dash-gold to-yellow-200 flex flex-shrink-0 items-center justify-center shadow-lg transform -translate-y-1">
                 <Bot className="w-5 h-5 text-slate-900" />
               </div>
            )}
            <div className={cn(
              "relative group",
              msg.role === 'user' 
                ? "bg-[#EEF0F2] text-slate-900 rounded-3xl rounded-tr-sm px-5 py-4 font-medium max-w-[85%] shadow-sm" 
                : "bg-transparent text-dash-textMain w-full max-w-[90%] sm:max-w-[85%] pl-1"
            )}>
              {/* Render User Attachments */}
              {msg.role === 'user' && msg.attachments && msg.attachments.length > 0 && (
                 <div className="flex flex-wrap gap-2 mb-3">
                    {msg.attachments.map((att: any, attIdx: number) => (
                       <div key={attIdx} className="relative shadow-sm rounded-xl overflow-hidden border border-black/10">
                          {att.mimeType.startsWith('image/') ? (
                             <img src={`data:${att.mimeType};base64,${att.data}`} alt="attachment" className="w-24 h-24 sm:w-32 sm:h-32 object-cover hover:scale-105 transition-transform" />
                          ) : (
                             <div className="w-24 h-24 sm:w-32 sm:h-32 bg-slate-200/50 flex flex-col items-center justify-center p-3 text-[10px] text-slate-600 font-sans text-center font-medium">
                                <FileText className="w-6 h-6 mb-2" />
                                <span className="truncate w-full">{att.name}</span>
                             </div>
                          )}
                       </div>
                    ))}
                 </div>
              )}

              {/* Render Thinking block */}
               {msg.thinking && (
                 <div className="mb-6 border border-[#2A2B2D] bg-[#1A1D21] rounded-2xl text-xs overflow-hidden shadow-sm">
                    <button onClick={() => {
                        setExpandedThinking(prev => ({ ...prev, [i]: prev[i] === undefined ? false : !prev[i] }))
                    }} className="w-full flex items-center justify-between p-3 sm:p-4 text-dash-textSub hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-2.5">
                          {isTyping && i === messages.length - 1 && !msg.content ? (
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                              <Sparkles className="w-4 h-4 text-dash-gold" />
                            </motion.div>
                          ) : <Check className="w-4 h-4 text-dash-green" />}
                          <span className="font-sans font-semibold tracking-wide text-sm">{isTyping && i === messages.length - 1 && !msg.content ? '调度中...' : '运行日志与数据'}</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${expandedThinking[i] !== false ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {expandedThinking[i] !== false && (
                         <motion.div 
                           initial={{ height: 0, opacity: 0 }}
                           animate={{ height: "auto", opacity: 1 }}
                           exit={{ height: 0, opacity: 0 }}
                           className="border-t border-[#2A2B2D] text-slate-400 font-sans leading-relaxed whitespace-pre-wrap bg-[#15171A]"
                         >
                            <div className="p-4 sm:p-5">{msg.thinking}</div>
                         </motion.div>
                      )}
                    </AnimatePresence>
                 </div>
              )}

              {/* Msg Content */}
               {msg.role !== 'user' ? (
                 (!msg.content && isTyping && i === messages.length - 1) ? (
                    <div className="flex items-center gap-3 text-dash-textSub font-sans text-sm py-2">
                       <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                         <Loader2 className="w-4 h-4 text-dash-gold" />
                       </motion.div>
                       生成中...
                    </div>
                 ) : (
                    <div className="text-[15px] sm:text-[16px] leading-[1.75] ai-message break-words w-full space-y-4">
                       <Markdown
                         components={{
                           p: ({node, children}) => (
                             <motion.p 
                               initial={{ opacity: 0, y: 10 }} 
                               animate={{ opacity: 1, y: 0 }} 
                               transition={{ ease: [0.4, 0, 0.2, 1], duration: 0.4 }} 
                               className="mb-4 text-slate-200" 
                             >
                               {children}
                             </motion.p>
                           ),
                           li: ({node, children}) => (
                             <motion.li
                               initial={{ opacity: 0, x: -10 }} 
                               animate={{ opacity: 1, x: 0 }} 
                               transition={{ ease: [0.4, 0, 0.2, 1], duration: 0.4 }} 
                               className="mb-1"
                             >
                               {children}
                             </motion.li>
                           ),
                           code: ({node, inline, className, children, ...props}: any) => {
                             const match = /language-(\w+)/.exec(className || '');
                             const codeString = String(children).replace(/\n$/, '');
                             return !inline ? (
                               <motion.div 
                                 initial={{ opacity: 0, y: 10 }} 
                                 animate={{ opacity: 1, y: 0 }} 
                                 className="relative group/code my-6 rounded-2xl bg-[#0B0D0F] border border-white/10 overflow-hidden shadow-xl"
                               >
                                 <div className="flex items-center justify-between px-4 py-2.5 bg-[#1A1D21] border-b border-white/5">
                                   <span className="text-xs font-mono font-medium text-slate-400">{match?.[1] || 'Code'}</span>
                                   <div className="flex gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
                                       <button onClick={() => {
                                           navigator.clipboard.writeText(codeString);
                                           handleCopy(codeString, parseInt(`${i}99`));
                                       }} className="text-slate-400 hover:text-white p-1.5 rounded-md hover:bg-white/10 transition-colors">
                                           {copiedIndex === parseInt(`${i}99`) ? <Check className="w-3.5 h-3.5 text-dash-green" /> : <Copy className="w-3.5 h-3.5" />}
                                       </button>
                                       <button onClick={() => setFullScreenCode({ code: codeString, language: match?.[1] || 'Code' })} className="text-slate-400 hover:text-white p-1.5 rounded-md hover:bg-white/10 transition-colors hidden sm:block">
                                           <Maximize2 className="w-3.5 h-3.5" />
                                       </button>
                                   </div>
                                 </div>
                                 <pre className="p-4 sm:p-5 overflow-x-auto text-[13px] sm:text-[14px] font-mono text-slate-300 leading-relaxed custom-scroll">
                                   <code className={className} {...props}>{children}</code>
                                 </pre>
                               </motion.div>
                             ) : (
                               <code className="bg-white/10 text-dash-gold px-1.5 py-0.5 rounded-md text-[0.9em] font-mono whitespace-pre-wrap" {...props}>{children}</code>
                             );
                           }
                         }}
                       >{msg.content}</Markdown>
                       {msg.content && (
                           <div className="mt-8 pt-4 border-t border-[#2A2B2D]/50 flex flex-col gap-3">
                             {/* Explainable Output Summary */}
                             <div className="flex flex-wrap gap-2">
                               {msg._liveSources?.includes('longbridge') && (
                                 <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono uppercase font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                   <Activity className="w-3 h-3" /> Live Data (Longbridge)
                                 </span>
                               )}
                               {msg.hasMemoryUpdate && (
                                 <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-sans font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                   <UserIcon className="w-3 h-3" /> Profile Memory Updated
                                 </span>
                               )}
                             </div>

                             <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button onClick={() => handleCopy(msg.content, i)} className="flex items-center gap-1.5 text-[12px] font-medium text-dash-textSub hover:text-white transition-colors p-2 rounded-lg hover:bg-[#1A1D21]">
                                 {copiedIndex === i ? <Check className="w-3.5 h-3.5 text-dash-green" /> : <Copy className="w-3.5 h-3.5" />}
                                 {copiedIndex === i ? <span className="text-dash-green">已复制</span> : '复制'}
                               </button>
                               {i === messages.length - 1 && onRegenerate && (
                                 <button onClick={onRegenerate} className="flex items-center gap-1.5 text-[12px] font-medium text-dash-textSub hover:text-white transition-colors p-2 rounded-lg hover:bg-[#1A1D21]">
                                   <RefreshCw className="w-3.5 h-3.5" /> 重算 (Regenerate)
                                 </button>
                               )}
                             </div>
                           </div>
                       )}
                    </div>
                 )
              ) : (
                 msg.content.length > 500 ? (
                    <div className="text-[15px] sm:text-[16px] leading-relaxed break-words text-slate-800">
                       <div className={cn("whitespace-pre-wrap", expandedUserMsg[i] ? "" : "line-clamp-6")}>
                          {msg.content}
                       </div>
                       <button 
                         onClick={() => setExpandedUserMsg(prev => ({ ...prev, [i]: !prev[i] }))} 
                         className="text-xs text-dash-green hover:text-green-600 mt-2 font-bold w-full text-left transition-colors"
                       >
                          {expandedUserMsg[i] ? "收起" : "展开"}
                       </button>
                    </div>
                 ) : (
                    <div className="text-[15px] sm:text-[16px] leading-relaxed whitespace-pre-wrap break-words text-slate-800">{msg.content}</div>
                 )
              )}
            </div>
          </div>
        ))
      )}
      <div ref={chatEndRef} className="h-4" />

      {/* Fullscreen Code Modal */}
      <AnimatePresence>
        {fullScreenCode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#0B0D0F]/90 backdrop-blur-md flex flex-col pt-4 sm:pt-10 px-0 sm:px-10 pb-0"
          >
             <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col bg-[#111315] border border-[#2A2B2D] sm:rounded-t-3xl overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2B2D] bg-[#15171A]">
                   <span className="text-sm font-mono font-bold text-dash-gold">{fullScreenCode.language}</span>
                   <div className="flex items-center gap-2">
                      <button onClick={() => {
                        navigator.clipboard.writeText(fullScreenCode.code);
                        handleCopy(fullScreenCode.code, -1);
                      }} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors">
                        {copiedIndex === -1 ? <Check className="w-3.5 h-3.5 text-dash-green" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedIndex === -1 ? '已复制 (Copied)' : '复制 (Copy)'}
                      </button>
                      <button onClick={() => setFullScreenCode(null)} className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded-lg border border-rose-500/20 hover:bg-rose-500/10 transition-colors ml-2">
                        <X className="w-4 h-4" /> 关闭 (Close)
                      </button>
                   </div>
                </div>
                <div className="flex-1 overflow-auto p-6 bg-[#0B0D0F]">
                   <pre className="text-sm font-mono text-slate-300 leading-relaxed break-words whitespace-pre-wrap">
                      <code>{fullScreenCode.code}</code>
                   </pre>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ChatInput({ input, handleInputChange, handleSubmit, isLoading, onKeyDown, onStop, onPaste, hasAttachments = false }: any) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`; // Adjust height, max 200px
    }
  }, [input]);

  const handleCustomKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow new line
        return;
      } else {
        // Prevent default newline and submit
        e.preventDefault();
        if ((input.trim() || hasAttachments) && !isLoading) {
          handleSubmit(e);
        }
      }
    }
    if (onKeyDown) onKeyDown(e);
  };

  return (
    <form onSubmit={handleSubmit} className="relative group w-full flex items-end gap-2 bg-[#1A1D21]/80 backdrop-blur-md border border-[#33373D] rounded-3xl p-1.5 sm:p-2 transition-colors focus-within:border-dash-textSub shadow-sm">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleCustomKeyDown}
        onPaste={onPaste}
        placeholder="发送消息..."
        rows={1}
        className="flex-1 bg-transparent border-none py-2.5 px-3 text-[15px] text-white placeholder:text-slate-500 focus:outline-none resize-none custom-scroll h-auto leading-relaxed"
        style={{ minHeight: '44px', maxHeight: '200px' }}
      />
      <div className="flex self-end mb-[2px] sm:mb-1 mr-[2px] sm:mr-1">
        <AnimatePresence mode="popLayout">
          {isLoading ? (
            <motion.button
              key="stop"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ ease: [0.4, 0, 0.2, 1], duration: 0.2 }}
              type="button"
              onClick={onStop}
              className="w-10 h-10 sm:w-11 sm:h-11 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-95"
              title="Stop Generation"
            >
              <StopCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            </motion.button>
          ) : (input.trim() || hasAttachments) ? (
            <motion.button
              key="send"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ ease: [0.4, 0, 0.2, 1], duration: 0.2 }}
              type="submit"
              className="w-10 h-10 sm:w-11 sm:h-11 bg-white text-black hover:bg-gray-200 rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-95"
            >
              <Send className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5" />
            </motion.button>
          ) : (
            <motion.button
              key="voice"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ ease: [0.4, 0, 0.2, 1], duration: 0.2 }}
              type="button"
              className="w-10 h-10 sm:w-11 sm:h-11 bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-2xl flex items-center justify-center transition-all active:scale-95"
              title="Voice Input (Coming soon)"
            >
              <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}
