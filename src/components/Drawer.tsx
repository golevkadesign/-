import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, FileText, RefreshCw, Paperclip, Send, StopCircle, Check } from 'lucide-react';
import { ChatList } from './ui/chat-ui';
import { useAiAgent } from '../hooks/useAiAgent';
import { useInteractionStore } from '../hooks/useInteractionStore';

// Shared utility
function fileToBase64(file: File): Promise<{ mimeType: string, data: string, name: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
       const base64String = reader.result as string;
       const [prefix, baseData] = base64String.split(',');
       const mimeType = prefix.match(/:(.*?);/)?.[1] || file.type;
       resolve({ mimeType, data: baseData, name: file.name });
    };
    reader.onerror = reject;
  });
}

export const Drawer = ({ isDrawerOpen, setIsDrawerOpen, user, data, setSduiState, setIsSynthesizing, commitData }: any) => {
  const [showDrawerClearConfirm, setShowDrawerClearConfirm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
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
  } = useAiAgent({ user, data, commitData, setSduiState, setIsSynthesizing });

  const handlePaste = async (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      const files = Array.from(e.clipboardData.files);
      const newAtts = await Promise.all(files.map(file => fileToBase64(file)));
      setAttachments(prev => [...prev, ...newAtts]);
    }
  };

  const { pendingGlobalIntent, clearPendingIntent } = useInteractionStore();

  useEffect(() => {
    if (pendingGlobalIntent) {
      handleAiSubmit(pendingGlobalIntent);
      clearPendingIntent();
    }
  }, [pendingGlobalIntent, handleAiSubmit, clearPendingIntent]);

  useEffect(() => {
    const handleAddAttachment = (e: any) => {
      const att = e.detail;
      setAttachments(prev => [...prev, att]);
    };
    window.addEventListener('add-attachment', handleAddAttachment);
    return () => {
       window.removeEventListener('add-attachment', handleAddAttachment);
    };
  }, [setAttachments]);

  return (
    <div 
      className={`fixed inset-y-0 right-0 w-full sm:w-[500px] md:w-[600px] bg-dash-surface/95 backdrop-blur-2xl border-l border-dash-subtle z-50 transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      onDrop={async (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const files = Array.from(e.dataTransfer.files);
          const newAtts = await Promise.all(files.map(file => fileToBase64(file)));
          setAttachments(prev => [...prev, ...newAtts]);
        }
      }}
    >
      {isDragging && (
        <div className="absolute inset-0 z-[100] bg-dash-green/10 backdrop-blur-md border-2 border-dashed border-dash-green/50 flex items-center justify-center">
           <div className="bg-dash-surface p-8 rounded-2xl shadow-2xl flex flex-col items-center pointer-events-none border border-dash-subtle scale-105 transition-transform">
              <Upload className="w-12 h-12 mb-4 text-dash-green animate-bounce" />
              <p className="text-dash-primary font-bold text-lg tracking-tight">释放即可上传文件 (Drop to Upload)</p>
           </div>
        </div>
      )}
      
      <div className="p-4 sm:p-6 border-b border-dash-subtle flex justify-between items-center bg-transparent relative z-10">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-xl bg-dash-surface-hover flex items-center justify-center border border-dash-subtle shadow-sm">
              <div className="w-4 h-4 rounded-full bg-dash-green animate-glow-flow"></div>
           </div>
           <div>
              <h2 className="text-lg font-semibold text-dash-primary leading-tight tracking-tight">Smart Agent</h2>
              <p className="text-[10px] text-dash-tertiary font-mono uppercase tracking-[0.2em] mt-0.5">Terminal AI</p>
           </div>
        </div>
        <div className="flex items-center gap-3">
           {chatHistory.length > 0 && (
              <div className="relative">
                 <button 
                   onClick={() => setShowDrawerClearConfirm(true)} 
                   className="text-[11px] text-dash-secondary hover:text-dash-red px-3 py-1.5 rounded-lg border border-dash-subtle hover:border-dash-red/30 hover:bg-dash-red/10 transition-all flex items-center gap-1.5 font-semibold tracking-tight uppercase"
                 >
                   <RefreshCw className="w-3.5 h-3.5" /> 清除屏显
                 </button>
                 
                 {showDrawerClearConfirm && (
                   <>
                     <div className="fixed inset-0 z-40" onClick={() => setShowDrawerClearConfirm(false)}></div>
                     <div className="absolute right-0 top-full mt-2 w-64 bg-dash-surface border border-dash-red/30 rounded-xl p-5 shadow-[0_0_20px_rgba(211,76,76,0.15)] z-50 animate-in fade-in slide-in-from-top-2 backdrop-blur-md">
                        <p className="text-xs text-dash-secondary mb-4 leading-relaxed font-medium">此操作仅清除屏幕显示，系统仍保有长期记忆。确认清除？</p>
                        <div className="flex justify-end gap-2">
                           <button onClick={() => setShowDrawerClearConfirm(false)} className="px-3 py-1.5 bg-dash-surface-hover border border-dash-subtle text-dash-secondary text-xs rounded-md hover:bg-dash-strong hover:text-dash-primary transition-colors font-semibold">取消</button>
                           <button onClick={() => { setChatHistory([]); setShowDrawerClearConfirm(false); }} className="px-3 py-1.5 bg-rose-600/20 text-rose-500 border border-rose-500/30 text-xs rounded hover:bg-rose-600 hover:text-white transition-colors">确认清除</button>
                        </div>
                     </div>
                   </>
                 )}
              </div>
           )}
           <button onClick={() => setIsDrawerOpen(false)} className="p-2 bg-dash-surface-hover border border-dash-subtle hover:bg-white/10 rounded-xl transition-colors text-dash-tertiary hover:text-dash-primary ml-2 shadow-sm">
             <X className="w-5 h-5" />
           </button>
        </div>
      </div>

      <ChatList 
        messages={React.useMemo(() => chatHistory.flatMap((c, i) => {
           const msgs = [];
           if (c.user || (c.attachments && c.attachments.length > 0)) {
              msgs.push({ role: 'user', content: c.user || '', attachments: c.attachments });
           }
           if (c.ai || (i === chatHistory.length - 1 && isLoading) || c.thinking) {
              msgs.push({ role: 'assistant', content: c.ai || '', thinking: c.thinking, hasMemoryUpdate: c.hasMemoryUpdate, _liveSources: data._liveSources, timeTaken: c.timeTaken, debugData: (c as any).debugData });
           }
           return msgs;
        }), [chatHistory, isLoading, data._liveSources])} 
        isTyping={isLoading} 
        onRegenerate={chatHistory.length > 0 ? handleRegenerate : undefined}
        onQuickPrompt={(prompt: string) => handleAiSubmit(prompt)}
      />

      <div className="absolute bottom-0 left-0 right-0 z-40 px-4 sm:px-6 pb-6 pt-10 bg-gradient-to-t from-[#090A0C] via-[#090A0C]/90 to-transparent pointer-events-none">
        <div className="mx-auto w-full max-w-4xl pointer-events-auto relative">
          
          {/* Memory Toggle */}
          <div className="absolute right-2 -top-8 flex items-center">
            <label className="flex items-center gap-1.5 cursor-pointer group">
              <div className={`w-3.5 h-3.5 rounded-md flex items-center justify-center transition-colors ${syncProfile ? 'bg-emerald-500' : 'bg-white/10 border border-white/20'}`}>
                 {syncProfile && <Check className="w-2.5 h-2.5 text-white stroke-[4px]" />}
              </div>
              <input type="checkbox" className="hidden" checked={syncProfile} onChange={(e) => setSyncProfile(e.target.checked)} />
              <span className="text-[10px] text-dash-secondary uppercase tracking-wider font-semibold group-hover:text-dash-primary transition-colors">写入长线记忆</span>
            </label>
          </div>

          {/* Main Capsule Container */}
          <div className="relative bg-[#13151A]/80 backdrop-blur-3xl rounded-[28px] border border-white/5 p-2 flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            
            <input type="file" multiple accept="image/*,.pdf,.txt" ref={fileInputRef} onChange={async e => {
                if (e.target.files) {
                  const files = Array.from(e.target.files);
                  const newAtts = await Promise.all(files.map(file => fileToBase64(file)));
                  setAttachments(prev => [...prev, ...newAtts]);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }
            }} className="hidden" />

            {/* Attachments Gallery */}
            <AnimatePresence>
               {attachments.length > 0 && (
                   <div className="flex flex-wrap gap-3 px-3 pt-3 pb-1">
                     {attachments.map((att, i) => (
                        <motion.div 
                          layout
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          key={att.name + i} 
                          className="relative group"
                        >
                          {att.mimeType.startsWith('image/') ? (
                             <img src={`data:${att.mimeType};base64,${att.data}`} alt="upload" className="w-20 h-20 object-cover rounded-[16px] border border-white/10 shadow-sm" />
                          ) : (
                             <div className="w-20 h-20 bg-white/5 rounded-[16px] border border-white/10 flex flex-col items-center justify-center p-2 text-[10px] text-dash-secondary font-sans shadow-sm">
                                <FileText className="w-6 h-6 mb-1 text-dash-tertiary" />
                                <span className="truncate w-full text-center px-1 font-medium">{att.name}</span>
                             </div>
                          )}
                          <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-1.5 -right-1.5 bg-black text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg border border-white/10 z-10">
                            <X className="w-2.5 h-2.5 stroke-[3]" />
                          </button>
                        </motion.div>
                     ))}
                   </div>
               )}
            </AnimatePresence>

            {/* Input Row */}
            <div className="flex items-end gap-1 w-full relative">
               <button onClick={() => fileInputRef.current?.click()} className="flex-shrink-0 w-11 h-11 ml-1 mb-0.5 rounded-full text-dash-tertiary hover:text-dash-primary hover:bg-white/5 transition-colors flex items-center justify-center active:scale-95">
                 <Paperclip className="w-[22px] h-[22px]" />
               </button>

               <div className="flex-1 relative flex flex-col justify-center min-h-[48px]">
                  <textarea
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if ((inputMsg.trim() || attachments.length > 0) && !isLoading) {
                          handleAiSubmit();
                        }
                      }
                    }}
                    onPaste={handlePaste}
                    placeholder="发送消息..."
                    rows={1}
                    className="w-full bg-transparent border-none py-3 px-2 text-[15px] sm:text-[16px] text-dash-primary placeholder:text-dash-tertiary focus:outline-none resize-none custom-scroll h-auto leading-relaxed"
                    style={{ minHeight: '48px', maxHeight: '150px' }}
                    ref={(el) => {
                       if (el) {
                         el.style.height = 'auto';
                         el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
                       }
                    }}
                  />
               </div>

               {/* Send / Stop button */}
               <div className="flex-shrink-0 self-end mb-1 mr-1">
                 {isLoading ? (
                   <motion.button
                     key="stop"
                     initial={{ scale: 0.8, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     exit={{ scale: 0.8, opacity: 0 }}
                     type="button"
                     onClick={handleStop}
                     className="w-[42px] h-[42px] bg-red-500/20 text-red-400 rounded-full flex items-center justify-center transition-colors active:scale-95 border border-red-500/30"
                   >
                     <StopCircle className="w-5 h-5" />
                   </motion.button>
                 ) : (
                   <motion.button
                     key="send"
                     initial={{ scale: 0.8, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     exit={{ scale: 0.8, opacity: 0 }}
                     type="button"
                     onClick={() => {(inputMsg.trim() || attachments.length > 0) && handleAiSubmit()}}
                     style={{ background: (inputMsg.trim() || attachments.length > 0) ? 'radial-gradient(circle at top left, var(--color-emerald-500), var(--color-teal-600))' : '' }}
                     className={`w-[42px] h-[42px] rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${inputMsg.trim() || attachments.length > 0 ? 'text-white cursor-pointer hover:brightness-110 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-white/5 text-white/30 cursor-default'}`}
                   >
                     <Send className="w-4 h-4 ml-0.5" />
                   </motion.button>
                 )}
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
