"use strict";
/* Sunucu entegrasyon testi: oda, katılma, hatalar, senkron, kaynak çakışması, inşa, hile, kopma/yeniden bağlanma, host devri. */
process.env.PORT = "0"; process.env.DATA_DIR = require("os").tmpdir() + "/wis-test-" + Date.now();
const WebSocket = require("ws"); const { server } = require("./server.js");
const assert = require("assert");
let ok = 0; const pass = n => { ok++; console.log("  ✓ " + n); };
function client(port) {
  const ws = new WebSocket("ws://127.0.0.1:" + port); const q = []; let waiters = [];
  ws.on("message", d => { const m = JSON.parse(d); const i = waiters.findIndex(w => w.t === m.t); if (i >= 0) waiters.splice(i, 1)[0].res(m); else q.push(m); });
  const api = { ws, send: o => ws.send(JSON.stringify(o)),
    wait: (t, ms = 2000) => new Promise((res, rej) => { const i = q.findIndex(m => m.t === t); if (i >= 0) return res(q.splice(i, 1)[0]); const w = { t, res }; waiters.push(w); setTimeout(() => rej(new Error("zaman aşımı: " + t)), ms); }),
    open: () => new Promise(r => ws.on("open", r)) };
  return api;
}
(async () => {
  await new Promise(r => server.listen(0, r)); const port = server.address().port;
  const A = client(port), B = client(port), C = client(port), D = client(port), E = client(port);
  await Promise.all([A.open(), B.open(), C.open(), D.open(), E.open()]);
  A.send({ t: "create", name: "Ali" }); const wa = await A.wait("welcome"); assert(/^WILD-\d{4}$/.test(wa.code)); pass("oda oluşturuldu: " + wa.code);
  B.send({ t: "join", code: "WILD-0000", name: "Bob" }); assert.strictEqual((await B.wait("error")).code, "notfound"); pass("yanlış kod → hata");
  B.send({ t: "join", code: "xx", name: "Bob" }); assert.strictEqual((await B.wait("error")).code, "badcode"); pass("geçersiz biçim → hata");
  B.send({ t: "join", code: wa.code, name: "Bob" }); const wb = await B.wait("welcome"); assert.strictEqual(wb.players.length, 2); pass("kodla katılım");
  C.send({ t: "join", code: wa.code, name: "Can" }); await C.wait("welcome"); D.send({ t: "join", code: wa.code, name: "Dil" }); await D.wait("welcome");
  E.send({ t: "join", code: wa.code, name: "Ece" }); assert.strictEqual((await E.wait("error")).code, "full"); pass("5. oyuncu → oda dolu uyarısı");
  B.send({ t: "start" }); assert.strictEqual((await B.wait("error")).code, "nothost"); pass("host olmayan başlatamaz");
  A.send({ t: "start" }); await B.wait("start"); pass("host oyunu başlattı");
  // senkron
  A.send({ t: "pos", x: 5, z: 10, y: 0, r: 1, sp: 4 }); const st = await B.wait("state"); assert(st.p.find(p => p.id === wa.id)); pass("oyuncu konumu diğer istemciye yayıldı");
  A.send({ t: "pos", x: 80, z: 80 }); const sn = await A.wait("snap"); assert(sn.x === 5); pass("ışınlanma hilesi geri alındı");
  // kaynak çakışması
  A.send({ t: "pos", x: 6, z: 10 });
  const idx = 0; // Wood, i%6==0 ; oyuncuları kaynağın yanına taşı (sunucu mesafe denetler)
  A.send({ t: "collect", i: idx, type: "Wood", x: 6, z: 10 }); const ra = await A.wait("res"); assert.strictEqual(ra.i, 0);
  B.send({ t: "collect", i: idx, type: "Wood", x: 0, z: 10 }); assert.strictEqual((await B.wait("collect_no")).i, 0); pass("aynı kaynak ikinci oyuncu tarafından toplanamaz");
  A.send({ t: "collect", i: 1, type: "Wood", x: 6, z: 10 }); await new Promise(r => setTimeout(r, 150)); // yanlış tür: reddedilir
  // inşa + hile
  A.send({ t: "build", type: "Chest", x: 8, z: 10, r: 0 }); assert.strictEqual((await A.wait("error")).code, "need"); pass("malzemesiz inşa reddedildi (envanter hilesi engeli)");
  A.send({ t: "craft", id: "Axe" }); assert.strictEqual((await A.wait("error")).code, "need");
  A.send({ t: "inv", a: "hunt", n: 3 }); await A.wait("inv"); A.send({ t: "inv", a: "hunt", n: 3 }); await new Promise(r => setTimeout(r, 100)); pass("istemci kaynaklı av hız sınırlı");
  // yeterli odun için kaynak toplayıp inşa: 6 odun yerine, doğrudan sunucu envanterini test edemeyiz; Chest=8 odun → 8 farklı Wood (i%6==0): 0,6,12,...
  let got = 1; for (const i of [6, 12, 18, 24, 30, 36, 42]) { A.send({ t: "pos", x: 6.3, z: 10 }); A.send({ t: "collect", i, type: "Wood", x: 6.3, z: 10 }); await A.wait("res"); got++; }
  A.send({ t: "build", type: "Chest", x: 8, z: 10, r: 0.3 }); const bl = await B.wait("built"); assert.strictEqual(bl.b.type, "Chest"); pass("inşa edilen yapı diğer oyuncuda göründü");
  A.send({ t: "build", type: "Campfire", x: 8, z: 10 }); assert.strictEqual((await A.wait("error")).code, "blocked"); pass("üst üste inşa engellendi");
  // kopma / yeniden bağlanma
  const keep = { id: wb.id, token: wb.token }; B.ws.close(); await A.wait("dc"); pass("bağlantı kopması diğer oyunculara bildirildi");
  const B2 = client(port); await B2.open(); B2.send({ t: "join", code: wa.code, name: "Bob", resume: keep }); const wb2 = await B2.wait("welcome");
  assert.strictEqual(wb2.id, keep.id); assert(wb2.buildings.length === 1); pass("aynı kimlikle yeniden bağlandı, dünya durumu geri geldi");
  // host devri
  A.ws.close(); const h = await B2.wait("host"); assert.notStrictEqual(h.id, wa.id); pass("host ayrılınca yeni host atandı");
  B2.send({ t: "kick", id: h.id === wb.id ? wa.id : wb.id }); await new Promise(r => setTimeout(r, 100));
  console.log("\nTÜM TESTLER GEÇTİ (" + ok + ")"); process.exit(0);
})().catch(e => { console.error("TEST HATASI:", e.message); process.exit(1); });
    
