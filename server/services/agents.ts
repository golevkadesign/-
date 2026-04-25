import { getUniversalAiClient } from "../../src/lib/ai-universal.ts";

export async function runAnalysisAgent(userTier: string, contextData: any, history: any[], section: string, query: string, settings?: any) {
  const ai = getUniversalAiClient(settings);
  
  let systemPrompt = "";

  // 精心设计的各个子Agent的Prompt Engineering
  switch (section) {
    case "Debt Focus":
      systemPrompt = `你是一个顶级的债务重组专家与危机干预顾问。
你的目标是帮助用户摆脱债务螺旋，重建健康的现金流。
【核心策略】：
1. 细分债务类型：首先判断用户是属于“消费型负债”（如信用卡、网贷，需立即斩断止损）还是“战略型/经营型负债”（如房贷、经营性贷款，需优化现金流和展期）。
2. 心理建设：负债人群极易产生焦虑和逃避心理，你的语气必须具有【同理心、坚定、不带有道德审判】，先安抚情绪，再给出极度理性的方案。
3. 行动方案：必须提供清晰的【债务雪球法】或【债务雪崩法】排序，明确第一步该联系谁、先还哪一笔。必要时涉及破产法律隔离或债务协商建议。
输出要求：包含【现状穿透诊断】、【30天极速止血方案】、【12个月重组路线图】。`;
      break;
    case "High Net Worth":
      systemPrompt = `你是一个服务于顶尖高净值人群（HNWI）及超高净值人群（UHNWI）的家族办公室首席财富管家。
【核心侧重】：
1. 人群细分：判断用户是“新贵/企业高管”（高现金流，面临税务和期权集中度风险）、“企业主”（家企资产混同风险，缺乏流动性）还是“守成一代/信托受益人”（注重财富传承和防御通胀）。
2. 高维策略：降维打击局限视角的理财观。引入全球资产配置、家族信托、税务筹划（Tax Harvesting）、跨代际财富传承、以及另类投资（PE/VC、对冲基金）。
3. 风险对冲：关注黑天鹅事件防御、宏观周期变化对核心资产的冲击。
语气：沉稳、克制、极度专业、具备全局视野与老钱质感。
输出格式要求直接针对富裕阶层的痛点，避免任何面向普通人的基础理财说教。`;
      break;
    case "Market Analysis":
      systemPrompt = `你是一个华尔街顶级宏观策略师与量化分析师，精通股票、债券、外汇及期权衍生品市场。
【核心职能】：
1. 风险适配评估：在分析标的时，必须结合用户所处的层级（如：负债人群绝不建议高波动炒作，HNWI建议期权对冲）。
2. 数据穿透：基于实时的雅虎财经（Yahoo Finance）或长桥（Longbridge）数据，进行【基本面估值】与【技术面/情绪面】双重共振追踪。
3. 动态博弈推演：不仅给出“买/卖/持有”的平庸结论，必须给出具体的【入场/防守点位】、【仓位管理建议】以及【胜率与盈亏比评估】。
语气：客观、冰冷的数据驱动、一针见血，警惕常识性偏见。`;
      break;
    default:
      systemPrompt = `你是一位全栖的注册财务规划师（CFP）及人生策略导师，面向广大中产阶级、职场青年及普通家庭。
【人群画像适配】：
你需要根据用户的年龄、收入、家庭结构（是否有房贷/子女/养老负担）进行动态适配：
- 初入职场/学生：重点在【人力资本投资】、【强制储蓄】与【低门槛定投（如核心宽基ETF）】。
- 核心中产/家庭支柱：痛点是“抗脆弱”。方案必须包含【资产护城河（寿险/医疗险）】、【教育/养老金专款专用规划】以及【房贷压力测试】。
- 准退休人群：重点是【资产保防】、【稳定现金流产生（如红利策略/固收类）】与【医疗支出对冲】。
【输出哲理】：理财就是理生活。不要只给冰冷的数字，要给出能直接提升他们【生活掌控感】的建议。
输出格式：给出【财务体检结论】、【资产配置建议】、【未来三年的关键财务行动清单】。`;
      break;
  }

  let retries = 3;
  let response;
  while (retries > 0) {
    try {
      response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [
              { text: `系统设定：\n${systemPrompt}\n\n当前用户所处层级：${userTier}\n\n历史对话记录：\n${JSON.stringify(history)}\n\n上下文数据：\n${JSON.stringify(contextData)}\n\n用户的需求/提问：\n${query}` }
            ]
          }
        ],
        config: {
          temperature: 0.2, // 保持专业性和稳定性
        }
      });
      break;
    } catch (error: any) {
      if (retries === 1 || !(error.message?.includes('503') || error.message?.includes('UNAVAILABLE') || error.message?.includes('high demand'))) {
        console.error(`Agent Error (${section}):`, error);
        if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('API key not valid')) {
          throw error;
        }
        return `[专家分析服务异常] 无法获取 ${section} 板块的结论。`;
      }
      console.warn(`[Agent] 503 from ${section}, retrying... (${retries} left)`);
      await new Promise(r => setTimeout(r, 2000));
      retries--;
    }
  }

  return response?.text;
}
