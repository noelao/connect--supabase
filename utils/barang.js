async function ambilSemua(supabase) {
    console.log("Mencoba mengambil data dari tabel 'barangKenapaTidak'...");
    // Mengambil semua kolom (*) dari 'barangKenapaTidak'
    const { data, error, status } = await supabase
      .from('barangKenapaTidak') // MENGGUNAKAN NAMA TABEL ANDA
      .select('*'); // Mengambil semua kolom 
    
    
    if (error) {
      console.error('Supabase error:', error.message, 'Status:', status);
      return (`Supabase error: ${error.message} ${error.details}`);
    }

    // Log data yang diterima dari Supabase (sebelum dikirim ke klien)
    console.log("Data yang diterima dari Supabase:", JSON.stringify(data, null, 2));

    // Periksa apakah data yang diterima adalah array kosong
    if (data && data.length === 0) {
      console.log("Tidak ada data ditemukan di tabel 'barangKenapaTidak'.");
    }
    return data;
}

async function tambahBarang(ini, supabase){
    // Pastikan ada data yang dikirim
    if (!ini || Object.keys(ini).length === 0) {
      return ('Request body tidak boleh kosong.');
    }

    console.log("Mencoba menambahkan item baru:", ini, "ke tabel 'barangKenapaTidak'");

    const { data, error, status } = await supabase
      .from('barangKenapaTidak') // MENGGUNAKAN NAMA TABEL ANDA
      .insert([ini])      // Masukkan data baru
      .select();              // Kembalikan data yang baru dimasukkan

    if (error) {
      console.error('Supabase error on insert:', error.message, 'Status:', status);
      if (error.details) return ('Error details:', error.details);
    }
    
    return ("Item berhasil ditambahkan:", data);
}

module.exports = {
    ambilSemua,
    tambahBarang
}