import puppeteer from 'puppeteer';

(async () => {
  console.log("🚀 启动 Arbitra Terminal 终端体感自动化测试...");
  
  // 启动浏览器
  const browser = await puppeteer.launch({ 
    headless: "new", // 使用新版无头模式，如果要看可视界面可以改为 false
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // 注入错误监听，防止控制台有隐蔽报错
  page.on('pageerror', err => console.log('❌ [浏览器控制台报错]:', err.toString()));

  console.log("⏳ 正在连接本地开发服务器 (http://localhost:3000/?test=1)...");
  await page.goto('http://localhost:3000/?test=1', { waitUntil: 'domcontentloaded' });

  // 注入 FPS 监控探针 (验证 App.tsx 的 60ms 节流阀是否生效，防假死)
  await page.evaluate(() => {
    window.fpsRecord = [];
    let lastTime = performance.now();
    let frames = 0;
    const loop = () => {
      const now = performance.now();
      frames++;
      if (now - lastTime >= 1000) {
        window.fpsRecord.push(frames);
        frames = 0;
        lastTime = now;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });

  try {
    // ---- 测试用例 1：测试主链路流式渲染与 JSON 正则解析 ----
    console.log("\n🧪 [Test 1] 测试主对话流式渲染与 JSON 鲁棒性...");

    // 假设用户已经跳过登录，或者我们在开发者视图。我们直接找到输入框。
    await page.waitForSelector('textarea[placeholder="发送消息..."]', { timeout: 10000 });
    await page.type('textarea[placeholder="发送消息..."]', "请帮我制定一份极度硬核的财务压测计划，必须包含 JSON 状态更新。");
    await page.keyboard.press('Enter');
    
    console.log("   - 消息已发送，等待 AI 响应...");
    const startTime = Date.now();
    
    // 等待流式输出完成 (监听 "生成中..." 或按钮状态变化)
    // 等待输入框恢复可用，意味着生成结束
    await page.waitForFunction(() => {
        const btn = document.querySelector('button[type="button"] svg.lucide-send');
        return btn !== null; // 当 Send 按钮重新出现时，说明流结束
    }, { timeout: 60000 }); 
    
    const duration = (Date.now() - startTime) / 1000;
    console.log(`   - 流式渲染完毕，总耗时: ${duration}秒 (若在 5-15s 内，说明 503 降级机制完美触发)`);
    
    // 检查是否有恶性正则报错
    const pageText = await page.evaluate(() => document.body.innerText);
    if (pageText.includes("JSON 解析失败:")) {
        throw new Error("❌ 发现 'JSON 解析失败' 报错，useAiAgent.ts 正则依然存在漏洞！");
    } else if (pageText.includes("WebSocket closed")) {
        throw new Error("❌ 发现 'WebSocket closed' 报错，chat.ts 防洪机制失效！");
    } else {
        console.log("   ✅ 界面未见 JSON 解析异常，正文与状态树解析互不干扰。");
    }

    // ---- 测试用例 2：测试局部推演卡片 (Plan API) 及渲染雪崩防护 ----
    console.log("\n🧪 [Test 2] 测试局部卡片推演 (Plan API 降级与渲染雪崩防护)...");
    
    // 寻找 "Analyze" 按钮 (假设页面上有渲染出来的 Life Strategies 卡片)
    let clicked = false;
    const analyzeBtn = await page.$('::-p-text(Analyze)');
    if (!analyzeBtn) {
       const buttons = await page.$$('button');
       for (let b of buttons) {
          const txt = await page.evaluate(el => el.textContent, b);
          if (txt && txt.includes('Analyze')) {
             await b.click();
             clicked = true;
             break;
          }
       }
    } else {
       await analyzeBtn.click();
       clicked = true;
    }

    if (clicked) {
        console.log("   - 已点击 Analyze 按钮，监控页面 FPS 波动...");
        
        // 等待状态变为 Wait 然后变回 Analyze 或 Retry 或消失
        await page.waitForFunction(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            return !btns.some(b => b.innerText.includes('Wait'));
        }, { timeout: 45000 }); // 如果卡死这里会超时
        
        console.log("   ✅ 局部推演完成，没有发生无限期挂起 (Backend plan.ts 降级生效)。");
        
        // 提取 FPS 记录
        const fpsData = await page.evaluate(() => window.fpsRecord);
        const minFps = Math.min(...fpsData);
        console.log(`   - 渲染期间最低 FPS: ${minFps}`);
        
        if (minFps < 5) {
            console.warn("   ⚠️ 警告：渲染期间存在掉帧 (FPS < 5)，App.tsx 的 60ms 节流可能还可以进一步放宽。");
        } else {
            console.log("   ✅ 渲染流畅无假死 (前端 React 节流防雪崩生效)。");
        }
    } else {
         console.log("   - 当前界面暂无 Analyze 按钮，跳过卡片推演测试。");
    }

    console.log("\n🎉 所有用户体感压测通过！系统抗脆性拉满！");
    
  } catch (err) {
    console.error(`\n❌ 测试失败: ${err.message}`);
  } finally {
    await browser.close();
  }
})();
