export function getCurrencySymbol(currency?: string) {
  if (!currency) return '$';
  const c = currency.toUpperCase();
  if (c === 'USD') return '$';
  if (c === 'CNY' || c === 'RMB') return '¥';
  if (c === 'HKD') return 'HK$';
  return c + ' ';
}

export function getSDUIPieOption(data: any) {
  return { 
    tooltip: { trigger: 'item' }, 
    series: [{ type: 'pie', data, radius: ['40%', '70%'] }] 
  };
}

export function getDonutOption(data: any) {
  const arr = data?.distributions?.liquidity || [];
  return {
    tooltip: { 
      trigger: 'item', 
      formatter: (p: any) => `${p.name}: ${getCurrencySymbol(arr[p.dataIndex]?.currency)}${(p.value || 0).toLocaleString()} (${p.percent}%)` 
    },
    legend: { orient: 'vertical', left: 'left', textStyle: { color: '#cbd5e1' }, top: 'middle' },
    color: ['#14b8a6', '#0ea5e9', '#3b82f6', '#0284c7', '#0369a1'],
    series: [{
      type: 'pie', radius: ['50%', '70%'], center: ['70%', '50%'],
      itemStyle: { borderRadius: 6, borderColor: '#0B0C0E', borderWidth: 2 },
      label: { show: false }, data: arr.length ? arr : [{ name: '无数据', value: 0 }]
    }]
  };
}

export function getExpenseOption(data: any) {
  const arr = data?.distributions?.expenses || [];
  return {
    tooltip: { 
      trigger: 'item', 
      formatter: (p: any) => `${p.name}: ${getCurrencySymbol(arr[p.dataIndex]?.currency)}${(p.value || 0).toLocaleString()} (${p.percent}%)` 
    },
    legend: { orient: 'vertical', left: 'left', textStyle: { color: '#cbd5e1' }, top: 'middle' },
    color: ['#0d9488', '#0891b2', '#2563eb', '#1e40af', '#115e59', '#1e3a8a'],
    series: [{
      type: 'pie', radius: ['50%', '70%'], center: ['70%', '50%'],
      itemStyle: { borderRadius: 6, borderColor: '#0B0C0E', borderWidth: 2 },
      label: { show: false }, data: arr.length ? arr : [{ name: '无数据', value: 0 }]
    }]
  };
}

export function getWaterfallOption(data: any) {
  const arr = data?.distributions?.privateAssets || [];
  const names = arr.map((v: any) => v.name).concat(['总净现值']);
  const total = arr.reduce((sum: number, v: any) => sum + v.value, 0);

  let currentSum = 0;
  const helpData = arr.map((v: any) => { const start = currentSum; currentSum += v.value; return start; }).concat([0]);
  const mainData = arr.map((v: any) => v.value).concat([total]);

  return {
    tooltip: { 
      trigger: 'axis', 
      axisPointer: { type: 'shadow' }, 
      formatter: (p: any) => {
        const idx = p[1].dataIndex;
        const cur = idx < arr.length ? arr[idx].currency : arr[0]?.currency;
        return p[1].name + ' : ' + getCurrencySymbol(cur) + (p[1].value?.toLocaleString() || 0);
      }
    },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '15%', containLabel: true },
    xAxis: { type: 'category', splitLine: { show: false }, data: names.length > 1 ? names : ['无数据'], axisLabel: { color: '#cbd5e1', interval: 0, formatter: (val: string) => val.length > 4 ? val.slice(0, 4) + '...' : val } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#334155', type: 'dashed' } }, axisLabel: { show: false } },
    series: [
      { type: 'bar', stack: 'Total', itemStyle: { borderColor: 'transparent', color: 'transparent' }, data: helpData },
      {
        type: 'bar', stack: 'Total', label: { show: true, position: 'top', formatter: (p: any) => p.value >= 10000 ? (p.value / 10000).toFixed(1) + 'w' : (p.value?.toLocaleString() || '0'), color: '#f8fafc', fontSize: 10 },
        itemStyle: { color: (p: any) => p.dataIndex === names.length - 1 ? '#f8fafc' : '#0ea5e9', borderRadius: [4, 4, 0, 0] }, data: mainData.length ? mainData : [0]
      }
    ]
  };
}

