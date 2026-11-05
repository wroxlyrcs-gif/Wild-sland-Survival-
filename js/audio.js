/* WILD ISLAND 2.0 — prosedürel ses (WebAudio): rüzgâr, deniz, orman/cırcır, yağmur, ateş, nehir, ayak sesi, hayvan sesleri */
(() => {
"use strict";
const WI = (window.WI = window.WI || {});
let ac = null, master = null, started = false, muted = false;
const L = {}; let stepT = 0, birdT = 3, crackT = 1, howlT = 40;
function noiseBuf(sec) { const b = ac.createBuffer(1, ac.sampleRate * sec, ac.sampleRate), d = b.getChannelData(0); let last = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + .02 * w) / 1.02; d[i] = (w * .5 + last * 3.2); } return b; }
function loop(type, freq, q) { const s = ac.createBufferSource(); s.buffer = L.nb; s.loop = true; const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q || .7; const g = ac.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(master); s.start(); return { g, f }; }
function start() {
  if (started) { if (ac && ac.state === "suspended") ac.resume(); return; }
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; ac = new AC(); master = ac.createGain(); master.gain.value = muted ? 0 : .6; master.connect(ac.destination);
    L.nb = noiseBuf(3); L.wind = loop("bandpass", 420, .6); L.sea = loop("lowpass", 700, .5); L.rain = loop("highpass", 2200, .4); L.river = loop("bandpass", 1500, .8); L.cric = null; started = true;
  } catch (e) { ac = null; }
}
function burst(freq, dur, vol, type, glide, filt) {
  if (!ac) return; const t = ac.currentTime; const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur); g.connect(master);
  if (type === "noise") { const s = ac.createBufferSource(); s.buffer = L.nb; const f = ac.createBiquadFilter(); f.type = filt || "lowpass"; f.frequency.value = freq; s.connect(f); f.connect(g); s.start(t, Math.random() * 2, dur); }
  else { const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur); o.connect(g); o.start(t); o.stop(t + dur + .02); }
}
const sfx = {
  step(sprint, wet) { burst(wet ? 900 : 380, .09, sprint ? .35 : .22, "noise", 0, wet ? "bandpass" : "lowpass"); },
  collect() { burst(660, .12, .2, "triangle", 880); }, craft() { burst(300, .1, .3, "square", 520); setTimeout(() => burst(520, .14, .25, "square", 780), 110); },
  hit() { burst(180, .12, .35, "noise", 0, "lowpass"); }, hurt() { burst(120, .25, .5, "sawtooth", 70); }, eat() { burst(260, .08, .25, "noise", 0, "bandpass"); }, drink() { burst(500, .2, .2, "sine", 300); },
  bow() { burst(900, .15, .25, "noise", 0, "highpass"); }, thunder() { burst(90, 2.2, .7, "noise", 0, "lowpass"); }, alert() { burst(520, .2, .3, "square", 400); },
  animal(sp, d) { const v = Math.max(0, 1 - d / 50); if (v <= 0) return; if (sp === "wolf") burst(420, 1.3, .35 * v, "sawtooth", 260); else if (sp === "bear") burst(95, .6, .5 * v, "sawtooth", 70); else if (sp === "snake") burst(5000, .5, .25 * v, "noise", 0, "highpass"); else if (sp === "croc") burst(75, .5, .4 * v, "sawtooth", 60); else if (sp === "deer") burst(520, .25, .18 * v, "triangle", 420); else if (sp === "bird") { burst(2400, .1, .12 * v, "sine", 3200); setTimeout(() => burst(2900, .09, .1 * v, "sine", 2200), 130); } }
};
function update(dt, env) { // env: {wind, night, rain, coast(0-1), river(0-1), fire(0-1), moving, sprint, wet, nearAnimals:[{sp,d}]}
  if (!ac || muted) return; const t = ac.currentTime, ramp = (p, v) => p.g.gain.setTargetAtTime(v, t, .6);
  ramp(L.wind, .05 + env.wind * .12 + env.rain * .08); ramp(L.sea, env.coast * .22); ramp(L.rain, env.rain * .16); ramp(L.river, env.river * .22);
  if (env.moving) { stepT -= dt * (env.sprint ? 1.55 : 1); if (stepT <= 0) { stepT = .42; sfx.step(env.sprint, env.wet); } } else stepT = 0;
  birdT -= dt; if (birdT <= 0) { birdT = 2 + Math.random() * 5; if (env.night < .5 && env.rain < .4) sfx.animal("bird", 10 + Math.random() * 25); else if (env.night >= .5) burst(4200 + Math.random() * 600, .07, .05, "sine"); }
  if (env.fire > 0) { crackT -= dt; if (crackT <= 0) { crackT = .1 + Math.random() * .5; burst(2500 + Math.random() * 2500, .04, .12 * env.fire, "noise", 0, "highpass"); } }
  howlT -= dt; if (howlT <= 0) { howlT = 35 + Math.random() * 40; if (env.night > .5) sfx.animal("wolf", 25); }
  for (const a of env.nearAnimals || []) if (Math.random() < dt * .08) sfx.animal(a.sp, a.d);
}
WI.audio = { start, update, sfx, setMuted(v) { muted = v; if (master) master.gain.value = v ? 0 : .6; }, get started() { return started; } };
})();
                                                                                                                                                                                                                                     
