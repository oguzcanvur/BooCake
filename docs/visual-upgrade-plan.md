# BooCake — Görsel ve İçerik Yükseltme Planı

> Gray-box prototipi (basit şekiller) modern, güzel ve dolu bir oyuna çevirme planı.
> Kaynak tasarım: [game-design.md](game-design.md). Genel plan: [production-plan.md](production-plan.md).

## 1. Hedef
- **Görünüm:** Modern, düz vektör (flat) çizgi film stili: yuvarlak köşeler, yumuşak gölgeler, canlı pastel renkler koyu mor/mavi duvarlarda. "Sevimli ve ürkütücü", korku değil Halloween partisi (GDD).
- **Dolu dünya:** Boş duvar yerine pencere, ay, yarasalar, örümcek ağları, balkabakları, mumlar, bayraklar, analog duvar saati.
- **Canlı his ("juice"):** Parçacıklar, animasyonlar, ses efektleri, müzik, ekran geçişleri.
- **Daha fazla içerik:** GDD'deki canavarlar (vampir, hayalet, hırsız), upgrade dükkânı, daha çok cupcake çeşidi.

## 2. Asset seçimi
Hepsi **CC0** (kullanım serbest, atıf zorunlu değil). Yine de `CREDITS.md`'de kaynak yazılır.

| Amaç | Paket | Kaynak | Neden |
|------|-------|--------|-------|
| Canavar müşteriler | **Kenney Monster Builder Pack** (2D, 170 dosya) | kenney.nl/assets/monster-builder-pack | Vücut parçaları 6 renkte; parçaları birleştirerek çok çeşit canavar çıkar. Tarzı düz vektör, pastel renklere uygun. |
| Arayüz (buton, panel, çubuk) | **Kenney UI Pack** (430 dosya) | kenney.nl/assets/ui-pack | Modern, tutarlı buton/panel/slider seti. |
| Efekt parçacıkları | **Kenney Particle Pack** (80 dosya) | kenney.nl/assets/particle-pack | Yıldız, kıvılcım, duman: servis, yanma, para efektleri. |
| Ses efektleri | **Kenney Interface Sounds** (100) + **Impact Sounds** (130) | kenney.nl/assets/interface-sounds, kenney.nl/assets/impact-sounds | Tıklama, para, uyarı, düşme sesleri. |
| İkonlar | ~~Kenney Game Icons~~ | | İndirilmedi: UI Pack'teki yıldız yetti, diğer ikonlar (ay, para, hoparlör) kodla çizildi. |
| Yazı tipi | **Fredoka** (SIL OFL, npm: `@fontsource/fredoka`) | npm | Yuvarlak, sevimli, okunaklı. |
| Müzik | Sonra seçilecek (CC0 Halloween/jazzy loop) | OpenGameArt / Kenney Music Jingles | Önce SFX, müzik cila aşamasında. |

**Kodla çizilenler (asset gerektirmez):** Cupcake'ler (krema, topping, kâğıt kap), fırın ve istasyonlar, arka plan, dekorlar. Böylece paketlerde 2D cupcake olmaması sorun olmaz ve stil tutarlı kalır.

