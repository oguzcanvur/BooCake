# BooCake — Üretim Planı

> Oyunu tasarım belgesinden ([game-design.md](game-design.md)) oynanabilir bir tarayıcı oyununa nasıl çevireceğimizin genel hatları.
> Ayrıntılı tasarım (sayılar, denge, içerik listeleri) sonraki aşamada yapılacak.

## 0. Nasıl çalışıyoruz
**Ekip kod yazmaz.** Ekip üyeleri Claude'a (Claude Code) prompt verir; kurulumları, indirmeleri, proje iskeletini, bütün kodu, testleri ve git işlemlerini Claude yapar.

Ekibin işi:
- **Ne yapılacağına karar vermek:** tasarım, öncelikler, "bu eğlenceli mi?"
- **Prompt vermek:** net, tek bir işe odaklı istekler.
- **Oynayıp test etmek** ve geri bildirim vermek.
- **Asset seçmek ve onaylamak** (görsel ve ses tarzı).
- **İnceleme ve onay:** Pull Request'leri oynayarak kontrol edip onaylamak.

## 1. Temel kararlar
| Konu | Karar | Neden |
|------|-------|-------|
| Motor | **Phaser** (güncel kararlı sürüm, kurulumda sabitlenir) | Her şey metin kod olduğu için Claude tam kontrol eder. Oyunu kendi tarayıcı panelinde açıp tıklayarak test edebilir ve ekran görüntüsüyle gösterebilir. |
| Dil | **TypeScript** | Hataları kod çalışmadan yakalar; Claude'un yazdığı kod daha güvenilir olur. |
| Araçlar | **Vite** (geliştirme sunucusu + build), Node.js (oğuzcan'ın bilgisayarında kurulu: v24) | Kaydedince oyun tarayıcıda anında yenilenir; build küçük ve hızlıdır. |
| Platform | Web tarayıcı (masaüstü), sadece fare | GDD'deki hedef kitle kararı |
| Yayın | **itch.io** (geliştirme sırasında gizli/draft sayfa) | Ücretsiz, HTML5 oyunlarını doğrudan destekler. Private repoda GitHub Pages ücretli plan istiyor (GitHub Student Pack ile açılabilir). |
| Görsel / ses | Hazır, ücretsiz ve lisansı uygun asset'ler (Kenney, itch.io, OpenGameArt, freesound) | Ekipte sanatçı yok. Her asset'in lisansı `CREDITS.md`'ye yazılır. |
| Roller | Alan sahipliği (bkz. bölüm 3) | Aynı anda iki Claude oturumunun aynı dosyaları değiştirmesini önler. |

## 2. Aşamalar ve takvim (≈ 7 hafta + 1 hafta yedek)
Stüdyo mantığı: önce eğlenceli olup olmadığını en ucuz yoldan kanıtla (prototip), sonra bir geceyi bitmiş kaliteye getir (vertical slice), en son içeriği çoğalt.

| Hafta | Aşama | Hedef | Bitince elimizde ne olacak (milestone) |
|-------|-------|-------|------|
| 0 | **Hazırlık** | Claude projeyi kurar: Phaser + TypeScript + Vite iskeleti, klasör yapısı, test için yerel sunucu, ilk itch.io build'i. Ekip davetleri kabul eder, repoyu klonlar, prototip için minimum tasarımı netleştirir. | Tarayıcıda açılan boş "BooCake" ekranı (yerelde ve itch.io'da) |
| 1–2 | **Prototip (gray box)** | Sadece kutular ve placeholder'larla temel döngü: 1 müşteri tipi, 1–2 cupcake çeşidi, fırın → krema → topping → servis, sabır barı, bahşiş, saat. | Ana döngü oynanabilir. Soru: **"Bu eğlenceli mi?"** Ekip içi test. |
| 3 | **Vertical slice** | 1. gece "bitmiş" kalitede: gerçek asset'ler, para hedefi, yıldızlar, gece sonu ekranı, temel ses ve efektler. | Başkasına oynatılabilecek tek bir gece. İlk dış playtest. |
| 4–5 | **Üretim** | 7 gece verisi, canavarlar (vampir, hayalet, hırsız), geceler arası upgrade dükkânı (sarımsak, görevli...), ana menü, kayıt (save). | Bütün oyun baştan sona oynanabilir (**Alpha / content complete**) |
| 6 | **Test ve denge** | Playtestler, zorluk eğrisi, para hedefleri, hata ayıklama. Yeni özellik eklenmez. | **Beta** |
| 7 | **Cila (polish)** | Animasyonlar, "juice" (sallanma, parçacıklar), ses dengesi, performans, farklı tarayıcılarda test. | **Release candidate** |
| 8 | **Yedek + teslim** | Gecikmeler için tampon, sunum, video, teslim. | Teslim edilen oyun |

