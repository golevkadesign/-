import React, { useState, useEffect } from 'react';
import { X, FileText, Loader2, RefreshCw, Edit3, Save } from 'lucide-react';
import Markdown from 'react-markdown';
import { getSettings } from '../lib/settings';

export const ProfileReportView = ({ isOpen, onClose, data, commitData }: any) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [reportText, setReportText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReportText(data?.userProfile?.narrativeReport || '');
      setIsEditing(false);
    }
  }, [isOpen, data?.userProfile?.narrativeReport]);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const res = await fetch('/api/profile/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          data: data, 
          contextData: data,
          settings: getSettings() 
        })
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }
      const raw = await res.json();
      setReportText(raw.content || '');
      setIsEditing(false);
    } catch (e: any) {
      alert("生成报告失败: " + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    commitData((prev: any) => ({
      ...prev,
      userProfile: {
        ...prev.userProfile,
        narrativeReport: reportText
      }
    }));
    setIsEditing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-[#111315] border border-[#2A2B2D] rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh] min-h-[60vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10">
          <X className="w-5 h-5" />
        </button>
        <div className="px-6 py-5 border-b border-[#2A2B2D] shrink-0 flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2 text-white">
            <FileText className="w-5 h-5 text-dash-primary" /> 长线记忆核查面板
          </h2>
          <div className="flex gap-2 mr-8">
            <button
               onClick={handleGenerate}
               disabled={isGenerating}
               className="flex flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white/5 hover:bg-white/10 text-white transition-colors disabled:opacity-50"
            >
               {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
               {isGenerating ? "生成中..." : "重新生成"}
            </button>
            {!isEditing ? (
              <button
                 onClick={() => setIsEditing(true)}
                 className="flex flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-dash-primary/20 text-dash-primary hover:bg-dash-primary/30 transition-colors"
              >
                 <Edit3 className="w-4 h-4" /> 编辑
              </button>
            ) : (
              <button
                 onClick={handleSave}
                 className="flex flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-dash-green/20 text-dash-green hover:bg-dash-green/30 transition-colors"
              >
                 <Save className="w-4 h-4" /> 保存
              </button>
            )}
          </div>
        </div>
        <div className="p-6 overflow-y-auto flex-1 custom-scroll bg-[#0a0a0c]">
          {isGenerating ? (
            <div className="h-full flex flex-col items-center justify-center text-dash-tertiary">
              <Loader2 className="w-8 h-8 animate-spin text-dash-primary mb-4" />
              <p className="animate-pulse">正在深度提炼长线战略记忆...</p>
            </div>
          ) : isEditing ? (
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              className="w-full h-full min-h-[300px] bg-dash-surface-hover text-white border border-dash-subtle rounded-xl p-4 font-mono text-sm leading-relaxed focus:outline-none focus:border-dash-primary/50 resize-none custom-scroll"
              placeholder="请输入或生成记忆文本..."
            />
          ) : reportText ? (
             <div className="prose prose-invert prose-p:leading-relaxed prose-pre:bg-dash-surface-hover marker:text-dash-primary max-w-none">
               <Markdown>{reportText}</Markdown>
             </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-dash-tertiary space-y-4">
              <FileText className="w-12 h-12 opacity-20" />
              <p>暂无长线记忆报告，请点击右上角"重新生成"。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
