// 3つのデモサイトをPC/スマホの2サイズで撮影する（Edge headless + CDP）
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const OUT = "C:\\Users\\my\\tproject-site\\assets\\img\\works";
const PORT = 9333;
const DEMOS = ["auto", "reform", "salon"];
const SIZES = {
  pc: { w: 1440, h: 900, mobile: false, scale: 1 },
  sp: { w: 390, h: 802, mobile: true, scale: 2 },
};
mkdirSync(OUT, { recursive: true });

const edge = spawn(EDGE, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${process.env.TEMP}\\edge-cdp-shots`,
  "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitForDevtools() {
  for (let i = 0; i < 50; i++) {
    try { return await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); } catch { await sleep(200); }
  }
  throw new Error("devtools not up");
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.events = [];
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && this.pending.has(d.id)) { const { res, rej } = this.pending.get(d.id); this.pending.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } else if (d.method) this.events.push(d.method); }; }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((res, rej) => this.pending.set(id, { res, rej })); }
}

const targets = await waitForDevtools();
const page = targets.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
const cdp = new CDP(ws);
await cdp.send("Page.enable");
await cdp.send("Runtime.enable");

for (const demo of DEMOS) {
  for (const [name, s] of Object.entries(SIZES)) {
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: s.w, height: s.h, deviceScaleFactor: s.scale, mobile: s.mobile });
    if (s.mobile) await cdp.send("Emulation.setUserAgentOverride", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" });
    else await cdp.send("Emulation.setUserAgentOverride", { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36" });
    await cdp.send("Page.navigate", { url: `http://localhost:8765/demo/${demo}/?shot=${Date.now()}` });
    await sleep(1500);
    // デモ告知バーを隠し、出現アニメーションを完了状態にする
    await cdp.send("Runtime.evaluate", { expression: `
      (()=>{const st=document.createElement('style');st.textContent='.demo-bar{display:none!important} *{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important}';document.head.appendChild(st);
      document.querySelectorAll('[class*="reveal"],[class*="fade"],[data-reveal]').forEach(e=>{e.classList.add('in','is-in','visible','show','active');e.style.opacity='1';e.style.transform='none';});
      window.scrollTo(0,1);window.scrollTo(0,0);return document.images.length;})()` });
    await sleep(2500);
    const imgs = await cdp.send("Runtime.evaluate", { expression: `[...document.images].filter(i=>i.getBoundingClientRect().top<${s.h}).map(i=>i.complete&&i.naturalWidth>0).every(Boolean)`, returnByValue: true });
    const shot = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 84, clip: { x: 0, y: 0, width: s.w, height: s.h, scale: 1 }, captureBeyondViewport: false });
    const file = `${OUT}\\${demo}_${name}.jpg`;
    writeFileSync(file, Buffer.from(shot.data, "base64"));
    console.log(`${demo}_${name}.jpg  imagesLoaded=${imgs.result.value}`);
  }
}
ws.close();
edge.kill();
