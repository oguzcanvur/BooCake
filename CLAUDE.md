# BooCake — CENG361 Oyun Projesi

Bu dosya projenin ortak hafızasıdır (ekip + Claude). Önemli kararlar buraya yazılır.

## Proje
- **Ad:** BooCake — canavarlara cupcake satan, zamana karşı sipariş hazırlama oyunu (tarayıcıda, sadece fare).
- **Ders:** CENG 361 Innovative Game Design (Activity 3). Sınıfta dizüstünden tarayıcıda gösterilecek.
- **Ekip:** Oğuzcan Vur (@oguzcanvur, repo sahibi), Ceren Candemir (@CerenCandemir), Karya Altundal (@KaryaAltundal).
- **Repo:** https://github.com/oguzcanvur/BooCake (private)
- **Çalışma modeli:** Ekip **kod yazmaz**, prompt verir. Kurulum, kod, test, git işlerini Claude yapar. Ekip karar verir, oynayıp test eder, PR'ları onaylar.
- **Geçerli tasarım:** [docs/game-design-v2.md](docs/game-design-v2.md) (ekibin ayrıntılı dokümanı). Eski [game-design.md](docs/game-design.md) ile çelişirse v2 kazanır.

## Teknik kararlar
- Phaser 4.2.1 + TypeScript 7 + Vite 8 (Node v24). Önce Godot seçilmişti; Claude editörü kullanamadığı için Phaser'a geçildi.
- **Teslim:** `npm run build` → `dist/BooCake.html` **tek dosya**, çift tıklayınca açılır (asset'ler base64 olarak kodun içinde; `tools/make-single.mjs` JS/CSS'i HTML'e gömer). `file://` ile doğrulandı.
- Geliştirme: `npm install`, `npm run dev` → http://localhost:5173. Kontrol: `npm run typecheck`.
- Arayüz dili Türkçe; tüm metinler `src/text.ts`'te (çeviri için sadece orası değişir). Yazı tipi Fredoka (latin + latin-ext).
- Asset'ler: Kenney CC0 paketleri (UI Pack, Particle Pack, Interface/Impact Sounds). Canavarlar ekibin verdiği örnek çizime göre (ince koyu-mor kontur, pastel düz renk, allık, tezgâha yaslanan eller) `src/objects/MonsterView.ts` içinde kodla çizilir; tarifleri `src/data/monsters.ts`. Cupcake, fırın, istasyon ve dekorlar da kodla çizilir. Dosyalar `src/assets/` altında. Lisanslar [CREDITS.md](CREDITS.md).
- Görsel referans notu: Doküman 16. bölüm var olan bir oyunun görsellerinin kopyalanmasını yasaklıyor; "Good Pizza, Great Pizza"dan sadece tür ortakları (tezgâh + sipariş balonu + istasyonlar) alındı.

## Oyun kuralları (kodda olan)
Tüm sayılar tek yerde: `src/data/gameConfig.ts` (`CONFIG`).
- **Akış:** hamur kâsesine tık → boş fırına girer (5 sn'de pişer, 10 sn'de yanar) → pişen/yanan keke tık → tabağa geçer → krema → topping (krema önce) → müşteriye tık ya da hazır tepsiye koy (2 slot; tepsideki keke tık seçer, sonra müşteriye tık). Çöp kutusu seçili şeyi (tabak/tepsi/fırındaki yanık kek) atar. Yanık kek süslenemez ve verilemez.
- **Ödeme:** doğru cupcake $5 + ruh haline göre bahşiş (mutlu +5, huzursuz +2, sinirli 0). Yanlış cupcake yok olur, müşterinin sabrı %20 düşer.
- **Gün:** 150 sn, 3 koltuk. 4 gün: hedef $60/90/120/150, müşteri aralığı 12/10/8/7 sn, sabır 30/27/24/22 sn. Yıldız: hedefin %100/130/160'ı. Para sadece hedefi geçilen günlerde cüzdana eklenir; başarısız gün tekrarlanır.
- **Karakterler:** normal müşteriler zombi, zombi kız, mumya, kurt adam, balçık. Vampirin 3 görünümü (pelerinli, vampir kız, vampir çocuk) rastgele gelir (`SPECIAL_VARIANTS`). Yeni karakter = `src/data/monsters.ts`'e bir kayıt (ekibin referans çizimlerine göre).
- **Özel canavarlar** (her gün her açık olan en az bir kez gelir): vampir (gün 2+, ısırınca 5 sn tıklama kilidi + kırmızı ekran, fırın çalışır), hayalet (gün 2+, keki düşürür ama tam öder, sabrı yavaş azalır), hırsız (gün 3+, koltuk almaz, tepsideki tüm kekleri çalar).
- **Dükkân** (günler arası, kalıcı): Sarımsak $40 (vampir ısırmaz), Güvenlik $60 (hırsız yakalanır, +$5), 3. fırın $50.
- **Ekranlar:** Menü, Nasıl Oynanır, Gün (yeni canavar kartları), Gün özeti, Dükkân, Final.
- **Yok:** Frankenstein (opsiyonel), müzik, kayıt/en iyi skor.

## Kod yapısı
- `src/scenes/` Preload, Menu, HowTo, Night (asıl oyun), Summary, UpgradeShop, Final.
- `src/objects/` Shop (dükkân dekoru), MonsterView + Customer + Thief, OvenSlot, stations (hamur/krema/topping/tabak/tepsi/çöp), cupcake (çizim).
- `src/data/` gameConfig (tüm sayılar), recipes (hamur/krema/topping), monsters (canavar tanımları).
- `src/systems/GameState.ts` (gün, cüzdan, upgrade'ler), `src/ui/` (button, Hud, panel), `src/assets.ts`, `src/audio.ts`, `src/fx.ts`, `src/text.ts`, `src/config.ts` (1280x720, renk, çizim sırası, yerleşim).
- Yeni canavar: `data/monsters.ts`'e kayıt ekle. Yeni ses/görsel: `src/assets/` + `src/assets.ts` listesi + CREDITS.md.
- Sahne olay dinleyicileri (`this.events.on`) yeniden başlatmada birikir; `SHUTDOWN`'da kaldır.

## Claude için test notları
- Test aracı repoda yok: headless Edge + CDP (uzaktan hata ayıklama) betiği ile gerçek zamanlı tık/JS/ekran görüntüsü testi yapıldı. Dev modda `window.__game` ve `window.__monsters` var; `await import('/src/systems/GameState.ts')` ile aynı modül örneğine erişilir.
- Tarayıcı panelinde (gizliyken) oyun ~3 fps çalışır; zamanlı testlerde başsız Edge kullan. `game.scene.start()` açık sahneyi kapatmaz, `scene.scene.start()` kullan.
- Test edilen: pişirme/yanma, çöp, tepsi, yanlış sipariş, bahşiş, vampir ısırığı/sarımsak, hayalet, hırsız/güvenlik, özet → dükkân → sonraki gün, 3. fırın, final, tek dosya build'in gerçek tıklamayla oynanması.
- Test edilmeyen: tam 150 sn'lik bir günün elle baştan sona oynanması ve denge (hedefler/sürelerin hissi); sesler (dinlenmedi).

## Çalışma kuralları
- Claude ekip üyelerinden komut çalıştırmasını istemez; sade Türkçe açıklar. İndirme/kurulum ve push'tan önce onay alır.
- Her işe başlamadan `main`'i çek; kararları bu dosyaya veya GDD'ye yaz (diğer oturumlar bağlamı buradan alır).
- `main` her zaman çalışır durumda; iş kendi dalında + PR + başka bir üyenin oynayarak onayı.
- Satır sonları LF; `node_modules/`, `dist/` commit'lenmez.

## Açık işler
- Denge ayarı (oynanarak): hedefler, müşteri aralığı, sabır süreleri.
- Frankenstein, müzik, en iyi skor (opsiyonel). Ekibin kendi çizimleri varsa `src/assets/` ve monsters.ts üzerinden değiştirilir.
- Alan sahipleri (kim hangi kısmı test edecek) ve itch.io/teslim planı belirsiz.
- docs/production-plan.md ve visual-upgrade-plan.md eski plan notlarıdır (Godot/960x640 ifadeleri eskidir).
