/*
 * WILD ISLAND: SURVIVAL — Android yapılandırma betiği
 *
 * `npx cap add android` ile oluşturulan android/ klasörünü şu şekilde ayarlar:
 *   1. AndroidManifest.xml  -> MainActivity için android:screenOrientation="sensorLandscape"
 *      (APK açıldığı anda doğrudan yatay; dikey ekran kullanılamaz, iki yatay yön de desteklenir)
 *   2. MainActivity.java    -> tam ekran (sistem çubukları gizli), çentik alanına yayılma, ekran açık kalsın
 *
 * Betik tekrar tekrar çalıştırılabilir (idempotent). Kullanım:
 *   node scripts/android-config.js [proje-kök-dizini]
 * `npm run android:init` ve `npm run android:sync` bunu otomatik çalıştırır.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(process.argv[2] || path.join(__dirname, ".."));
const androidDir = path.join(root, "android");
const manifestPath = path.join(androidDir, "app", "src", "main", "AndroidManifest.xml");
const MARKER = "WILD_ISLAND_CONFIG";

if (!fs.existsSync(manifestPath)) {
  console.error("android/ klasörü bulunamadı. Önce şunu çalıştırın: npx cap add android");
  process.exit(1);
}

/* ---------- 1) AndroidManifest.xml ---------- */
let manifest = fs.readFileSync(manifestPath, "utf8");
const activityTags = manifest.match(/<activity\b[^>]*>/g) || [];
const mainTag = activityTags.find(t => /android:name="[^"]*MainActivity"/.test(t));
if (!mainTag) {
  console.error("AndroidManifest.xml içinde MainActivity bulunamadı.");
  process.exit(1);
}
let newTag;
if (/android:screenOrientation="[^"]*"/.test(mainTag)) {
  newTag = mainTag.replace(/android:screenOrientation="[^"]*"/, 'android:screenOrientation="sensorLandscape"');
} else {
  newTag = mainTag.replace(/^<activity\b/, '<activity\n            android:screenOrientation="sensorLandscape"');
}
// Yön değişiminde activity yeniden başlamasın (oyun durumu korunur)
const need = ["orientation", "screenSize", "smallestScreenSize", "screenLayout", "keyboardHidden"];
const cc = newTag.match(/android:configChanges="([^"]*)"/);
if (cc) {
  const have = cc[1].split("|");
  const merged = [...new Set([...have, ...need])].join("|");
  newTag = newTag.replace(cc[0], `android:configChanges="${merged}"`);
} else {
  newTag = newTag.replace(/^<activity\b/, `<activity\n            android:configChanges="${need.join("|")}"`);
}
if (newTag !== mainTag) {
  manifest = manifest.replace(mainTag, newTag);
  fs.writeFileSync(manifestPath, manifest);
  console.log("AndroidManifest.xml güncellendi: screenOrientation=sensorLandscape");
} else {
  console.log("AndroidManifest.xml zaten yatay kilitli.");
}

/* ---------- 2) MainActivity.java ---------- */
const cfg = JSON.parse(fs.readFileSync(path.join(root, "capacitor.config.json"), "utf8"));
const pkg = cfg.appId;
const activityPath = path.join(androidDir, "app", "src", "main", "java", ...pkg.split("."), "MainActivity.java");
const activitySource = `package ${pkg};

// ${MARKER}: bu dosya scripts/android-config.js tarafından yönetilir.
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            // Yatayda çentik/kamera deliği olan ekranlarda görüntü kenara kadar uzansın
            getWindow().getAttributes().layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
        hideSystemBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    private void hideSystemBars() {
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.hide(WindowInsetsCompat.Type.systemBars());
    }
}
`;
if (!fs.existsSync(activityPath)) {
  fs.mkdirSync(path.dirname(activityPath), { recursive: true });
  fs.writeFileSync(activityPath, activitySource);
  console.log("MainActivity.java oluşturuldu.");
} else {
  const current = fs.readFileSync(activityPath, "utf8");
  const isStock = /extends\s+BridgeActivity\s*\{\s*\}/.test(current);
  if (current.includes(MARKER) || isStock) {
    if (current !== activitySource) {
      fs.writeFileSync(activityPath, activitySource);
      console.log("MainActivity.java güncellendi (tam ekran + çentik).");
    } else console.log("MainActivity.java güncel.");
  } else {
    console.warn("MainActivity.java özelleştirilmiş görünüyor; dokunulmadı. Yatay kilit manifest ile zaten sağlanıyor.");
  }
}
console.log("Android yapılandırması tamam.");
