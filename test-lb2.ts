import 'dotenv/config';
import fetch from 'node-fetch';

async function test() {
    const lbToken = process.env.LONGBRIDGE_ACCESS_TOKEN || process.env.LONGBRIDGE_API_KEY;
    if (!lbToken) {
        console.log("No token");
        return;
    }
    const headers: any = { 'Content-Type': 'application/json' };
    if (lbToken.length > 50) {
        headers['Authorization'] = `Bearer ${lbToken}`;
    } else {
        headers['X-API-Key'] = lbToken;
    }
    console.log("Fetching...");
    const res = await fetch("https://openapi.longbridgeapp.com/v1/asset/stock", { headers });
    const text = await res.text();
    console.log("Result:", text);
}

test();
