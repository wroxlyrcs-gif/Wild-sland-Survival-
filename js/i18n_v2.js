/* 2.0 ek metinler (TR + EN; AZ eksik anahtarlarda TR'ye düşer) */
(() => {
const D = window.WI.i18n.DICT;
Object.assign(D.tr, {
  online_mp: "ONLINE MULTIPLAYER", about: "OYUN HAKKINDA", temp: "VÜCUT SICAKLIĞI", use: "KULLAN", sleep: "UYU", quests: "Görevler", players: "Oyuncular",
  tab_items: "EŞYALAR", tab_build: "İNŞAAT", sound: "Ses", bag: "ÇANTA", chest_store: "SANDIK",
  about_text: "WILD ISLAND: SURVIVAL 2.0 — Uçak kazasından sonra gizemli bir adada mahsur kaldın. Hayatta kal, barınak kur, radyo parçalarını topla, dağdaki kuleden kurtarma sinyali gönder. Tek başına (çevrimdışı) ya da 4 kişiye kadar arkadaşlarınla (online) oyna.",
  win_title: "KURTULDUN!", win_text: "Kurtarma ekibi adaya ulaştı. Adadan sağ salim ayrıldın.", dead_title: "ÖLDÜN", dead_text: "Ada acımasız. Sahilde yeniden doğacaksın.", respawn: "YENİDEN DOĞ",
  srv_url: "Sunucu adresi", nick: "Takma ad", ol_create: "ODA OLUŞTUR", ol_quick: "HIZLI KATIL", ol_friends: "ARKADAŞLARLA OYNA", ol_join: "Oda kodu", ol_join_btn: "ODAYA KATIL",
  room_code: "ODA KODU", copy: "KOPYALA", share: "PAYLAŞ", leave: "AYRIL", start_game: "OYUNU BAŞLAT", copied: "Oda kodu kopyalandı.",
  waiting_host: "Oda sahibinin oyunu başlatması bekleniyor…", need_players: "Oda dolana kadar ya da hazır olunca başlatabilirsin.", host_badge: "OTURUM SAHİBİ", kick: "ÇIKAR", offline_tag: "bağlantı yok",
  err_nourl: "Sunucu adresi girin (örn. wss://sunucu.com).", err_connect: "Sunucuya bağlanılamadı. Adresi ve internetini kontrol et.", err_badcode: "Geçersiz oda kodu.", err_notfound: "Oda bulunamadı.", err_full: "Oda dolu (en fazla 4 oyuncu).", err_started: "Bu oyun zaten başladı.",
  connecting: "Bağlanılıyor…", net_lost: "Bağlantı kesildi. Yeniden bağlanılıyor…", net_back: "Yeniden bağlandı.", net_gone: "Sunucuya yeniden bağlanılamadı. Çevrimdışı menüye dönüldü.", kicked: "Odadan çıkarıldın.", new_host: "Yeni oda sahibi: {name}",
  offline_only: "Çevrimdışı oyun", ping: "Gecikme",
  use_attack: "Saldır", use_fish: "Balık tut", use_nothing: "Burada yapılacak bir şey yok.", full_bag: "Çanta dolu! (Sırt çantası kapasiteyi artırır)",
  item_Spear: "Mızrak", item_Bow: "Yay", item_Arrow: "Ok", item_Flashlight: "El feneri", item_Backpack: "Sırt çantası", item_WaterBottle: "Su kabı", item_RawMeat: "Çiğ et", item_CookedMeat: "Pişmiş et",
  item_RawFish: "Çiğ balık", item_CookedFish: "Pişmiş balık", item_DirtyWater: "Kirli su", item_CleanWater: "Temiz su", item_RadioPart: "Radyo parçası", item_WoodHouse: "Ahşap ev", item_Chest: "Depolama sandığı", item_WaterCollector: "Su toplama sistemi", item_Defense: "Savunma yapısı",
  r_Spear: "Mızrak", r_Bow: "Yay", r_Arrow: "Ok ×5", r_Flashlight: "El feneri", r_Backpack: "Sırt çantası", r_WaterBottle: "Su kabı", r_Campfire: "Kamp ateşi", r_Shelter: "Küçük barınak", r_WoodHouse: "Ahşap ev", r_Chest: "Depolama sandığı", r_WaterCollector: "Su toplama sistemi", r_Defense: "Savunma yapısı",
  build_btn: "İNŞA ET", equip: "KUŞAN", equipped: "KUŞANILDI", eat: "YE", drink: "İÇ", placed: "{name} inşa edildi.", too_close: "Burada inşa edilemez.", crafted_eq: "{name} üretildi.",
  eaten: "Yedin.", drunk: "İçtin.", dirty_drink: "Kirli su! Hastalanabilirsin.", cooked: "Pişirildi.", boiled: "Su kaynatıldı: temiz su.", refueled: "Ateş harlandı.", filled: "Su kabı dolduruldu (kirli su).", fishing: "Olta atıldı…", fish_caught: "Balık yakaladın!", fish_miss: "Balık kaçtı.", hunt_ok: "Av: {item} ×{n}",
  slept: "Dinlendin.", cant_sleep: "Uyumak için barınakta ya da ateşin yanında ol.", sleeping: "Uyuyorsun…", hurt_by: "{sp} saldırdı!", cold_warn: "Üşüyorsun! Ateş yak ya da barınağa gir.", night_warn: "Gece çöküyor. Işık ve barınak bul.", storm_warn: "Fırtına geliyor!",
  sp_wolf: "Kurt", sp_bear: "Ayı", sp_croc: "Timsah", sp_snake: "Yılan", sp_deer: "Geyik", sp_rabbit: "Tavşan", sp_bird: "Kuş",
  reg_beach: "Sahil", reg_forest: "Yoğun Orman", reg_river: "Nehir", reg_falls: "Şelale", reg_cave: "Mağara", reg_camp: "Terk Edilmiş Kamp", reg_radio: "Eski Radyo İstasyonu", reg_tower: "Dağ Kulesi",
  discovered: "Yeni bölge keşfedildi: {name}", day_n: "Gün {n}", quest_done: "Görev tamamlandı!", quest_new: "Yeni görev: {name}", locked: "Kilitli", done: "Tamamlandı", active: "Aktif",
  q_survive: "Hayatta kal", q_survive_d: "Kazadan sonra adada ilk günü atlat.", q_supplies: "Yiyecek ve su bul", q_supplies_d: "Muz, hindistan cevizi ya da meyve topla; su iç.",
  q_shelter: "Barınak inşa et", q_shelter_d: "İnşaat menüsünden küçük barınak ya da ahşap ev yap.", q_camp: "Terk edilmiş kampı keşfet", q_camp_d: "Adanın kuzeybatısındaki eski kampı bul. (Haritaya bak)",
  q_radio: "Eski radyo istasyonunu bul", q_radio_d: "Güneydoğudaki radyo istasyonuna git.", q_parts: "Radyo parçalarını topla", q_parts_d: "Kampta, istasyonda ve mağarada sarı radyo parçaları var.",
  q_tower: "Dağdaki iletişim kulesine ulaş", q_tower_d: "Kuzeydeki yüksek tepedeki kuleye çık.", q_signal: "Kurtarma sinyalini gönder", q_signal_d: "Kulenin yanında KULLAN düğmesine bas (3 radyo parçası gerekir).",
  q_rescue: "Son kurtarma görevi", q_rescue_d: "Kule çevresinde 90 saniye hayatta kal. Hayvanlar bu sırada daha saldırgan!",
  goal_progress: "{a}/{b}", signal_sent: "Sinyal gönderildi! Kurtarma yolda — kuleyi savun!", need_parts: "3 radyo parçası gerekli.", part_found: "Radyo parçası bulundu!", chest_full: "Sandık dolu."
});
Object.assign(D.en, {
  online_mp: "ONLINE MULTIPLAYER", about: "ABOUT", temp: "BODY TEMP", use: "USE", sleep: "SLEEP", quests: "Quests", players: "Players",
  tab_items: "ITEMS", tab_build: "BUILD", sound: "Sound", bag: "BAG", chest_store: "CHEST",
  about_text: "WILD ISLAND: SURVIVAL 2.0 — After a plane crash you are stranded on a mysterious island. Survive, build shelter, collect radio parts and send a rescue signal from the mountain tower. Play solo (offline) or with up to 4 friends (online).",
  win_title: "RESCUED!", win_text: "The rescue team reached the island. You escaped alive.", dead_title: "YOU DIED", dead_text: "The island is merciless. You will respawn on the beach.", respawn: "RESPAWN",
  srv_url: "Server address", nick: "Nickname", ol_create: "CREATE ROOM", ol_quick: "QUICK JOIN", ol_friends: "PLAY WITH FRIENDS", ol_join: "Room code", ol_join_btn: "JOIN ROOM",
  room_code: "ROOM CODE", copy: "COPY", share: "SHARE", leave: "LEAVE", start_game: "START GAME", copied: "Room code copied.",
  waiting_host: "Waiting for the host to start…", need_players: "Start whenever you are ready.", host_badge: "HOST", kick: "KICK", offline_tag: "offline",
  err_nourl: "Enter a server address (e.g. wss://server.com).", err_connect: "Could not reach the server.", err_badcode: "Invalid room code.", err_notfound: "Room not found.", err_full: "Room is full (max 4).", err_started: "That game already started.",
  connecting: "Connecting…", net_lost: "Connection lost. Reconnecting…", net_back: "Reconnected.", net_gone: "Could not reconnect. Returned to offline menu.", kicked: "You were removed from the room.", new_host: "New host: {name}",
  offline_only: "Offline game", ping: "Ping",
  use_nothing: "Nothing to do here.", full_bag: "Bag is full! (A backpack adds capacity)",
  item_Spear: "Spear", item_Bow: "Bow", item_Arrow: "Arrow", item_Flashlight: "Flashlight", item_Backpack: "Backpack", item_WaterBottle: "Water bottle", item_RawMeat: "Raw meat", item_CookedMeat: "Cooked meat",
  item_RawFish: "Raw fish", item_CookedFish: "Cooked fish", item_DirtyWater: "Dirty water", item_CleanWater: "Clean water", item_RadioPart: "Radio part", item_WoodHouse: "Wooden house", item_Chest: "Storage chest", item_WaterCollector: "Water collector", item_Defense: "Defense barrier",
  r_Spear: "Spear", r_Bow: "Bow", r_Arrow: "Arrow ×5", r_Flashlight: "Flashlight", r_Backpack: "Backpack", r_WaterBottle: "Water bottle", r_Campfire: "Campfire", r_Shelter: "Small shelter", r_WoodHouse: "Wooden house", r_Chest: "Storage chest", r_WaterCollector: "Water collector", r_Defense: "Defense barrier",
  build_btn: "BUILD", equip: "EQUIP", equipped: "EQUIPPED", eat: "EAT", drink: "DRINK", placed: "{name} built.", too_close: "Cannot build here.",
  sp_wolf: "Wolf", sp_bear: "Bear", sp_croc: "Crocodile", sp_snake: "Snake", sp_deer: "Deer", sp_rabbit: "Rabbit", sp_bird: "Bird",
  reg_beach: "Beach", reg_forest: "Dense Forest", reg_river: "River", reg_falls: "Waterfall", reg_cave: "Cave", reg_camp: "Abandoned Camp", reg_radio: "Old Radio Station", reg_tower: "Mountain Tower",
  discovered: "New area discovered: {name}", day_n: "Day {n}", locked: "Locked", done: "Done", active: "Active",
  q_survive: "Survive", q_survive_d: "Make it through your first day.", q_supplies: "Find food and water", q_supplies_d: "Gather bananas, coconuts or berries; drink water.",
  q_shelter: "Build a shelter", q_shelter_d: "Use the Build tab to make a shelter or house.", q_camp: "Explore the abandoned camp", q_camp_d: "Find the old camp in the north-west.",
  q_radio: "Find the old radio station", q_radio_d: "Head to the radio station in the south-east.", q_parts: "Collect radio parts", q_parts_d: "Yellow radio parts lie at the camp, station and cave.",
  q_tower: "Reach the mountain tower", q_tower_d: "Climb the hill with the tower in the north.", q_signal: "Send the rescue signal", q_signal_d: "Press USE next to the tower (needs 3 radio parts).",
  q_rescue: "Final rescue", q_rescue_d: "Survive 90 seconds near the tower. Animals are more aggressive!",
  signal_sent: "Signal sent! Rescue is coming — defend the tower!", need_parts: "Need 3 radio parts.", part_found: "Radio part found!"
});
Object.assign(D.tr, {
  mode_title: "OYUN MODU", mode_surv: "HAYATTA KALMA", mode_surv_d: "Sonsuz hayatta kalma. Ev kur, ateş yak; meşale, sopa ve sivri tuzak yap. Her gece kurtlar ve vahşi hayvanlar sana saldırır, gün geçtikçe sayıları artar.",
  mode_story: "HİKÂYE (KURTULUŞ)", mode_story_d: "Görevleri tamamla, radyo parçalarını bul, kuleden sinyal gönder ve adadan kurtul.",
  raid_warn: "🐺 Gece oldu! Kurtlar ve vahşi hayvanlar sana doğru geliyor!", raid_end: "Gün doğuyor, hayvanlar çekiliyor.", surv_line: "Gün {n} · En iyi: {best}",
  surv_start: "Hayatta kal! Geceleri vahşi hayvanlar gelir: ateş, barınak ya da meşale hazırla.", dead_surv: "{n} gün hayatta kaldın. Sahilde yeniden doğacaksın.", torch_out: "Meşale söndü.",
  ol_new_code: "Oda kodu (kendin yaz)", ol_create_go: "ODAYI OLUŞTUR", err_taken: "Bu oda kodu kullanımda. Başka bir kod yaz.", err_badcode: "Oda kodu 3-16 karakter olmalı (harf, rakam, tire).", mode_label: "Mod",
  item_Torch: "Meşale", item_Club: "Sopa", item_SpikeTrap: "Sivri tuzak", r_Torch: "Meşale (hayvanları korkutur)", r_Club: "Sopa", r_SpikeTrap: "Sivri tuzak"
});
Object.assign(D.en, {
  mode_title: "GAME MODE", mode_surv: "SURVIVAL", mode_surv_d: "Endless survival. Build a base, light fires, craft torches, clubs and spike traps. Every night wolves and wild animals hunt you, and more come as days pass.",
  mode_story: "STORY (ESCAPE)", mode_story_d: "Finish the quests, find the radio parts, send a signal from the tower and escape the island.",
  raid_warn: "🐺 Night has fallen! Wolves and wild animals are coming for you!", raid_end: "Dawn breaks, the animals retreat.", surv_line: "Day {n} · Best: {best}",
  surv_start: "Survive! Wild animals come at night: prepare a fire, shelter or torch.", dead_surv: "You survived {n} days. You will respawn on the beach.", torch_out: "The torch burned out.",
  ol_new_code: "Room code (type your own)", ol_create_go: "CREATE ROOM", err_taken: "That room code is taken. Try another.", err_badcode: "Room code must be 3-16 characters (letters, digits, dash).", mode_label: "Mode",
  item_Torch: "Torch", item_Club: "Club", item_SpikeTrap: "Spike trap", r_Torch: "Torch (scares animals)", r_Club: "Club", r_SpikeTrap: "Spike trap"
});
})();
