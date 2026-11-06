/* WILD ISLAND 2.0 — çok oyunculu ağ istemcisi (WebSocket). Sunucu: /server/server.js */
(() => {
"use strict";
const WI = (window.WI = window.WI || {});
const handlers = {}; let ws = null, url = "", status = "offline", resume = null, retry = 0, retryT = 0, pingT = 0, latency = 0, wantOpen = false, pendingOpen = null, lastSend = 0;
const listeners = [];
const setStatus = s => { status = s; listeners.forEach(f => { try { f(s); } catch (e) {} }); };
function loadResume() { try { return JSON.parse(localStorage.getItem("wis-resume") || "null"); } catch (e) { return null; } }
function saveResume(r) { resume = r; try { if (r) localStorage.setItem("wis-resume", JSON.stringify(r)); else localStorage.removeItem("wis-resume"); } catch (e) {} }
function normUrl(u) { u = String(u || "").trim(); if (!u) return ""; if (!/^wss?:\/\//i.test(u)) u = (/^(localhost|127\.|192\.168\.|10\.)/.test(u) ? "ws://" : "wss://") + u; return u; }
function connect(u) {
  return new Promise((res, rej) => {
    url = normUrl(u); if (!url) return rej(new Error("no_url"));
    if (ws && ws.readyState <= 1) { try { ws.close(); } catch (e) {} }
    wantOpen = true; setStatus("connecting"); let done = false;
    const to = setTimeout(() => { if (!done) { done = true; try { ws.close(); } catch (e) {} rej(new Error("timeout")); } }, 8000);
    try { ws = new WebSocket(url); } catch (e) { clearTimeout(to); return rej(e); }
    ws.onopen = () => { clearTimeout(to); done = true; retry = 0; setStatus("connected"); res(); };
    ws.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } if (m.t === "pong") { latency = Math.round(performance.now() - m.c); } const h = handlers[m.t]; if (h) h.forEach(f => { try { f(m); } catch (e) { console.error(e); } }); };
    ws.onerror = () => {};
    ws.onclose = () => { clearTimeout(to); if (!done) { done = true; rej(new Error("closed")); } if (status !== "offline") { setStatus(wantOpen ? "reconnecting" : "offline"); if (wantOpen) scheduleRetry(); } };
  });
}
function scheduleRetry() { clearTimeout(retryT); const wait = Math.min(8000, 800 * Math.pow(1.6, retry++)); retryT = setTimeout(async () => { if (!wantOpen) return; try { await connect(url); const r = resume || loadResume(); if (r && r.code) { send({ t: "join", code: r.code, name: r.name, resume: { id: r.id, token: r.token } }); } } catch (e) { if (wantOpen && retry < 30) scheduleRetry(); else { setStatus("offline"); (handlers._lost || []).forEach(f => f()); } } }, wait); }
function send(o) { if (ws && ws.readyState === 1) { ws.send(JSON.stringify(o)); return true; } return false; }
function on(t, f) { (handlers[t] = handlers[t] || []).push(f); }
function disconnect() { wantOpen = false; clearTimeout(retryT); saveResume(null); setStatus("offline"); try { ws && ws.close(); } catch (e) {} ws = null; }
setInterval(() => { if (status === "connected") send({ t: "ping", c: performance.now() }); }, 4000);
WI.net = { connect, send, on, disconnect, saveResume, loadResume, onStatus: f => listeners.push(f), get status() { return status; }, get latency() { return latency; }, get connected() { return status === "connected"; }, normUrl, getResume: () => resume || loadResume() };
})();
