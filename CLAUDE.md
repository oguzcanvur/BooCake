# BooCake — CENG361 Oyun Projesi

Bu dosya projenin ortak hafızasıdır. Repoda durur, böylece ekipteki herkes (ve Claude) aynı bağlamı görür.
Önemli kararlar alındıkça buraya eklenir.

## Proje
- **Ad:** BooCake
- **Ders:** CENG361
- **Ekip:** 3 kişi — Oğuzcan Vur (@oguzcanvur, repo sahibi), Ceren Candemir (@CerenCandemir), Karya Altundal (@KaryaAltundal)
- **Repo:** https://github.com/oguzcanvur/BooCake
- **Durum:** Tasarım belgesi yazıldı, motor seçimi bekleniyor — henüz kod yazılmadı.
- **Tasarım belgesi (GDD):** [docs/game-design.md](docs/game-design.md) — oyun konseptinin asıl kaynağı.

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
| Oyun motoru / dil | Henüz belli değil (tarayıcıda çalışabilmeli) | — |

## Açık sorular
- **Motor/dil:** Tarayıcıda çalışması gerektiği için adaylar: Phaser (JS/TS), Godot (Web export), Unity (WebGL).
- Her gecenin para hedefi ve 1/2/3 yıldız eşikleri ne olacak?
- Her gece hangi yeni şeyi ekliyor? (7 gecelik zorluk/içerik tablosu)
- Kaç çeşit cupcake / krema / topping var? Sipariş nasıl gösteriliyor?
- Bahşiş hesabı: hız ve doğruluk nasıl paraya dönüşüyor?
- Upgrade listesi ve fiyatları (sarımsak, görevli dışında neler var?)
- Hırsız ve vampir tam olarak nasıl tetikleniyor, nasıl engelleniyor?
- Sanat varlıkları (art/ses) kim tarafından, nasıl üretilecek?
- Görev dağılımı ve teslim tarihleri

## Çalışma kuralları
- Kod yazmaya, motor kararı netleşmeden başlanmaz.
- `main` dalına doğrudan büyük değişiklik pushlanmaz; özellik dalı + Pull Request kullanılır.
- Motor seçilince `.gitignore` o motora göre güncellenir.
- Tasarım değişince önce [docs/game-design.md](docs/game-design.md), sonra bu dosyadaki özet güncellenir.
