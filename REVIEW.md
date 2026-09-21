# Review Kekurangan — NHCIE LMS

Tinjauan kode per 26 Juli 2026, setelah perbaikan build, palet, dan pemutar video.
Diurutkan berdasarkan dampak, bukan berdasarkan seberapa mudah diperbaiki.

---

## 1. Kebocoran data antar pengguna (paling serius)

`GET /api/db` mengembalikan **isi penuh tabel `users`, `certificates`, dan `transactions` kepada setiap pengguna yang login** — bukan hanya admin.

**a. Hash password ikut terkirim.** `src/app/api/db/route.js` memetakan `password: row.password`. Artinya seorang peserta cukup membuka DevTools → Network → `/api/db` untuk memperoleh email, jabatan, organisasi, dan **hash bcrypt seluruh pengguna termasuk admin**. Hash bcrypt memang lambat dipecahkan, tetapi memberikannya secara cuma-cuma kepada semua orang menghapus satu lapisan pertahanan sepenuhnya. Bila ada pengguna berkata sandi lemah, ini cukup untuk pengambilalihan akun.

**b. Sertifikat tidak difilter per pemilik.** `WalletPage` menampilkan array `certificates` dari context, dan context mengisinya dari `/api/db` yang mengirim seluruh tabel. Jadi Digital Wallet setiap peserta menampilkan sertifikat milik semua orang seolah miliknya sendiri. Ini sekaligus bug fungsional dan pelanggaran privasi. Ironisnya endpoint yang benar sudah ada — `GET /api/certificates` memfilter berdasarkan pengguna yang login — tetapi **tidak pernah dipanggil UI**.

**c. Riwayat transaksi orang lain** ikut terkirim dengan cara yang sama.

Perbaikan minimum: hapus `password` dari respons, batasi daftar `users` ke admin, dan alihkan Wallet ke `/api/certificates`.

## 2. Admin menyimpan password tanpa hash

`POST /api/db` (`type: "user"`) memasukkan `password` apa adanya dari formulir admin ke kolom `users.password`. Tidak ada `hashPassword()` di jalur ini, padahal `/api/auth/register` melakukannya dengan benar.

Akibatnya berlapis: pengguna yang dibuat admin **tidak bisa login** (karena `comparePassword` membandingkan teks polos dengan hash), sampai proses Node berikutnya menjalankan migrasi di `lib/db.js` yang meng-hash ulang semua password non-bcrypt. Jadi bug ini tampak "sembuh sendiri setelah restart" — pola yang sangat menyulitkan saat ditelusuri. Selama jeda itu, password tersimpan sebagai teks polos di basis data.

## 3. Fitur inti yang masih simulasi

Ini yang paling berisiko bila platform didemokan ke calon pembeli, karena tampak berfungsi padahal tidak.

| Fitur | Kondisi sebenarnya |
|---|---|
| **Pendaftaran kelas** | `enrolledCourses` di `AppContext` adalah `useState(["c1"])` — nilai mati. Tabel `enrollments` ada, endpoint bulk ada, tetapi UI **tidak pernah** memuat pendaftaran milik pengguna. Semua orang "terdaftar" di kursus c1, dan pembelian tidak benar-benar menambah akses |
| **Pembayaran** | `handleConfirmPayment` langsung menandai transaksi `"Berhasil"` di sisi klien tanpa memanggil `/api/payment`. Padahal alur order manual + konfirmasi admin sudah lengkap di backend dan tidak terpakai |
| **Absensi** | String `"IP: 192.168.1.45, Lokasi GPS Terverifikasi"` ditulis mati. Tidak ada pembacaan IP maupun Geolocation API, dan tidak ada tabel absensi |
| **Unggah tugas** | `setTimeout(2000)` lalu status "Success". Tidak ada berkas yang dikirim, padahal `/api/upload/presigned` (S3/R2) dan `/api/upload/drive` sudah jadi |
| **Progress video** | Simulator timer, bukan durasi tontonan nyata |

Pola yang berulang: **backend sudah dikerjakan, UI-nya masih memakai simulasi lama.** Pekerjaan yang tersisa sebagian besar adalah menyambungkan, bukan membangun dari nol.

## 4. Arsitektur frontend

