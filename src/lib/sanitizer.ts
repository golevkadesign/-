import { TerminalState, DistributionItem, LifeStrategy } from '../types/terminal';
import { EMPTY_STATE } from '../hooks/useTerminalSync';

function fallbackNum(val: any, fallback: number = 0): number | undefined {
  if (val === undefined) return undefined;
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val.replace(/,/g, ''));
    if (!isNaN(parsed)) return parsed;
  }
  return fallback;
}

function fallbackStr(val: any, fallback: string = ''): string | undefined {
  if (val === undefined) return undefined;
  if (typeof val === 'string') return val;
  if (val != null) return String(val);
  return fallback;
}

function sanitizeDistributionArray(arr: any[]): DistributionItem[] | undefined {
  if (arr === undefined) return undefined;
  if (!Array.isArray(arr)) return [];
  return arr.map(item => {
    if (typeof item !== 'object' || item === null) return {};
    const sanitizedItem: any = { ...item };
    if (item.value !== undefined) sanitizedItem.value = fallbackNum(item.value, 0);
    if (item.name !== undefined) sanitizedItem.name = fallbackStr(item.name, '');
    return sanitizedItem;
  });
}

function sanitizeLifeStrategies(arr: any[]): LifeStrategy[] | undefined {
  if (arr === undefined) return undefined;
  if (!Array.isArray(arr)) return [];
  return arr.map(item => {
    const sanitizedItem: any = { ...item };
    if (item?.title !== undefined) sanitizedItem.title = fallbackStr(item.title, '未命名策略');
    if (item?.description !== undefined) sanitizedItem.description = fallbackStr(item.description, '无描述');
    if (item?.timeNode !== undefined) sanitizedItem.timeNode = fallbackStr(item.timeNode, '');
    return sanitizedItem;
  });
}

function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  Object.keys(obj).forEach(key => {
    if (obj[key] === undefined) {
      delete obj[key];
    }
  });
  return obj;
}

export function sanitizeTerminalState(rawPayload: any): Partial<TerminalState> {
  if (!rawPayload || typeof rawPayload !== 'object') return {};

  const sanitized: Partial<TerminalState> = { ...rawPayload };

  // Sanitize userPersona
  if (rawPayload.userPersona) {
    sanitized.userPersona = cleanUndefined({
      ...rawPayload.userPersona,
      tags: rawPayload.userPersona.tags !== undefined ? (Array.isArray(rawPayload.userPersona.tags) ? rawPayload.userPersona.tags.map((t: any) => fallbackStr(t) || '') : EMPTY_STATE.userPersona.tags) : undefined,
      description: fallbackStr(rawPayload.userPersona.description, EMPTY_STATE.userPersona.description),
    });
  }

  // Sanitize metrics
  if (rawPayload.metrics) {
    sanitized.metrics = cleanUndefined({
      ...rawPayload.metrics,
      netWorth: fallbackNum(rawPayload.metrics.netWorth, EMPTY_STATE.metrics.netWorth),
      liquidity: fallbackNum(rawPayload.metrics.liquidity, EMPTY_STATE.metrics.liquidity),
      safetyRatio: fallbackNum(rawPayload.metrics.safetyRatio, EMPTY_STATE.metrics.safetyRatio),
      safetyRatioSummary: fallbackStr(rawPayload.metrics.safetyRatioSummary, EMPTY_STATE.metrics.safetyRatioSummary),
      fcf: fallbackNum(rawPayload.metrics.fcf, EMPTY_STATE.metrics.fcf),
      fcfSummary: fallbackStr(rawPayload.metrics.fcfSummary, EMPTY_STATE.metrics.fcfSummary),
    });
  }

  // Sanitize distributions
  if (rawPayload.distributions) {
    sanitized.distributions = cleanUndefined({
      ...rawPayload.distributions,
      liquidity: sanitizeDistributionArray(rawPayload.distributions.liquidity),
      expenses: sanitizeDistributionArray(rawPayload.distributions.expenses),
      privateAssets: sanitizeDistributionArray(rawPayload.distributions.privateAssets),
      publicHoldings: sanitizeDistributionArray(rawPayload.distributions.publicHoldings),
      fixedAssets: sanitizeDistributionArray(rawPayload.distributions.fixedAssets),
      options: sanitizeDistributionArray(rawPayload.distributions.options),
    });
  }

  // Sanitize goal
  if (rawPayload.goal) {
    sanitized.goal = cleanUndefined({
      ...rawPayload.goal,
      name: fallbackStr(rawPayload.goal.name, EMPTY_STATE.goal.name),
      current: fallbackNum(rawPayload.goal.current, EMPTY_STATE.goal.current),
      target: fallbackNum(rawPayload.goal.target, EMPTY_STATE.goal.target),
      index: fallbackNum(rawPayload.goal.index, EMPTY_STATE.goal.index),
    });
  }

  // Sanitize insights
  if (rawPayload.insights) {
    sanitized.insights = cleanUndefined({
      ...rawPayload.insights,
      global: fallbackStr(rawPayload.insights.global, EMPTY_STATE.insights.global),
      private: fallbackStr(rawPayload.insights.private, EMPTY_STATE.insights.private),
      public: rawPayload.insights.public, // keeping original format (sometimes array)
    });
  }

  // Sanitize life strategies
  if (rawPayload.lifeStrategiesShort !== undefined) {
    sanitized.lifeStrategiesShort = sanitizeLifeStrategies(rawPayload.lifeStrategiesShort) as any;
  }
  if (rawPayload.lifeStrategiesLong !== undefined) {
    sanitized.lifeStrategiesLong = sanitizeLifeStrategies(rawPayload.lifeStrategiesLong) as any;
  }

  return sanitized;
}
