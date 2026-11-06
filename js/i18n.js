/* WILD ISLAND: SURVIVAL — çok dilli arayüz (TR / EN / AZ) */
(() => {
"use strict";
const WI = (window.WI = window.WI || {});

const DICT = {
  tr: {
    tagline: "Issız bir adada hayatta kal. Keşfet, kaynak topla, barınağını kur.",
    new_game: "YENİ OYUN", continue: "DEVAM ET", settings: "AYARLAR", language: "DİL SEÇİMİ", quit: "OYUNDAN ÇIKIŞ",
    health: "SAĞLIK", food: "AÇLIK", water: "SUSUZLUK", energy: "ENERJİ",
    jump: "ZIPLA", run: "KOŞ", collect: "TOPLA",
    hint_start: "Yakındaki kaynakları toplamak için TOPLA düğmesine bas.", hint_near: "TOPLA: {item}",
    map: "Harita", inventory: "Envanter", craft: "Üretim", pause: "Duraklat", close: "Kapat",
    inventory_title: "ENVANTER", craft_title: "ÜRETİM", map_title: "ADA HARİTASI", settings_title: "AYARLAR",
    pause_title: "OYUN DURAKLATILDI", language_title: "DİL SEÇİMİ", quit_title: "OYUNDAN ÇIKIŞ",
    explored: "Keşfedilen bölge:", region_beach: "Sahil", map_note: "Bu prototipte harita keşfi temel seviyededir.",
    inventory_empty: "Envanter boş.", craft_btn: "ÜRET",
    need: "Yetersiz malzeme: {item}", crafted: "{name} üretildi.", collected: "{item} toplandı.",
    nothing_near: "Yakında toplanabilecek kaynak yok.", saved: "Oyun kaydedildi.", save_failed: "Kayıt yapılamadı.",
    no_save: "Kayıt bulunamadı. Yeni oyun başlatıldı.",
    quality: "Grafik kalitesi", q_low: "Düşük", q_medium: "Orta", q_high: "Yüksek",
    sensitivity: "Kamera hassasiyeti", show_fps: "FPS göstergesi", save_settings: "KAYDET", settings_saved: "Ayarlar kaydedildi.",
    resume: "DEVAM ET", save: "KAYDET", main_menu: "ANA MENÜ",
    quit_text: "Oyundan çıkmak istediğine emin misin?", yes_quit: "ÇIK", cancel: "VAZGEÇ",
    quit_web: "Tarayıcı sekmesini kapatarak çıkabilirsin.",
    rotate_title: "Cihazını yatay çevir", rotate_text: "WILD ISLAND yalnızca yatay ekranda oynanır.",
    loading: "ADA YÜKLENİYOR...", init_fail: "Oyun başlatılamadı. Konsol hatalarını kontrol edin.",
    item_Wood: "Odun", item_Stone: "Taş", item_Fiber: "Lif", item_Berries: "Meyve", item_Banana: "Muz",
    item_Coconut: "Hindistan cevizi", item_Axe: "Balta", item_Campfire: "Kamp ateşi", item_Shelter: "Barınak", item_FishingRod: "Olta",
    r_Axe: "Balta", r_Campfire: "Kamp Ateşi", r_Shelter: "Barınak", r_FishingRod: "Olta"
  },
  en: {
    tagline: "Survive on a deserted island. Explore, gather resources, build your shelter.",
    new_game: "NEW GAME", continue: "CONTINUE", settings: "SETTINGS", language: "LANGUAGE", quit: "QUIT GAME",
    health: "HEALTH", food: "HUNGER", water: "THIRST", energy: "ENERGY",
    jump: "JUMP", run: "RUN", collect: "GATHER",
    hint_start: "Press GATHER to pick up nearby resources.", hint_near: "GATHER: {item}",
    map: "Map", inventory: "Inventory", craft: "Crafting", pause: "Pause", close: "Close",
    inventory_title: "INVENTORY", craft_title: "CRAFTING", map_title: "ISLAND MAP", settings_title: "SETTINGS",
    pause_title: "GAME PAUSED", language_title: "LANGUAGE", quit_title: "QUIT GAME",
    explored: "Explored area:", region_beach: "Beach", map_note: "Map exploration is basic in this prototype.",
    inventory_empty: "Inventory is empty.", craft_btn: "CRAFT",
    need: "Not enough materials: {item}", crafted: "{name} crafted.", collected: "{item} collected.",
    nothing_near: "Nothing to gather nearby.", saved: "Game saved.", save_failed: "Could not save.",
    no_save: "No save found. Started a new game.",
    quality: "Graphics quality", q_low: "Low", q_medium: "Medium", q_high: "High",
    sensitivity: "Camera sensitivity", show_fps: "Show FPS", save_settings: "SAVE", settings_saved: "Settings saved.",
    resume: "RESUME", save: "SAVE", main_menu: "MAIN MENU",
    quit_text: "Are you sure you want to quit the game?", yes_quit: "QUIT", cancel: "CANCEL",
    quit_web: "You can leave by closing this browser tab.",
    rotate_title: "Rotate your device", rotate_text: "WILD ISLAND can only be played in landscape.",
    loading: "LOADING ISLAND...", init_fail: "The game could not start. Check the console for errors.",
    item_Wood: "Wood", item_Stone: "Stone", item_Fiber: "Fiber", item_Berries: "Berries", item_Banana: "Banana",
    item_Coconut: "Coconut", item_Axe: "Axe", item_Campfire: "Campfire", item_Shelter: "Shelter", item_FishingRod: "Fishing rod",
    r_Axe: "Axe", r_Campfire: "Campfire", r_Shelter: "Shelter", r_FishingRod: "Fishing Rod"
  },
  az: {
    tagline: "Boş adada sağ qal. Kəşf et, ehtiyat topla, sığınacağını qur.",
    new_game: "YENİ OYUN", continue: "DAVAM ET", settings: "PARAMETRLƏR", language: "DİL SEÇİMİ", quit: "OYUNDAN ÇIXIŞ",
    health: "SAĞLAMLIQ", food: "AÇLIQ", water: "SUSUZLUQ", energy: "ENERJİ",
    jump: "TULLAN", run: "QAÇ", collect: "YIĞ",
    hint_start: "Yaxındakı ehtiyatları yığmaq üçün YIĞ düyməsinə bas.", hint_near: "YIĞ: {item}",
    map: "Xəritə", inventory: "İnventar", craft: "Hazırlama", pause: "Dayandır", close: "Bağla",
    inventory_title: "İNVENTAR", craft_title: "HAZIRLAMA", map_title: "ADA XƏRİTƏSİ", settings_title: "PARAMETRLƏR",
    pause_title: "OYUN DAYANDIRILDI", language_title: "DİL SEÇİMİ", quit_title: "OYUNDAN ÇIXIŞ",
    explored: "Kəşf edilən ərazi:", region_beach: "Sahil", map_note: "Bu prototipdə xəritə kəşfi əsas səviyyədədir.",
    inventory_empty: "İnventar boşdur.", craft_btn: "HAZIRLA",
    need: "Material çatmır: {item}", crafted: "{name} hazırlandı.", collected: "{item} yığıldı.",
    nothing_near: "Yaxınlıqda yığıla bilən ehtiyat yoxdur.", saved: "Oyun yadda saxlanıldı.", save_failed: "Yadda saxlamaq alınmadı.",
    no_save: "Yadda saxlanmış oyun tapılmadı. Yeni oyun başladıldı.",
    quality: "Qrafika keyfiyyəti", q_low: "Aşağı", q_medium: "Orta", q_high: "Yüksək",
    sensitivity: "Kamera həssaslığı", show_fps: "FPS göstəricisi", save_settings: "YADDA SAXLA", settings_saved: "Parametrlər yadda saxlanıldı.",
    resume: "DAVAM ET", save: "YADDA SAXLA", main_menu: "ANA MENYU",
    quit_text: "Oyundan çıxmaq istədiyinə əminsən?", yes_quit: "ÇIX", cancel: "LƏĞV ET",
    quit_web: "Brauzer səhifəsini bağlayaraq çıxa bilərsən.",
    rotate_title: "Cihazı üfüqi çevir", rotate_text: "WILD ISLAND yalnız üfüqi ekranda oynanılır.",
    loading: "ADA YÜKLƏNİR...", init_fail: "Oyun başladıla bilmədi. Konsol xətalarını yoxlayın.",
    item_Wood: "Odun", item_Stone: "Daş", item_Fiber: "Lif", item_Berries: "Giləmeyvə", item_Banana: "Banan",
    item_Coconut: "Hindistan qozu", item_Axe: "Balta", item_Campfire: "Tonqal", item_Shelter: "Sığınacaq", item_FishingRod: "Qarmaq",
    r_Axe: "Balta", r_Campfire: "Tonqal", r_Shelter: "Sığınacaq", r_FishingRod: "Qarmaq"
  }
};
const META = {
  tr: { name: "Türkçe", code: "TR" },
  en: { name: "English", code: "EN" },
  az: { name: "Azərbaycanca", code: "AZ" }
};

let lang = "tr";
const listeners = [];

function detect() {
  try { const s = localStorage.getItem("wis-lang"); if (s && DICT[s]) return s; } catch (e) { /* depolama yok */ }
  const n = String(navigator.language || "tr").slice(0, 2).toLowerCase();
  return DICT[n] ? n : "tr";
}
function t(key, vars) {
  let s = (DICT[lang] && DICT[lang][key]) || DICT.tr[key] || key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  return s;
}
function apply(root) {
  root = root || document;
  root.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll("[data-i18n-aria]").forEach(el => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
  root.querySelectorAll("[data-i18n-title]").forEach(el => { el.setAttribute("title", t(el.dataset.i18nTitle)); });
  document.documentElement.lang = lang;
}
function setLang(l, silent) {
  if (!DICT[l]) return;
  lang = l;
  try { localStorage.setItem("wis-lang", l); } catch (e) { /* yok say */ }
  apply();
  if (!silent) listeners.forEach(fn => { try { fn(l); } catch (e) { console.warn(e); } });
}
function init() { lang = detect(); apply(); }

WI.i18n = { t, apply, setLang, init, onChange: fn => listeners.push(fn), get lang() { return lang; }, META, langs: Object.keys(DICT), DICT };
})();
    
