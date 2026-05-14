import { z } from 'zod';
import { TerminalState } from '../types/terminal';

// 核心预处理：容错转换，保留 undefined 穿透
const laxNumber = z.preprocess((val) => {
  if (val === undefined || val === null) return undefined;
  if (typeof val === 'string') {
    const parsed = parseFloat(val.replace(/,/g, ''));
    return isNaN(parsed) ? undefined : parsed;
  }
  return Number(val);
}, z.number().optional().catch(undefined));

const laxString = z.preprocess((val) => {
  if (val === undefined || val === null) return undefined;
  return String(val);
}, z.string().optional().catch(undefined));

const laxStringArray = z.preprocess((val) => {
  if (val === undefined || val === null) return undefined;
  if (!Array.isArray(val)) return undefined;
  return val.map(String);
}, z.array(z.string()).optional().catch(undefined));

const DistributionItemSchema = z.object({
  id: laxString,
  name: laxString,
  value: laxNumber,
  currency: laxString,
  category: laxString,
  type: laxString,
}).catchall(z.any()); // 允许保留大模型下发的额外有用字段

const MetricsSchema = z.object({
  netWorth: laxNumber,
  netWorthSummary: laxString,
  liquidity: laxNumber,
  liquiditySummary: laxString,
  safetyRatio: laxNumber,
  safetyRatioSummary: laxString,
  fcf: laxNumber,
  fcfSummary: laxString,
}).catchall(z.any());

const UserPersonaSchema = z.object({
  tags: laxStringArray,
  description: laxString,
}).catchall(z.any());

const GoalSchema = z.object({
  name: laxString,
  current: laxNumber,
  target: laxNumber,
  index: laxNumber,
}).catchall(z.any());

const InsightsSchema = z.object({
  global: laxString,
  private: laxString,
  public: z.any().optional(), // keeping original format (sometimes array)
}).catchall(z.any());

const LifeStrategySchema = z.object({
  title: laxString,
  description: laxString,
  timeNode: laxString,
}).catchall(z.any());

// 组合出增量更新的 Schema
const TerminalStatePatchSchema = z.object({
  userPersona: UserPersonaSchema.optional(),
  metrics: MetricsSchema.optional(),
  distributions: z.object({
    liquidity: z.array(DistributionItemSchema).optional(),
    expenses: z.array(DistributionItemSchema).optional(),
    privateAssets: z.array(DistributionItemSchema).optional(),
    publicHoldings: z.array(DistributionItemSchema).optional(),
    fixedAssets: z.array(DistributionItemSchema).optional(),
    options: z.array(DistributionItemSchema).optional(),
  }).catchall(z.any()).optional(),
  goal: GoalSchema.optional(),
  insights: InsightsSchema.optional(),
  lifeStrategiesShort: z.array(LifeStrategySchema).optional(),
  lifeStrategiesLong: z.array(LifeStrategySchema).optional(),
}).catchall(z.any());

export function sanitizeTerminalState(rawPayload: any): Partial<TerminalState> {
  if (!rawPayload || typeof rawPayload !== 'object') return {};
  
  // 使用 safeParse 进行防御性清洗
  const result = TerminalStatePatchSchema.safeParse(rawPayload);
  if (!result.success) {
    console.warn("Zod Sanitizer Warning: Some fields were stripped due to invalid types", result.error);
    // 即使校验失败，依然可以通过剥离错误字段返回安全部分，或者这里直接返回一个清理过的结构
    // 为保持兼容性，直接返回清洗后的对象
  }
  
  // strip 掉明确为 undefined 的 top-level keys，防止对象层面的覆盖
  const cleaned = result.success ? result.data : rawPayload;
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === undefined) delete cleaned[key];
  });
  
  return cleaned as Partial<TerminalState>;
}
