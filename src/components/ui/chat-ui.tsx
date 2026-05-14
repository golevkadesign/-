import React, { useRef, useEffect, useMemo, useState } from 'react';
import { cn } from '../../lib/utils';
import { Send, FileText, Bot, User as UserIcon, Loader2, Activity, ChevronDown, Sparkles, StopCircle, Check, Copy, RefreshCw, MessageSquare, X, Mic, Maximize2, Cpu, Download } from 'lucide-react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

const CodeBlock = React.memo(({ inline, className, children, setFullScreenCode, isBlock }: any) => {
  const match = /language-(\w+)/.exec(className || '');
  const codeString = String(children).replace(/\n$/, '');
  const [copied, setCopied] = useState(false);

  if (!isBlock) {
    return <code className="bg-dash-surface-hover text-dash-primary font-semibold px-2 py-1 rounded-[6px] border border-dash-subtle text-[0.85em] font-mono whitespace-pre-wrap tracking-wide">{children}</code>;
  }

  return (
    <div className="relative group/code my-6 rounded-[20px] bg-dash-surface border border-dash-subtle overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-5 py-3 bg-dash-surface-hover border-b border-dash-subtle">
        <span className="text-xs font-mono font-semibold uppercase tracking-widest text-dash-tertiary">{match?.[1] || 'Code'}</span>
        <div className="flex gap-1.5 opacity-70 hover:opacity-100 transition-opacity">
            <button onClick={() => {
                navigator.clipboard.writeText(codeString);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }} className="text-dash-tertiary hover:text-dash-primary p-2 rounded-lg hover:bg-dash-subtle transition-colors">
                {copied ? <Check className="w-4 h-4 text-dash-green" /> : <Copy className="w-4 h-4" />}
            </button>
            <button onClick={() => setFullScreenCode({ code: codeString, language: match?.[1] || 'Code' })} className="text-dash-tertiary hover:text-dash-primary p-2 rounded-lg hover:bg-dash-subtle transition-colors hidden sm:block">
                <Maximize2 className="w-4 h-4" />
            </button>
        </div>
      </div>
      <pre className="p-5 sm:p-6 overflow-x-auto text-[13px] sm:text-[14px] font-mono text-dash-primary leading-relaxed custom-scroll">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
});

const PComponent = React.memo(({ children }: any) => <div className="mb-4 text-dash-secondary">{children}</div>);
const LiComponent = React.memo(({ children }: any) => <li className="mb-1 text-dash-secondary">{children}</li>);
const StrongComponent = React.memo(({ children }: any) => <strong className="font-bold text-dash-primary">{children}</strong>);

const LiveTimer = () => {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed(Date.now() - start);
    }, 100);
    return () => clearInterval(interval);
  }, []);
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-semibold bg-white/5 text-dash-tertiary border border-white/10">
      <Cpu className="w-3.5 h-3.5 animate-pulse text-emerald-400" /> { (elapsed / 1000).toFixed(1) }s 耗时
    </span>
  );
};

