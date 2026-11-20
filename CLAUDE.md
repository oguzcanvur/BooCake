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
- Arayüz dili **İngilizce** (ekip kararı); tüm metinler `src/text.ts`'te, malzeme adları `src/data/recipes.ts`'te. İstasyon resimlerinde Türkçe yazılar var; üstlerine kodla İngilizce etiket yapıştırılır (`stations.ts` `withTag`, `fromTop` = yazının resimdeki yüksekliği). Yazı tipi Fredoka (latin + latin-ext).
- **Sanat yönetimi (art direction):** Tüm görseller vektör olarak kodla çizilir (parçacık dokuları ve sesler hariç). Kurallar: sıcak kahve-bordo kontur (`INK` = 0x4a2a2e, 2–3 px), ışık sol üstten (parlama sol üstte, gölge sağ altta), pastel düz renkler; duvar mor, ahşap sıcak kahve, kumaşlar mor + altın şerit. Ortak ikon/buton/panel çizimleri `src/ui/icons.ts`, `button.ts`, `panel.ts`. Ortam `src/objects/Shop.ts` (katmanlar: ekibin verdiği arka plan resmi `src/assets/bg/shop.webp` (duvar, vitrin camı, raflar) → tezgâh → çalışma tezgâhı → vinyet). Resim ekran genişliğine ölçeklenir; içindeki tezgâh kenarı (`BG_COUNTER_Y` = 410, resmin kendi pikseli) oyunun tezgâhına (`LAYOUT.counterTop` = 410) hizalanır. Resim değişirse bu iki sayı ayarlanır. Eski kodla çizilen duvar/pencere/saat/raf kaldırıldı (`Shop.update` artık boş). Resim 1024x572; daha büyük bir sürümü gelirse aynı adla değiştirilir.
- **Masa istasyonları (ekibin çizimleri):** `src/assets/stations/*.png` (ekibin tek bir çizim sayfasından kesilip beyaz arka planı şeffaf yapıldı): hamur masası + 3 kâse, fırın, kilitli fırın, tabak, krema cebi + 3 sıkma torbası, 3 kavanoz, tepsi, çöp. Kâseler ve torbalar setlerinden ayrı kesildi (altlarındaki masa/cep boşluğu doldurularak); yerleri `stations.ts`'teki `BOWLS`/`BAGS` tablolarında (taban resminin pikseli). Malzemeler (kâse, torba, kavanoz) ve çöp: fare üstüne gelince sallanır, tıklayınca hafifçe yukarı zıplar (`makeIngredient`). Yazılar resimlerin üstünde, kod etiket çizmez. Fırın resminin camında kek ve altında ilerleme çubuğu `OvenSlot.ts`'te çizilir (`WIN`, `BAR` resim üstünde ölçüldü). Kilitli fırın resmindeki "$50" resme yazılı: `CONFIG.shop.oven` değişirse resim de değişmeli. Keçe raflar ve tahta başlıklar (HAMUR, FIRIN...) kaldırıldı.
- **Soft stil (ekip kararı, "Good Pizza, Great Pizza" gibi yumuşak/sıcak his; görselleri kopyalanmadı):** `src/softStyle.ts` Phaser'ın renk ayarlayıcılarını (Graphics fill/line/gradient, Shape, Text) bir kez yamalar; her renk doygunluğu düşürülmüş, koyuları açılmış, biraz krem karışmış ve soğuk mor/maviler sıcak mürdüme kaydırılmış olarak çizilir. Çizim kodunda renkleri tek tek değiştirmeye gerek yok; ayar sabitleri dosyanın başında (`STRENGTH` 0 = eski görünüm). Üstte şeffaf bir HTML kâğıt dokusu katmanı var (tıklamalar geçer). Kaldırmak için `main.ts`'teki `installSoftStyle()` / `addPaperGrain()` çağrılarını sil.
- **Netlik (HiDPI):** `config.RES = 2`: tuval 2560x1440, her sahnenin kamerası 2 kat yakınlaştırır (`fx.setupCamera`, `fadeIn` içinde çağrılır), tüm metinler 2 kat çözünürlükte (`main.ts`'teki fabrika yaması). Dünya koordinatları hâlâ 1280x720. Performans: fırın, sipariş fişi ve para çubuğu yalnızca değiştiğinde yeniden çizilir; gerçek ekran kartıyla ~58 fps.
- **Logo (ekibin görseli):** `src/assets/ui/logo.webp` (koyu mor arka planı kenardan dolgu + renkten alfa ile şeffaf yapıldı, 1100 px, WebP). `BootScene` önce yalnızca logoyu yükler; `PreloadScene` açılış ekranında logoyu parıltı ve ilerleme çubuğuyla en az 1,7 sn gösterir, sonra menüye geçer. Menüde metin başlık ve tezgâhtaki büyük cupcake yerine logo var (y=218, 370 px yükseklik, sallanır); final ekranında panelin üst kenarında küçük logo. Sekme ikonu (favicon) `index.html` içinde gömülü 64 px PNG.
- Yükleyici: tüm dosyalar gömülü (data URI); Phaser'ın 32 paralel dosya sınırında yükleme ilk 32'den sonra takıldı, `PreloadScene`'de `maxParallelDownloads = 256`.
- Ortalamayı sadece Phaser yapar (`index.html`'de flex yok); 4:3 projektörde tıklamalar doğru yere gider.
- Asset'ler: Kenney CC0 paketleri (Particle Pack, Interface/Impact Sounds). Canavarlar ekibin verdiği örnek çizime göre (ince koyu-mor kontur, pastel düz renk, allık, tezgâha yaslanan eller) `src/objects/MonsterView.ts` içinde kodla çizilir; tarifleri `src/data/monsters.ts`. Cupcake, fırın, istasyon ve dekorlar da kodla çizilir. Dosyalar `src/assets/` altında. Lisanslar [CREDITS.md](CREDITS.md).
- Görsel referans notu: Doküman 16. bölüm var olan bir oyunun görsellerinin kopyalanmasını yasaklıyor; "Good Pizza, Great Pizza"dan sadece tür ortakları (tezgâh + sipariş balonu + istasyonlar) alındı. Ekibin verdiği ticari oyun ekran görüntüsü (ahşap/mor dükkân) ve mumya/cupcake görselleri sadece atmosfer ve stil ilhamı olarak kullanıldı, kopyalanmadı.

## Oyun kuralları (kodda olan)
Tüm sayılar tek yerde: `src/data/gameConfig.ts` (`CONFIG`).
- **Kremalar:** pembe = Strawberry, yeşil = Pistachio, mor = Blueberry (`recipes.ts`). Siparişte uzun adlar balona sığsın diye daraltılır.
- **Durdurma:** üst çubukta ses düğmesinin solunda durdurma düğmesi (ya da P / Esc). `NightScene.pause` sahneyi durdurur (sabır, fırın, zamanlayıcı, animasyon donar) ve üstte `PauseScene` açılır: Resume, Restart day, Main menu.
- **Seçim:** seçili cupcake (tabak/tepsi) etrafında halka yok, 10 px yukarı kalkık çizilir.
- **Sürükle-bırak:** tabaktaki, tepsideki ya da fırındaki (pişmiş/yanık) kek fareyle sürüklenip müşteriye, boş tepsi yerine (tepsiler arası da), boş tabağa veya çöpe bırakılabilir; fırındaki keke basıp bırakmak (sürüklemeden) onu boş tabağa koyar (fırın tıklaması bırakınca çalışır); boşa bırakılırsa yerine döner (`NightScene.setupDrag`/`dropAt`). Tıklama ile seçip tıklama ile verme de hâlâ çalışır.
- **Akış:** hamur kâsesine tık → boş fırına girer (5 sn'de pişer, 10 sn'de yanar) → pişen/yanan keke tık → boş bir tabağa geçer → krema → topping (krema önce) → müşteriye tık ya da tepsiye koy (2 slot, solda; süslenmemiş kek de bekletilebilir, yanık kek konmaz; tepsideki keke tık seçer, sonra müşteriye ya da boş tabağa tık). Tabaklar doluyken pişmiş keke tıklamak onu seçer, boş tepsi yerine tıklayınca oraya geçer. Çöp kutusu seçili şeyi (tabak/tepsi/fırındaki yanık kek) atar. Yanık kek süslenemez ve verilemez.
- **Ödeme:** doğru cupcake $5 + ruh haline göre bahşiş (mutlu +5, huzursuz +2, sinirli 0). Yanlış cupcake yok olur, müşterinin sabrı %20 düşer.
- **Gün:** 150 sn, 3 koltuk. 4 gün: hedef $45/90/120/150, müşteri aralığı 13/10/8/7 sn, sabır 36/27/24/22 sn (1. gün ekip isteğiyle kolaylaştırıldı; tek fırınla başlanıyor). Yıldız: hedefin %100/130/160'ı. Para sadece hedefi geçilen günlerde cüzdana eklenir; başarısız gün tekrarlanır.
- **Karakterler:** müşteriler ekibin çizimleri (`src/assets/chars/`, tek sayfadan kesildi): normal = zombi, mumya, kurt adam, cadı; özel = vampir, hayalet. `MonsterDef.sprite` dolu olan karakter resimle gösterilir (çizim alanları yalnızca yedek). Hırsız ve güvenlik görevlisi hâlâ kodla çizilir. Resim yüz ifadesi değiştiremediği için ruh hali efektlerle gösterilir (`MonsterView.applyPictureMood`): mutlu = arada zıplar; huzursuz = ter damlası, sabırsız sallanma; kızgın = kafada atan kızgınlık işareti, buhar ve titreme. Ayrıca karakter mutlu eşiğinin altına inince sabırla birlikte yavaş yavaş kırmızılaşır (`setRedness`, `Customer.update`). SVG karakterler denendi, ekip beğenmedi; kullanılmıyor. Yeni karakter = resmi `src/assets/chars/` + `CHAR_SPRITES` + `monsters.ts` kaydı.
- **Özel canavarlar** (her gün her açık olan en az bir kez gelir): vampir (gün 2+, ısırınca 5 sn tıklama kilidi + kırmızı ekran, fırın çalışır), hayalet (gün 2+, keki düşürür ama tam öder, sabrı yavaş azalır), hırsız (gün 3+, koltuk almaz, tepsideki tüm kekleri çalar).
- **Fırın:** oyun başında 1 fırın (`CONFIG.oven.slots`), dükkândan 1 tane daha alınır (en fazla 2, ekip kararı: 3 fırın fazlaydı). İkinci yerde kilitli fırın resmi durur.
- **Tabaklar:** oyun 2 tabakla başlar (`CONFIG.plates.slots`, eski 3. fırının yerinde), dükkândan 2 tane daha alınır (toplam 4). Alınanlar alttaki 2 tabağın hemen üstüne, aynı sütunlara gelir; alınmamışken soluk tabak + fiyatlı "Buy in shop" etiketi. Yerler `config.ts` `PLATES`. Fırından çıkan kek ilk boş tabağa gider; krema/topping seçili tabağa, seçili yoksa o adıma ihtiyacı olan ilk tabağa sürülür. Müşteriye tıklayınca seçili kek, yoksa siparişe uyan bitmiş tabak keki verilir. Kekler tabaklar arasında tıklayarak ya da sürükleyerek taşınabilir. Güvenlik görevlisi sağa (kavanozların üstü) taşındı.
- **Dükkân** (günler arası, kalıcı): Sarımsak $40 (vampir ısırmaz), Güvenlik $60 (hırsız yakalanır, +$5), Ekstra Fırın $50 (1 kez, `upgrades.ovens`, toplam 2 fırın), Ekstra Tabak $30 (en fazla 2 kez, `upgrades.plates`, toplam 4 tabak).
- **Ekranlar:** Açılış (logo), Menü, Nasıl Oynanır, Gün (yeni canavar kartları), Gün özeti, Dükkân, Final.
- **Yok:** Frankenstein (opsiyonel), müzik, kayıt/en iyi skor.

## Kod yapısı
- `src/scenes/` Preload, Menu, HowTo, Night (asıl oyun), Summary, UpgradeShop, Final.
- `src/objects/` Shop (dükkân dekoru), MonsterView + Customer + Thief, OvenSlot, stations (hamur/krema/topping/tabak/tepsi/çöp), cupcake (çizim).
- `src/data/` gameConfig (tüm sayılar), recipes (hamur/krema/topping), monsters (canavar tanımları).
- `src/systems/GameState.ts` (gün, cüzdan, upgrade'ler), `src/ui/` (button, Hud, panel), `src/assets.ts`, `src/audio.ts`, `src/fx.ts`, `src/text.ts`, `src/config.ts` (1280x720, renk, çizim sırası, yerleşim).
- Yeni canavar: `data/monsters.ts`'e kayıt ekle. Yeni ses/görsel: `src/assets/` + `src/assets.ts` listesi + CREDITS.md.
- Sahne olay dinleyicileri (`this.events.on`) yeniden başlatmada birikir; `SHUTDOWN`'da kaldır.

## Claude için test notları
- Test aracı repoda yok: headless Edge + CDP (uzaktan hata ayıklama) betiği ile gerçek zamanlı tık/JS/ekran görüntüsü testi yapıldı. GPU için `--use-angle=d3d11` kullan (swiftshader 2x çözünürlükte ~11 fps verir ve zamanlı testler şaşar). Dev modda `window.__game` ve `window.__monsters` var; `await import('/src/systems/GameState.ts')` ile aynı modül örneğine erişilir.
- Tarayıcı panelinde (gizliyken) oyun ~3 fps çalışır; Vite, değişen modülleri `?t=` ekiyle yükler: `gameState`'e erişmek için `performance.getEntriesByType('resource')` içinden `GameState.ts?t=...` adresini import et (eki olmayan adres ayrı bir kopya verir). Ekran görüntüsünden önce `cameras.main.resetFX()` + tek seferlik tween'leri `complete()` etmezsen sahne yarı saydam (fade ortasında) görünür; zamanlı testlerde başsız Edge kullan. `game.scene.start()` açık sahneyi kapatmaz, `scene.scene.start()` kullan.
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
