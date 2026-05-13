import { TerminalState, DistributionItem, LifeStrategy } from '../types/terminal';
import { EMPTY_STATE } from '../hooks/useTerminalSync';

function fallbackNum(val: any, fallback: number = 0): number {
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val.replace(/,/g, ''));
    if (!isNaN(parsed)) return parsed;
  }
  return fallback;
}

function fallbackStr(val: any, fallback: string = ''): string {
  if (typeof val === 'string') return val;
  if (val != null) return String(val);
  return fallback;
}

function sanitizeDistributionArray(arr: any[]): DistributionItem[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => {
    if (typeof item !== 'object' || item === null) return {};
    return {
      ...item,
      value: fallbackNum(item.value, 0),
      name: fallbackStr(item.name, ''),
    };
  });
}

function sanitizeLifeStrategies(arr: any[]): LifeStrategy[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => ({
    title: fallbackStr(item?.title, '未命名策略'),
    description: fallbackStr(item?.description, '无描述'),
    timeNode: fallbackStr(item?.timeNode, ''),
  }));
}

export function sanitizeTerminalState(rawPayload: any): Partial<TerminalState> {
  if (!rawPayload || typeof rawPayload !== 'object') return {};

  const sanitized: Partial<TerminalState> = { ...rawPayload };

  // Sanitize userPersona
  if (rawPayload.userPersona) {
    sanitized.userPersona = {
      tags: Array.isArray(rawPayload.userPersona.tags) ? rawPayload.userPersona.tags.map(fallbackStr) : EMPTY_STATE.userPersona.tags,
      description: fallbackStr(rawPayload.userPersona.description, EMPTY_STATE.userPersona.description),
    };
  }

  // Sanitize metrics
  if (rawPayload.metrics) {
    sanitized.metrics = {
      netWorth: fallbackNum(rawPayload.metrics.netWorth, EMPTY_STATE.metrics.netWorth),
      liquidity: fallbackNum(rawPayload.metrics.liquidity, EMPTY_STATE.metrics.liquidity),
      safetyRatio: fallbackNum(rawPayload.metrics.safetyRatio, EMPTY_STATE.metrics.safetyRatio),
      safetyRatioSummary: fallbackStr(rawPayload.metrics.safetyRatioSummary, EMPTY_STATE.metrics.safetyRatioSummary),
      fcf: fallbackNum(rawPayload.metrics.fcf, EMPTY_STATE.metrics.fcf),
      fcfSummary: fallbackStr(rawPayload.metrics.fcfSummary, EMPTY_STATE.metrics.fcfSummary),
    };
  }

  // Sanitize distributions
  if (rawPayload.distributions) {
    sanitized.distributions = {
      liquidity: sanitizeDistributionArray(rawPayload.distributions.liquidity),
      expenses: sanitizeDistributionArray(rawPayload.distributions.expenses),
      privateAssets: sanitizeDistributionArray(rawPayload.distributions.privateAssets),
      publicHoldings: sanitizeDistributionArray(rawPayload.distributions.publicHoldings),
      fixedAssets: sanitizeDistributionArray(rawPayload.distributions.fixedAssets),
      options: sanitizeDistributionArray(rawPayload.distributions.options),
    };
  }

  // Sanitize goal
  if (rawPayload.goal) {
    sanitized.goal = {
      name: fallbackStr(rawPayload.goal.name, EMPTY_STATE.goal.name),
      current: fallbackNum(rawPayload.goal.current, EMPTY_STATE.goal.current),
      target: fallbackNum(rawPayload.goal.target, EMPTY_STATE.goal.target),
      index: fallbackNum(rawPayload.goal.index, EMPTY_STATE.goal.index),
    };
  }

  // Sanitize insights
  if (rawPayload.insights) {
    sanitized.insights = {
      global: fallbackStr(rawPayload.insights.global, EMPTY_STATE.insights.global),
      private: fallbackStr(rawPayload.insights.private, EMPTY_STATE.insights.private),
      public: rawPayload.insights.public, // keeping original format (sometimes array)
    };
  }

  // Sanitize life strategies
  if (rawPayload.lifeStrategiesShort) {
    sanitized.lifeStrategiesShort = sanitizeLifeStrategies(rawPayload.lifeStrategiesShort);
  }
  if (rawPayload.lifeStrategiesLong) {
    sanitized.lifeStrategiesLong = sanitizeLifeStrategies(rawPayload.lifeStrategiesLong);
  }

  return sanitized;
}
