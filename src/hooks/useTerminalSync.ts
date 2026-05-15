import { useState, useEffect } from 'react';
import { subscribeToAuthChanges, db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { TerminalState } from '../types/terminal';
import { sanitizeTerminalState } from '../lib/sanitizer';
import { mergeWith, isArray, debounce } from 'lodash-es';
import { DEFAULT_DASHBOARD_SCHEMA } from '../lib/default-schema';

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
  lifeStrategiesLong: [],
  dynamicWidgets: [],
  dashboardSchema: DEFAULT_DASHBOARD_SCHEMA,
};

const debouncedSyncToCloud = debounce((uid: string, payload: any) => {
  setDoc(doc(db, "userProfiles", uid), payload, { merge: true })
    .catch(e => console.error("Failed to commit appData to firestore:", e));
}, 2000);

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

    let unsubscribeSnapshot: (() => void) | undefined;

    const unsubscribeAuth = subscribeToAuthChanges((u) => {
      setUser(u);
      
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = undefined;
      }

      if (u) {
         unsubscribeSnapshot = onSnapshot(doc(db, "userProfiles", u.uid), (snapshot) => {
            if (snapshot.exists()) {
               const fsData = snapshot.data();
               let localState: TerminalState = EMPTY_STATE;
               
               if (fsData.appData && Object.keys(fsData.appData).length > 0) {
                  localState = { ...EMPTY_STATE, ...fsData.appData };
               }
               if (fsData.userProfile) {
                  localState = { ...localState, userProfile: fsData.userProfile };
               } else if (!fsData.appData && !fsData.chatHistory) {
                  localState = { ...localState, userProfile: fsData };
               }
               
               setData(sanitizeTerminalState(localState) as TerminalState);
            } else {
               // 💥 修复清空残留：如果远程文档被删除了，本地立刻归零
               console.log("Terminal: Remote document deleted, resetting local state.");
               setData(EMPTY_STATE);
            }
            setLoadingAuth(false);
         }, (error) => {
            console.error("Firestore sync error:", error);
            setLoadingAuth(false);
         });
      } else {
         setData(EMPTY_STATE);
         setLoadingAuth(false);
      }
    });
    
    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
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
          debouncedSyncToCloud(user.uid, { appData: appDataToSave, userProfile: fullData.userProfile });
      }
      return fullData;
    });
  };

  return { user, data, loadingAuth, commitData };
}
