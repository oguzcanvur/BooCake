# BooCake: Oyun Tasarım Dokümanı (v2)

> Ekip tarafından yazılan ayrıntılı sürüm (2026-11-18). Önceki özet [game-design.md](game-design.md)'nin yerine **bu doküman geçerlidir**;
> ikisi çelişirse bu kazanır. Aşağıdaki metin ekibin verdiği haliyle korunmuştur; sonundaki "Uygulama notları" bölümü Claude'un eklemesidir.

Bu doküman, oyunu kodlayacak/geliştirecek bir yapay zekâ ya da kişi için hazırlanmıştır. Oyunun fikri, kuralları, sayısal değerleri ve teknik beklentileri burada eksiksiz anlatılır. Belirtilmeyen bir detay olursa basit olanı seç ve bu dokümandaki ruha sadık kal.

## 1. Bağlam
- **Ders:** CENG 361 – Innovative Game Design (Activity 3: Game Concept Design)
- **Ekip:** 3 kişi
- **Kısıt:** Ekibin vakti çok az (vize, final, bitirme projesi). Oyun küçük, bitmiş ve sunulabilir olmalı. Fazla özellik yerine az ama düzgün çalışan özellik tercih edilir.
- **Sunum:** Sınıfta bir dizüstü bilgisayardan, tarayıcıda açılarak gösterilecek.

## 2. Oyunun Özeti
BooCake, canavarlara özel bir cupcake dükkânı işlettiğin, zamana karşı sipariş hazırlama oyunudur. Canavar müşteriler gelir, istedikleri cupcake'i (hamur + krema rengi + topping) söyler. Oyuncu cupcake'i fırında pişirir, süsler ve müşteriye verir. Geç kalırsan müşteri sinirlenir ve daha az bahşiş verir. Bazı özel canavarlar ise ortalığı karıştırır: vampir ısırır, hırsız kekleri çalar, hayalet keki tutamaz.

- **Tagline:** Bake cupcakes for monsters before they get angry!
- **Platform:** Dijital (web tarayıcısı)
- **Oyuncu sayısı:** 1
- **Hedef kitle:** 10 yaş ve üzeri, casual oyuncular
- **Bir gün (seviye) süresi:** 2,5 dakika (150 saniye)

## 3. Oynanış Türleri (Kinds of Play – Macklin & Sharp, Bölüm 3)

| Sıra | Tür ve alt tür | Oyundaki rolü |
|------|----------------|---------------|
| 1. Ana | Skill-Based: Combined | Hızlı tıklama (el becerisi) + siparişleri akılda tutma, fırını yönetme (zihinsel) |
| 2. İkincil | Chance & Uncertainty: Strategic | Özel canavarlar rastgele gelir; oyuncu parasını sarımsak/güvenliğe harcayarak önlem alır |
| 3. Üçüncül | Whimsical: Silly | Isıran vampir, kek çalan hırsız, keki içinden düşüren hayalet |
| 4. Ekstra | Role-Playing: Progression | Dükkân sahibi rolü; her gün yeni canavar ve yükseltme açılır |

**Tasarım ilkesi ("baharat" metaforu):** Oyunun omurgası beceridir. Şans ve komiklik tat katar ama oyuncunun kontrolünü elinden almamalı. Bir özel canavar oyuncuyu asla tek başına yenilgiye sürüklememeli.

## 4. Ekran Düzeni
Tek sabit ekran, yatay (16:9, ör. 1280×720 tasarlanıp ölçeklenir).

```
+--------------------------------------------------------------+
| Gün 2   ⏱ 1:47        💰 $54 / Hedef $90                     |  <- HUD
+--------------------------------------------------------------+
|   [Müşteri 1]       [Müşteri 2]       [Müşteri 3]            |  <- Tezgâh (3 yer)
|   sipariş balonu    sipariş balonu    sipariş balonu         |
|   sabır çubuğu      sabır çubuğu      sabır çubuğu           |
+--------------------------------------------------------------+
|  [Hazır Tepsi: 2 slot]                         [Çöp kutusu]  |
+--------------------------------------------------------------+
| HAMUR: [Vanilya][Çikolata][Çilek]   FIRIN: [Slot 1][Slot 2]  |
| TABAK (hazırlık alanı)                                       |
| KREMA: [Pembe][Yeşil][Mor]   TOPPING: [Şeker][Göz][Örümcek]  |
+--------------------------------------------------------------+
```

