const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
fs.copyFileSync(path.join(root, "index.html"), path.join(dist, "index.html"));
copyDir(path.join(root, "css"), path.join(dist, "css"));
copyDir(path.join(root, "js"), path.join(dist, "js"));
copyDir(path.join(root, "assets"), path.join(dist, "assets"));
copyDir(path.join(root, "shared"), path.join(dist, "shared"));
// Sunucu adresi (gizli anahtar değil): WI_SERVER_URL ortam değişkeni ile build sırasında gömülebilir
if (process.env.WI_SERVER_URL) fs.writeFileSync(path.join(dist, "js", "config.js"), "window.WI_CONFIG = " + JSON.stringify({ serverUrl: process.env.WI_SERVER_URL }) + ";\n");

// Three.js: r160 ve sonrasında build/three.min.js dağıtımdan kaldırıldı. Varsa onu kullan,
// yoksa CommonJS paketinden (three.cjs) küresel THREE nesnesi üreten bir sarmalayıcı yaz.
const threeBuild = path.join(root, "node_modules", "three", "build");
const threeMin = path.join(threeBuild, "three.min.js");
const threeCjs = path.join(threeBuild, "three.cjs");
fs.mkdirSync(path.join(dist, "js"), { recursive: true });
const threeTarget = path.join(dist, "js", "three.min.js");
if (fs.existsSync(threeMin)) {
  fs.copyFileSync(threeMin, threeTarget);
} else if (fs.existsSync(threeCjs)) {
  const src = fs.readFileSync(threeCjs, "utf8");
  fs.writeFileSync(
    threeTarget,
    "(function(root){var exports={};var module={exports:exports};\n" + src +
    "\nroot.THREE=module.exports;})(typeof window!==\"undefined\"?window:this);\n"
  );
  console.log("three.min.js bulunamadı; three.cjs sarmalayıcısı kullanıldı.");
} else {
  console.error("Three.js bulunamadı. Önce npm install çalıştırın.");
  process.exit(1);
}
console.log("Build tamamlandı: dist/");
