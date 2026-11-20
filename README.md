# BooCake

CENG361 dersi oyun projesi: canavarlara cupcake satan bir dükkân (tarayıcıda, sadece fare ile).

- Tasarım: [docs/game-design-v2.md](docs/game-design-v2.md) · Ortak notlar: [CLAUDE.md](CLAUDE.md) · Lisanslar: [CREDITS.md](CREDITS.md)

## Oynamak (sunum için)
`npm run build` sonrası oluşan **`dist/BooCake.html`** dosyasını çift tıklayın; internet ve sunucu gerekmez.

## İnternette yayınlamak (GitHub Pages)
Oyun her `main` güncellemesinde otomatik derlenip GitHub Pages'te yayınlanır (`.github/workflows/deploy-pages.yml`).
Bağlantı: **https://oguzcanvur.github.io/BooCake/**. Oyuncular hiçbir şey indirmeden tarayıcıda oynar (telefonda yan çevirerek).

**İlk kurulum (bir kez):**
1. Ücretsiz GitHub hesabında Pages yalnızca **public** depolarda çalışır: Settings → General → Danger Zone → Change visibility → Public.
2. Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. Actions sekmesinde "Deploy to GitHub Pages" iş akışını çalıştırın (ya da `main`'e bir şey gönderin). Bitince bağlantı Settings → Pages'te görünür.

**Güncellemek:** değişiklikleri `main`'e birleştirmek yeterli; 1–2 dakika içinde site yenilenir. İlerleme durumu Actions sekmesinde görünür.

Notlar: `vite.config.ts` içindeki `base: './'` sayesinde oyun alt klasörde (`/BooCake/`) sorunsuz çalışır; tüm görsel, ses ve yazı tipleri kodun içine gömülü olduğu için 404 riski yoktur. Kayıtlar her oyuncunun kendi tarayıcısında tutulur.

## Geliştirmek
Node.js gerekir:

```
npm install
npm run dev
```

Sonra tarayıcıda http://localhost:5173 adresini açın. Tüm sayılar (süreler, fiyatlar, hedefler) `src/data/gameConfig.ts` içindedir.
