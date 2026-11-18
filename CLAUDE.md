# BooCake — CENG361 Oyun Projesi

Bu dosya projenin ortak hafızasıdır. Repoda durur, böylece ekipteki herkes (ve Claude) aynı bağlamı görür.
Önemli kararlar alındıkça buraya eklenir.

## Proje
- **Ad:** BooCake
- **Ders:** CENG361
- **Ekip:** 3 kişi — Oğuzcan Vur (@oguzcanvur, repo sahibi), Ceren Candemir (@CerenCandemir), Karya Altundal (@KaryaAltundal)
- **Repo:** https://github.com/oguzcanvur/BooCake
- **Durum:** Hafta 1 — gray-box prototip yazıldı (`feature/prototype-core-loop` dalı): menü, mutfak döngüsü, müşteriler, gece saati, para/yıldız, sonuç ekranı, 3 gece. Canavar türleri, upgrade dükkânı, ses ve gerçek görseller henüz yok.
- **Çalışma modeli:** Ekip **kod yazmaz**; prompt verir. Kurulum, indirme, kod, test ve git işlerini Claude yapar. Ekip tasarım kararı verir, test eder, asset seçer, PR'ları oynayarak onaylar.
- **Tasarım belgesi (GDD):** [docs/game-design.md](docs/game-design.md) — oyun konseptinin asıl kaynağı.
- **Üretim planı:** [docs/production-plan.md](docs/production-plan.md) — aşamalar, takvim, roller, kapsam, mimari, çalışma şekli.

## Oyun özeti
Canavarlara cupcake satan bir dükkân işleten fırıncı olarak oynanan, fare ile oynanan bir zaman yönetimi (cooking) oyunu.

