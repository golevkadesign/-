import { useState, useEffect } from 'react';
import { subscribeToAuthChanges, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { TerminalState } from '../types/terminal';
import { sanitizeTerminalState } from '../lib/sanitizer';
import { mergeWith, isArray } from 'lodash-es';

export const EMPTY_STATE: TerminalState = {
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

export function useTerminalSync() {
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [data, setData] = useState<TerminalState>(EMPTY_STATE);

  useEffect(() => {
    const isTestMode = new URLSearchParams(window.location.search).get('test') === '1';
    
    if (isTestMode) {
       const dummyUser = { uid: 'test-user', displayName: 'Test User' };
       setUser(dummyUser);
       setData(EMPTY_STATE);
       setLoadingAuth(false);
       return;
    }

    const unsubscribe = subscribeToAuthChanges(async (u) => {
      setUser(u);
      if (u) {
         let localState: TerminalState = EMPTY_STATE;
         const stored = localStorage.getItem(`ai_terminal_data_${u.uid}`);
         if (stored) {
             try { localState = { ...EMPTY_STATE, ...JSON.parse(stored) }; } catch { localState = EMPTY_STATE; }
         } else {
             const oldStored = localStorage.getItem('ai_terminal_data');
             if (oldStored) {
                 try { 
                     localState = { ...EMPTY_STATE, ...JSON.parse(oldStored) };
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
              }
              if (fsData.userProfile) {
                 localState = { ...localState, userProfile: fsData.userProfile };
              } else if (!fsData.appData && !fsData.chatHistory) {
                 localState = { ...localState, userProfile: fsData };
              }
              localStorage.setItem(`ai_terminal_data_${u.uid}`, JSON.stringify(localState));
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
         
         setData(sanitizeTerminalState(localState) as TerminalState);
      } else {
         setData(EMPTY_STATE);
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const commitData = (newDataOrUpdater: any) => {
    setData((prev: TerminalState) => {
      const rawNewData = typeof newDataOrUpdater === 'function' ? newDataOrUpdater(prev) : newDataOrUpdater;
      const newData = sanitizeTerminalState(rawNewData) as TerminalState;
      
      // 使用 mergeWith 进行防御性合并，并在遇到数组时直接覆盖，防止出现数组索引混合污染
      const fullData = mergeWith({}, prev, newData, (objValue, srcValue) => {
        if (isArray(srcValue)) {
          return srcValue; // 数组全量替换，不执行深度合并
        }
      });
      
      if (user?.uid) {
          localStorage.setItem(`ai_terminal_data_${user.uid}`, JSON.stringify(fullData));
          const appDataToSave = { ...fullData };
          delete appDataToSave.userProfile; // RAG profile saved separately in the same doc
          setDoc(doc(db, "userProfiles", user.uid), { appData: appDataToSave, userProfile: fullData.userProfile }, { merge: true }).catch(e => console.error("Failed to commit appData to firestore:", e));
      }
      return fullData;
    });
  };

  return { user, data, loadingAuth, commitData };
}
