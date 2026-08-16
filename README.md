# Inner Flow — PWA + Push Notification

Apl kesejahteraan diri (nafas, emosi, tiup, pet, tabiat balon) sebagai PWA installable dengan
push notification jadual dari server Node.js sendiri.

## Struktur

```
index.html          — Aplikasi (PWA)
manifest.webmanifest — Install prompt
sw.js               — Service Worker (cache + push + notification click)
icon-192/512.png    — Ikon
server/             — Node.js push server (self-host)
```

## Jadual Peringatan (automatik, waktu Asia/Kuala_Lumpur)

| Masa  | Jenis            | Kes | Bila dihantar |
|-------|------------------|-----|---------------|
| 08:00 | bangun           | bila belum "bangun" hari ini | tekan Bangun dalam Pet |
| 12:00 | makan            | bila belum makan | 🍚 jaga pet |
| 14:00 | minum            | bila belum minum | 🥤 segar pet |
| 17:00 | senam            | bila belum bersenam | 🏃 aktif |
| 18:30 | checklist        | bila belum update tabiat | 🎈 update Balon Tabiat |
| 23:00 | tidur            | bila belum tidur | 😴 rehat |

Notis hanya dihantar apabila tiada tindakan pada hari tersebut (server semak
`POST /api/state`). Setiap jenis hanya sekali sehari.

## Cara deploy (self-host)

1. **Pasang server** — ke mana-mana Node 18+ (VPS, Render, Railway, Fly.io…).
   ```bash
   cd server
   npm install
   npm run genkeys      # hasilkan server/vapid.json (rahsia!)
   npm start            # port 3000
   ```
2. **Atur persekitaran**:
   - `PORT` (lalai 3000)
   - Pastikan laluan `/` menghidang folder ini (server sudah serve `../`).
   - HTTPS wajib untuk Service Worker & Web Push.
3. **Buka app** atas HTTPS → Tetapan → Peringatan → **Benarkan notifikasi**.
   Tekan **Uji notifikasi** untuk sahkan.

## Aliran push

1. App minta kebenaran → dapatkan VAPID public key dari `GET /api/vapidPublicKey`.
2. App `pushManager.subscribe(...)` → `POST /api/subscribe` simpan langganan.
3. Setiap tindakan besar (bangun/makan/minum/senam/checklist/tidur) → `POST /api/state {action}`.
4. `node-cron` pada masa tertentu → semak state harian → `webpush.sendNotification` jika tindakan belum dibuat.

## Endpoints API

- `GET  /api/vapidPublicKey` — kunci awam VAPID
- `POST /api/subscribe` — daftar langganan push `{subscription:{endpoint,keys}}`
- `POST /api/unsubscribe` — `{endpoint}`
- `POST /api/state` — `{action}` tandakan tindakan selesai (per hari)
- `POST /api/test` — `{jenis}` hantar ujian segera; `GET /api/ping` status

## Nota

- Data kekal local (gabus pengguna) + server simpan langganan & state harian dalam `server/db.json`.
- Kalau belum deploy server, app masih berfungsi dengan peringatan lokal (semasa app dibuka).
- `server/vapid.json` & `server/db.json` jangan masukkan ke git (kandungan rahsia / persendirian).