- **Yapı:** 7 gece (Cadılar Bayramı'ndan önceki hafta). 7. gece Halloween, en yoğun gece. Her gece ~2.5 dakika gerçek zaman (gün batımı → gece yarısı, duvarda saat).
- **Kazanma:** Gece yarısına kadar gecenin para hedefine ulaşmak. Hedefin üstü → en fazla 3 yıldız. Hedefe ulaşılamazsa gece tekrar oynanır.
- **Ana döngü:** Siparişi oku → fırına koy → yanmadan çıkar → krema → süsleme (topping) → servis → bahşiş → sonraki müşteri. Geceler arasında bahşişle upgrade alınır.
- **Fiiller:** sipariş okuma, pişirme, fırından çıkarma, krema, topping, servis, çöpe atma, upgrade satın alma.
- **Küçük başarısızlıklar:** müşterinin sabrı biter ve ödemeden gider; cupcake yanar (kararır); yanlış cupcake → bahşiş yok; vampir ısırır → 5 sn hareket edemezsin; hırsız hazır cupcake'leri çalar.
- **Canavarlar:** vampir (ısırır), hayalet (cupcake'i tutamaz, düşürür ama yine öder), hırsız (çalar).
- **Upgrade örnekleri:** sarımsak (vampire karşı), güvenlik görevlisi (hırsıza karşı). Gece başlamadan alınır.
- **Ekran:** Kamera tezgâhın arkasında. Müşteri sırası üstte; fırın, krema ve topping istasyonları altta. Fırıncı yürümez, fare fırıncının elleri gibidir.
- **Görsel ton:** Çizgi film tarzı; koyu mor/mavi duvarlarda pastel cupcake renkleri, mumlar, örümcek ağları, balkabakları. "Sevimli ve ürkütücü", korku değil Halloween partisi.
- **Hedef kitle:** 10 yaş üstü, casual oyuncular; tarayıcıda, sadece fare ile. Bartle: ağırlıkla Achiever.

## Tasarım değerleri
1. **Eğlenceli kaos:** Yoğun ve biraz bunaltıcı ama hep eğlenceli.
2. **Yavaş yavaş zorlaşma:** Her gece sadece *bir* yeni şey eklenir (yeni canavar veya daha hızlı tempo).
3. **Çoğunlukla beceri, biraz şans:** Rastgele canavarlar var ama upgrade'lerle hazırlanılabilir; kaybetmek adil hissettirmeli.
4. **Sevimli ve ürkütücü:** Canavarlar komik şekilde sorun çıkarır.
5. **Anlaşılır geri bildirim:** Sipariş, müşteri sabrı ve pişme durumu her zaman görünür; bahşiş kaybının sebebi belli olmalı.

## Kararlar
| Konu | Karar | Tarih |
|------|-------|-------|
| Repo | GitHub, private | 2026-11-18 |
| Konsept | Canavarlara cupcake dükkânı, 7 gece, zaman yönetimi (GDD'ye bkz.) | 2026-11-18 |
| Platform | Web tarayıcı, sadece fare | 2026-11-18 |
| Gece süresi | ~2.5 dakika | 2026-11-18 |
| Çalışma modeli | Ekip prompt verir; Claude kurar, kodlar, test eder, git işlerini yapar | 2026-11-18 |
| Oyun motoru / dil | Phaser + TypeScript + Vite. (Önce Godot 4 seçilmişti; Claude editörü kullanamadığı ve Phaser'ı tarayıcıda kendisi test edebildiği için değiştirildi.) | 2026-11-18 |
| Sürümler | Phaser 4.2.1, Vite 8.3.8, TypeScript 7.0.2 (Node v24 ile) | 2026-11-18 |
| Yayın | itch.io web build (geliştirmede gizli sayfa) | 2026-11-18 |
| Asset'ler | Hazır ücretsiz asset'ler; lisanslar CREDITS.md'de | 2026-11-18 |
| Takvim | 4–8 hafta; plan ≈7 hafta + 1 hafta yedek | 2026-11-18 |
| Roller | Alan sahipliği: A) Mutfak, B) Müşteriler, C) Oyun akışı + UI + asset — kişiler henüz atanmadı | 2026-11-18 |
| Ekip deneyimi | Daha önce kimse oyun motoru kullanmadı; ekip kod yazmayacak | 2026-11-18 |

## Prototipte şu an kodlanmış davranış (GEÇİCİ değerler)
Bütün sayılar `src/data/nights.ts` ve `src/data/recipes.ts` içinde; tasarım aşamasında ayarlanacak.
- **Akış:** Fırın slotuna tıkla → pişer (6 sn hazır, 12 sn yanar) → hazır cupcake'e tıkla (elinde taşırsın, fareyi takip eder) → krema → topping (krema önce) → siparişi veren müşteriye tıkla. Çöp kutusu elindekini atar. Elde bir seferde tek cupcake.
- **Servis kuralları:** Yanık veya eksik (krema/topping yok) cupcake müşteriye verilemez (uyarı çıkar, harcanmaz). Tam ama yanlış cupcake → yarım ücret, bahşiş yok, müşteri gider. Doğru cupcake → taban ücret + hıza bağlı bahşiş (müşterinin kalan sabrı oranında).
- **Düzen:** 2 fırın slotu, 3 müşteri koltuğu. Müşteri sıklığı gece sonuna doğru %40'a kadar artar.
- **Geceler:** 3 gece (hedef $60 / $90 / $120, 150 sn). 1/2/3 yıldız = hedefin 1x / 1.5x / 2x'i. Gece 2: 3. krema (Lilac). Gece 3: Eyeball topping + daha hızlı kalabalık.
- **Görsel:** Hepsi basit şekillerle çizilmiş (placeholder); müşterinin yüzü sabır azaldıkça gülen → nötr → kızgın olur.
- **Henüz yok:** vampir/hayalet/hırsız, upgrade dükkânı, ses, kayıt (save), gerçek asset'ler, 4–7. geceler.

## Kod yapısı ve çalıştırma
- Çalıştır: `npm install` (bir kez), `npm run dev` → http://localhost:5173. Kontrol: `npm run typecheck`. Yayın build'i: `npm run build` (`dist/`).
- `src/scenes/` Menu, Night (asıl oyun), Result · `src/objects/` OvenSlot, Customer, cupcake çizimi · `src/data/` gece ve tarif verisi · `src/systems/GameState.ts` global ilerleme · `src/ui/button.ts`.
- Sahne olay dinleyicileri (`this.events.on`) sahne yeniden başlayınca birikir; mutlaka `SHUTDOWN`'da kaldırılmalı (bu hata bulundu ve düzeltildi).
- **Claude için test notu:** `npm run dev` + `.claude/launch.json` (`boocake-dev`) ile tarayıcı panelinde açılır. Dev modda `window.__game` ile oyuna erişilir (örn. `__game.scene.getScene('Night')`). Panel gizliyken oyun çok yavaş (≈3 fps) çalışır; zamanı beklemek yerine `scene.update(0, 100)` döngüsüyle mantığı ilerlet.

## Açık sorular
- Alan sahipleri kim? (A Mutfak / B Müşteriler / C Oyun akışı + UI + asset)
- Hangi ana asset paketi?
- itch.io hesabını kim açacak?
- Her gecenin para hedefi ve 1/2/3 yıldız eşikleri ne olacak?
- Her gece hangi yeni şeyi ekliyor? (7 gecelik zorluk/içerik tablosu)
- Kaç çeşit cupcake / krema / topping var? Sipariş nasıl gösteriliyor?
- Bahşiş hesabı: hız ve doğruluk nasıl paraya dönüşüyor?
- Upgrade listesi ve fiyatları (sarımsak, görevli dışında neler var?)
- Hırsız ve vampir tam olarak nasıl tetikleniyor, nasıl engelleniyor?
- Kesin teslim tarihi ve dersin ara teslimleri

## Çalışma kuralları
- Kod yazmaya, ekip "başlayalım" demeden başlanmaz. Sıra: hazırlık → prototip için minimum tasarım → gray-box prototip.
- **Claude için:** Ekip üyeleri programcı değil. Açıklamaları sade Türkçe yap, onlardan komut çalıştırmalarını isteme; kurulumları kendin yap. İndirme/kurulumdan ve push'tan önce onay al. Her değişiklikten sonra oyunu tarayıcıda test et ve neyi test ettiğini yaz.
- **Claude için:** Her işe başlamadan `main`'i çek. Sohbette alınan her kararı bu dosyaya veya GDD'ye yaz; diğer ekip üyelerinin Claude oturumları bağlamı sadece buradan alır.
- `main` her zaman çalışır durumda; her iş kendi dalında (`feature/...`) + Pull Request + başka bir ekip üyesinin oynayarak onayı.
- Herkes kendi alanının dosyalarında çalışır; iki kişi aynı anda aynı sisteme prompt vermez.
- Oyun içeriği (geceler, tarifler, upgrade'ler) mantık kodundan ayrı veri dosyalarında (`src/data/`) tutulur.
- Sistemler arası iletişim olaylarla (event) yapılır.
- Satır sonları LF (`.gitattributes`); `node_modules/`, `dist/` ve build'ler commit'lenmez.
- Her asset'in kaynağı ve lisansı `CREDITS.md`'ye yazılır.
- Tasarım değişince önce [docs/game-design.md](docs/game-design.md), sonra bu dosyadaki özet güncellenir.
