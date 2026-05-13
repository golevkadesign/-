export interface UserPersona {
  tags: string[];
  description: string;
}

export interface UserProfile {
  [key: string]: any;
}

export interface Metrics {
  netWorth: number;
  netWorthSummary?: string;
  liquidity: number;
  liquiditySummary?: string;
  safetyRatio: number;
  safetyRatioSummary: string;
  fcf: number;
  fcfSummary: string;
}

export interface DistributionItem {
  id?: string;
  name?: string;
  value?: number;
  currency?: string;
  category?: string;
  type?: string;
  [key: string]: any;
}

export interface Distributions {
  liquidity: DistributionItem[];
  expenses: DistributionItem[];
  privateAssets: DistributionItem[];
  publicHoldings: DistributionItem[];
  fixedAssets: DistributionItem[];
  options: DistributionItem[];
}

export interface Goal {
  name: string;
  current: number;
  target: number;
  index: number;
}

export interface Insights {
  global: string;
  private: string;
  liquidity?: string;
  publicText?: string;
  publicSummary?: string;
  options?: string;
  fixedAssets?: string;
  expenses?: string;
  public?: any;
}

export interface LifeStrategy {
  title: string;
  description: string;
  timeNode: string;
}

export interface TerminalState {
  userPersona: UserPersona;
  userProfile: UserProfile;
  metrics: Metrics;
  distributions: Distributions;
  goal: Goal;
  insights: Insights;
  lifeStrategiesShort: LifeStrategy[];
  lifeStrategiesLong: LifeStrategy[];
  _liveSources?: string[];
  [key: string]: any;
}
