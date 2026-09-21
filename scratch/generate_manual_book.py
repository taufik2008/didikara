# -*- coding: utf-8 -*-
import os
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=140, bottom=140, left=180, right=180):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def add_callout(doc, text_list, title="CATATAN PENTING", fill_hex="EBF3FC", border_color="2563EB"):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    
    cell = table.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_background(cell, fill_hex)
    set_cell_margins(cell, top=160, bottom=160, left=200, right=200)
    
    # Left border only
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>'
        f'<w:left w:val="single" w:sz="24" w:space="0" w:color="{border_color}"/>'
        f'<w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>'
        f'<w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(tcBorders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(4)
    run_title = p.add_run(f"📌 {title}\n")
    run_title.bold = True
    run_title.font.name = "Calibri"
    run_title.font.size = Pt(10.5)
    run_title.font.color.rgb = RGBColor(0x1E, 0x40, 0xAF)
    
    for item in text_list:
        p2 = cell.add_paragraph()
        p2.paragraph_format.space_before = Pt(2)
        p2.paragraph_format.space_after = Pt(2)
        r = p2.add_run(item)
        r.font.name = "Calibri"
        r.font.size = Pt(10)
        r.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)
    
    doc.add_paragraph() # space after callout

def add_custom_heading(doc, text, level):
    h = doc.add_heading(text, level=level)
    h.paragraph_format.keep_with_next = True
    if level == 1:
        h.paragraph_format.space_before = Pt(18)
        h.paragraph_format.space_after = Pt(8)
        for r in h.runs:
            r.font.name = "Calibri"
            r.font.size = Pt(16)
            r.font.bold = True
            r.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A) # Navy
    elif level == 2:
        h.paragraph_format.space_before = Pt(14)
        h.paragraph_format.space_after = Pt(6)
        for r in h.runs:
            r.font.name = "Calibri"
            r.font.size = Pt(13)
            r.font.bold = True
            r.font.color.rgb = RGBColor(0x02, 0x84, 0xC7) # Blue
    elif level == 3:
        h.paragraph_format.space_before = Pt(10)
        h.paragraph_format.space_after = Pt(4)
        for r in h.runs:
            r.font.name = "Calibri"
            r.font.size = Pt(11.5)
            r.font.bold = True
            r.font.color.rgb = RGBColor(0x33, 0x41, 0x55) # Slate
    return h

def add_styled_paragraph(doc, text, bold_prefix="", italic=False):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(3)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.bold = True
        r_pre.font.name = "Calibri"
        r_pre.font.size = Pt(11)
        r_pre.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    r = p.add_run(text)
    r.italic = italic
    r.font.name = "Calibri"
    r.font.size = Pt(11)
    r.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
    return p

def add_bullet_item(doc, bold_title, description):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    r1 = p.add_run(bold_title)
    r1.bold = True
    r1.font.name = "Calibri"
    r1.font.size = Pt(10.5)
    r1.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    
    r2 = p.add_run(f": {description}")
    r2.font.name = "Calibri"
    r2.font.size = Pt(10.5)
    r2.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
    return p

def add_numbered_step(doc, step_num, step_title, step_desc):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.15
    
    r_num = p.add_run(f"Langkah {step_num}: ")
    r_num.bold = True
    r_num.font.name = "Calibri"
    r_num.font.size = Pt(11)
    r_num.font.color.rgb = RGBColor(0x25, 0x63, 0xEB)
    
    r_title = p.add_run(f"{step_title}\n")
    r_title.bold = True
    r_title.font.name = "Calibri"
    r_title.font.size = Pt(11)
    r_title.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    
    r_desc = p.add_run(step_desc)
    r_desc.font.name = "Calibri"
    r_desc.font.size = Pt(10.5)
    r_desc.font.color.rgb = RGBColor(0x47, 0x55, 0x69)
    return p

