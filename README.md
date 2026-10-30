# Noise SMP — Feedback Web

Website feedback modern, minimalis, dark mode & responsif untuk **Noise SMP**.

Dibuat sesuai brief: satu kolom tulis pesan, satu tombol kirim, dan satu panel admin tersembunyi untuk membaca semua pesan. Data disimpan permanen di database (SQLite), bukan localStorage.

## ✨ Fitur

### Halaman Member (`/`)
- Judul **"Sampaikan Pendapatmu"**
- Textarea dengan placeholder `Tuliskan keluh kesah atau saranmu di sini...`
- Tombol **Kirim** — pesan langsung tersimpan ke database
- Notifikasi `Pesan berhasil dikirim! Terima kasih atas masukannya.`
- 100% anonim, tanpa perlu login
- Counter karakter, validasi, dan animasi loading
- Desain modern dark mode + blob gradient + glassmorphism
- Responsif penuh untuk HP

### Panel Admin (`/admin`)
- Halaman tersembunyi hanya via URL `/admin`
- Login dengan password (default: `noiseadmin123`, bisa diubah via env `ADMIN_PASSWORD`)
- Menampilkan semua pesan **terbaru paling atas**
- Admin bisa **membaca & menghapus** pesan
- Statistik total pesan & waktu terbaru
- Hanya admin yang bisa akses `/api/messages` (proteksi token + cookie)
- Logout aman

### Sistem
- Backend **Node.js + Express**
- Database **SQLite** via `node:sqlite` (built-in Node 22) — file `feedback.db` otomatis terbuat, tidak hilang saat refresh
- API terhubung langsung: form member → database → panel admin
- Tidak menggunakan localStorage sebagai database (hanya untuk token admin)

## 🚀 Cara Menjalankan

```bash
npm install
npm start
# atau
npm run dev
```

Buka:
- Member: http://localhost:3000
- Admin: http://localhost:3000/admin → password: `noiseadmin123`

### Environment Variable (opsional)
```bash
ADMIN_PASSWORD=passwordBaru123 PORT=3000 node server.js
```

## 📁 Struktur

```
FEEDBACK_WEB/
├── server.js          # Express + SQLite + Auth
├── public/
│   ├── index.html     # Halaman Member
│   ├── admin.html     # Panel Admin (login + dashboard)
│   ├── style.css      # Dark mode modern minimal
│   ├── app.js         # Logic Member
│   └── admin.js       # Logic Admin
├── feedback.db        # SQLite (auto-create, gitignored)
└── package.json
```

## 🔒 Keamanan
- `GET /api/messages` & `DELETE /api/messages/:id` butuh header `Authorization: Bearer <token>` (dicek di `/api/admin/check`)
- Token dibuat dengan `crypto.randomBytes`, expiry 24 jam, disimpan di memory + cookie httpOnly
- Password default bisa diganti tanpa ubah kode

## 🎨 Desain
- Font: Outfit + Plus Jakarta Sans
- Warna: deep black `#08080a` + violet `#8b5cf6` → cyan `#06b6d4` gradient
- Card gelap, border halus, shadow dalam, blur backdrop
- Mobile-first, max-width 640px, grid fitur adaptif

## 📸 Endpoint API

| Method | Endpoint | Akses | Deskripsi |
|--------|----------|-------|-----------|
| POST | /api/feedback | Public | Kirim pesan `{message}` |
| POST | /api/admin/login | Public | Login `{password}` → token |
| GET | /api/admin/check | Public | Cek auth |
| POST | /api/admin/logout | Admin | Logout |
| GET | /api/messages | Admin | Ambil semua pesan (DESC) |
| DELETE | /api/messages/:id | Admin | Hapus pesan |

---

© 2026 Noise SMP — Dibuat untuk komunitas
