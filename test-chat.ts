import fetch from 'node-fetch';

async function test() {
  const res = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Hello', contextData: {} })
  });
  
  const text = await res.text();
  console.log(text);
}
test();
