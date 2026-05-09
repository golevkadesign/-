async function test() {
  console.log("== Starting End-to-End Fallback Test ==");
  const payload = {
    message: '我现在持有25股 APLD 和 15股 CRWV，看看我的情况',
    contextData: {
      distributions: {
        publicHoldings: [
          { symbol: 'APLD', quantity: 25, marketValue: 197.75, name: 'Applied Digital' },
          { symbol: 'CRWV', quantity: 15, marketValue: 878.925, name: 'Coreweave' }
        ],
        options: [
          { symbol: 'APLD', quantity: 10 }
        ]
      }
    }
  };
  
  const res = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  console.log("Status:", res.status);
  
  if (!res.ok) {
     console.log(await res.text());
     return;
  }
  
  let chunks = "";
  const reader = res.body?.getReader();
  if (reader) {
     const decoder = new TextDecoder('utf-8');
     while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');
        for (const line of lines) {
           if (line.startsWith('data: ')) {
               try {
                  const data = JSON.parse(line.trim().slice(6));
                  if (data.type === 'progress') {
                      console.log('[Thinking]:', data.message.substring(0, 100));
                  } else if (data.type === 'summary_chunk') {
                      chunks += data.text;
                      process.stdout.write(data.text);
                  } else if (data.type === 'partial_result') {
                      console.log('\n[Eager Live Portfolio Update Yielded]:', JSON.stringify(data.data?.externalData?.livePortfolio || []).substring(0, 200));
                  }
               } catch (e) {}
           }
        }
     }
  }
  console.log("\n\n== Finished! Check if APLD is 41.25 instead of 7.91! ==");
  console.log("Payload:", chunks);
}
test();