export const ChatList = React.memo(function ChatList({ messages, isTyping, onRegenerate, onQuickPrompt }: { messages: any[], isTyping: boolean, onRegenerate?: () => void, onQuickPrompt?: (p: string) => void }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const [expandedThinking, setExpandedThinking] = React.useState<Record<number, boolean>>({});
  const [expandedUserMsg, setExpandedUserMsg] = React.useState<Record<number, boolean>>({});
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);
  const [fullScreenCode, setFullScreenCode] = React.useState<{ code: string, language: string } | null>(null);
  
  React.useEffect(() => {
    if (!isTyping && messages.length > 0) {
      // 自动折叠最后一条消息的思考过程
      setExpandedThinking(prev => ({ ...prev, [messages.length - 1]: false }));
    }
  }, [isTyping, messages.length]);

  const isAtBottomRef = React.useRef(true);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const markdownComponents = useMemo(() => ({
    p: PComponent,
    li: LiComponent,
    strong: StrongComponent,
    pre: ({ children }: any) => {
      if (React.isValidElement(children)) {
        return React.cloneElement(children, { isBlock: true } as any);
      }
      return <>{children}</>;
    },
    code: (props: any) => <CodeBlock {...props} setFullScreenCode={setFullScreenCode} />
  }), [setFullScreenCode]);

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
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-10 custom-scroll pb-40 sm:pb-48" ref={containerRef} onScroll={handleScroll}>
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center opacity-70 py-10 px-4">
          <Bot className="w-12 h-12 mb-6 text-dash-tertiary" />
          <p className="text-xs font-mono tracking-[0.2em] mb-10 text-dash-tertiary uppercase font-semibold">Initialize Intelligence Prompt...</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => onQuickPrompt?.(prompt)}
                className="text-left p-5 rounded-2xl border border-dash-subtle hover:border-dash-primary/30 hover:bg-dash-surface hover:shadow-lg transition-all text-sm flex items-start gap-3 group backdrop-blur-md"
              >
                <MessageSquare className="w-5 h-5 text-dash-tertiary mt-0.5 flex-shrink-0 group-hover:text-dash-gold transition-colors" />
                <span className="text-dash-secondary group-hover:text-dash-primary transition-colors font-medium tracking-tight leading-relaxed">{prompt}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        messages.map((msg, i) => {
          if (msg.role === 'user') {
            return (
              <div key={i} className="flex w-full items-start gap-4 sm:gap-5 transition-all duration-300 relative justify-end">
                <div className="relative group bg-[#15171A] text-dash-primary rounded-[24px] rounded-tr-[4px] px-6 py-4 font-medium max-w-[85%] shadow-sm border border-white/5">
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {msg.attachments.map((att: any, attIdx: number) => (
                          <div key={attIdx} className="relative shadow-sm rounded-[16px] overflow-hidden border border-white/5 bg-dash-surface">
                              {att.mimeType?.startsWith('image/') ? (
                                <img src={att.url || `data:${att.mimeType};base64,${att.data}`} alt="attachment" className="w-20 h-20 object-cover hover:scale-105 transition-transform" />
                              ) : (
                                <div className="w-20 h-20 bg-white/5 flex flex-col items-center justify-center p-2 text-[10px] text-dash-secondary font-sans text-center font-medium">
                                    <FileText className="w-6 h-6 mb-1 text-dash-tertiary" />
                                    <span className="truncate w-full">{att.name}</span>
                                </div>
                              )}
                          </div>
                        ))}
                    </div>
                  )}
                  {msg.content.length > 500 ? (
                      <div className="text-[15px] sm:text-[16px] leading-[1.8] break-words text-dash-primary font-medium tracking-tight">
                        <motion.div layout className="relative">
                          <div className={cn("overflow-hidden transition-all duration-300", expandedUserMsg[i] ? "max-h-[5000px]" : "max-h-[150px]")}>
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                          </div>
                          {!expandedUserMsg[i] && (
                            <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-[#15171A] to-transparent pointer-events-none" />
                          )}
                        </motion.div>
                        <button 
                          onClick={() => setExpandedUserMsg(prev => ({ ...prev, [i]: !prev[i] }))} 
                          className="text-[11px] text-dash-tertiary hover:text-dash-primary mt-3 font-semibold uppercase tracking-widest w-full text-left transition-colors"
                        >
                            {expandedUserMsg[i] ? "收起 (Collapse)" : "展开 (Expand)"}
                        </button>
                      </div>
                  ) : (
                      <div className="text-[15px] sm:text-[16px] leading-[1.8] whitespace-pre-wrap break-words text-dash-primary font-medium tracking-tight">{msg.content}</div>
                  )}
                </div>
              </div>
            );
          } else {
            return (
              <div key={i} className="flex flex-col w-full items-start gap-3 transition-all duration-300 relative justify-start max-w-[95%]">
                {/* Thinking Section - Centered or Top-Aligned? Top-aligned to the card */}
                {msg.thinking && (
                  <div className="ml-0 sm:ml-16 mb-1 max-w-[85%]">
                    <div className="rounded-2xl overflow-hidden backdrop-blur-md bg-[#13151A]/80 border border-dash-subtle/50 text-xs shadow-sm">
                        <button onClick={() => {
                            setExpandedThinking(prev => ({ ...prev, [i]: prev[i] === undefined ? false : !prev[i] }))
                        }} className="w-full flex items-center justify-between py-2.5 px-4 text-dash-tertiary hover:text-dash-secondary hover:bg-white/5 transition-colors border-b border-transparent data-[expanded=true]:border-dash-subtle" data-expanded={expandedThinking[i] !== false}>
                            <div className="flex items-center gap-2">
                              {isTyping && i === messages.length - 1 && !msg.content ? (
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                                  <Cpu className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                                </motion.div>
                              ) : <RefreshCw className="w-3.5 h-3.5 text-dash-tertiary" />}
                              <span className="font-mono tracking-widest uppercase font-semibold text-[10px] sm:text-[11px] text-dash-secondary">{isTyping && i === messages.length - 1 && !msg.content ? '调度中...' : '运行日志与数据'}</span>
                            </div>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${expandedThinking[i] !== false ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {expandedThinking[i] !== false && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="text-dash-tertiary font-mono text-[10px] sm:text-[11px] leading-relaxed whitespace-pre-wrap bg-[#101216] border-t border-dash-subtle/50"
                              >
                                <div className="p-4 sm:p-5 border-l-2 border-emerald-500/20 ml-2 my-2">{msg.thinking}</div>
                              </motion.div>
                          )}
                        </AnimatePresence>
                    </div>
                  </div>
                )}
                
                <div className="flex items-start w-full gap-4 sm:gap-5">
                  <div className="w-10 h-10 rounded-xl bg-[#13151A] border border-white/5 flex flex-shrink-0 items-center justify-center shadow-lg mt-1">
                    <Sparkles className="w-5 h-5 text-emerald-400 ml-[1px]" />
                  </div>
                  
                  <div className="flex-1 max-w-[85%] bg-[#13151A] border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] rounded-[24px] rounded-tl-[4px] px-6 py-5">
                    {(!msg.content && isTyping && i === messages.length - 1) ? (
                        <div className="flex items-center gap-3 text-dash-tertiary font-sans text-sm py-1 font-semibold tracking-wide">
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                            <Loader2 className="w-4 h-4 text-emerald-400" />
                          </motion.div>
                          生成中...
                        </div>
                    ) : (
                        <div className="text-[14px] leading-[22px] ai-message break-words w-full space-y-4 text-dash-primary" style={{ fontFamily: 'Roboto' }}>
                          <Markdown components={markdownComponents}>
                            {msg.content}
                          </Markdown>
                       {msg.content && (
                           <div className="mt-8 pt-4 border-t border-white/5 flex flex-col gap-3">
                             {/* Explainable Output Summary */}
                             <div className="flex flex-wrap gap-2">
                               {msg._liveSources?.includes('longbridge') && (
                                 <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                   <Activity className="w-3.5 h-3.5" /> Live Data (Longbridge)
                                 </span>
                               )}
                               {msg.hasMemoryUpdate && (
                                 <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                   <UserIcon className="w-3.5 h-3.5" /> Profile Memory Updated
                                 </span>
                               )}
                               {(isTyping && i === messages.length - 1 && msg.timeTaken === undefined) ? (
                                 <LiveTimer />
                               ) : msg.timeTaken !== undefined ? (
                                 <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-semibold bg-white/5 text-dash-tertiary border border-white/10">
                                   <Cpu className="w-3.5 h-3.5" /> { (msg.timeTaken / 1000).toFixed(1) }s 耗时
                                 </span>
                               ) : null}
                             </div>

                             <div className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity mt-2">
                               <button onClick={() => handleCopy(msg.content, i)} className="flex items-center gap-1.5 text-xs text-dash-tertiary hover:text-dash-secondary transition-colors px-2 py-1 -ml-2 rounded-lg hover:bg-white/5 uppercase tracking-wide">
                                 {copiedIndex === i ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                 {copiedIndex === i ? <span className="text-emerald-400">已复制</span> : '复制'}
                               </button>
                               {i === messages.length - 1 && onRegenerate && (
                                 <button onClick={onRegenerate} className="flex items-center gap-1.5 text-xs text-dash-tertiary hover:text-dash-secondary transition-colors px-2 py-1 rounded-lg hover:bg-white/5 uppercase tracking-wide">
                                   <RefreshCw className="w-3.5 h-3.5" /> 重算 (Regenerate)
                                 </button>
                               )}
                               {msg.debugData && (
                                 <button onClick={() => {
                                     const blob = new Blob([JSON.stringify(msg.debugData, null, 2)], { type: 'application/json' });
                                     const url = URL.createObjectURL(blob);
                                     const a = document.createElement('a');
                                     a.href = url;
                                     a.download = `terminal-node-data-${Date.now()}.json`;
                                     a.click();
                                     URL.revokeObjectURL(url);
                                 }} className="flex items-center gap-1.5 text-xs text-dash-tertiary hover:text-dash-secondary transition-colors px-2 py-1 rounded-lg hover:bg-white/5 uppercase tracking-wide">
                                     <Download className="w-3.5 h-3.5" /> 下载节点数据 (JSON)
                                 </button>
                               )}
                             </div>
                           </div>
                       )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }
      })
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
             <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col bg-dash-bg border border-dash-subtle sm:rounded-t-3xl overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-dash-subtle bg-dash-surface">
                   <span className="text-sm font-mono font-bold text-dash-secondary uppercase tracking-widest">{fullScreenCode.language}</span>
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
});

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
    <form onSubmit={handleSubmit} className="relative group w-full flex items-end gap-2 bg-dash-surface-hover/80 backdrop-blur-xl border border-dash-subtle rounded-[24px] p-2 transition-all focus-within:border-dash-primary/30 focus-within:ring-4 focus-within:ring-dash-primary/5 shadow-sm">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleCustomKeyDown}
        onPaste={onPaste}
        placeholder="发送消息..."
        rows={1}
        className="flex-1 bg-transparent border-none py-3 px-4 text-[15px] text-dash-primary placeholder:text-dash-tertiary focus:outline-none resize-none custom-scroll h-auto leading-relaxed"
        style={{ minHeight: '48px', maxHeight: '200px' }}
      />
      <div className="flex self-end mb-1 mr-1">
        <AnimatePresence mode="popLayout">
          {isLoading ? (
            <motion.button
              key="stop"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              type="button"
              onClick={onStop}
              className="w-10 h-10 sm:w-11 sm:h-11 bg-dash-surface text-dash-secondary hover:text-dash-red hover:bg-dash-red/10 rounded-xl flex items-center justify-center transition-colors shadow-sm active:scale-95 border border-dash-subtle"
              title="Stop Generation"
            >
              <StopCircle className="w-5 h-5" />
            </motion.button>
          ) : (input.trim() || hasAttachments) ? (
            <motion.button
              key="send"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              type="submit"
              className="w-10 h-10 sm:w-11 sm:h-11 bg-dash-primary text-dash-base hover:bg-white rounded-xl flex items-center justify-center transition-colors shadow-sm active:scale-95"
            >
              <Send className="w-5 h-5 ml-0.5" />
            </motion.button>
          ) : (
            <motion.button
              key="voice"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              type="button"
              className="w-10 h-10 sm:w-11 sm:h-11 bg-transparent text-dash-tertiary hover:text-dash-primary hover:bg-dash-surface rounded-xl flex items-center justify-center transition-colors active:scale-95"
              title="Voice Input (Coming soon)"
            >
              <Mic className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}