def main():
    doc = Document()
    
    # Page setup (A4, 1-inch margins)
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
        
        # Header and footer setup
        footer = section.footer
        p_ft = footer.paragraphs[0]
        p_ft.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r_ft = p_ft.add_run("Buku Panduan Pengguna LMS — Sistem Manajemen Pembelajaran")
        r_ft.font.name = "Calibri"
        r_ft.font.size = Pt(8.5)
        r_ft.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)

    # ==================== COVER / JUDUL UTAMA ====================
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(36)
    p_title.paragraph_format.space_after = Pt(12)
    
    r_sub0 = p_title.add_run("PANDUAN PENGGUNA RESMI (USER MANUAL)\n")
    r_sub0.font.name = "Calibri"
    r_sub0.font.size = Pt(13)
    r_sub0.font.bold = True
    r_sub0.font.color.rgb = RGBColor(0x02, 0x84, 0xC7)
    
    r_main_title = p_title.add_run("SISTEM LEARNING MANAGEMENT SYSTEM (LMS)\n")
    r_main_title.font.name = "Calibri"
    r_main_title.font.size = Pt(22)
    r_main_title.font.bold = True
    r_main_title.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)
    
    r_sub = p_title.add_run("Panduan Operasional Lengkap Berurutan untuk Penyedia Kursus, Instruktur, dan Peserta\n")
    r_sub.font.name = "Calibri"
    r_sub.font.size = Pt(12)
    r_sub.italic = True
    r_sub.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)

    # Info table on cover
    cover_table = doc.add_table(rows=4, cols=2)
    cover_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cover_table.autofit = False
    
    info_data = [
        ("Versi Sistem", "2.0 (Next.js 15 & PostgreSQL Architecture)"),
        ("Hak Akses", "Penyedia Kursus (Admin), Instruktur (Teacher), Peserta (Student)"),
        ("Kategori Modul", "Video Pembelajaran, PDF Viewer, Ujian Interaktif, Sertifikasi"),
        ("Tanggal Terbit", "September 2026")
    ]
    
    for row_idx, (k, v) in enumerate(info_data):
        cell_k = cover_table.cell(row_idx, 0)
        cell_v = cover_table.cell(row_idx, 1)
        cell_k.width = Inches(2.2)
        cell_v.width = Inches(4.3)
        
        set_cell_background(cell_k, "F1F5F9")
        set_cell_background(cell_v, "FFFFFF")
        set_cell_margins(cell_k, 100, 100, 140, 140)
        set_cell_margins(cell_v, 100, 100, 140, 140)
        
        pk = cell_k.paragraphs[0]
        pk.paragraph_format.space_before = Pt(0)
        pk.paragraph_format.space_after = Pt(0)
        rk = pk.add_run(k)
        rk.font.name = "Calibri"
        rk.font.size = Pt(10)
        rk.font.bold = True
        rk.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
        
        pv = cell_v.paragraphs[0]
        pv.paragraph_format.space_before = Pt(0)
        pv.paragraph_format.space_after = Pt(0)
        rv = pv.add_run(v)
        rv.font.name = "Calibri"
        rv.font.size = Pt(10)
        rv.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)

    doc.add_page_break()

    # ==================== DAFTAR ISI ====================
    add_custom_heading(doc, "DAFTAR ISI & STRUKTUR PANDUAN", level=1)
    
    toc_items = [
        ("BAGIAN 1: GAMBARAN UMUM SISTEM & AUTENTIKASI", "Struktur Role, Akses Masuk & Pendaftaran Akun"),
        ("BAGIAN 2: PANDUAN PENYEDIA KURSUS (COURSE PROVIDER / ADMIN)", "Manajemen Kursus, Kurikulum, Instruktur & Monitoring"),
        ("BAGIAN 3: PANDUAN INSTRUKTUR (INSTRUCTOR)", "Materi Video & PDF, Bank Soal (Single, Multi, Essay), Ujian & Penilaian"),
        ("BAGIAN 4: PANDUAN PESERTA (PARTICIPANT / LEARNER)", "Pendaftaran Mandiri, Belajar Mandiri, Ujian Akhir & Sertifikat"),
        ("BAGIAN 5: PANDUAN SPESIFIK FITUR UJIAN MULTI-TIPE", "Pilihan Ganda Tunggal, Kompleks / Checkbox, dan Soal Uraian / Essay"),
        ("BAGIAN 6: FAQ & TROUBLESHOOTING", "Penyelesaian Kendala PDF, Ujian, Login & Sertifikat")
    ]
    
    for bold_t, desc in toc_items:
        add_bullet_item(doc, bold_t, desc)
        
    doc.add_paragraph()

    # ==================== BAGIAN 1 ====================
    add_custom_heading(doc, "BAGIAN 1: GAMBARAN UMUM SISTEM & AUTENTIKASI", level=1)
    
    add_styled_paragraph(doc, 
        "Sistem Learning Management System (LMS) ini dirancang untuk memfasilitasi kegiatan belajar daring yang komprehensif, terstruktur, dan terukur. Platform ini mendukung interaksi tiga pilar utama pengguna: Penyedia Kursus (Administrator), Instruktur (Pendidik), dan Peserta (Pelajar).")
    
    add_custom_heading(doc, "1.1 Pembagian Role & Hak Akses Pengguna", level=2)
    
    roles_table = doc.add_table(rows=4, cols=3)
    roles_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    roles_table.autofit = False
    
    headers = ["Role Pengguna", "Fokus Tanggung Jawab", "Akses Utama"]
    for c_idx, h_text in enumerate(headers):
        cell = roles_table.cell(0, c_idx)
        set_cell_background(cell, "1E3A8A")
        set_cell_margins(cell, 120, 120, 140, 140)
        p = cell.paragraphs[0]
        r = p.add_run(h_text)
        r.font.name = "Calibri"
        r.font.size = Pt(10.5)
        r.font.bold = True
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        
    role_rows = [
        ("Penyedia Kursus (Admin)", "Mengelola keseluruhan katalog kursus, struktur modul besar, pendaftaran pengajar, dan pemantauan analitik platform.", "Manajemen Kursus, Master Kurikulum, Pengumuman, Laporan"),
        ("Instruktur (Teacher)", "Menyiapkan silabus materi, mengunggah video & dokumen PDF, menyusun bank soal ujian, dan mengevaluasi hasil ujian.", "Upload Materi (Video/PDF), Bank Soal, Rubrik Essay, Forum Diskusi"),
        ("Peserta (Student)", "Mengikuti proses pembelajaran mandiri, membaca materi, berdiskusi, mengerjakan ujian akhir, dan mengunduh sertifikat.", "Katalog Kursus, Ruang Belajar (Classroom), Ujian Online, Sertifikat")
    ]
    
    for r_idx, (r_name, r_focus, r_access) in enumerate(role_rows, start=1):
        bg = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate([r_name, r_focus, r_access]):
            cell = roles_table.cell(r_idx, c_idx)
            set_cell_background(cell, bg)
            set_cell_margins(cell, 100, 100, 120, 120)
            if c_idx == 0:
                cell.width = Inches(1.8)
            elif c_idx == 1:
                cell.width = Inches(2.7)
            else:
                cell.width = Inches(2.0)
            p = cell.paragraphs[0]
            r = p.add_run(val)
            r.font.name = "Calibri"
            r.font.size = Pt(9.5)
            if c_idx == 0:
                r.bold = True
                r.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
            else:
                r.font.color.rgb = RGBColor(0x33, 0x41, 0x55)

    add_custom_heading(doc, "1.2 Alur Masuk (Login) & Registrasi Mandiri", level=2)
    add_styled_paragraph(doc, "Akses ke dalam platform LMS dilakukan melalui halaman login utama:")
    
    add_numbered_step(doc, "1", "Akses Alamat Web LMS", "Buka browser (Google Chrome, Microsoft Edge, atau Mozilla Firefox) lalu akses URL portal LMS (contoh: http://localhost:3000).")
    add_numbered_step(doc, "2", "Memilih Menu Masuk / Daftar", "Pada kartu autentikasi sebelah kanan, tersedia dua tab navigasi: 'Masuk' (untuk akun yang telah terdaftar) dan 'Daftar Peserta' (untuk pendaftaran akun baru).")
    add_numbered_step(doc, "3", "Proses Login", "Pilih tab peran (Peserta, Instruktur, atau Penyedia Kursus). Masukkan Email dan Password yang terdaftar, lalu klik tombol 'Masuk ke Platform'.")
    add_numbered_step(doc, "4", "Proses Registrasi Peserta Baru", "Klik tab 'Daftar Peserta', isi Nama Lengkap, Alamat Email Aktif, Kata Sandi (minimal 8 karakter), serta Konfirmasi Kata Sandi. Klik tombol 'Daftar Akun Baru'. Setelah berhasil, sistem akan mengarahkan Anda ke dasbor peserta secara otomatis.")

    # ==================== BAGIAN 2 ====================
    add_custom_heading(doc, "BAGIAN 2: PANDUAN PENYEDIA KURSUS (COURSE PROVIDER / ADMIN)", level=1)
    add_styled_paragraph(doc, 
        "Penyedia Kursus memegang kendali administratif tertinggi dalam penataan katalog pendidikan, penerbitan sertifikasi, dan penugasan instruktur.")
    
    add_custom_heading(doc, "2.1 Urutan Operasional Penyedia Kursus", level=2)
    
    add_numbered_step(doc, "1", "Login sebagai Penyedia Kursus", "Masuk menggunakan kredensial Admin / Penyedia Kursus untuk membuka antarmuka manajemen penuh.")
    add_numbered_step(doc, "2", "Membuat Kursus Baru (*Create Course*)", "Klik tombol '+ Tambah Kursus' pada Dasbor Manajemen. Lengkapi formulir:\n• Judul Kursus: Nama kursus yang jelas dan menarik.\n• Kategori: Kategori bidang ilmu (contoh: Pengadaan Barang/Jasa, IT & Software, Manajemen, dsb.).\n• Level Kesulitan: Pemula (Beginner), Menengah (Intermediate), atau Mahir (Advanced).\n• Deskripsi Kursus: Gambaran umum capaian kompetensi dan tujuan pembelajaran.\n• Gambar Sampul (Thumbnail): URL atau unggahan gambar representatif.")
    add_numbered_step(doc, "3", "Menetapkan Instruktur Pengampu", "Pilih nama instruktur yang bertanggung jawab mengisi silabus dan materi pada kursus tersebut.")
    add_numbered_step(doc, "4", "Menyusun Kerangka Modul Utama", "Tambahkan sekat-sekat modul/bab pembelajaran (contoh: Modul 1: Pengantar Dasar, Modul 2: Regulasi & Prosedur, Modul 3: Evaluasi & Studi Kasus).")
    add_numbered_step(doc, "5", "Konfigurasi Kelulusan & Sertifikat", "Tentukan standar nilai kelulusan (*passing grade*, default 70%) dan format nomor seri sertifikat yang akan diterbitkan secara otomatis saat peserta lulus.")
    add_numbered_step(doc, "6", "Menerbitkan Kursus (*Publish*)", "Ubah status kursus menjadi Aktif/Published agar tampil pada katalog utama peserta.")

    add_custom_heading(doc, "2.2 Pengelolaan Master Data Kategori, Level & Dimensi Kompetensi", level=2)
    add_styled_paragraph(doc, 
        "Penyedia Kursus dapat mengatur seluruh standar master data melalui Tab 'Kategori & Level' di Admin Panel:")
    
    add_bullet_item(doc, "1. Master Kategori Kursus", "Menambah, mengubah, dan menghapus kategori bidang ilmu (contoh: AI, Tech, Procurement, Leadership, Finance).")
    add_bullet_item(doc, "2. Master Tingkat Keahlian (Level)", "Mengatur jenjang kompetensi (Dasar, Menengah, Lanjutan, Eksekutif).")
    add_bullet_item(doc, "3. Master Dimensi Kompetensi (Radar Skills)", "Mengelola pilar-pilar keahlian radar peserta secara dinamis (contoh: Menambah 'Cyber Security', 'Public Speaking', atau menghapus dimensi lama). Perubahan langsung tersinkronisasi ke form skor profil pengguna dan grafik Radar di Dasbor Peserta.")

    add_callout(doc, [
        "Pastikan struktur modul telah tersusun rapi sebelum instruktur mengunggah berkas materi dan soal ujian.",
        "Penyedia Kursus dapat memantau jumlah peserta aktif, tingkat penyelesaian kursus, serta skor rata-rata ujian melalui Dasbor Statistik."
    ], title="REKOMENDASI PENYEDIA KURSUS")

    # ==================== BAGIAN 3 ====================
    add_custom_heading(doc, "BAGIAN 3: PANDUAN INSTRUKTUR (INSTRUCTOR)", level=1)
    add_styled_paragraph(doc, 
        "Instruktur bertugas menyusun isi pembelajaran yang interaktif, mengunggah materi ajar yang valid, mengelola bank soal ujian, dan menilai kompetensi peserta.")
    
    add_custom_heading(doc, "3.1 Urutan Operasional Instruktur", level=2)
    
    add_numbered_step(doc, "1", "Memilih Kursus yang Diampu", "Login sebagai Instruktur, lalu buka kursus yang telah ditugaskan dari dasbor instruktur.")
    add_numbered_step(doc, "2", "Mengunggah Materi Video Pembelajaran", "Klik 'Kelola Kursus' > Tab 'Materi'. Pilih tipe materi 'Video':\n• Masukkan tautan video (YouTube URL / Google Drive embed / MP4 direct link).\n• Isi judul sesi dan durasi estimasi.\n• Tuliskan ringkasan inti video pada kolom catatan materi.")
    add_numbered_step(doc, "3", "Mengunggah Materi Dokumen PDF & Slide Presentasi", "Pilih tipe materi 'Dokumen / Slide (PDF)':\n• Masukkan tautan atau upload file PDF materi.\n• Sistem akan menampilkan dokumen secara *clean* dan terintegrasi melalui PDF Viewer bawaan tanpa slide contoh dummy.")
    add_numbered_step(doc, "4", "Menyusun Bank Soal & Soal Ujian Akhir", "Buka Tab 'Bank Soal' atau Tab 'Soal Ujian' untuk merancang pertanyaan evaluasi.")
    add_numbered_step(doc, "5", "Memilih Format Soal & Menentukan Kunci Jawaban", "Pilih tipe soal yang sesuai (Single Choice, Multi-Select, atau Essay) dan simpan.")
    add_numbered_step(doc, "6", "Melakukan Moderasi Diskusi Kelas", "Pantau tab 'Forum Diskusi' untuk menjawab pertanyaan yang diajukan oleh peserta.")
    add_numbered_step(doc, "7", "Mengevaluasi & Mereview Jawaban Esai", "Buka Tab 'Hasil Ujian Peserta' untuk memeriksa jawaban uraian/esai dan memvalidasi kelulusan peserta.")

    add_custom_heading(doc, "3.2 Panduan Pembuatan Soal Ujian Interaktif", level=2)
    add_styled_paragraph(doc, 
        "Sistem LMS mendukung 3 tipe pertanyaan ujian yang dapat disesuaikan pada form input soal yang telah diperbesar dan proporsional:")
    
    add_bullet_item(doc, "1. Pilihan Ganda Tunggal (Single Choice)", "Gunakan untuk soal dengan tepat 1 kunci jawaban benar. Masukkan teks pertanyaan pada kotak textarea yang luas, isi Opsi A, B, C, D, lalu klik huruf opsi untuk menentukan kunci (ditandai dengan badge hijau '✓ Kunci').")
    add_bullet_item(doc, "2. Pilihan Ganda Kompleks (Multi-Select / Checkbox)", "Gunakan untuk soal yang memiliki lebih dari satu jawaban benar (misal: 'Pilihlah 2 dokumen yang wajib disertakan...'). Klik huruf-huruf opsi yang benar untuk memasukkan beberapa kunci sekaligus.")
    add_bullet_item(doc, "3. Soal Uraian / Esai (Essay)", "Gunakan untuk soal analisis, penalaran, atau studi kasus. Masukkan teks pertanyaan dan isi kolom 'Kata Kunci Penilaian / Rubrik Jawaban' sebagai pedoman evaluasi.")

    # ==================== BAGIAN 4 ====================
    add_custom_heading(doc, "BAGIAN 4: PANDUAN PESERTA (PARTICIPANT / LEARNER)", level=1)
    add_styled_paragraph(doc, 
        "Peserta memiliki pengalaman belajar terpandu dengan alur belajar yang jelas mulai dari pendaftaran hingga perolehan sertifikat kompetensi.")
    
    add_custom_heading(doc, "4.1 Urutan Alur Belajar Peserta", level=2)
    
    add_numbered_step(doc, "1", "Pendaftaran Akun & Masuk", "Buka halaman login, pilih tab 'Daftar Peserta' untuk membuat akun baru atau 'Masuk' jika sudah terdaftar.")
    add_numbered_step(doc, "2", "Eksplorasi Katalog & Memilih Kursus", "Pada Beranda LMS, lihat daftar kursus yang tersedia. Filter berdasarkan kategori atau tingkat kesulitan, lalu klik 'Mulai Belajar' atau 'Masuk Kelas'.")
    add_numbered_step(doc, "3", "Mempelajari Materi Sesi per Sesi", "Pelajari materi secara berurutan sesuai silabus di bilah samping kiri (Sidebar Kursus):\n• Tonton video penjelasan sampai tuntas.\n• Baca dokumen PDF materi melalui penampil dokumen terintegrasi (gunakan tombol 'Buka Tab Baru' jika ingin membaca layar penuh).")
    add_numbered_step(doc, "4", "Menandai Selesai & Melacak Progres", "Klik tombol 'Tandai Selesai' di setiap akhir materi. Bilah kemajuan (Progress Bar) akan bertambah secara otomatis.")
    add_numbered_step(doc, "5", "Aktif dalam Forum Diskusi", "Gunakan tab 'Forum Diskusi' di bawah materi untuk bertanya atau berbagi pandangan dengan rekan sekelas dan instruktur.")
    add_numbered_step(doc, "6", "Mengerjakan Ujian Akhir (Final Exam)", "Setelah seluruh materi selesai dipelajari, tombol 'Mulai Ujian' akan aktif. Kerjakan soal dengan memperhatikan batas waktu yang ditentukan.")
    add_numbered_step(doc, "7", "Melihat Hasil & Unduh Sertifikat", "Setelah mengirimkan ujian, skor akan langsung dihitung. Apabila mencapai batas nilai kelulusan (passing grade), sertifikat digital berbarcode resmi langsung diterbitkan dan dapat diunduh.")

    # ==================== BAGIAN 5 ====================
    add_custom_heading(doc, "BAGIAN 5: PANDUAN TEKNIS MENGERJAKAN UJIAN AKHIR", level=1)
    add_styled_paragraph(doc, 
        "Ujian akhir di LMS dilindungi dengan sistem sesi token dan penghitung waktu mundur yang akurat. Berikut tata cara pengerjaan berdasarkan jenis soal:")
    
    exam_rules_table = doc.add_table(rows=4, cols=3)
    exam_rules_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    exam_rules_table.autofit = False
    
    e_headers = ["Tipe Soal", "Tampilan Antarmuka Peserta", "Cara Menjawab & Validasi"]
    for c_idx, h_text in enumerate(e_headers):
        cell = exam_rules_table.cell(0, c_idx)
        set_cell_background(cell, "0284C7")
        set_cell_margins(cell, 120, 120, 140, 140)
        p = cell.paragraphs[0]
        r = p.add_run(h_text)
        r.font.name = "Calibri"
        r.font.size = Pt(10.5)
        r.font.bold = True
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        
    e_rows = [
        ("Pilihan Ganda Tunggal", "Badge Biru '🔘 1 Jawaban Benar'\nTombol pilihan radio A, B, C, D.", "Klik satu opsi jawaban terbaik. Jawaban terpilih akan berubah warna menjadi biru terang."),
        ("Pilihan Ganda Kompleks", "Badge Ungu '☑️ Pilih Semua yang Benar'\nKotak centang (checkbox).", "Klik semua opsi yang menurut Anda benar (bisa 2, 3, atau lebih). Anda dapat membatalkan centang dengan mengklik kembali."),
        ("Soal Uraian / Esai", "Badge Emas '📝 Soal Uraian / Essay'\nKotak textarea luas dengan live character counter.", "Ketikkan argumentasi/uraian jawaban secara lengkap. Pastikan jawaban tidak kosong sebelum menekan tombol Kirim.")
    ]
    
    for r_idx, (e_type, e_ui, e_action) in enumerate(e_rows, start=1):
        bg = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate([e_type, e_ui, e_action]):
            cell = exam_rules_table.cell(r_idx, c_idx)
            set_cell_background(cell, bg)
            set_cell_margins(cell, 100, 100, 120, 120)
            if c_idx == 0:
                cell.width = Inches(1.8)
            elif c_idx == 1:
                cell.width = Inches(2.2)
            else:
                cell.width = Inches(2.5)
            p = cell.paragraphs[0]
            r = p.add_run(val)
            r.font.name = "Calibri"
            r.font.size = Pt(9.5)
            if c_idx == 0:
                r.bold = True
                r.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
            else:
                r.font.color.rgb = RGBColor(0x33, 0x41, 0x55)

    add_callout(doc, [
        "Sistem menerapkan validasi ketat: Tombol 'Kirim Ujian' akan mengingatkan nomor soal yang belum diisi apabila masih ada soal terlewat.",
        "Jangan me-refresh browser selama ujian berlangsung untuk menjaga kontinuitas timer ujian."
    ], title="TIPS KESUKSESAN UJIAN")

    # ==================== BAGIAN 6 ====================
    add_custom_heading(doc, "BAGIAN 6: FAQ & TROUBLESHOOTING (PENYELESAIAN MASALAH)", level=1)
    
    faq_data = [
        ("Bagaimana jika file PDF materi tidak muncul di layar?", 
         "Pastikan tautan PDF valid dan dapat diakses publik. Jika browser memblokir tampilan frame, klik tombol 'Buka Tab Baru' di kanan atas area materi untuk membuka dokumen secara langsung."),
        
        ("Bagaimana cara mengganti kunci jawaban soal dari A ke opsi lain?", 
         "Pada panel pembuat soal Instruktur, cukup klik tombol huruf opsi (B, C, atau D). Badge '✓ Kunci' akan berpindah seketika. Untuk soal multi-select, klik setiap opsi yang ingin dimasukkan ke dalam kunci jawaban."),
         
        ("Mengapa tombol Kirim Ujian menampilkan peringatan?", 
         "Sistem memeriksa seluruh butir pertanyaan. Jika ada soal pilihan ganda yang belum dicentang atau essay yang masih kosong, sistem akan memunculkan notifikasi nomor soal yang harus dilengkapi terlebih dahulu."),
         
        ("Kapan sertifikat kelulusan dapat diakses?", 
         "Sertifikat langsung otomatis terbit di Tab 'Sertifikat' segera setelah nilai ujian Anda mencapai batas minimal kelulusan (passing score, misal >= 70%). Sertifikat dilengkapi ID unik dan tanggal kelulusan.")
    ]
    
    for q, a in faq_data:
        add_styled_paragraph(doc, q, bold_prefix="T: ", italic=False)
        add_styled_paragraph(doc, a, bold_prefix="J: ", italic=False)
        doc.add_paragraph()

    # Output file
    output_dir = "E:/lms"
    output_path = os.path.join(output_dir, "Buku_Panduan_Pengguna_LMS.docx")
    doc.save(output_path)
    print(f"SUCCESS: Document saved to {output_path}")

if __name__ == "__main__":
    main()
