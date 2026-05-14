import { create } from 'zustand';

interface CopilotConfig {
  isOpen: boolean;
  title: string;
  data: any;
  role: string;
}

interface InteractionState {
  isDrawerOpen: boolean;
  pendingGlobalIntent: string | null;
  copilotConfig: CopilotConfig;
  setDrawerOpen: (isOpen: boolean) => void;
  openDrawerWithIntent: (intent: string) => void;
  clearPendingIntent: () => void;
  openCopilot: (title: string, data: any, role: string) => void;
  closeCopilot: () => void;
}

export const useInteractionStore = create<InteractionState>((set) => ({
  isDrawerOpen: false,
  pendingGlobalIntent: null,
  copilotConfig: { isOpen: false, title: '', data: null, role: '' },
  
  setDrawerOpen: (isOpen) => set({ isDrawerOpen: isOpen }),
  
  openDrawerWithIntent: (intent) => set({ 
    isDrawerOpen: true, 
    pendingGlobalIntent: intent 
  }),
  
  clearPendingIntent: () => set({ pendingGlobalIntent: null }),
  
  openCopilot: (title, data, role) => set({ 
    copilotConfig: { isOpen: true, title, data, role } 
  }),
  
  closeCopilot: () => set((state) => ({ 
    copilotConfig: { ...state.copilotConfig, isOpen: false } 
  })),
}));
