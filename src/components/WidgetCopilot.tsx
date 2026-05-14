import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Zap, Bot, Loader2 } from 'lucide-react';
import Markdown from 'react-markdown';
import { getSettings } from '../lib/settings';

export interface WidgetCopilotProps {
  isOpen: boolean;
  onClose: () => void;
  widgetTitle: string;
  widgetData: any;
  expertRole?: string;
  globalData?: any;
  onPromoteIntent: (prompt: string) => void;
}

export const WidgetCopilot: React.FC<WidgetCopilotProps> = ({
  isOpen,
  onClose,
  widgetTitle,
  widgetData,
  expertRole = "首席资产分析师",
  globalData,
  onPromoteIntent
}) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model', content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      const res = await fetch('/api/sandbox/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          history: messages,
          message: userMsg,
          widgetContext: widgetData,
          widgetTitle: widgetTitle,
          expertRole: expertRole,
          globalState: globalData,
          settings: getSettings()
        })
      });

      if (!res.ok) {
        let errText = "Unknown Server Error";
        try {
           const errData = await res.json();
           errText = errData.error || res.statusText;
        } catch(e) {
           errText = res.statusText;
        }
        throw new Error(`[HTTP ${res.status}] ${errText}`);
      }
      if (!res.body) throw new Error("No response body stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      setMessages(prev => [...prev, { role: 'model', content: '' }]);

      let buffer = ''; // 新增：粘包缓冲器
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // 将最后可能不完整的字符串放回 buffer，等待下一个 chunk 补齐
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr.trim() === '[DONE]') continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.error) {
                throw new Error(data.error);
              }
              if (data.text) {
                setMessages(prev => {
                  const newMsgs = [...prev];
                  const lastIndex = newMsgs.length - 1;
                  const last = newMsgs[lastIndex];
                  if (last && last.role === 'model') {
                    // 💥 修复复读机Bug：必须生成一个全新的对象，不能直接 += 修改原对象
                    newMsgs[lastIndex] = { ...last, content: last.content + data.text };
                  }
                  return newMsgs;
                });
              }
            } catch (e) {
              // Parse error or stream structure issue, ignore
            }
          }
        }
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'model', content: `**Error:** ${e.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handlePromote = () => {
    const lastModelMessage = [...messages].reverse().find(m => m.role === 'model');
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    
    let prompt = `我在分析【${widgetTitle}】时得出了以下设想：\n`;
    if (lastUserMessage) {
       prompt += `我的核心诉求：${lastUserMessage.content}\n`;
    }
    if (lastModelMessage) {
       prompt += `系统沙盒结论：${lastModelMessage.content}\n`;
    }
    prompt += `\n请结合全局配置，帮我生成具体的执行策略和系统更新。`;

    onPromoteIntent(prompt);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 transition-opacity">
      <div className="bg-dash-surface border border-dash-subtle shadow-2xl rounded-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-dash-subtle bg-black/20">
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Bot className="w-4 h-4 text-dash-primary" />
              {widgetTitle} 局部推演沙盒
            </h3>
            <p className="text-[10px] text-dash-tertiary mt-1">
              执行者：{expertRole} | 此对话不会直接修改大盘数据
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-dash-tertiary hover:text-white transition-colors rounded-lg hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scroll bg-[#0a0a0c] min-h-[350px]">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center px-4 opacity-60">
               <p className="text-xs text-dash-tertiary leading-relaxed">
                 这里是安全的局部沙盒。<br/><br/>
                 你可以针对 <span className="text-dash-primary font-bold">{widgetTitle}</span> 随时提出各种假设、计算和推演。<br/>
                 直到你点击“一键应用”前，一切探讨结论都仅限于当前环境。
               </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] ${
                  msg.role === 'user' 
                    ? 'bg-dash-primary text-black rounded-br-none font-medium shadow-[0_4px_12px_rgba(202,236,155,0.15)]' 
                    : 'bg-[#1a1c1e] border border-[#2d3032] text-dash-textMain rounded-bl-none prose prose-invert prose-p:leading-relaxed prose-sm marker:text-dash-primary max-w-none shadow-md'
                }`}>
                  {msg.role === 'user' ? (
                     msg.content
                  ) : (
                     <Markdown>{msg.content}</Markdown>
                  )}
                </div>
              </div>
            ))
          )}
          
          {isTyping && (
             <div className="flex justify-start">
               <div className="bg-[#1a1c1e] border border-[#2d3032] rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-3">
                 <Loader2 className="w-4 h-4 animate-spin text-dash-primary" />
                 <span className="text-[11px] text-dash-tertiary font-mono uppercase tracking-widest">专家正在推演...</span>
               </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-dash-subtle bg-dash-surface flex flex-col gap-3">
          <div className="relative flex items-center">
            <input
               type="text"
               value={input}
               onChange={(e) => setInput(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleSend()}
               placeholder="输入你需要推演的情景或指令..."
               className="w-full bg-[#0a0a0c] border border-dash-subtle rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-dash-primary/50 transition-colors shadow-inner"
            />
            <button
               onClick={handleSend}
               disabled={!input.trim() || isTyping}
               className="absolute right-2 p-1.5 bg-dash-primary text-black rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dash-primary/80 transition-all active:scale-95"
            >
               <Send className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex justify-between items-center">
            <p className="text-[10px] text-dash-tertiary">
              按 Enter 键发送
            </p>
            <button
               onClick={handlePromote}
               disabled={messages.length === 0}
               className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-dash-primary/10 text-dash-primary border border-dash-primary/20 hover:bg-dash-primary/20 hover:border-dash-primary/40 transition-all duration-200 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(202,236,155,0.05)] uppercase tracking-wide"
            >
               <Zap className="w-3.5 h-3.5" />
               一键应用到大盘
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