**Takvim 4 haftaya inerse:** Hafta 0–1 prototip, 2 vertical slice, 3 üretim (MVP kapsamı), 4 test ve teslim.

## 3. Ekip ve alan sahipliği
"Sahip", o alanın prompt'larını veren, detaylarına karar veren ve test eden kişi demek.

| Alan | Kapsam | Sahip |
|------|--------|-------|
| **A. Mutfak** | Fırın (pişme/yanma), krema, topping, çöp, elde tutulan cupcake, sipariş eşleştirme | _?_ |
| **B. Müşteriler** | Müşteri sırası, sabır, sipariş üretme, canavar davranışları (vampir, hayalet, hırsız), müşterilerin tepkileri | _?_ |
| **C. Oyun akışı + UI + asset** | Gece döngüsü ve saat, para/bahşiş/yıldız, upgrade dükkânı, menüler, HUD, kayıt, asset/ses seçimi, itch.io build'leri | _?_ |

Sahipler ilk toplantıda belirlenip buraya ve CLAUDE.md'ye yazılır.

## 4. Kapsam (scope) — öncelik sırası
Zaman daralırsa listenin altından kesilir.

**Must (olmazsa oyun yok — MVP)**
- Temel mutfak döngüsü ve yanma
- Müşteri sırası, sabır, doğru/yanlış sipariş, bahşiş
- Gece saati, para hedefi, kazan/kaybet, gece tekrarı
- En az 3–4 gece ile artan zorluk
- Basit ana menü ve gece sonu ekranı

**Should (oyunu "BooCake" yapan şeyler)**
- 7 gece + Halloween finali
- Vampir, hayalet, hırsız
- Upgrade dükkânı (sarımsak, görevli + 2–3 tane daha)
- 3 yıldız sistemi, kayıt (save)
- Ses efektleri ve müzik

**Could (vakit kalırsa)**
- Ekstra canavarlar ve cupcake çeşitleri
- Ayarlar menüsü (ses seviyesi), tam ekran
- Kısa tutorial / ilk gece ipuçları
- Başarımlar, istatistik ekranı

## 5. Teknik mimari (genel hat)
Ayrıntıları Claude kodlama aşamasında belirler ve buraya işler.

