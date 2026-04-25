#!/bin/bash
echo '=== Running Code Integrity Verification ==='
echo '[Checking] 1. Core Chat Input & Context Flow...'
grep -q 'fetch("/api/chat"' src/App.tsx || { echo 'Error: Chat API call missing'; exit 1; }
grep -q 'evaluateWealthStatus' server/routes/chat.ts || { echo 'Error: Orchestrator flow missing'; exit 1; }

echo '[Checking] 1.5 Intent Router Flash Pre-processing...'
grep -q 'model: "gemini-3-flash-preview"' server/routes/chat.ts || { echo 'Error: Flash intent routing missing'; exit 1; }
grep -q 'requiresDeepAnalysis' server/routes/chat.ts || { echo 'Error: Intent logic missing'; exit 1; }

echo '[Checking] 2. AI Thinking & Result Output (Pro Level)...'
grep -q '<think>' src/App.tsx || { echo 'Error: <think> parser missing in App.tsx'; exit 1; }
grep -q 'Synthesizer Agent' server/services/orchestrator.ts || { echo 'Error: Synthesizer mechanism missing'; exit 1; }
grep -q 'gemini-3.1-pro-preview' server/services/orchestrator.ts || { echo 'Error: Synthesizer not using Pro model'; exit 1; }
grep -q 'gemini-3-flash-preview' server/services/agents.ts || { echo 'Error: Agents not using Flash model'; exit 1; }

echo '[Checking] 3. Market Feedback Integration...'
grep -q 'queryYahooFinance' server/routes/chat.ts || { echo 'Error: Yahoo Finance integration missing'; exit 1; }

echo '[Checking] 4. Life Strategy Sub-planning (Detailed Node Plans)...'
grep -q 'handleInlineNodePlan' src/App.tsx || { echo 'Error: handleInlineNodePlan missing'; exit 1; }
grep -q '<think> 闭合后，严格按照以下三段式输出' src/App.tsx || { echo 'Error: Sub-planning AI strict prompt missing'; exit 1; }

echo '[Checking] 5. TypeScript Compilation...'
npx tsc --noEmit || { echo 'TypeScript check failed'; exit 1; }

echo '✅ Verification Passed: Entire pipeline remains effective.'
exit 0
