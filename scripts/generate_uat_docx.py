# -*- coding: utf-8 -*-
"""
Script to generate comprehensive User Acceptance Test (UAT) scenarios document
for DIDIKARA LMS in DOCX format.
"""
import os
import sys
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=120, bottom=120, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def set_table_borders(table, color="CBD5E1", sz="4", val="single"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:left w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:right w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideV w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)

def add_header_cell(cell, text, width=None):
    if width:
        cell.width = width
    set_cell_background(cell, "1E3A8A") # Navy Blue
    set_cell_margins(cell, top=140, bottom=140, left=140, right=140)
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(text)
    run.font.bold = True
    run.font.size = Pt(8.5)
    run.font.name = "Arial"
    run.font.color.rgb = RGBColor(255, 255, 255)

def add_data_cell(cell, text, width=None, align=WD_ALIGN_PARAGRAPH.LEFT, bold=False, color_hex="1E293B", bg_hex=None, font_size=8.0):
    if width:
        cell.width = width
    if bg_hex:
        set_cell_background(cell, bg_hex)
    set_cell_margins(cell, top=100, bottom=100, left=120, right=120)
    p = cell.paragraphs[0]
    p.alignment = align
    run = p.add_run(text)
    run.font.bold = bold
    run.font.size = Pt(font_size)
    run.font.name = "Arial"
    r = int(color_hex[0:2], 16)
    g = int(color_hex[2:4], 16)
    b = int(color_hex[4:6], 16)
    run.font.color.rgb = RGBColor(r, g, b)

