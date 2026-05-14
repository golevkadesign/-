import { SDUIComponent } from '../types/terminal';

export const DEFAULT_DASHBOARD_SCHEMA: SDUIComponent[] = [
  {
    id: "metrics-grid",
    type: "Grid",
    props: { columns: 4, gap: 6, className: "mb-8" },
    children: [
      { id: "m1", type: "MetricCard", props: { title: "总净资产 (Net Worth)", dataKey: "netWorth", isLongSubText: true } },
      { id: "m2", type: "MetricCard", props: { title: "可用现金池 (Liquidity)", dataKey: "liquidity", isLongSubText: true } },
      { id: "m3", type: "MetricCard", props: { title: "抗风险系数 (Safety Ratio)", dataKey: "safetyRatio", isLongSubText: true } },
      { id: "m4", type: "MetricCard", props: { title: "月自由现金流 (FCF)", dataKey: "fcf", isLongSubText: true } }
    ]
  },
  {
    id: "charts-grid",
    type: "Grid",
    props: { columns: 2, gap: 6, className: "mb-8 lg:grid-cols-2 2xl:grid-cols-3" },
    children: [
      { id: "c1", type: "DynamicChart", props: { title: "流动资金池", chartType: "liquidity", delay: 0.1 } },
      { id: "c2", type: "DynamicChart", props: { title: "公开市场持仓视图", chartType: "publicHoldings", chartHeight: "300px", delay: 0.2 } },
      { id: "c3", type: "DynamicChart", props: { title: "衍生品及期权", chartType: "options", chartHeight: "200px", delay: 0.3 } },
      { id: "c4", type: "DynamicChart", props: { title: "非公开资产估值", chartType: "privateAssets", chartHeight: "200px", delay: 0.4 } },
      { id: "c5", type: "DynamicChart", props: { title: "开支结构分析", chartType: "expenses", delay: 0.6 } }
    ]
  }
];
