# WILD ISLAND: SURVIVAL 2.0 — Değişiklik raporu

## Düzeltilen hatalar (kök neden)
1. **Açılışta takılı kalma**: `index.html`, `js/three.min.js` dosyasını bekliyor ama bu dosya yalnızca `npm run build` ile `dist/` içinde üretiliyor. Kaynak klasörden açınca `THREE` tanımsız → `game.js` en üst düzeyde hata verip yükleme ekranı sonsuza kadar açık kalıyordu. → `js/boot-guard.js` eklendi: üç saniye sonra neden başlamadığını ekranda yazar. Gerçek çözüm: `npm install && npm run build` ve `dist/` kullanmak (README'de).
2. **`state.inventory` içinde kalan "Campfire/Axe" öğeleri** ve eski kayıtlardaki ölü öğeler: kayıt v2'ye geçildi; eski v1 kayıtlar uyumlu yüklenir.
3. **Kayıt/Devam**: yapılar, görevler, keşifler, hayvan durumu, radyo parçaları, kamp ateşi yakıtı artık kaydediliyor; "Ana menü"ye dönünce otomatik kaydediliyor.
4. **Arka plana alınınca**: çevrimiçi modda oyun donmaz (sunucu zamanı akar); çevrimdışıda duraklar.
5. **Android geri tuşu**: tüm yeni pencereleri (lobi, sandık, görev, harita…) kapatır; oyunda duraklatma menüsünü açar.

## Eklenen özellikler (kodda gerçekten çalışan)
- **Menü**: Yeni Oyun, Devam Et, Online Multiplayer, Ayarlar (+ses), Oyun Hakkında, Dil, Çıkış.
- **Hayvanlar** (`js/world.js`): kurt, ayı, timsah, yılan, geyik, tavşan, kuş. Her birinin kendine ait basit 3D modeli; yürüme/koşma/bekleme animasyonu; yaşam alanı (home) ve tasma; oyuncuyu algılama; gece/gündüz davranışı (kurt geceleri avlanır, avlar geceleri yuvaya çekilir, kuşlar gece konar); ateşten/barınaktan çekinme; ilk gün temkinli, günler ilerledikçe tehlike artar; öldürülünce et düşer ve 5 dk sonra yeniden doğar.
- **Hayatta kalma**: sağlık, açlık, susuzluk, enerji, **vücut sıcaklığı**, ıslanma, yağmur/fırtına (şimşek), gece görüş mesafesi, kamp ateşi (yakıtlı), pişirme, kirli/temiz su (kaynatma), su toplama sistemi (yağmurda daha hızlı), uyuma (barınak/ateş yanında; çevrimdışıda zaman hızlanır), çanta kapasitesi (30; sırt çantasıyla 60).
- **Eşyalar**: balta, mızrak, yay+ok, el feneri (gerçek SpotLight), sırt çantası, olta (balık), su kabı. Envanterden kuşan/ye/iç.
- **İnşaat**: kamp ateşi, küçük barınak, ahşap ev, depolama sandığı (yatır/çek), su toplayıcı, savunma çiti — dünyada görünür, kaydedilir.
- **Harita/bölgeler**: orman, nehir, şelale, mağara, dağ kulesi, terk edilmiş kamp, eski radyo istasyonu; harita penceresinde oyuncu konumu + keşfedilen bölgeler.
- **Görevler**: 9 adım sırayla açılır (açıklama, hedef, ilerleme çubuğu); sinyal gönderme kulede KULLAN ile; son görevde 90 sn hayatta kalma + hayvanlar saldırgan; bitince "KURTULDUN" ekranı.
- **Ses**: rüzgâr, deniz, yağmur, nehir, ateş çıtırtısı, ayak sesi, hayvan sesleri, şimşek (WebAudio ile üretilir, ses dosyası gerekmez).
- **Mobil**: sol joystick/sağ kamera mevcut; yeni KULLAN, UYU, görev, oyuncu listesi düğmeleri.

## Çevrimiçi multiplayer (gerçek WebSocket sunucusu: `server/server.js`)
- Oda oluştur (açık) / Arkadaşlarla oyna (gizli) / Hızlı katıl / Kodla katıl; kod `WILD-NNNN`, benzersiz; kopyala + paylaş; en fazla 4 oyuncu; dolu/yanlış kod uyarıları; lobi; host başlatır, çıkarır; host ayrılınca yeni host.
- Senkron: oyuncu konum/yön/animasyon/sağlık-ihtiyaç değerleri (10 Hz), kaynaklar, envanter, yapılar, sandık, görev, radyo parçaları, gün/hava, hayvanlar (host simüle eder, diğerleri yumuşak izler).
- Güvenlik: sunucu envanterin tek doğruluk kaynağı (toplama/üretim/inşa/yemek sunucuda doğrulanır; malzemesiz inşa reddedilir), kaynak çift toplama engeli, ışınlanma/hız hilesi geri alınır, mesafe doğrulaması, mesaj boyutu ve hız sınırı, ad temizleme, kaynak sabit tohum ve tür doğrulaması, origin listesi (`ALLOWED_ORIGINS`).
- Bağlantı kopması: 5 dakika boyunca aynı kimlikle yeniden bağlanma; istemci üstel geri çekilmeyle otomatik dener ve ekranda uyarı gösterir; vazgeçerse çevrimdışı menüye döner.
- Kayıt: oda dünyası + oyuncu envanter/durumu sunucuda `DATA_DIR`'e JSON olarak yazılır (10 sn).

## Yapılan testler (bu ortamda)
- `server/test.js` — 17/17 geçti (oda kodu, katılım, dolu oda, yanlış kod, host denetimi, senkron, ışınlanma engeli, çift toplama, hile, inşa, kopma/yeniden bağlanma, host devri).
- Uçtan uca duman testi (sahte THREE/DOM + gerçek sunucu + gerçek istemci kodu, iki istemci): yeni oyun, 600 kare, hayvan YZ gece/gündüz, inşa (6 tip), üretim, saldırı/av, yemek, kayıt/devam, ölüm/yeniden doğma, oda oluştur → kodla katıl → başlat → konum senkronu → tek kaynak → hayvan senkronu → kopma → yeniden bağlanma: **hepsi geçti**.

## DÜRÜST SINIRLAR — henüz yapılmayanlar / doğrulanamayanlar
- **Gerçek tarayıcıda/telefonda çalıştırılıp görsel olarak doğrulanmadı.** Bu ortamda internet ve Android SDK yok; `npm install`, `npm run build` ve APK derlemesi çalıştırılamadı. Mantık testleri sahte (stub) 3D ile yapıldı; görünüm, FPS ve dokunmatik his sizin cihazınızda denenmeli.
- **Sunucuyu internete kurmanız gerekir** (Render/Fly/VPS). Kurulana kadar online mod "bağlanılamadı" der (sahte çalışma yok). Telefonlarda `wss://` (TLS) gerekir.
- Arazi düz (yükseklik haritası yok); bölgeler yer işaretleri ve alanlarla belirlenir. Karakter/hayvan modelleri basit kutu tabanlıdır, yüksek poligonlu gerçekçilik değildir. Şelale/nehir basit düzlemlerdir.
- Çevrimiçi: stat değerleri (sağlık vb.) istemciden gelir (sunucu aralık denetler, kuralları sunucuda yeniden hesaplamaz); hayvan hasarını host hesaplar (host hileli olabilir). Görev ilerlemesi istemcilerden gelir, sunucu yalnızca sıra/üst sınır denetler. Tam yetkili sunucu simülasyonu sonraki adım.
- Çevrimiçi bir oyuncu ölünce yeniden doğar; envanter korunur. Sandık yalnızca yakındayken. Sohbet mesajı altyapısı sunucuda var, arayüzü yok.
- AZ dilinde yeni metinler Türkçe görünür.