- **`AppContext.js` menampung ±70 `useState` dan mengekspor ±120 nilai.** Objek `value` dibentuk ulang setiap render dan tidak di-memo, sehingga satu ketikan di kolom pencarian admin me-render ulang seluruh pohon komponen termasuk pemutar video dan grafik. Keberadaan `fix-context.sh` di root — skrip tambal darurat untuk berkas ini — menunjukkan file ini sudah pernah rusak saat diedit.
- **Dua sumber kebenaran.** Data awal di-hardcode di context *dan* diambil dari DB. Ketika DB gagal, aplikasi diam-diam masuk "demo mode" dengan data fiktif alih-alih menyatakan ada gangguan.
- **Aplikasi satu halaman tanpa routing.** Enam "halaman" ditukar lewat state `activePage`. Konsekuensinya: tautan ke sebuah kelas tidak bisa dibagikan, tombol Back peramban tidak berfungsi, dan menyegarkan halaman selalu kembali ke dashboard — di tengah ujian sekalipun.
- **Tidak ada `error.js`, `loading.js`, maupun `not-found.js`.** Satu galat render menghasilkan layar putih tanpa pesan.
- **Komponen kembar.** `PaymentModal` vs `PaymentModalV2`, `PlatformSettingsPanel` vs V2, pemutar Vimeo lama di `LmsPage` — sekitar 700 baris kode mati yang masih ikut dibaca setiap kali seseorang menelusuri kode.

## 5. Skala dan kinerja

- **`/api/db` mengirim enam tabel sekaligus tanpa batas.** Dengan 50 pengguna ini tidak terasa; dengan 5.000 pengguna dan 20.000 sertifikat, satu permintaan ini akan mengirim puluhan megabita ke setiap peramban saat login.
- **Hanya 5 dari 40 route punya pagination** (`audit-logs`, `catalog`, `email`, `forum`, `reviews`).
- **Rate limiting hanya di endpoint login** dan disimpan di memori proses, sehingga tidak berlaku bila dijalankan lebih dari satu instans.

## 6. Aksesibilitas

32 elemen interaktif memakai `<div onClick>` tanpa `role`, `tabIndex`, atau penanganan papan ketik — termasuk tab peran di halaman login, tab LMS, menu sidebar, dan pilihan jawaban ujian. Elemen semacam ini tidak dapat dijangkau dengan Tab, tidak merespons Enter/Spasi, dan tidak diumumkan pembaca layar sebagai kontrol.

Untuk platform yang dijual ke instansi pemerintah, aksesibilitas lazimnya bagian dari persyaratan pengadaan, bukan penyempurnaan opsional. Sebagian besar kasus di sini selesai dengan mengganti `<div onClick>` menjadi `<button type="button">`.

## 7. Responsivitas

Hanya ada **2 media query** di 1.100+ baris CSS, dan tata letak inti memakai grid kolom tetap (`.lms-container`, `.login-card` lebar 1000px, `.dashboard-grid`). Praktis aplikasi ini desktop-only — padahal `manifest.json` mendaftarkannya sebagai PWA dengan `"orientation": "portrait-primary"`, yang menjanjikan pengalaman ponsel yang belum ada.

## 8. Tidak ada jaring pengaman rekayasa

- **Nol tes otomatis.** Tidak ada satu pun berkas `.test.js`. Untuk sistem yang menghitung skor ujian dan menerbitkan sertifikat, minimal pengujian pada `exam/submit` (perhitungan skor, ambang kelulusan, batas percobaan) sangat sepadan.
- **Tidak ada repositori git** di folder ini — tidak ada riwayat, tidak ada cara membatalkan perubahan, tidak ada penelusuran siapa mengubah apa.
- **Tidak ada CI, error tracking, maupun monitoring.**

---

## Urutan pengerjaan yang saya sarankan

1. **Hentikan kebocoran data** (§1) dan **hash password di jalur admin** (§2). Keduanya perubahan kecil, berdampak besar, dan berisiko regulasi bila platform sudah memuat data pegawai sungguhan.
2. **`git init` dan commit pertama.** Semua langkah berikutnya jauh lebih aman setelah ini.
3. **Sambungkan pendaftaran kelas dan pembayaran ke backend** (§3). Backend-nya sudah ada; ini pekerjaan penyambungan yang mengubah demo menjadi produk.
4. **Pisahkan `AppContext` dan tambahkan routing berbasis URL** (§4). Pekerjaan terbesar, tapi menjadi prasyarat bagi hampir semua perbaikan lain.
5. **Aksesibilitas dan responsivitas** (§6, §7) sebelum masuk proses pengadaan instansi.
6. **Tes untuk jalur ujian dan sertifikat** (§8).

## Yang sudah baik dan sebaiknya dipertahankan

Agar seimbang — beberapa keputusan di kode ini justru di atas rata-rata:

- **Keamanan ujian.** Kunci jawaban tidak pernah dikirim ke klien; soal dan pilihan diacak Fisher-Yates; jawaban benar disimpan dalam JWT bertanda tangan; penilaian sepenuhnya di server. Banyak LMS komersial tidak seketat ini.
- **Mock fallback yang konsisten** di setiap integrasi eksternal (Gemini, Midtrans, S3, Drive, email), sehingga aplikasi tetap bisa dijalankan tanpa satu pun kredensial.
- **Skema basis data yang tertata** dengan migrasi idempoten, indeks pada kolom yang sering di-query, dan soft delete.
- **Pola route API yang seragam**: autentikasi → validasi Zod → query → `{ success, ... }`.