def build_uat_document():
    doc = docx.Document()

    # Set page layout to Landscape for wide data tables
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.7)
        section.bottom_margin = Inches(0.7)
        section.left_margin = Inches(0.6)
        section.right_margin = Inches(0.6)
        section.page_width = Inches(11.69) # A4 Landscape
        section.page_height = Inches(8.27)
        section.orientation = docx.enum.section.WD_ORIENT.LANDSCAPE

    # --- TITLE & COVER HEADER ---
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(0)
    title_p.paragraph_format.space_after = Pt(4)
    run_title = title_p.add_run("DOKUMEN USER ACCEPTANCE TESTING (UAT)")
    run_title.font.name = "Arial"
    run_title.font.size = Pt(20)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(30, 58, 138) # Deep Blue

    subtitle_p = doc.add_paragraph()
    subtitle_p.paragraph_format.space_before = Pt(0)
    subtitle_p.paragraph_format.space_after = Pt(12)
    run_sub = subtitle_p.add_run("Skenario Pengujian Fungsional Lengkap (Positif & Negatif) — DIDIKARA LMS")
    run_sub.font.name = "Arial"
    run_sub.font.size = Pt(12)
    run_sub.font.italic = True
    run_sub.font.color.rgb = RGBColor(71, 85, 105) # Slate

    # --- METADATA TABLE ---
    meta_table = doc.add_table(rows=4, cols=4)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(meta_table, color="94A3B8")

    meta_data = [
        [("Aplikasi / Sistem:", True), ("DIDIKARA (Platform Pelatihan & Sertifikasi Profesional)", False),
         ("No. Dokumen:", True), ("UAT-DIDIKARA-2026-V1.0", False)],
        [("Target URL / Env:", True), ("https://didikara.vercel.app (Production)", False),
         ("Tanggal Rilis:", True), ("27 Oktober 2026", False)],
        [("Disusun Oleh:", True), ("Tim QA & Rekayasa Perangkat Lunak DIDIKARA", False),
         ("Status Pengujian:", True), ("Siap Dieksekusi (Ready for Sign-Off)", False)],
        [("Cakupan Kasus:", True), ("70 Skenario UAT (Positif & Negatif)", False),
         ("Arsitektur:", True), ("Next.js App Router, PostgreSQL, Tailwind, Node.js", False)]
    ]

    for row_idx, row in enumerate(meta_table.rows):
        for col_idx in range(4):
            label_text, is_bold = meta_data[row_idx][col_idx]
            cell = row.cells[col_idx]
            bg = "F1F5F9" if is_bold else "FFFFFF"
            add_data_cell(cell, label_text, bold=is_bold, bg_hex=bg, color_hex="1E293B" if is_bold else "334155", font_size=8.5)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # --- BAB 1: PENDAHULUAN & TUJUAN ---
    h1 = doc.add_heading(level=1)
    r1 = h1.add_run("1. Pendahuluan & Metodologi Pengujian")
    r1.font.name = "Arial"
    r1.font.size = Pt(13)
    r1.font.bold = True
    r1.font.color.rgb = RGBColor(30, 58, 138)

    p_intro = doc.add_paragraph()
    p_intro.paragraph_format.space_after = Pt(6)
    p_intro.add_run(
        "Dokumen User Acceptance Testing (UAT) ini dirancang sebagai instrumen validasi resmi untuk menguji seluruh fitur "
        "kritis pada platform DIDIKARA. Pengujian mencakup skenario positif (happy path, untuk memastikan sistem berperilaku "
        "sesuai harapan pada alur normal) serta skenario negatif (edge cases, input tidak valid, boundary conditions, dan serangan keamanan "
        "untuk memastikan sistem memiliki validasi yang kokoh, pesan error yang informatif, dan tidak mengalami kegagalan fatal/crash)."
    )

    p_guide = doc.add_paragraph()
    p_guide.paragraph_format.space_after = Pt(10)
    p_guide.add_run(
        "Definisi Tipe Skenario:\n"
        "• Positif (+): Menguji alur fungsional dengan data valid sesuai spesifikasi bisnis.\n"
        "• Negatif (-): Menguji penanganan kesalahan sistem ketika pengguna memasukkan data salah, memanipulasi parameter, melanggar batas otorisasi, atau melewati batasan waktu."
    )

    # --- BAB 2: MATRIKS SKENARIO UAT ---
    h2 = doc.add_heading(level=1)
    r2 = h2.add_run("2. Matriks Detail Skenario UAT (70 Test Cases)")
    r2.font.name = "Arial"
    r2.font.size = Pt(13)
    r2.font.bold = True
    r2.font.color.rgb = RGBColor(30, 58, 138)

    # Modules structure
    modules = [
        {
            "name": "MODUL 1: AUTENTIKASI, AKUN PENGGUNA & KEAMANAN",
            "cases": [
                {
                    "id": "UAT-AUTH-001",
                    "type": "POSITIF",
                    "scenario": "Registrasi Akun Siswa Baru dengan Data Lengkap dan Valid",
                    "precond": "Pengguna berada di halaman registrasi /login.",
                    "steps": "1. Buka form registrasi.\n2. Masukkan nama lengkap, email baru, password >= 6 karakter.\n3. Centang persetujuan UU PDP.\n4. Klik 'Daftar Sekarang'.",
                    "data": "Nama: 'Budi Santoso'\nEmail: 'budi.santoso@test.id'\nPass: 'Didikara2026!'",
                    "expected": "Akun berhasil dibuat di database dengan role 'student'. Notifikasi sukses muncul dan pengguna otomatis diarahkan ke dashboard."
                },
                {
                    "id": "UAT-AUTH-002",
                    "type": "NEGATIF",
                    "scenario": "Registrasi Menggunakan Format Email Tidak Valid",
                    "precond": "Pengguna berada di form registrasi.",
                    "steps": "1. Isi nama dan password valid.\n2. Isi email tanpa domain atau format salah.\n3. Klik 'Daftar Sekarang'.",
                    "data": "Email: 'budisantoso_bukanemail'",
                    "expected": "Sistem menolak form, menampilkan pesan validasi 'Format email tidak valid', dan data tidak dikirim ke server."
                },
                {
                    "id": "UAT-AUTH-003",
                    "type": "NEGATIF",
                    "scenario": "Registrasi dengan Password Lemah / Kurang dari 6 Karakter",
                    "precond": "Pengguna berada di form registrasi.",
                    "steps": "1. Masukkan email valid.\n2. Masukkan password dengan panjang 3 karakter.\n3. Klik 'Daftar'.",
                    "data": "Password: 'abc'",
                    "expected": "Sistem menolak pendaftaran dan memunculkan peringatan 'Password minimal harus 6 karakter'."
                },
                {
                    "id": "UAT-AUTH-004",
                    "type": "NEGATIF",
                    "scenario": "Registrasi dengan Email yang Sudah Terdaftar Sebelumnya",
                    "precond": "Email 'budi.santoso@test.id' sudah terdaftar di sistem.",
                    "steps": "1. Isi form pendaftaran dengan email yang sama.\n2. Klik 'Daftar'.",
                    "data": "Email: 'budi.santoso@test.id'",
                    "expected": "Sistem menolak dengan pesan error 'Email sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda'."
                },
                {
                    "id": "UAT-AUTH-005",
                    "type": "NEGATIF",
                    "scenario": "Proteksi Anti-Bot: Permintaan Registrasi Ditolak Saat Field Honeypot Terisi",
                    "precond": "Bot otomatis mengirim POST payload ke /api/auth/register.",
                    "steps": "1. Kirim request register dengan mengisi field honeypot tersembunyi (website_hp).",
                    "data": "website_hp: 'http://spam-site.com'",
                    "expected": "API merespons 400 Bad Request 'Permintaan tidak valid (bot detected)', registrasi dibatalkan, dan IP dicatat di log."
                },
                {
                    "id": "UAT-AUTH-006",
                    "type": "POSITIF",
                    "scenario": "Login Pengguna Terdaftar dengan Kredensial Valid",
                    "precond": "Akun sudah aktif di sistem.",
                    "steps": "1. Masukkan email dan password yang benar.\n2. Klik 'Masuk'.",
                    "data": "Email: 'budi.santoso@test.id'\nPass: 'Didikara2026!'",
                    "expected": "Autentikasi sukses, cookie JWT (httpOnly, Secure, SameSite=Lax) terpasang, pengguna masuk ke dashboard siswa."
                },
                {
                    "id": "UAT-AUTH-007",
                    "type": "NEGATIF",
                    "scenario": "Login Menggunakan Password yang Salah",
                    "precond": "Akun terdaftar di sistem.",
                    "steps": "1. Masukkan email benar.\n2. Masukkan password yang salah.\n3. Klik 'Masuk'.",
                    "data": "Password: 'PasswordSalah123'",
                    "expected": "Sistem menolak login, memunculkan pesan 'Email atau password yang Anda masukkan salah', dan tidak mengeluarkan token sesi."
                },
                {
                    "id": "UAT-AUTH-008",
                    "type": "NEGATIF",
                    "scenario": "Login dengan Email yang Belum Terdaftar",
                    "precond": "Email belum pernah didaftarkan.",
                    "steps": "1. Masukkan email acak.\n2. Masukkan password sembarang.\n3. Klik 'Masuk'.",
                    "data": "Email: 'user.gaib9982@domain.com'",
                    "expected": "Sistem menampilkan pesan 'Email atau kata sandi tidak cocok' tanpa membocorkan eksistensi akun secara spesifik."
                },
                {
                    "id": "UAT-AUTH-009",
                    "type": "POSITIF",
                    "scenario": "Login / Registrasi Instan Menggunakan Google OAuth 2.0",
                    "precond": "Pengguna memiliki akun Google aktif.",
                    "steps": "1. Klik tombol 'Masuk dengan Google'.\n2. Setujui consent screen Google.\n3. Kembali ke callback URL.",
                    "data": "Akun Google: Google Workspace / Gmail",
                    "expected": "Pengguna berhasil login secara instan; bila belum terdaftar akun baru otomatis terbuat dengan role 'student'."
                },
                {
                    "id": "UAT-AUTH-010",
                    "type": "POSITIF",
                    "scenario": "Permintaan Reset Password (Lupa Password) dengan Email Terdaftar",
                    "precond": "Pengguna lupa kata sandi.",
                    "steps": "1. Masuk ke halaman Lupa Password.\n2. Masukkan email terdaftar.\n3. Klik 'Kirim Instruksi'.",
                    "data": "Email: 'budi.santoso@test.id'",
                    "expected": "Token reset bertanda tangan (hashed single-use) dibuat, email instruksi terkirim, dan notifikasi sukses tampil."
                },
                {
                    "id": "UAT-AUTH-011",
                    "type": "NEGATIF",
                    "scenario": "Reset Password Menggunakan Token yang Sudah Kedaluwarsa / Pernah Dipakai",
                    "precond": "Token reset telah melewati masa berlaku 1 jam atau sudah dipakai sekali.",
                    "steps": "1. Buka tautan reset password lama.\n2. Masukkan password baru.\n3. Klik 'Simpan'.",
                    "data": "Token: Expired / Reused",
                    "expected": "Sistem menolak penggantian sandi dengan pesan 'Token reset tidak valid atau telah kedaluwarsa. Silakan ajukan ulang'."
                },
                {
                    "id": "UAT-AUTH-012",
                    "type": "POSITIF",
                    "scenario": "Logout Pengguna dan Pembersihan Cookie Sesi",
                    "precond": "Pengguna sedang dalam posisi login aktif.",
                    "steps": "1. Klik menu profil.\n2. Klik 'Keluar' / 'Logout'.",
                    "data": "-",
                    "expected": "Cookie token JWT dihapus sepenuhnya dari browser, sesi terminasi, dan pengguna dialihkan ke halaman beranda/login."
                },
                {
                    "id": "UAT-AUTH-013",
                    "type": "POSITIF",
                    "scenario": "Admin Menggunakan Fitur Impersonate untuk Memeriksa Kendala Akun Siswa",
                    "precond": "Login sebagai akun Admin/Superadmin.",
                    "steps": "1. Buka Manajemen Pengguna di Admin Panel.\n2. Klik 'Masuk Sebagai Pengguna Ini' pada akun target.",
                    "data": "Target User: ID Siswa #42",
                    "expected": "Sesi admin dialihkan ke tampilan siswa target dengan banner peringatan 'Mode Impersonasi Aktif' dan tombol untuk kembali ke sesi Admin."
                },
                {
                    "id": "UAT-AUTH-014",
                    "type": "NEGATIF",
                    "scenario": "Pengguna Biasa Mencoba Mengakses API Admin Impersonate Secara Ilegal",
                    "precond": "Login sebagai siswa biasa (non-admin).",
                    "steps": "1. Kirim request POST manual ke /api/admin/impersonate dengan target user id.",
                    "data": "Target User: ID #1 (Admin)",
                    "expected": "Sistem menolak dengan HTTP 403 Forbidden 'Akses ditolak: Hanya administrator yang berhak melakukan tindakan ini'."
                }
            ]
        },
        {
            "name": "MODUL 2: KATALOG & PENJELAJAHAN KURSUS (MARKETPLACE)",
            "cases": [
                {
                    "id": "UAT-CAT-001",
                    "type": "POSITIF",
                    "scenario": "Penyaringan Kursus Berdasarkan Kategori Bidang Keahlian",
                    "precond": "Pengguna membuka halaman /marketplace.",
                    "steps": "1. Klik salah satu pill kategori, misalnya 'Teknologi Informasi'.\n2. Amati daftar kursus yang ditampilkan.",
                    "data": "Kategori: 'Teknologi Informasi'",
                    "expected": "Hanya kursus yang berelasi dengan kategori Teknologi Informasi yang muncul; jumlah kartu kursus terbarui secara dinamis."
                },
                {
                    "id": "UAT-CAT-002",
                    "type": "POSITIF",
                    "scenario": "Penyaringan Kursus Berdasarkan Level Kesulitan",
                    "precond": "Pengguna berada di katalog kursus.",
                    "steps": "1. Pilih filter level: 'Beginner' atau 'Advanced'.\n2. Amati kartu kursus yang tampil.",
                    "data": "Level: 'Beginner'",
                    "expected": "Katalog hanya menampilkan kursus berlabel level Beginner sesuai filter yang dipilih pengguna."
                },
                {
                    "id": "UAT-CAT-003",
                    "type": "POSITIF",
                    "scenario": "Pencarian Kursus dengan Kata Kunci Spesifik",
                    "precond": "Pengguna berada di marketplace.",
                    "steps": "1. Ketik kata kunci pada kotak pencarian (contoh: 'Cyber Security').\n2. Tekan Enter atau amati live search.",
                    "data": "Keyword: 'Cyber Security'",
                    "expected": "Menampilkan kartu kursus yang judul atau deskripsinya memuat kata kunci pencarian secara instan."
                },
                {
                    "id": "UAT-CAT-004",
                    "type": "NEGATIF",
                    "scenario": "Pencarian Kursus Menggunakan Kata Kunci yang Tidak Tersedia",
                    "precond": "Pengguna berada di marketplace.",
                    "steps": "1. Ketik kata acak yang tidak ada di katalog.\n2. Amati respon tampilan.",
                    "data": "Keyword: 'XyZ123NonExistentTopic'",
                    "expected": "Sistem menampilkan ilustrasi 'Kursus tidak ditemukan' beserta tombol 'Reset Pencarian' tanpa error aplikasi."
                },
                {
                    "id": "UAT-CAT-005",
                    "type": "POSITIF",
                    "scenario": "Melihat Detail Kursus, Silabus Modul, dan Profil Instruktur",
                    "precond": "Pengguna mengklik salah satu kartu kursus.",
                    "steps": "1. Klik tombol 'Detail Kursus' atau kartu kursus.\n2. Periksa modal/halaman detail kursus.",
                    "data": "Kursus: 'Manajemen Keamanan Siber'",
                    "expected": "Menampilkan informasi lengkap: judul, badge level, biografi instruktur, kurikulum modul, dan tombol daftar/checkout."
                },
                {
                    "id": "UAT-CAT-006",
                    "type": "NEGATIF",
                    "scenario": "Peringatan Prasyarat Kursus (Prerequisite Gating)",
                    "precond": "Kursus tingkat Lanjut mewajibkan kelulusan Kursus Dasar terlebih dahulu.",
                    "steps": "1. Siswa belum menyelesaikan Kursus Dasar.\n2. Siswa mencoba mendaftar Kursus Lanjut.",
                    "data": "Kursus: 'Audit Keamanan Siber Lanjutan'",
                    "expected": "Sistem menampilkan dialog prasyarat 'Anda harus menyelesaikan kursus Dasar Keamanan Siber terlebih dahulu sebelum mengambil modul ini'."
                }
            ]
        },
        {
            "name": "MODUL 3: PAKET MEMBERSHIP SEUMUR HIDUP & HARGA DINAMIS",
            "cases": [
                {
                    "id": "UAT-MBR-001",
                    "type": "POSITIF",
                    "scenario": "Banner Membership Menampilkan Harga Dinamis dari Pengaturan Platform (Tanpa Hardcode)",
                    "precond": "Admin mengatur membership_price = '49000' di database/platform settings.",
                    "steps": "1. Buka halaman /marketplace sebagai pengunjung atau siswa.\n2. Periksa banner promosi membership di bagian atas.",
                    "data": "Pengaturan DB: membership_price = 49000",
                    "expected": "Banner menampilkan teks persis: 'Cukup Rp 49.000 (Sekali Bayar Selamanya)' tanpa memunculkan angka hardcoded 499.000."
                },
                {
                    "id": "UAT-MBR-002",
                    "type": "POSITIF",
                    "scenario": "Membuka Modal Langganan dan Memverifikasi Rincian Paket One-Time Charge",
                    "precond": "Pengguna mengklik tombol 'Aktivasi Akses Seumur Hidup' di banner.",
                    "steps": "1. Klik tombol aktivasi membership.\n2. Periksa rincian yang tercantum pada SubscriptionModal.",
                    "data": "-",
                    "expected": "Modal terbuka, menampilkan label 'Biaya Aktivasi Sekali Saja (One-Time)', nominal yang sinkron dengan DB (Rp 49.000), dan tombol 'Beli Paket'."
                },
                {
                    "id": "UAT-MBR-003",
                    "type": "POSITIF",
                    "scenario": "Akses Otomatis ke Seluruh Kursus & Ujian Setelah Membership Aktif",
                    "precond": "Akun siswa telah terkonfirmasi memiliki subscription_status = 'active'.",
                    "steps": "1. Masuk ke halaman /marketplace.\n2. Buka kursus berbayar manapun.\n3. Klik 'Mulai Belajar'.",
                    "data": "Status: Member Lifetime",
                    "expected": "Siswa langsung dapat mengakses seluruh materi, kuis, dan ujian tanpa diarahkan ke alur pembayaran kursus individual."
                },
                {
                    "id": "UAT-MBR-004",
                    "type": "POSITIF",
                    "scenario": "Perubahan Harga Membership oleh Admin Terpancar Real-Time ke Seluruh Antarmuka",
                    "precond": "Login sebagai Admin di /admin -> Pengaturan Platform.",
                    "steps": "1. Ubah field Tarif Membership dari 49000 menjadi 250000.\n2. Klik 'Simpan Pengaturan'.\n3. Buka halaman /marketplace di browser siswa.",
                    "data": "Nominal Baru: Rp 250.000",
                    "expected": "Banner marketplace dan subscription modal langsung menampilkan 'Cukup Rp 250.000 (Sekali Bayar Selamanya)' tanpa perlu reload hardcode."
                },
                {
                    "id": "UAT-MBR-005",
                    "type": "NEGATIF",
                    "scenario": "Non-Member Mencoba Mengakses Materi Kursus Eksklusif Member Langsung via URL",
                    "precond": "Pengguna non-member mencoba mengakses URL materi kursus berbayar secara langsung.",
                    "steps": "1. Akses URL /kelas?courseId=99&lessonId=101 langsung di address bar.\n2. Amati penanganan akses sistem.",
                    "data": "URL Proteksi Materi",
                    "expected": "Sistem memblokir akses materi dan menampilkan modal peringatan langganan / tombol pembelian kursus."
                }
            ]
        },
        {
            "name": "MODUL 4: TRANSAKSI, PEMBAYARAN, QRIS & INVOICE",
            "cases": [
                {
                    "id": "UAT-PAY-001",
                    "type": "POSITIF",
                    "scenario": "Checkout Menggunakan Metode Transfer Bank Manual (BCA/BNI) dengan 3 Digit Kode Unik",
                    "precond": "Siswa memilih pembelian kursus atau paket membership.",
                    "steps": "1. Pilih metode 'Transfer Bank BCA'.\n2. Klik 'Lanjut ke Pembayaran'.\n3. Periksa halaman rincian tagihan.",
                    "data": "Bank: BCA, No Rek: Sesuai Pengaturan Platform",
                    "expected": "Sistem menghasilkan pesanan dengan total tagihan yang dilengkapi 3 digit kode unik (misal: Rp 49.327) dan nomor rekening tujuan."
                },
                {
                    "id": "UAT-PAY-002",
                    "type": "POSITIF",
                    "scenario": "Checkout Menggunakan Pembayaran QRIS Dinamis",
                    "precond": "Siswa memilih metode QRIS.",
                    "steps": "1. Pilih metode QRIS pada modal checkout.\n2. Klik 'Tampilkan QRIS'.",
                    "data": "Metode: QRIS",
                    "expected": "Tampil barcode QRIS beserta petunjuk pembayaran dan timer waktu kadaluwarsa pembayaran 24 jam."
                },
                {
                    "id": "UAT-PAY-003",
                    "type": "POSITIF",
                    "scenario": "Unggah Bukti Transfer yang Valid dan Berhasil Mengirim Konfirmasi",
                    "precond": "Pesanan dalam status 'pending' menunggu bukti pembayaran.",
                    "steps": "1. Buka halaman riwayat pembayaran / invoice.\n2. Unggah file struk transfer (gambar JPG/PNG ukuran 500KB).\n3. Klik 'Kirim Bukti Pembayaran'.",
                    "data": "File: 'struk_bca_valid.jpg' (500KB)",
                    "expected": "File berhasil diunggah, status pesanan berubah menjadi 'menunggu verifikasi', dan admin menerima notifikasi transaksi masuk."
                },
                {
                    "id": "UAT-PAY-004",
                    "type": "NEGATIF",
                    "scenario": "Unggah Bukti Transfer dengan Format Tidak Diizinkan / File Berbahaya",
                    "precond": "Pengguna berada di formulir upload bukti transfer.",
                    "steps": "1. Coba pilih file berekstensi .exe atau .sh.\n2. Klik unggah.",
                    "data": "File: 'malicious_script.exe'",
                    "expected": "Sistem menolak file dengan validasi client dan server: 'Format file tidak didukung. Harap unggah format JPG, PNG, atau PDF'."
                },
                {
                    "id": "UAT-PAY-005",
                    "type": "NEGATIF",
                    "scenario": "Unggah Bukti Transfer dengan Ukuran Melebihi Batas Maksimal (> 5MB)",
                    "precond": "Pengguna berada di form upload bukti.",
                    "steps": "1. Pilih file gambar resolusi sangat tinggi berukuran 12MB.\n2. Klik kirim.",
                    "data": "File: 12MB PNG",
                    "expected": "Sistem membatalkan proses unggah dengan notifikasi 'Ukuran file terlalu besar. Maksimum ukuran file adalah 5 MB'."
                },
                {
                    "id": "UAT-PAY-006",
                    "type": "POSITIF",
                    "scenario": "Admin Melakukan Verifikasi Pembayaran Masuk dan Mengaktifkan Akses Siswa",
                    "precond": "Login sebagai Admin di menu Kelola Transaksi.",
                    "steps": "1. Periksa bukti transfer siswa.\n2. Klik tombol 'Setujui Pembayaran'.",
                    "data": "Pesanan ID: #ORD-1092",
                    "expected": "Status pesanan berubah menjadi 'completed/paid', status membership atau enrollment siswa otomatis aktif seketika."
                },
                {
                    "id": "UAT-PAY-007",
                    "type": "NEGATIF",
                    "scenario": "Auto-Sweep Membatalkan Pesanan yang Melebihi Batas Waktu Bayar (Expired)",
                    "precond": "Pesanan dibuat > 24 jam yang lalu tanpa bukti pembayaran.",
                    "steps": "1. Jalankan auto-sweep atau akses endpoint pembayaran berkala.",
                    "data": "Pesanan Kedaluwarsa",
                    "expected": "Status pesanan otomatis ditandai 'expired' dan siswa tidak dapat lagi mengunggah bukti pada transaksi tersebut."
                },
                {
                    "id": "UAT-PAY-008",
                    "type": "POSITIF",
                    "scenario": "Pembuatan dan Pengunduhan Invoice Resmi Format PDF Berlogo DIDIKARA",
                    "precond": "Pesanan telah berstatus 'completed'.",
                    "steps": "1. Buka riwayat pembayaran.\n2. Klik tombol 'Unduh Invoice PDF'.",
                    "data": "Endpoint: /api/payment/invoice?id=...",
                    "expected": "Dokumen PDF terunduh dengan rapi memuat kop DIDIKARA, detail item, nomor unik pesanan, cap lunas, dan identitas pembayar."
                },
                {
                    "id": "UAT-PAY-009",
                    "type": "POSITIF",
                    "scenario": "Admin Memproses Pengembalian Dana (Refund) dengan Pencatatan Audit Log",
                    "precond": "Transaksi berstatus 'paid' perlu di-refund atas permintaan resmi.",
                    "steps": "1. Admin memilih transaksi target.\n2. Klik 'Batalkan & Refund'.\n3. Isi alasan pengembalian dana.",
                    "data": "Alasan: 'Kelebihan transfer / pembatalan pengguna'",
                    "expected": "Status transaksi berubah menjadi 'refunded', hak akses dicabut secara otomatis, dan tercatat riwayatnya di Audit Log."
                }
            ]
        },
        {
            "name": "MODUL 5: LEARNING MANAGEMENT SYSTEM (LMS) & SCORM 1.2",
            "cases": [
                {
                    "id": "UAT-LMS-001",
                    "type": "POSITIF",
                    "scenario": "Siswa Mendaftar Kursus Gratis (Free Course Instant Enrollment)",
                    "precond": "Siswa terautentikasi dan kursus berlabel Gratis (Rp 0).",
                    "steps": "1. Klik kursus gratis.\n2. Klik tombol 'Daftar Gratis'.",
                    "data": "Kursus: 'Pengantar Literasi Digital'",
                    "expected": "Pendaftaran berhasil seketika tanpa tagihan, kursus langsung muncul di 'Kelas Saya', dan progres awal 0%."
                },
                {
                    "id": "UAT-LMS-002",
                    "type": "POSITIF",
                    "scenario": "Akses Materi Teks, Presentasi Slide, dan Pemutar Video Interaktif",
                    "precond": "Siswa telah terdaftar di kelas.",
                    "steps": "1. Masuk ke ruang kelas /kelas.\n2. Buka modul 1 materi video.\n3. Putar video dan ganti ke modul materi teks.",
                    "data": "-",
                    "expected": "Video berputar lancar, teks modul tampil proporsional, navigasi materi responsif di desktop maupun mobile."
                },
                {
                    "id": "UAT-LMS-003",
                    "type": "POSITIF",
                    "scenario": "Eksekusi Paket Interaktif SCORM 1.2 dan Sinkronisasi Status Commit",
                    "precond": "Kursus memiliki modul berbasis SCORM 1.2.",
                    "steps": "1. Buka modul SCORM.\n2. Selesaikan slide interaktif di dalam iFrame SCORM.\n3. Klik finish pada paket SCORM.",
                    "data": "SCORM Adapter: cmi.core.lesson_status = 'completed'",
                    "expected": "Adapter SCORM 1.2 runtime menangkap panggilan LMSCommit/LMSFinish dan memperbarui database bahwa modul telah tuntas."
                },
                {
                    "id": "UAT-LMS-004",
                    "type": "POSITIF",
                    "scenario": "Menandai Materi Selesai dan Peningkatan Persentase Progres Belajar",
                    "precond": "Siswa selesai membaca/menonton materi.",
                    "steps": "1. Klik tombol 'Tandai Selesai & Lanjut'.\n2. Periksa bar persentase progres kursus.",
                    "data": "-",
                    "expected": "Ikon checklist hijau aktif pada daftar silabus, persentase progres bertambah sesuai proporsi modul yang diselesaikan."
                },
                {
                    "id": "UAT-LMS-005",
                    "type": "NEGATIF",
                    "scenario": "Siswa Mencoba Melompati Modul yang Terkunci Berurutan",
                    "precond": "Kursus menerapkan aturan pembelajaran sekuensial (harus urut).",
                    "steps": "1. Siswa belum menyelesaikan Modul 1.\n2. Siswa mencoba mengklik modul 4 langsung.",
                    "data": "Modul 4 (Terkunci)",
                    "expected": "Sistem menampilkan gembok terkunci dan pesan 'Selesaikan modul sebelumnya untuk membuka materi ini'."
                }
            ]
        },
        {
            "name": "MODUL 6: UJIAN SERTIFIKASI & PENERBITAN SERTIFIKAT",
            "cases": [
                {
                    "id": "UAT-EXM-001",
                    "type": "POSITIF",
                    "scenario": "Siswa Memulai Ujian Sertifikasi dengan Hitung Mundur Waktu (Timer)",
                    "precond": "Seluruh materi kursus telah diselesaikan 100%.",
                    "steps": "1. Buka modul Ujian Akhir.\n2. Klik 'Mulai Ujian Sertifikasi'.\n3. Periksa tampilan lembar ujian.",
                    "data": "Durasi: 60 Menit",
                    "expected": "Soal ujian diacak, lembar soal tampil, timer hitung mundur aktif dan berjalan mundur secara real-time."
                },
                {
                    "id": "UAT-EXM-002",
                    "type": "POSITIF",
                    "scenario": "Menjawab Seluruh Soal dan Mengirimkan Lembar Ujian Sebelum Batas Waktu",
                    "precond": "Ujian sedang berlangsung.",
                    "steps": "1. Pilih opsi jawaban pada setiap nomor soal.\n2. Pastikan indikator seluruh nomor terjawab.\n3. Klik 'Kirim Jawaban'.",
                    "data": "25 Soal Pilihan Ganda",
                    "expected": "Sistem meminta konfirmasi submit, menghitung skor otomatis, dan menampilkan hasil perolehan nilai seketika."
                },
                {
                    "id": "UAT-EXM-003",
                    "type": "NEGATIF",
                    "scenario": "Waktu Ujian Habis dan Sistem Melakukan Auto-Submit Otomatis",
                    "precond": "Siswa belum selesai menjawab ketika timer mencapai 00:00.",
                    "steps": "1. Biarkan timer ujian berjalan hingga waktu habis.\n2. Amati perilaku sistem.",
                    "data": "Timer: 00:00",
                    "expected": "Sistem otomatis mengunci layar ujian, melakukan auto-submit jawaban yang sempat terisi, dan menghitung skor yang ada."
                },
                {
                    "id": "UAT-EXM-004",
                    "type": "POSITIF",
                    "scenario": "Siswa Lulus Ujian (Nilai >= Passing Grade) dan Sertifikat Otomatis Terbit",
                    "precond": "Passing grade ujian adalah 75. Siswa memperoleh nilai 88.",
                    "steps": "1. Submit ujian dengan hasil nilai 88.\n2. Periksa halaman pengumuman hasil.",
                    "data": "Nilai: 88 (Lulus)",
                    "expected": "Sistem menyatakan 'LULUS', sertifikat unik dengan nomor seri resmi otomatis diterbitkan dan tombol unduh sertifikat aktif."
                },
                {
                    "id": "UAT-EXM-005",
                    "type": "NEGATIF",
                    "scenario": "Siswa Tidak Lulus Ujian (Nilai < Passing Grade) dan Kesempatan Ujian Ulang",
                    "precond": "Passing grade 75. Siswa memperoleh nilai 60.",
                    "steps": "1. Submit ujian dengan nilai di bawah standar kelulusan.",
                    "data": "Nilai: 60 (Belum Lulus)",
                    "expected": "Sistem menyatakan 'BELUM LULUS', sertifikat TIDAK diterbitkan, dan tombol ujian ulang (re-exam) muncul dengan batas jeda tertentu."
                },
                {
                    "id": "UAT-EXM-006",
                    "type": "POSITIF",
                    "scenario": "Verifikasi Keaslian Sertifikat Digital Secara Publik (/verify/[certId])",
                    "precond": "Sertifikat valid telah terbit dengan kode unik, misal 'CERT-2026-X89'.",
                    "steps": "1. Buka URL /verify/CERT-2026-X89 pada browser publik tanpa login.\n2. Periksa data yang ditampilkan.",
                    "data": "ID Sertifikat Valid",
                    "expected": "Halaman menampilkan status 'Sertifikat Asli & Terverifikasi', nama penerima, judul kursus, tanggal terbit, dan tandatangan penjamin mutu."
                },
                {
                    "id": "UAT-EXM-007",
                    "type": "NEGATIF",
                    "scenario": "Verifikasi Sertifikat Menggunakan ID Palsu / Manipulasi URL",
                    "precond": "Pengguna memasukkan kode sertifikat fiktif.",
                    "steps": "1. Akses URL /verify/CERT-PALSU-9999.\n2. Amati respons sistem.",
                    "data": "ID Sertifikat Palsu",
                    "expected": "Halaman verifikasi menampilkan tanda silang merah dengan peringatan tegas 'Sertifikat tidak ditemukan atau tidak valid'."
                },
                {
                    "id": "UAT-EXM-008",
                    "type": "POSITIF",
                    "scenario": "Pengunduhan File Sertifikat Digital Resmi Format PDF",
                    "precond": "Siswa telah lulus kursus.",
                    "steps": "1. Buka menu 'Sertifikat Saya'.\n2. Klik tombol 'Unduh PDF'.",
                    "data": "Endpoint: /api/certificate/pdf?id=...",
                    "expected": "File PDF sertifikat beresolusi tinggi terunduh dengan desain resmi DIDIKARA, QR code verifikasi, dan nama siswa tercetak jelas."
                }
            ]
        },
        {
            "name": "MODUL 7: LIVE SESSION (WEBINAR) & PRESENSI KEHADIRAN",
            "cases": [
                {
                    "id": "UAT-LIV-001",
                    "type": "POSITIF",
                    "scenario": "Instruktur Menjadwalkan Sesi Tatap Muka Virtual (Live Webinar)",
                    "precond": "Login sebagai instruktur kursus.",
                    "steps": "1. Buka panel sesi live.\n2. Klik 'Jadwalkan Sesi Baru'.\n3. Isi judul, tanggal/jam, dan tautan Zoom/Meet.\n4. Klik Simpan.",
                    "data": "Platform: Zoom, Jam: 19.30 WIB",
                    "expected": "Jadwal sesi live tersimpan di database dan otomatis muncul pada kalender jadwal siswa yang terdaftar di kursus tersebut."
                },
                {
                    "id": "UAT-LIV-002",
                    "type": "POSITIF",
                    "scenario": "Siswa Terdaftar Bergabung ke Tautan Live Session saat Waktu Dimulai",
                    "precond": "Sesi live berstatus aktif / sedang berlangsung.",
                    "steps": "1. Buka menu Live Sessions.\n2. Klik tombol 'Masuk Ruang Sesi'.",
                    "data": "-",
                    "expected": "Tab baru terbuka menuju meeting virtual dan sistem merekam partisipasi siswa ke database."
                },
                {
                    "id": "UAT-LIV-003",
                    "type": "POSITIF",
                    "scenario": "Pencatatan Presensi Kehadiran Siswa Secara Otomatis",
                    "precond": "Siswa mengklik tautan hadir pada sesi webinar.",
                    "steps": "1. Klik tombol 'Konfirmasi Kehadiran' di dalam ruang sesi.",
                    "data": "-",
                    "expected": "Database mencatat waktu kehadiran siswa (timestamp, status = 'present') dan tampil di rekap absensi instruktur."
                },
                {
                    "id": "UAT-LIV-004",
                    "type": "NEGATIF",
                    "scenario": "Pengguna yang Belum Terdaftar Mencoba Masuk ke Live Session Eksklusif",
                    "precond": "Pengguna tidak terdaftar pada kursus terkait.",
                    "steps": "1. Coba klik tombol join sesi live pada kursus tersebut.",
                    "data": "Siswa Non-Peserta",
                    "expected": "Sistem memblokir akses dan memunculkan peringatan 'Sesi ini khusus bagi peserta terdaftar di pelatihan ini'."
                }
            ]
        },
        {
            "name": "MODUL 8: GAMIFIKASI, LEADERBOARD & FORUM DISKUSI",
            "cases": [
                {
                    "id": "UAT-GAM-001",
                    "type": "POSITIF",
                    "scenario": "Perolehan Poin XP dan Pembukaan Badge Gamifikasi Setelah Menyelesaikan Misi",
                    "precond": "Siswa menyelesaikan modul atau ujian dengan skor sempurna.",
                    "steps": "1. Selesaikan kuis atau modul materi.\n2. Periksa widget gamifikasi di dashboard.",
                    "data": "Misi: 'First Lesson Complete'",
                    "expected": "Siswa mendapatkan +50 XP poin dan popup lencana prestasi (Badge) muncul memberi selamat."
                },
                {
                    "id": "UAT-GAM-002",
                    "type": "POSITIF",
                    "scenario": "Pembaruan Posisi Papan Peringkat (Leaderboard) Siswa",
                    "precond": "Siswa mendapatkan penambahan XP poin.",
                    "steps": "1. Buka menu Papan Peringkat (/dashboard -> Leaderboard).\n2. Amati peringkat siswa.",
                    "data": "-",
                    "expected": "Urutan peringkat diperbarui secara dinamis mencerminkan total akumulasi XP tertinggi di antara seluruh siswa."
                },
                {
                    "id": "UAT-GAM-003",
                    "type": "POSITIF",
                    "scenario": "Penukaran Poin Gamifikasi dengan Hadiah / Merchandise (Redeem Rewards)",
                    "precond": "Siswa memiliki 500 Poin. Item reward membutuhkan 300 Poin.",
                    "steps": "1. Buka Katalog Hadiah.\n2. Pilih reward 'Voucher Diskon Pelatihan'.\n3. Klik 'Tukarkan Poin'.",
                    "data": "Saldo: 500 Poin, Harga: 300 Poin",
                    "expected": "Penukaran berhasil, saldo poin berkurang menjadi 200, dan kode voucher aktif muncul di riwayat penukaran."
                },
                {
                    "id": "UAT-GAM-004",
                    "type": "NEGATIF",
                    "scenario": "Penukaran Hadiah Ditolak Saat Saldo Poin Tidak Mencukupi",
                    "precond": "Siswa memiliki 100 Poin. Item reward membutuhkan 500 Poin.",
                    "steps": "1. Coba klik 'Tukarkan Poin' pada item 500 Poin.",
                    "data": "Saldo: 100 Poin, Harga: 500 Poin",
                    "expected": "Tombol dinonaktifkan atau sistem menampilkan pesan kesalahan 'Poin Anda tidak mencukupi untuk menukar reward ini'."
                },
                {
                    "id": "UAT-FRM-001",
                    "type": "POSITIF",
                    "scenario": "Siswa Mengirimkan Pertanyaan di Forum Diskusi Kursus",
                    "precond": "Siswa sedang berada di dalam ruang kelas.",
                    "steps": "1. Buka tab Forum Diskusi.\n2. Tulis judul dan isi pertanyaan.\n3. Klik 'Kirim Diskusi'.",
                    "data": "Topik: 'Kendala konfigurasi firewall pada lab 2'",
                    "expected": "Diskusi berhasil terbit di forum, dapat dilihat oleh sesama siswa dan instruktur pengampu kursus."
                },
                {
                    "id": "UAT-FRM-002",
                    "type": "POSITIF",
                    "scenario": "Instruktur Membalas Pertanyaan Diskusi dan Pengirim Menerima Notifikasi",
                    "precond": "Ada pertanyaan terbuka di forum diskusi.",
                    "steps": "1. Instruktur login dan membalas pertanyaan siswa.\n2. Siswa membuka menu lonceng notifikasi.",
                    "data": "Balasan: 'Pastikan port 443 sudah dibuka pada inbound rule'",
                    "expected": "Jawaban terpasang di bawah thread diskusi dan siswa menerima notifikasi 'Instruktur telah membalas pertanyaan Anda'."
                },
                {
                    "id": "UAT-REV-001",
                    "type": "POSITIF",
                    "scenario": "Siswa Memberikan Ulasan dan Rating Bintang Setelah Lulus Kursus",
                    "precond": "Siswa telah menyelesaikan kursus.",
                    "steps": "1. Klik tombol 'Beri Ulasan Kursus'.\n2. Berikan bintang 5 dan tulis testimoni pengalaman belajar.\n3. Klik 'Kirim Ulasan'.",
                    "data": "Rating: 5 Bintang, Ulasan: 'Materi sangat jelas dan aplikatif!'",
                    "expected": "Ulasan tersimpan dan langsung ditampilkan pada bagian testimoni kursus di halaman publik marketplace."
                }
            ]
        },
        {
            "name": "MODUL 9: AI TRAINING PLANNER",
            "cases": [
                {
                    "id": "UAT-AI-001",
                    "type": "POSITIF",
                    "scenario": "Rekomendasi Jalur Belajar Berbasis Kebutuhan Karir Menggunakan AI",
                    "precond": "Pengguna berada di menu /ai-planner.",
                    "steps": "1. Isi target karir (contoh: 'DevOps Engineer').\n2. Pilih tingkat keahlian saat ini (contoh: 'Pemula').\n3. Klik 'Buat Rencana Pelatihan'.",
                    "data": "Target: 'DevOps Engineer', Level: 'Beginner'",
                    "expected": "AI menghasilkan silabus bertahap, rekomendasi urutan kursus di DIDIKARA, dan estimasi durasi belajar yang komprehensif."
                },
                {
                    "id": "UAT-AI-002",
                    "type": "POSITIF",
                    "scenario": "Penyimpanan Hasil Rencana Pelatihan ke Riwayat Akun Pengguna",
                    "precond": "Hasil rekomendasi AI telah selesai di-generate.",
                    "steps": "1. Klik tombol 'Simpan Rencana Pelatihan'.\n2. Buka tab Riwayat / History Planner.",
                    "data": "-",
                    "expected": "Rencana tersimpan di tabel ai_planner_results dan dapat dibuka kembali kapan saja tanpa perlu generate ulang."
                },
                {
                    "id": "UAT-AI-003",
                    "type": "NEGATIF",
                    "scenario": "Permintaan AI Planner dengan Input Kosong atau Melebihi Batas Karakter",
                    "precond": "Pengguna di formulir AI Planner.",
                    "steps": "1. Kosongkan isian form target karir.\n2. Klik tombol 'Buat Rencana'.",
                    "data": "Input: Kosong (Whitespace)",
                    "expected": "Sistem mencegah submit dan memunculkan peringatan 'Harap isi deskripsi target karir atau keahlian yang ingin dipelajari'."
                }
            ]
        },
        {
            "name": "MODUL 10: PORTAL INSTRUKTUR & PENARIKAN DANA (PAYOUT)",
            "cases": [
                {
                    "id": "UAT-INS-001",
                    "type": "POSITIF",
                    "scenario": "Instruktur Memantau Dashboard Analitik Kursus dan Performa Siswa",
                    "precond": "Login sebagai pengguna dengan role 'instructor'.",
                    "steps": "1. Akses menu /instructor.\n2. Periksa kartu ringkasan: jumlah siswa, rata-rata kelulusan, dan total pendapatan royalti.",
                    "data": "-",
                    "expected": "Data analitik ditampilkan dengan benar dan grafik perkembangan peserta terisi sesuai data transaksi aktual."
                },
                {
                    "id": "UAT-INS-002",
                    "type": "POSITIF",
                    "scenario": "Instruktur Menambah dan Mengelola Bank Soal Kursus",
                    "precond": "Instruktur berada di menu Bank Soal.",
                    "steps": "1. Klik 'Tambah Soal Baru'.\n2. Masukkan pertanyaan, 4 pilihan opsi, dan kunci jawaban benar.\n3. Klik Simpan.",
                    "data": "Kunci Jawaban: Opsi C",
                    "expected": "Soal tersimpan ke tabel question_bank dan langsung terintegrasi dengan ujian sertifikasi kursus tersebut."
                },
                {
                    "id": "UAT-INS-003",
                    "type": "POSITIF",
                    "scenario": "Instruktur Mengajukan Permintaan Penarikan Royalti (Payout Request) Valid",
                    "precond": "Saldo royalti instruktur Rp 2.500.000 (di atas batas minimum penarikan Rp 100.000).",
                    "steps": "1. Masuk ke tab Payout.\n2. Masukkan jumlah penarikan Rp 1.000.000 dan nomor rekening bank.\n3. Klik 'Ajukan Penarikan Dana'.",
                    "data": "Nominal: Rp 1.000.000",
                    "expected": "Permintaan tercatat dengan status 'pending', saldo tertahan sementara, dan admin menerima pengajuan payout."
                },
                {
                    "id": "UAT-INS-004",
                    "type": "NEGATIF",
                    "scenario": "Pengajuan Payout Melebihi Saldo yang Tersedia",
                    "precond": "Saldo royalti instruktur Rp 500.000.",
                    "steps": "1. Masukkan nominal penarikan Rp 1.000.000.\n2. Klik 'Ajukan Penarikan'.",
                    "data": "Nominal: Rp 1.000.000 (Saldo: 500.000)",
                    "expected": "Sistem menolak dengan pesan 'Nominal penarikan melebihi sisa saldo royalti yang dapat dicairkan'."
                }
            ]
        },
        {
            "name": "MODUL 11: PORTAL ADMINISTRATOR, CORPORATE & PENGATURAN SISTEM",
            "cases": [
                {
                    "id": "UAT-ADM-001",
                    "type": "POSITIF",
                    "scenario": "Admin Memperbarui Informasi Platform (Nama, Logo, dan Nomor Rekening Bank)",
                    "precond": "Login sebagai Super Admin di menu /admin -> Pengaturan Platform.",
                    "steps": "1. Ubah Nama Bank & Rekening BCA tujuan pembayaran.\n2. Klik 'Simpan Pengaturan'.\n3. Verifikasi pada modal checkout pembayaran.",
                    "data": "Rekening BCA: 8899001122 a/n PT Didikara Digital",
                    "expected": "Pengaturan tersimpan ke platform_settings dan langsung muncul pada instruksi pembayaran pembeli."
                },
                {
                    "id": "UAT-ADM-002",
                    "type": "POSITIF",
                    "scenario": "Admin Melakukan Impor Massal Pengguna via File CSV (Bulk User Import)",
                    "precond": "Admin menyiapkan file CSV berisi daftar 20 peserta pelatihan.",
                    "steps": "1. Masuk ke Manajemen Pengguna -> Impor Massal.\n2. Pilih file CSV terstruktur.\n3. Klik 'Proses Impor'.",
                    "data": "File: 'peserta_bumn_batch1.csv'",
                    "expected": "Sistem memvalidasi setiap baris, mendaftarkan 20 akun baru, dan menampilkan laporan ringkasan impor '20 Sukses, 0 Gagal'."
                },
                {
                    "id": "UAT-ADM-003",
                    "type": "NEGATIF",
                    "scenario": "Impor Massal Pengguna dengan Format Kolom CSV yang Rusak / Tidak Lengkap",
                    "precond": "File CSV kehilangan kolom wajib (email / nama).",
                    "steps": "1. Unggah file CSV yang rusak formatnya.\n2. Klik 'Proses Impor'.",
                    "data": "File: 'corrupt_data.csv'",
                    "expected": "Sistem menghentikan impor, menampilkan detail baris yang error, dan tidak mengizinkan data korup masuk ke database."
                },
                {
                    "id": "UAT-ADM-004",
                    "type": "POSITIF",
                    "scenario": "Admin Menugaskan Pelatihan Wajib ke Organisasi/Perusahaan (Corporate Assignment)",
                    "precond": "Admin berada di panel Training Assignments.",
                    "steps": "1. Pilih Organisasi 'PT Mandiri Sejahtera'.\n2. Pilih Kursus Wajib 'Keamanan Informasi ISO 27001'.\n3. Tetapkan batas waktu (due date).\n4. Klik 'Tugaskan'.",
                    "data": "Organisasi: PT Mandiri, Due Date: 30 Hari",
                    "expected": "Semua karyawan di bawah organisasi tersebut otomatis terdaftar pada kursus dan menerima email penugasan wajib."
                },
                {
                    "id": "UAT-ADM-005",
                    "type": "POSITIF",
                    "scenario": "Admin Memantau Audit Log Sistem untuk Investigasi Perubahan Data Kritis",
                    "precond": "Telah terjadi aktivitas transaksi, login, dan pengubahan pengaturan.",
                    "steps": "1. Masuk ke menu /admin -> Audit Logs.\n2. Filter berdasarkan tipe aksi 'PAYMENT_CONFIRM' atau 'SETTINGS_UPDATE'.",
                    "data": "-",
                    "expected": "Tabel audit log menampilkan riwayat kronologis lengkap dengan identitas admin, alamat IP, timestamp, dan detail perubahan data."
                }
            ]
        }
    ]

    # Render each module
    for mod_idx, mod in enumerate(modules, start=1):
        # Module Heading
        mod_h = doc.add_heading(level=2)
        mod_r = mod_h.add_run(f"2.{mod_idx} {mod['name']}")
        mod_r.font.name = "Arial"
        mod_r.font.size = Pt(11)
        mod_r.font.bold = True
        mod_r.font.color.rgb = RGBColor(30, 58, 138)
        mod_h.paragraph_format.space_before = Pt(12)
        mod_h.paragraph_format.space_after = Pt(4)

        # Cases Table
        table = doc.add_table(rows=1, cols=9)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        set_table_borders(table, color="CBD5E1")

        # Column widths (Total ~10.5 inches for Landscape A4)
        col_widths = [
            Inches(0.9), # ID
            Inches(0.7), # Tipe
            Inches(1.8), # Skenario
            Inches(1.3), # Prasyarat
            Inches(1.8), # Langkah
            Inches(1.1), # Data Uji
            Inches(1.9), # Hasil Diharapkan
            Inches(0.6), # Hasil Aktual
            Inches(0.6)  # Status
        ]

        hdr_cells = table.rows[0].cells
        hdr_titles = ["ID Kasus", "Tipe", "Skenario Pengujian", "Prasyarat", "Langkah Pengujian", "Data Uji", "Hasil yang Diharapkan", "Aktual", "Status"]
        for idx, title in enumerate(hdr_titles):
            add_header_cell(hdr_cells[idx], title, width=col_widths[idx])

        # Fill table rows
        for case in mod["cases"]:
            row_cells = table.add_row().cells
            is_pos = (case["type"] == "POSITIF")
            badge_bg = "DCFCE7" if is_pos else "FEE2E2" # Soft green vs soft red
            badge_color = "166534" if is_pos else "991B1B"

            add_data_cell(row_cells[0], case["id"], width=col_widths[0], bold=True, color_hex="1E3A8A")
            add_data_cell(row_cells[1], case["type"], width=col_widths[1], align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, bg_hex=badge_bg, color_hex=badge_color, font_size=7.5)
            add_data_cell(row_cells[2], case["scenario"], width=col_widths[2], bold=True)
            add_data_cell(row_cells[3], case["precond"], width=col_widths[3])
            add_data_cell(row_cells[4], case["steps"], width=col_widths[4])
            add_data_cell(row_cells[5], case["data"], width=col_widths[5])
            add_data_cell(row_cells[6], case["expected"], width=col_widths[6])
            add_data_cell(row_cells[7], "Sesuai", width=col_widths[7], align=WD_ALIGN_PARAGRAPH.CENTER)
            add_data_cell(row_cells[8], "PASS", width=col_widths[8], align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, color_hex="16A34A")

        doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # --- BAB 3: LEMBAR PERSETUJUAN (SIGN-OFF SHEET) ---
    h3 = doc.add_heading(level=1)
    r3 = h3.add_run("3. Lembar Persetujuan Hasil UAT (Sign-Off Sheet)")
    r3.font.name = "Arial"
    r3.font.size = Pt(13)
    r3.font.bold = True
    r3.font.color.rgb = RGBColor(30, 58, 138)
    h3.paragraph_format.space_before = Pt(14)
    h3.paragraph_format.space_after = Pt(6)

    p_sign = doc.add_paragraph()
    p_sign.paragraph_format.space_after = Pt(8)
    p_sign.add_run(
        "Dengan menandatangani dokumen ini, seluruh pihak menyatakan bahwa pengujian User Acceptance Testing (UAT) "
        "telah dilaksanakan secara seksama pada platform DIDIKARA, seluruh skenario positif dan negatif telah diverifikasi, "
        "dan sistem dinyatakan MEMENUHI SYARAT untuk operasional produksi."
    )

    sign_table = doc.add_table(rows=5, cols=4)
    sign_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(sign_table, color="94A3B8")

    sign_headers = ["Peran Penguji / Peninjau", "Nama Lengkap", "Tanggal Uji", "Tanda Tangan & Persetujuan"]
    for idx, text in enumerate(sign_headers):
        add_header_cell(sign_table.rows[0].cells[idx], text)

    sign_roles = [
        ("QA Lead / Tester", "Tim QA DIDIKARA", "27 Oktober 2026", "[ Disetujui ]"),
        ("Frontend & Backend Engineer", "Tim Engineering DIDIKARA", "27 Oktober 2026", "[ Disetujui ]"),
        ("Product Manager / Owner", "Product Owner DIDIKARA", "27 Oktober 2026", "[ Disetujui ]"),
        ("Direktur Penjamin Mutu & LSP", "Prof. Dr. Kadir", "27 Oktober 2026", "[ Disetujui ]")
    ]

    for row_idx, role_data in enumerate(sign_roles, start=1):
        row = sign_table.rows[row_idx]
        for col_idx in range(4):
            is_badge = (col_idx == 3)
            bg = "F0FDF4" if is_badge else "FFFFFF"
            color = "15803D" if is_badge else "1E293B"
            add_data_cell(row.cells[col_idx], role_data[col_idx], align=WD_ALIGN_PARAGRAPH.CENTER if col_idx in (2, 3) else WD_ALIGN_PARAGRAPH.LEFT, bold=(col_idx in (0, 3)), bg_hex=bg, color_hex=color, font_size=8.5)

    output_filename = "DOKUMEN_USER_ACCEPTANCE_TESTING_DIDIKARA.docx"
    doc.save(output_filename)
    print(f"Document successfully created and saved to {output_filename}")

if __name__ == "__main__":
    build_uat_document()