> Not: Kenney sayfaları paketlerin içindeki dosya adlarını göstermiyor. Paketler indirildikten sonra içerikleri incelenir; beklentiyi karşılamayan paket varsa alternatifi (ör. OpenGameArt'taki CC0 canavar paketleri) seçilir.

## 3. Aşamalar
Her aşama bitince oyun tarayıcıda test edilir, commit atılır.

| # | Aşama | İçerik | Bitince |
|---|-------|--------|---------|
| A | **Asset altyapısı** | `public/assets/` klasör düzeni, `Preload` sahnesi (yükleme çubuğu), `CREDITS.md`, Fredoka yazı tipi | Asset'ler oyuna yükleniyor |
| B | **Dükkân yeniden tasarımı** | Katmanlı arka plan (degrade duvar, pencere + ay, yarasalar, örümcek ağları, balkabakları, titreyen mumlar, bayraklar), tezgâh ve istasyonlar, analog duvar saati, yeni HUD (UI Pack) | Dükkân dolu ve güzel görünüyor |
| C | **Canavar müşteriler** | Monster Builder ile ≥3 canavar tipi, giriş/çıkış animasyonları, hafif nefes alma (idle), yüz ifadeleri (sabır), sipariş balonu yeniden çizimi | Müşteriler karakterli |
| D | **Cupcake ve istasyon görselleri** | Daha güzel çizilmiş cupcake'ler, fırın ışıması ve buharı, yanınca duman, yeni topping/krema çeşitleri | Mutfak "lezzetli" görünüyor |
| E | **Juice** | Parçacıklar (servis kıvılcımı, uçan paralar, yanma dumanı), yaylanma/sıçrama animasyonları, ses efektleri, sahne geçişleri | Oyun "canlı" hissettiriyor |
| F | **Yeni içerik** | Vampir (ısırır, 5 sn donma), hayalet (cupcake'i düşürür ama öder), hırsız (hazır cupcake çalar); upgrade dükkânı (sarımsak, güvenlik görevlisi + 2–3 yeni); geceler arası ekran | GDD'nin çekirdeği oynanabilir |
| G | **Menü ve sonuç cilası** | Ana menü sahnesi (animasyonlu dükkân), sonuç ekranında yıldız animasyonu, geçiş efektleri | Baştan sona tutarlı |

**Sıra gerekçesi:** A–E oyunu bugünkü haliyle güzelleştirir (en görünür kazanç). F yeni oynanış getirdiği için tasarım kararları gerektirir (canavar sayıları, upgrade fiyatları): F başlamadan önce ekiple kısa sorular sorulur.

## 4. Durum (2026-11-18)
| # | Aşama | Durum | Not |
|---|-------|-------|-----|
| A | Asset altyapısı | ✅ Bitti | Preload sahnesi, `public/assets/`, `CREDITS.md`, Fredoka (yalnızca Latin alt kümesi) |
| B | Dükkân yeniden tasarımı | ✅ Bitti | Pencere+ay, yarasa, bayrak, ağ, saat, neon tabela, kabak, mum, bahşiş kavanozu, yeni HUD |
| C | Canavar müşteriler | ✅ Bitti | 6 tip, yüz ifadeleri, giriş/çıkış animasyonları, sipariş balonu |
| D | Cupcake ve istasyon görselleri | ✅ Bitti | Parlayan/dumanlı fırın, krema torbaları, cam kavanozlar, eldivenli el |
| E | Juice | ✅ Bitti | Parçacıklar, uçan paralar, 17 ses efekti, ses düğmesi, kararma geçişleri |
| F | Yeni içerik | ⏳ Bekliyor | Tasarım kararı gerekiyor (aşağıdaki sorular) |
| G | Menü ve sonuç cilası | ✅ Bitti | Animasyonlu menü, yıldız animasyonu, konfeti |

Ölçümler: üretim build'i 2,0 MB (sıkıştırılmış ≈0,8 MB, hedef < 5 MB). Müzik henüz yok (cila aşamasında).

## 5. Aşama F için sorular (ekip karar versin)
Varsayılanlar GDD'den gelir; "?" olanlara karar lazım.
1. **Vampir:** Hangi geceden itibaren çıksın? (öneri: gece 3) Isırınca 5 sn hareket edememe (GDD). ? Isırık ne zaman olur: sipariş verirken mi, rastgele mi?
2. **Hayalet:** Cupcake'i tutamayıp düşürür ama yine öder (GDD). ? Her hayalet mi düşürür, yoksa yarısı mı? Düşen cupcake'in tekrar yapılması mı gerekir, yoksa sadece komik bir an mı?
3. **Hırsız:** Hazır cupcake'leri çalar (GDD). ? Hangileri: elindeki mi, fırındakiler mi, tezgâhta bekleyenler mi? Oyuncu hırsızı yakalayabilir mi (tıklayarak)?
4. **Upgrade dükkânı:** Sarımsak (vampire karşı) ve güvenlik görevlisi (hırsıza karşı) GDD'de var. ? Fiyatlar, para gecenin hedefinden mi harcanır yoksa ayrı bir cüzdan mı? ? Başka upgrade'ler (3. fırın, daha hızlı pişirme, daha sabırlı müşteri)?
5. **Geceler 4–7:** Her gece tek yeni şey (GDD). ? 4–7 için yeni şeylerin sırası ve 7. gece (Halloween) finali.

## 6. Kurallar
- Asset'ler `public/assets/<tür>/` altında; her paketin klasöründe lisans dosyası saklanır.
- Gereksiz dosya yüklenmez: yalnızca kullanılan görseller/sesler repoya girer (tüm paketi commit'lemeyiz).
- Oyun boyutu hedefi: sıkıştırılmış build < 5 MB (itch.io için rahat).
- Görsel stil kararları (palet, köşe yuvarlaklığı, gölge) `src/config.ts` içinde tek yerden yönetilir.
