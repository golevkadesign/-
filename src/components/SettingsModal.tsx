import React, { useState, useEffect } from 'react';
import { X, Settings, Loader2, RefreshCw } from 'lucide-react';
import { getSettings, saveSettings as persistSettings, AppSettings } from '../lib/settings';

export const SettingsModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [availableGeminiModels, setAvailableGeminiModels] = useState<string[]>([]);
  const [availableOpenAIModels, setAvailableOpenAIModels] = useState<string[]>([]);
  const [isLoadingGeminiModels, setIsLoadingGeminiModels] = useState(false);
  const [isLoadingOpenAIModels, setIsLoadingOpenAIModels] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(getSettings());
    }
  }, [isOpen]);

  const handleSave = () => {
    persistSettings(settings);
    onClose();
    window.location.reload(); // Reload to apply cleanly
  };

  const fetchGeminiModels = async () => {
    const key = settings.geminiKey;
    if (!key) {
      alert("请先输入 Gemini API Key");
      return;
    }
    setIsLoadingGeminiModels(true);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const models = data.models.map((m: any) => m.name.replace('models/', '')).filter((m: string) => m.includes('gemini'));
      setAvailableGeminiModels(models);
    } catch (e: any) {
      alert("拉取 Gemini 模型失败: " + e.message);
    } finally {
      setIsLoadingGeminiModels(false);
    }
  };

  const fetchOpenAIModels = async () => {
    const key = settings.openaiKey;
    if (!key) {
      alert("请先输入 OpenAI API Key");
      return;
    }
    setIsLoadingOpenAIModels(true);
    try {
      const res = await fetch(`https://api.openai.com/v1/models`, {
        headers: { 'Authorization': `Bearer ${key}` }
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const models = data.data.map((m: any) => m.id).filter((m: string) => m.includes('gpt') || m.includes('o1') || m.includes('o3'));
      setAvailableOpenAIModels(models);
    } catch (e: any) {
      alert("拉取 OpenAI 模型失败: " + e.message);
    } finally {
      setIsLoadingOpenAIModels(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-[#111315] border border-[#2A2B2D] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10">
          <X className="w-5 h-5" />
        </button>
        <div className="px-6 py-5 border-b border-[#2A2B2D] shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2 text-white">
            <Settings className="w-5 h-5 text-dash-gold" /> 全局设置 (General Settings)
          </h2>
        </div>
        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scroll">
          
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-300">选择大模型厂商 (LLM Provider)</label>
            <div className="flex gap-2 p-1 bg-black/30 rounded-xl border border-white/5">
              <button
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${settings.provider === 'gemini' ? 'bg-[#2A2B2D] text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                onClick={() => setSettings({...settings, provider: 'gemini'})}
              >
                Google Gemini
              </button>
              <button
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${settings.provider === 'openai' ? 'bg-[#2A2B2D] text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                onClick={() => setSettings({...settings, provider: 'openai'})}
              >
                OpenAI (ChatGPT)
              </button>
            </div>
          </div>

          <div className="bg-[#181A1C] border border-[#2A2B2D] rounded-xl p-5 space-y-5 relative">
            {settings.provider === 'gemini' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Gemini API Key</label>
                  <input
                    type="password"
                    value={settings.geminiKey}
                    onChange={(e) => setSettings({...settings, geminiKey: e.target.value})}
                    placeholder="AIzaSy..."
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-dash-textMain focus:outline-none focus:border-dash-gold/50 font-mono transition-colors"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-slate-300">模型版本选择</label>
                    <button onClick={fetchGeminiModels} disabled={isLoadingGeminiModels} className="text-xs text-dash-green flex items-center gap-1 hover:underline disabled:opacity-50">
                      {isLoadingGeminiModels ? <Loader2 className="w-3 h-3 animate-spin"/> : <RefreshCw className="w-3 h-3"/>}
                      从官方拉取
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs text-dash-textSub block mb-1">意图识别/基础分析 (Fast Model)</span>
                      <select 
                        value={settings.geminiFastModel}
                        onChange={(e) => setSettings({...settings, geminiFastModel: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-dash-textMain focus:outline-none focus:border-dash-gold/50 font-mono appearance-none"
                      >
                         <option value="gemini-3-flash-preview">gemini-3-flash-preview (默认)</option>
                         <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                         {settings.geminiFastModel && !['gemini-3-flash-preview', 'gemini-2.5-flash'].includes(settings.geminiFastModel) && !availableGeminiModels.includes(settings.geminiFastModel) && (
                            <option value={settings.geminiFastModel}>{settings.geminiFastModel} (已保存)</option>
                         )}
                         {availableGeminiModels.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <span className="text-xs text-dash-textSub block mb-1">深度推演/战略级 (Advanced Model)</span>
                      <select 
                        value={settings.geminiAdvancedModel}
                        onChange={(e) => setSettings({...settings, geminiAdvancedModel: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-dash-textMain focus:outline-none focus:border-dash-gold/50 font-mono appearance-none"
                      >
                         <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (默认)</option>
                         <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                         {settings.geminiAdvancedModel && !['gemini-3.1-pro-preview', 'gemini-2.5-pro'].includes(settings.geminiAdvancedModel) && !availableGeminiModels.includes(settings.geminiAdvancedModel) && (
                            <option value={settings.geminiAdvancedModel}>{settings.geminiAdvancedModel} (已保存)</option>
                         )}
                         {availableGeminiModels.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">OpenAI API Key</label>
                  <input
                    type="password"
                    value={settings.openaiKey}
                    onChange={(e) => setSettings({...settings, openaiKey: e.target.value})}
                    placeholder="sk-..."
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-dash-textMain focus:outline-none focus:border-dash-gold/50 font-mono transition-colors"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-slate-300">模型版本选择</label>
                    <button onClick={fetchOpenAIModels} disabled={isLoadingOpenAIModels} className="text-xs text-dash-green flex items-center gap-1 hover:underline disabled:opacity-50">
                      {isLoadingOpenAIModels ? <Loader2 className="w-3 h-3 animate-spin"/> : <RefreshCw className="w-3 h-3"/>}
                      从官方拉取
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs text-dash-textSub block mb-1">意图识别/基础分析 (Fast Model)</span>
                      <select 
                        value={settings.openaiFastModel}
                        onChange={(e) => setSettings({...settings, openaiFastModel: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-dash-textMain focus:outline-none focus:border-dash-gold/50 font-mono appearance-none"
                      >
                         <option value="gpt-4o-mini">gpt-4o-mini (默认)</option>
                         <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                         {settings.openaiFastModel && !['gpt-4o-mini', 'gpt-3.5-turbo'].includes(settings.openaiFastModel) && !availableOpenAIModels.includes(settings.openaiFastModel) && (
                            <option value={settings.openaiFastModel}>{settings.openaiFastModel} (已保存)</option>
                         )}
                         {availableOpenAIModels.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <span className="text-xs text-dash-textSub block mb-1">深度推演/战略级 (Advanced Model)</span>
                      <select 
                        value={settings.openaiAdvancedModel}
                        onChange={(e) => setSettings({...settings, openaiAdvancedModel: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-dash-textMain focus:outline-none focus:border-dash-gold/50 font-mono appearance-none"
                      >
                         <option value="gpt-4o">gpt-4o (默认)</option>
                         <option value="o3-mini">o3-mini</option>
                         <option value="o1-preview">o1-preview</option>
                         {settings.openaiAdvancedModel && !['gpt-4o', 'o3-mini', 'o1-preview'].includes(settings.openaiAdvancedModel) && !availableOpenAIModels.includes(settings.openaiAdvancedModel) && (
                            <option value={settings.openaiAdvancedModel}>{settings.openaiAdvancedModel} (已保存)</option>
                         )}
                         {availableOpenAIModels.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <div className="bg-[#181A1C] border border-[#2A2B2D] rounded-xl p-5 space-y-5 relative">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2 border-b border-[#2A2B2D] pb-3">
              外部数据连接源 (External Data Providers)
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Longbridge App Key</label>
                <input
                  type="text"
                  value={settings.longbridgeAppKey || ''}
                  onChange={(e) => setSettings({...settings, longbridgeAppKey: e.target.value})}
                  placeholder="App Key (若使用 OAuth Token 则留空)"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-dash-textMain focus:outline-none focus:border-emerald-500/50 font-mono transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Longbridge App Secret</label>
                <input
                  type="password"
                  value={settings.longbridgeAppSecret || ''}
                  onChange={(e) => setSettings({...settings, longbridgeAppSecret: e.target.value})}
                  placeholder="App Secret (若使用 OAuth Token 则留空)"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-dash-textMain focus:outline-none focus:border-emerald-500/50 font-mono transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Longbridge Access Token</label>
                <input
                  type="password"
                  value={settings.longbridgeKey || ''}
                  onChange={(e) => setSettings({...settings, longbridgeKey: e.target.value})}
                  placeholder="在此输入您的 Access Token (或 OAuth Token)..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-dash-textMain focus:outline-none focus:border-emerald-500/50 font-mono transition-colors"
                />
              </div>
              <p className="text-xs text-dash-textSub mt-2 leading-relaxed">
                用于自动同步美港股实时持仓、盈亏状况进入智能推演网络。API Key 鉴权模式需要同时填写 App Key, App Secret 和 Access Token。如果您拥有的是 OAuth 获取的 Auth Token，由于无需计算 HMAC 签名，您可以直接仅填写 Access Token 字段。
              </p>
            </div>
          </div>
          
          <div className="text-xs text-dash-textSub leading-relaxed">
            注意：所有配置与 Key 均安全地保存在本地缓存。在无配置状态下，若环境中挂载了全局变量，将默认回退至全局 AI Studio 资源。切换模型厂商需要页面重载以应用变更。
          </div>
        </div>
        <div className="px-6 py-4 bg-black/20 flex justify-end gap-3 border-t border-[#2A2B2D] shrink-0">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-sm font-medium text-dash-textSub hover:text-white transition-colors"
          >
            取消
          </button>
          <button 
            onClick={handleSave} 
            className="px-6 py-2 bg-dash-gold text-slate-900 text-sm font-bold rounded-lg shadow-lg shadow-dash-gold/20 hover:bg-yellow-400 hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all"
          >
            保存并生效 (Save)
          </button>
        </div>
      </div>
    </div>
  );
};