- Üst kısım: müşteriler (en fazla 3 aynı anda).
- Orta: hazır tepsi (süslenmiş cupcake'lerin beklediği yer, 2 slot) ve çöp kutusu.
- Alt: istasyonlar (hamur, fırın, tabak, krema, topping).

## 5. Kontroller
- Sadece fare, sol tık. Sürükle-bırak yok (sunumda hata riskini azaltmak için).
- Tıklama akışı "seç, sonra hedefe tıkla" mantığındadır.

## 6. Cupcake Sistemi

### 6.1 Malzemeler

| Katman | Seçenekler |
|--------|-----------|
| Hamur | Vanilya, Çikolata, Çilek |
| Krema rengi | Pembe, Yeşil, Mor |
| Topping | Şeker serpme, Göz şekeri, Örümcek şekeri |

Toplam 3 × 3 × 3 = 27 kombinasyon.

### 6.2 Hazırlama akışı
1. **Hamur butonuna tıkla:** boş bir fırın slotuna o hamur girer ve pişmeye başlar. İki slot da doluysa hiçbir şey olmaz (küçük bir "dolu" sallanma animasyonu).
2. **Pişme:** Fırına girdikten sonra:
   - 0–5 sn: pişiyor (çiğ). Alınamaz. Slotun altında dolan bir ilerleme çubuğu var.
   - 5–10 sn: pişti. Rengi yavaş yavaş koyulaşır (açık altın → kahverengiye). Bu aralıkta alınabilir ve geçerlidir.
   - 10 sn: yandı. Siyah olur, üstünden duman çıkar. Alınabilir ama tek gideceği yer çöptür.
3. **Fırın slotuna tıkla (pişmişse):** kek tabağa geçer. Tabak doluysa olmaz.
4. **Krema rengine tıkla:** tabaktaki keke krema eklenir.
5. **Topping'e tıkla:** kekin üstüne topping eklenir. Sıra zorunlu: önce krema, sonra topping.
6. **Tamamlanan cupcake:** iki yoldan biri seçilir:
   - Doğrudan müşteriye tıkla: tabaktaki cupcake ona verilir.
   - Hazır tepsiye tıkla: cupcake tepside bekler (2 slot). Daha sonra tepsideki cupcake'e, ardından müşteriye tıklanarak servis yapılır.
7. **Çöp kutusu:** Seçili olan şey (tabaktaki kek, tepsideki cupcake veya fırındaki yanık kek) çöpe atılır.

*Tasarım notu:* Hazır tepsi bilinçli olarak var. Oyuncu önceden cupcake hazırlayıp bekletebilir; bu da hırsız canavarına hedef oluşturur (bkz. 8.3).

### 6.3 Yanık kek kuralı
Yanık kek tabağa alınabilir ama süslenemez. Sadece çöpe atılabilir. Müşteriye verilmesine izin verilmez.

## 7. Müşteriler

### 7.1 Geliş
- Tezgâhta 3 yer var. Boş yer varsa belirli aralıklarla yeni müşteri gelir.
- Her müşteri gelince başının üstünde sipariş balonu belirir: hamur + krema + topping ikonları.

### 7.2 Sabır ve ruh hali
Her müşterinin bir sabır çubuğu vardır. Zamanla azalır.

| Sabır | Ruh hali | Görsel |
|-------|----------|--------|
| %100–60 | Mutlu | Gülen yüz, yeşil çubuk |
| %60–30 | Huzursuz | Düz yüz, sarı çubuk |
| %30–0 | Sinirli | Kızgın yüz, kırmızı çubuk, hafif titreme |
| %0 | Gider | Kızgın şekilde çıkar, para vermez |

### 7.3 Ödeme
- Cupcake fiyatı: **$5** (doğru sipariş verildiğinde her zaman)
- Bahşiş (servis anındaki ruh haline göre): Mutlu **+$5**, Huzursuz **+$2**, Sinirli **+$0**
- Para ekranda müşterinin üstünde "+$10" gibi uçan bir yazıyla gösterilir.

### 7.4 Yanlış sipariş
Yanlış cupcake verilirse müşteri reddeder, cupcake yok olur ve müşterinin sabrı %20 düşer. (Para cezası yok; basit tutalım.)

### 7.5 Normal canavarlar
Normal müşteriler sadece görsel çeşitlilik içindir, kuralları aynıdır: Zombi, Mumya, Kurt Adam, Balçık (slime). Rastgele seçilir.

## 8. Özel Canavarlar
Özel canavarlar normal müşteri havuzuna belirli bir olasılıkla karışır. Her gün en az bir kez her açık özel canavar gelmeli (oyuncu mekaniği mutlaka görsün diye).

### 8.1 Vampir 🧛
- **Ne zaman açılır:** 2. gün
- **Davranış:** Tezgâha geldiği anda oyuncuyu ısırır. Ekran 5 saniye kırmızıya döner, "ISIRILDIN!" yazısı çıkar ve oyuncu 5 saniye hiçbir şeye tıklayamaz. Fırın bu sırada çalışmaya devam eder (yani kekler yanabilir; gerilimin kaynağı bu). Isırdıktan sonra normal müşteri gibi sipariş verir.
- **Karşı önlem:** Dükkândan Sarımsak satın alınırsa vampir artık ısırmaz; tezgâhta sarımsağı görünce yüzünü buruşturur ve normal sipariş verir.

### 8.2 Hayalet 👻
- **Ne zaman açılır:** 2. gün
- **Davranış:** Normal sipariş verir. Cupcake verildiğinde cupcake hayaletin içinden geçip yere düşer (komik düşme animasyonu). Ama hayalet yine de tam ücreti ve bahşişi öder. Oyuncuya zararı yoktur; tamamen "Silly" türü için var olan komik bir an.
- Opsiyonel küçük detay: hayaletin sabır çubuğu biraz daha yavaş azalır (hayaletler sabırlıdır).

### 8.3 Hırsız 🦹 (maskeli canavar)
- **Ne zaman açılır:** 3. gün
- **Davranış:** Sipariş vermez. Tezgâhın yanından koşarak gelir ve hazır tepsideki tüm cupcake'leri kapıp kaçar. Tepsi'de cupcake yoksa eli boş, sinirli şekilde gider. Tezgâhta yer kaplamaz (müşteri yerlerinin önünden geçer).
- **Karşı önlem:** Dükkândan Güvenlik Görevlisi satın alınırsa hırsız yakalanır, kaçamaz ve oyuncuya +$5 "ceza parası" bırakır.

### 8.4 (Opsiyonel, vakit kalırsa) Frankenstein 🧟‍♂️
- **Ne zaman açılır:** 4. gün
- **Davranış:** İki cupcake sipariş eder (iki balon). Daha sabırlıdır, ama ikisi de verilince iki katı bahşiş öder.
- Bu özellik ilk sürümde yapılmasa da olur.

## 9. Dükkân (Günler Arası)
Her gün sonunda, özet ekranından sonra dükkân açılır. Para günden güne birikir. Satın alınan şeyler kalıcıdır.

| Ürün | Fiyat | Etkisi |
|------|-------|--------|
| 🧄 Sarımsak | $40 | Vampir artık ısırmaz |
| 💂 Güvenlik Görevlisi | $60 | Hırsız yakalanır, +$5 bırakır |
| 🔥 3. Fırın Slotu (opsiyonel) | $50 | Fırına aynı anda 3 kek girer |

Not: Oyuncu, vampir ve hırsız gelmeden önce bunları alamayabilir; bu bilinçli. Önce problemi yaşar, sonra çözümü satın alır.

## 10. Günler ve Zorluk

| Gün | Hedef para | Müşteri gelme aralığı | Müşteri sabrı | Açık özel canavarlar |
|-----|-----------|----------------------|---------------|----------------------|
| 1 | $60 | ~12 sn | 30 sn | – (sadece normal) |
| 2 | $90 | ~10 sn | 27 sn | Vampir, Hayalet |
| 3 | $120 | ~8 sn | 24 sn | + Hırsız |
| 4 | $150 | ~7 sn | 22 sn | Hepsi (+ Frankenstein opsiyonel) |

- "Hedef para" o gün kazanılan para içindir (birikmiş toplam değil).
- Gün içindeki aralıklar küçük rastgelelik içerebilir (±2 sn).
- Değerler oynanarak ayarlanabilir; amaç: 1. gün rahat, 4. gün telaşlı ama kazanılabilir.

**Gün sonu**
- 150 sn dolduğunda yeni müşteri gelmez, tezgâhtakiler gider, gün biter.
- Hedefe ulaşıldıysa: özet ekranı (kazanılan para, servis edilen müşteri, kaçan müşteri, yıldız) → dükkân → sonraki gün.
- Ulaşılamadıysa: "Tekrar dene" ile gün baştan başlar. Önceki günlerden biriken para ve satın alımlar korunur.
- **Yıldız:** Hedefin %100'ü = 1 yıldız, %130'u = 2 yıldız, %160'ı = 3 yıldız.
- 4 gün geçilince "Kazandın! BooCake şehrin en iyi canavar pastanesi!" final ekranı.

## 11. Ekranlar
1. **Başlangıç ekranı:** BooCake logosu, "Oyna" ve "Nasıl Oynanır" butonları.
2. **Nasıl oynanır:** 3–4 maddelik, görselli kısa anlatım.
3. **Oyun ekranı** (Bölüm 4).
4. **Yeni canavar tanıtımı:** Yeni bir özel canavarın açıldığı günün başında küçük bir kart ("Yeni müşteri: Vampir! Seni ısırır, sarımsaktan korkar.").
5. **Gün sonu özeti.**
6. **Dükkân.**
7. **Final / kazanma ekranı.**

## 12. Görsel ve Ses Tarzı
- **Ton:** Korkutucu değil, sevimli-ürkütücü (cute-spooky). Pastel mor, nane yeşili, pembe; koyu mor arka plan.
- **İlk sürüm:** Grafikler emoji ve basit CSS/SVG şekilleriyle yapılabilir. Kod, görsellerin sonradan PNG ile değiştirilebileceği şekilde yazılmalı (her canavar/malzeme için tek bir yerde tanımlı görsel yolu).
- Ekip canavarları kendisi çizebilir; çizimler `assets/` klasörüne konacak.
- **Ses (opsiyonel):** fırın "ding", para şıngırtısı, vampir ısırığı, hayaletin düşürdüğü kekin "plop" sesi. Ses yoksa oyun eksik sayılmaz.
- **Animasyonlar:** basit CSS geçişleri yeterli (müşteri girişi/çıkışı, para yazısının yukarı uçması, ısırılma kırmızı ekranı, kek düşmesi).

## 13. Teknik Gereksinimler
- **Tek klasör, kurulumsuz:** `index.html` + (isteğe bağlı) `style.css`, `game.js`, `assets/`. Çift tıklayınca tarayıcıda açılmalı. Sunucu, build adımı, npm yok.
- Saf HTML/CSS/JavaScript. Framework gerekmez. DOM tabanlı yapmak (div'ler + CSS) Canvas'tan daha basit ve yeterlidir.
- Tüm sayısal değerler (süreler, fiyatlar, hedefler, gün tablosu) dosyanın başında tek bir `CONFIG` nesnesinde durmalı, böylece kolayca dengelenebilir.
- Oyun döngüsü `requestAnimationFrame` ile; süreler gerçek zamana (delta time) göre hesaplanmalı.
- Ekran 1280×720 için tasarlanıp pencereye göre ölçeklenmeli; sunumda tam ekran güzel görünmeli.
- Kaydetme gerekmez (her açılışta baştan başlar). İstenirse `localStorage` ile en iyi skor tutulabilir.
- Kod okunur ve yorumlu olmalı; ekip derste anlatabilmeli.

## 14. Öncelik Sırası (Kapsam)
**Mutlaka olmalı (teslim için yeterli):**
- Cupcake hazırlama akışı (hamur → fırın → krema → topping → servis)
- Fırında pişme ve yanma
- Müşteri sabrı, ruh hali, bahşiş
- 150 sn'lik gün, hedef para, gün sonu
- Vampir + sarımsak, Hayalet, Hırsız + güvenlik
- Dükkân ekranı
- 4 gün ve final ekranı

**Vakit kalırsa:**
- Frankenstein
- 3. fırın slotu
- Ses efektleri ve müzik
- Ekibin çizdiği görseller
- Yıldız sistemi, en iyi skor

## 15. Derste Kullanılacak Pitch (60 saniye)
"Our game BooCake is a cupcake shop for monsters. In this game, skill meets strategic chance. The player tries to reach the daily money goal by baking and serving cupcakes fast. What makes it unique is silly monsters: a biting vampire, a cupcake thief and a clumsy ghost. We designed this game for ages 10+ casual gamers."

## 16. Özgünlük Notu
BooCake, "zamana karşı yemek servisi" türünde özgün bir oyundur. Var olan belirli bir oyunun karakterleri, görselleri, isimleri veya bölümleri kopyalanmamalıdır. Oyunun özgün tarafı canavar müşteriler ve onların kurallara kattığı komik kaos (ısırma, çalma, içinden düşürme) ile bunlara karşı alınan stratejik önlemlerdir.

---

## Uygulama notları (Claude, 2026-11-18)
Bunlar ekibin metni değildir; koda geçerken fark edilen noktalar.

1. **Görsel referans:** Ekip "Good Pizza, Great Pizza" benzeri bir düzen istedi. Bölüm 16 var olan bir oyunun görsellerinin/karakterlerinin kopyalanmamasını söylüyor; bu yüzden o oyundan yalnızca tür ortaklarını alıyoruz (tezgâh + sipariş balonu + istasyonlar, dolu ve renkli dükkân hissi). Karakterler, renkler, çizimler ve isimler BooCake'e özgü kalır (mevcut Kenney canavarları + pastel mor stil).
2. **Teknik çelişki (karar bekliyor):** Bölüm 13 "npm/build yok, saf HTML/CSS/JS, çift tıklayınca açılsın" diyor; repoda ise Phaser + TypeScript + Vite var. Ayrıca Vite'ın normal build'i `file://` ile çift tıklayınca açılmaz (modül scriptleri ve resim yüklemeleri engellenir).
3. **Mevcut koddan farklar:** Yeni doküman hamur seçimi (3 hamur), tabak, hazır tepsi, sabit $5 fiyat + ruh haline göre bahşiş, 4 gün, hedef gün başına, vampir/hayalet/hırsız, dükkân, "nasıl oynanır" ve final ekranı istiyor. Mevcut prototip bunların çoğundan farklı çalışıyor.