- **Phaser sahneleri (Scene):** `Boot/Preload` (asset yükleme), `MainMenu`, `Night` (dükkân ekranı, oyunun kendisi), `NightResult` (gece sonu, yıldızlar), `UpgradeShop`, `HUD` (Night'ın üstünde çalışan arayüz).
- **Oyun nesneleri:** istasyonlar (`Oven`, `Frosting`, `Topping`, `Trash`), `Cupcake`, `Customer` ve canavar türleri.
- **Global durum:** `GameState`: para, mevcut gece, alınan upgrade'ler, yıldızlar.
- **Veri odaklı içerik:** Gece ayarları (süre, hedef, müşteri sıklığı, hangi canavarlar), cupcake tarifleri ve upgrade'ler mantık kodundan ayrı veri dosyalarında tutulur. Denge değişikliği için sadece sayılar değişir.
- **İletişim:** Sistemler birbirine olaylarla (event) haber verir, örneğin `order-served`, `customer-left`, `cupcake-burned`. Böylece alanlar birbirinden bağımsız geliştirilebilir.
- **Kayıt:** Tarayıcının `localStorage`'ı.
- **Klasör yapısı (öneri):**
  ```
  src/
    scenes/        ← Phaser sahneleri
    objects/       ← istasyonlar, cupcake, müşteriler
    systems/       ← GameState, sipariş, bahşiş, gece zamanlayıcı
    data/          ← geceler, tarifler, upgrade'ler
  public/assets/   ← art/, audio/, fonts/
  docs/            ← tasarım ve plan belgeleri
  CREDITS.md       ← asset lisansları
  ```

## 6. Çalışma şekli
- **Kurulum (her üye bir kez):** GitHub davetini kabul et → repoyu klonla → klasörde Claude Code'u aç. Gerekli kurulumları (Node.js, paketler) Claude yapar. Claude ortak bağlamı repodaki `CLAUDE.md`'den okur.
- **Bir iş nasıl yapılır:**
  1. GitHub Issues'tan işi seç (veya yeni issue aç).
  2. Claude'a prompt ver, örneğin: *"Issue #12: Fırına konan cupcake 8 saniyede pişsin, 12 saniyede yansın ve siyaha dönsün."*
  3. Claude en güncel `main`'i çeker, `feature/...` dalı açar, kodu yazar, oyunu tarayıcıda test eder ve sonucu gösterir.
  4. Sen oynayıp kontrol edersin; düzeltme varsa prompt ile istersin.
  5. Claude Pull Request açar; **başka bir ekip üyesi** oyunu açıp dener ve onaylar; sonra `main`'e birleştirilir.
- **İyi prompt:** tek bir iş, net davranış, mümkünse sayılar. Kararlar sohbette kalmaz: Claude onları `CLAUDE.md` veya GDD'ye yazar ki diğer üyelerin Claude oturumları da bilsin.
- **Çakışmayı önleme:** Herkes kendi alanının dosyalarında çalışır. İki kişi aynı anda aynı sisteme prompt vermez. `main` her zaman çalışır durumda olur.
- **Görev takibi:** GitHub Issues + GitHub Projects panosu (Yapılacak / Yapılıyor / İncelemede / Bitti).
- **Toplantı:** Haftada 1 planlama (30 dk, işler dağıtılır), haftada 1–2 kısa durum kontrolü (mesajla da olabilir).
- **Build:** Her hafta sonu `main`'den itch.io'ya bir web build yüklenir; playtest her zaman son build ile yapılır.
- **Playtest:** Hafta 3'ten itibaren ekip dışından en az 2–3 kişi oynar. Notlar bir issue'ya yazılır.

## 7. Riskler
| Risk | Etki | Önlem |
|------|------|-------|
| Belirsiz prompt'lar | Claude yanlış şeyi yapar, zaman kaybı | Prompt'tan önce kısa tasarım kararı; tek işe odaklı istekler; sayıları vermek |
| Üç ayrı Claude oturumu farklı bağlamla çalışır | Tutarsız kod, kararlar kaybolur | Bütün kararlar ve kurallar repodaki `CLAUDE.md`'de; her oturum önce `main`'i çeker |
| Aynı dosyalara aynı anda değişiklik | Git çakışmaları | Alan sahipliği, küçük PR'lar, birleştirmeden önce test |
| Kapsam büyümesi ("bunu da ekleyelim") | Teslime yetişmemek | Must/Should/Could listesi; hafta 6'dan sonra yeni özellik yok |
| Uyumlu asset bulunamaması (tarz farkları) | Görsel bütünlük bozulur | Tek bir ana asset paketi seçilir; renk paleti GDD'ye göre sabitlenir |
| Ekip kodu anlamadığı için hatayı fark etmez | Hatalar birikir | Her PR oynanarak kontrol edilir; Claude her değişiklikte neyi test ettiğini yazar |

## 8. Sonraki adımlar
1. Alan sahiplerini belirle (bölüm 3).
2. Ceren ve Karya davetleri kabul edip repoyu klonlasın, Claude Code'a erişimleri olsun.
3. Claude proje iskeletini kursun (Phaser + TypeScript + Vite) ve boş ekranı tarayıcıda göstersin.
4. itch.io hesabı ve gizli oyun sayfası (hesabı bir ekip üyesi açar).
5. Ana asset paketini seç; Claude uygun ücretsiz paketleri araştırıp seçenek sunabilir.
6. **Tasarım aşaması:** Prototip için gereken minimum detayları netleştir: cupcake/krema/topping çeşitleri, sipariş gösterimi, pişme ve yanma süreleri, sabır süresi, bahşiş formülünün ilk hali.
