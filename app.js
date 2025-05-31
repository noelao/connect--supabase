// Import modul yang diperlukan
require('dotenv').config(); // Memuat variabel lingkungan dari file .env
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

// Inisialisasi aplikasi Express
const app = express();
const port = process.env.PORT || 3000;

// Dapatkan URL Supabase dan Service Key dari variabel lingkungan
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Gunakan Service Key untuk operasi backend

// Pastikan variabel lingkungan sudah diatur
if (!supabaseUrl || !supabaseKey) {
  console.error("Error: Pastikan SUPABASE_URL dan SUPABASE_SERVICE_KEY sudah diatur di file .env Anda.");
  process.exit(1); // Keluar jika variabel tidak ditemukan
}

// Buat klien Supabase
// Untuk operasi di sisi server (backend), biasanya Anda akan menggunakan service_role key
// yang memiliki hak akses lebih tinggi dan bisa melewati Row Level Security (RLS) jika diperlukan.
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware untuk parsing JSON
app.use(express.json());

// Contoh: Membuat route untuk mengambil semua data dari tabel 'barangKenapaTidak'
app.get('/items', async (req, res) => {
  try {
    console.log("Mencoba mengambil data dari tabel 'barangKenapaTidak'...");
    // Mengambil semua kolom (*) dari 'barangKenapaTidak'
    const { data, error, status } = await supabase
      .from('barangKenapaTidak') // MENGGUNAKAN NAMA TABEL ANDA
      .select('*'); // Mengambil semua kolom

    if (error) {
      // Jika ada error dari Supabase saat query
      console.error('Supabase error:', error.message, 'Status:', status);
      // Melempar error agar bisa ditangkap oleh blok catch di bawah
      // dan mengirimkan respons error yang lebih informatif ke klien
      return res.status(status || 500).json({ message: `Supabase error: ${error.message}`, details: error.details });
    }

    // Log data yang diterima dari Supabase (sebelum dikirim ke klien)
    console.log("Data yang diterima dari Supabase:", JSON.stringify(data, null, 2));

    // Periksa apakah data yang diterima adalah array kosong
    if (data && data.length === 0) {
      console.log("Tidak ada data ditemukan di tabel 'barangKenapaTidak'.");
    }

    res.json(data); // Kirim data sebagai response JSON
  } catch (error) {
    // Menangani error umum atau error yang dilempar dari blok try
    // (Ini mungkin tidak akan terpanggil jika error Supabase sudah ditangani di atas,
    // tapi baik untuk penanganan error tak terduga lainnya)
    console.error('Error fetching items:', error.message);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// Contoh: Membuat route untuk menambahkan data baru ke 'barangKenapaTidak'
app.post('/items', async (req, res) => {
  try {
    const newItem = req.body; // Misal: { column1: 'value1', column2: 'value2' }

    // Pastikan ada data yang dikirim
    if (!newItem || Object.keys(newItem).length === 0) {
      return res.status(400).json({ message: 'Request body tidak boleh kosong.' });
    }

    console.log("Mencoba menambahkan item baru:", newItem, "ke tabel 'barangKenapaTidak'");

    const { data, error, status } = await supabase
      .from('barangKenapaTidak') // MENGGUNAKAN NAMA TABEL ANDA
      .insert([newItem])      // Masukkan data baru
      .select();              // Kembalikan data yang baru dimasukkan

    if (error) {
      console.error('Supabase error on insert:', error.message, 'Status:', status);
      // Cek detail error spesifik dari Supabase jika ada
      if (error.details) console.error('Error details:', error.details);
      return res.status(status || 500).json({ message: `Supabase error: ${error.message}`, details: error.details });
    }

    console.log("Item berhasil ditambahkan:", data);
    res.status(201).json({ message: 'Item berhasil ditambahkan', item: data });
  } catch (error) {
    console.error('Error adding item:', error.message);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});


// Menjalankan server
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
  console.log('Terhubung ke Supabase project:', supabaseUrl.substring(0, supabaseUrl.indexOf('.co') + 3) + '...'); // Hanya menampilkan bagian awal URL
});

// Pastikan Anda memiliki tabel bernama 'barangKenapaTidak' di Supabase
// Contoh struktur tabel (sesuaikan dengan kebutuhan Anda):
// id (int8, primary key, generated always as identity)
// nama_barang (text)
// jumlah (integer)
// created_at (timestamptz, default: now())
//
// Anda bisa membuatnya melalui SQL Editor di Supabase Dashboard:
/*
  CREATE TABLE barangKenapaTidak (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    nama_barang TEXT NOT NULL,
    jumlah INTEGER,
    deskripsi TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Aktifkan Row Level Security (RLS) jika belum (opsional tapi direkomendasikan)
  ALTER TABLE barangKenapaTidak ENABLE ROW LEVEL SECURITY;

  -- Buat policy agar bisa dibaca semua orang (jika diperlukan untuk GET /items tanpa auth)
  -- PERHATIAN: service_role key akan melewati RLS ini secara default.
  -- Policy ini lebih relevan jika Anda menggunakan anon key atau JWT pengguna.
  CREATE POLICY "Allow public read access for barangKenapaTidak"
  ON barangKenapaTidak
  FOR SELECT
  USING (true);

  -- Buat policy agar bisa diinsert semua orang (jika diperlukan untuk POST /items tanpa auth server-side)
  -- HATI-HATI: Ini memungkinkan siapa saja untuk insert jika endpoint Anda publik dan menggunakan anon key.
  -- service_role key akan melewati RLS ini secara default.
  CREATE POLICY "Allow public insert access for barangKenapaTidak"
  ON barangKenapaTidak
  FOR INSERT
  WITH CHECK (true);
*/
