export interface AppSettings {
  provider: 'gemini' | 'openai';
  geminiKey: string;
  openaiKey: string;
  longbridgeAppKey?: string;
  longbridgeAppSecret?: string;
  longbridgeKey?: string;
  geminiFastModel: string;
  geminiAdvancedModel: string;
  openaiFastModel: string;
  openaiAdvancedModel: string;
  agentPrompts?: Record<string, string>;
  ragSchema?: string;
}

export const defaultSettings: AppSettings = {
  provider: 'gemini',
  geminiKey: '',
  openaiKey: '',
  longbridgeAppKey: '',
  longbridgeAppSecret: '',
  longbridgeKey: '',
  geminiFastModel: 'gemini-3-flash-preview',
  geminiAdvancedModel: 'gemini-3.1-pro-preview',
  openaiFastModel: 'gpt-4o-mini',
  openaiAdvancedModel: 'gpt-4o',
  agentPrompts: {},
  ragSchema: '',
};

export const getSettings = (): AppSettings => {
  if (typeof window === 'undefined') return defaultSettings;
  const stored = localStorage.getItem('arbitra_app_settings');
  if (stored) {
    try {
      return { ...defaultSettings, ...JSON.parse(stored) };
    } catch {}
  }
  // migrate legacy key
  const legacyKey = localStorage.getItem('custom_gemini_api_key');
  if (legacyKey) {
    return { ...defaultSettings, geminiKey: legacyKey };
  }
  return defaultSettings;
};

export const saveSettings = (settings: AppSettings) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('arbitra_app_settings', JSON.stringify(settings));
    // sync back legacy key so we don't break simple reads if any
    if (settings.geminiKey) {
        localStorage.setItem('custom_gemini_api_key', settings.geminiKey);
    } else {
        localStorage.removeItem('custom_gemini_api_key');
    }
  }
};
