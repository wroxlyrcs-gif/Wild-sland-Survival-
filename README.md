# WILD ISLAND: SURVIVAL

Three.js tabanlı, Android yatay ekran hedefli açık dünya hayatta kalma prototipi.

## Gereksinimler
- Node.js 18 veya üzeri
- npm
- Android APK için Android Studio, Android SDK ve JDK 17

## Web sürümünü çalıştırma
1. `npm install`
2. `npm run build`
3. `dist/index.html` dosyasını yerel bir web sunucusu üzerinden açın.

Örnek: `npx serve dist`

`index.html` dosyasını doğrudan `file://` üzerinden açmak her tarayıcıda güvenilir değildir.

## Android
1. `npm install`
2. İlk kurulumda: `npm run android:init` (build + `cap add android` + yatay kilit yapılandırması)
3. Sonraki değişikliklerde: `npm run android:sync`
4. `npx cap open android`

Yatay kilit `scripts/android-config.js` ile manifeste (`sensorLandscape`) yazılır; APK doğrudan yatay açılır.

Android Studio'da Build > Build Bundle(s) / APK(s) > Build APK(s) seçin.

Komut satırında:
- Windows: `cd android && gradlew.bat assembleDebug`
- macOS/Linux: `cd android && ./gradlew assembleDebug`

Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`

## Kontroller
- Sol yarı: yüzen joystick (dokunduğun yerde belirir), hareket
- Sağ yarı: parmakla kamerayı döndürme (üçüncü şahıs, karakteri hafif yukarıdan görür)
- ZIPLA: zıplama
- KOŞ: basılı tutarak koşma
- TOPLA: yakındaki kaynağı toplama
- Sağ üst: harita, envanter, üretim ve duraklatma
- Dikey tutulursa oyun durur ve "yatay çevir" uyarısı çıkar (web); APK'da dikey zaten kilitli

## 2.0 — Neler eklendi (özet; ayrıntı için RAPOR.md)
- Offline survival + online multiplayer (4 oyuncuya kadar), yeni ana menü
- 7 hayvan türü (yapay zeka, animasyon, gece/gündüz), 8 bölge, 9 adımlı görev zinciri
- Sıcaklık/yağmur/fırtına/ateş/pişirme/temiz su/uyku, 7 yeni eşya, 6 yapı tipi (kaydedilir)
- Gerçek WebSocket sunucusu: `server/server.js`

## Çevrimiçi sunucuyu çalıştırma
Yerel deneme:
```
cd server && npm install && node server.js      # ws://localhost:8080
node test.js                                    # sunucu testleri
```
Oyunda: Online Multiplayer → sunucu adresi `ws://BILGISAYAR_IP:8080` (yerel ağ) ya da `wss://alan-adiniz` (internette).
İnternette yayın için sunucuyu bir Node/Docker barındırıcıya (Render, Fly.io, Railway, VPS) kurun (`Dockerfile` hazır, kalıcı disk için `DATA_DIR=/data`).
Android APK'da `wss://` kullanın (Capacitor `https` şeması düz `ws://` bağlantısını engeller; yerel test için tarayıcı/LAN yeterlidir).
Ortam değişkenleri: `PORT`, `DATA_DIR`, `ALLOWED_ORIGINS` (virgülle ayrılmış). Sunucu adresini build sırasında gömmek için: `WI_SERVER_URL=wss://... npm run build`.
Kod içinde API anahtarı/gizli bilgi yoktur.