export function getHoldingsOption(data: any) {
  const arr = data?.distributions?.publicHoldings || [];
  // Sort array by value to make horizontal chart look better (descending)
  const sortedArr = [...arr].sort((a: any, b: any) => (a.value ?? a.marketValue ?? 0) - (b.value ?? b.marketValue ?? 0));
  
  const symbols = sortedArr.map((v: any) => v.name || v.symbol || '未知');
  const values = sortedArr.map((v: any) => v.value ?? v.marketValue ?? 0);
  
  return {
    tooltip: { 
      trigger: 'axis', 
      axisPointer: { type: 'shadow' }, 
      formatter: (p: any) => {
        const idx = p[0].dataIndex;
        return p[0].name + ' : ' + getCurrencySymbol(sortedArr[idx]?.currency) + (p[0].value?.toLocaleString() || 0);
      }
    },
    grid: { left: '3%', right: '15%', bottom: '5%', top: '5%', containLabel: true },
    dataZoom: [
      {
        type: 'inside',
        yAxisIndex: 0,
        start: sortedArr.length > 8 ? Math.floor((1 - 8 / sortedArr.length) * 100) : 0, 
        end: 100
      },
      {
        type: 'slider',
        yAxisIndex: 0,
        show: sortedArr.length > 8,
        width: 12,
        right: 0,
        borderColor: 'transparent',
        backgroundColor: '#1e293b',
        fillerColor: '#38BDF855',
        handleSize: '100%',
      }
    ],
    xAxis: [{ type: 'value', splitLine: { lineStyle: { color: '#334155', type: 'dashed' } }, axisLabel: { show: false } }],
    yAxis: [{ type: 'category', data: symbols.length ? symbols : ['无数据'], axisLabel: { color: '#cbd5e1', interval: 0, width: 80, overflow: 'truncate' } }],
    series: [{ 
      type: 'bar', 
      label: { show: true, position: 'right', formatter: (p: any) => p.value >= 10000 ? (p.value / 10000).toFixed(1) + 'w' : (p.value?.toLocaleString() || '0'), color: '#14b8a6', fontSize: 10 }, 
      barWidth: '60%', 
      data: values.length ? values : [0], 
      itemStyle: { color: '#14b8a6', borderRadius: [0, 4, 4, 0] } 
    }]
  };
}

export function getOptionsOption(data: any) {
  const arr = data?.distributions?.options || [];
  const symbols = arr.map((v: any) => v.name || v.symbol || '未知');
  const values = arr.map((v: any) => v.value ?? v.marketValue ?? 0);
  return {
    tooltip: { 
      trigger: 'axis', 
      axisPointer: { type: 'shadow' }, 
      formatter: (p: any) => {
        const idx = p[0].dataIndex;
        return p[0].name + ' : ' + getCurrencySymbol(arr[idx]?.currency) + (p[0].value?.toLocaleString() || 0);
      }
    },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '15%', containLabel: true },
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: arr.length > 5 ? Math.floor((5 / arr.length) * 100) : 100
      },
      {
        type: 'slider',
        show: arr.length > 5,
        height: 12,
        bottom: 0,
        borderColor: 'transparent',
        backgroundColor: '#1e293b',
        fillerColor: '#38BDF855',
        handleSize: '100%',
      }
    ],
    xAxis: [{ type: 'category', data: symbols.length ? symbols : ['无数据'], axisLabel: { color: '#cbd5e1', interval: 0, rotate: symbols.length > 4 ? 30 : 0 } }],
    yAxis: [{ type: 'value', splitLine: { lineStyle: { color: '#334155', type: 'dashed' } }, axisLabel: { show: false } }],
    series: [{ type: 'bar', label: { show: true, position: 'top', formatter: (p: any) => p.value >= 10000 ? (p.value / 10000).toFixed(1) + 'w' : (p.value?.toLocaleString() || '0'), color: '#0369a1', fontSize: 10 }, barWidth: '40%', data: values.length ? values : [0], itemStyle: { color: '#0369a1', borderRadius: [4, 4, 0, 0] } }]
  };
}
