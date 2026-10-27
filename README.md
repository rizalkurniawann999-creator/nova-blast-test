# NOVA BLAST — Full-stack testing scaffold

Paket ini berisi frontend NOVA BLAST yang sudah ada dan backend API Node.js + Express. Backend dapat dijalankan di GitHub Codespaces. **Ini paket testing, bukan sistem produksi.**

## Fitur yang benar-benar tersedia
- API health check: `GET /api/health`
- Login backend dengan bcrypt hash + JWT: `POST /api/auth/login`
- Identitas token: `GET /api/auth/me`
- Ringkasan backend: `GET /api/dashboard`
- Tarif: `GET/PUT /api/settings/tariff` (ADMIN/BOS untuk perubahan)
- Template: `GET/POST /api/templates` (POST ADMIN/BOS)
- Permintaan WD demo: `GET/POST /api/withdrawals` dan update status ADMIN
- Daftar akun demo: `GET /api/users` (ADMIN)
- Data backend disimpan ke `data/store.json` saat pertama kali dijalankan.

## Yang belum terhubung / masih simulasi
Pairing WhatsApp, blast/pengiriman, saldo dan pendapatan, notifikasi, serta sebagian tabel dashboard di UI masih berupa simulasi frontend. Endpoint withdrawal hanya mencatat permintaan demo; tidak ada dana sungguhan yang dipindahkan. Jangan gunakan data pengguna sungguhan.

## Jalankan lokal atau Codespaces
1. Buka repository di Codespaces.
2. Di terminal:
   ```bash
   cp .env.example .env
   ```
3. Buat secret JWT acak minimal 32 karakter dan masukkan ke `.env` sebagai `JWT_SECRET`. Untuk Codespaces port 3000 cukup dibuka `Private` untuk testing pribadi; gunakan `Public` hanya bila perlu mengakses dari frontend eksternal dan jangan masukkan data nyata.
4. Install dan jalankan:
   ```bash
   npm install
   npm start
   ```
5. Buka port 3000 dari tab **Ports**. Frontend disajikan oleh server yang sama; cek `/api/health` untuk API.

## Akun demo
- ADMIN: `nova.admin` / `NovaDemo#2026!`
- BOS: `nova.boss` / `BossDemo#2026!`
- USER: `nova.user` / `UserDemo#2026!`

Akun ini untuk pengujian saja. Ganti/hapus sebelum deployment publik. Database file JSON bukan pilihan produksi untuk banyak pengguna bersamaan.

## Frontend Netlify
Untuk preview paling mudah, jalankan frontend dan API pada host Codespaces yang sama. Jika frontend tetap di Netlify, atur `window.NOVA_API_BASE` ke URL API Codespaces **sebelum** script frontend berjalan, dan masukkan origin Netlify ke `CORS_ORIGIN` di `.env`. URL Codespaces dapat berubah dan API hanya aktif saat Codespace berjalan. Jangan taruh JWT secret di frontend.

## Catatan keamanan
- `.env` dan `data/store.json` tidak masuk Git karena `.gitignore`.
- JWT_SECRET wajib disetel; server menolak login/API token jika belum disetel.
- Tambahkan database terkelola, validasi/otorisasi tambahan, backup, audit log, dan pengujian sebelum penggunaan nyata.
