// Import modul yang diperlukan
require('dotenv').config(); // Memuat variabel lingkungan dari file .env
const { createClient } = require('@supabase/supabase-js');
const express = require('express');
const path = require('path')
const multer = require('multer')
const cookieParser = require('cookie-parser');

const app = express();
const port = process.env.PORT || 3000;

const { ambilSemua, tambahBarang } = require('./utils/barang')
const { 
  getUserByUsernameSupabase, 
  cobaLogin, verifyToken, 
  authorizeAdmin, prosesRegistrasi,
  authSession
} = require("./utils/empu")


// ejs
const expressLayouts = require('express-ejs-layouts');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(expressLayouts);
app.set('layout', 'layouts/main')


// perlu ini, meddleware fungsi untuk membantu proses post ke alamat action
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());


// Konfigurasi Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Gunakan Service Key untuk operasi backend
if (!supabaseUrl || !supabaseKey) {
  console.error("Error: Pastikan SUPABASE_URL dan SUPABASE_SERVICE_KEY sudah diatur di file .env Anda.");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);
// 
app.use(authSession, (req, res, next) => {
  // Membuat variabel 'currentUser' tersedia di semua template EJS
  // Jika req.user ada (biasanya di-set oleh Passport.js setelah login berhasil)
  // atau req.session.user (jika Anda menyimpannya secara manual di session)
  console.log("ini dieksekusi ...")
  try {
    if(req.user){
      res.locals.currentUser = req.user;
      // console.log(res.locals.currentUser)
    } else {
      res.locals.currentUser = null;
      // console.log(res.locals.currentUser)
    }
  } catch (err){
    console.log(err)
    res.locals.currentUser = null;
  }
  next();
});

app.get('/', (req, res) => {
  res.render('i/index');
});

app.get('/items', async (req, res) => {
  try {
    const data = await ambilSemua(supabase);

    kiriman = {
      judul: 'Barang',
      data,
      kategori: 'semua'
    }

    // res.json(data); // Kirim data sebagai response JSON
    res.render('i/items', kiriman)
  } catch (error) {
    console.error('Error fetching items:', error.message);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

app.post('/items', async (req, res) => {
  try {
    const newItem = req.body; // Misal: { column1: 'value1', column2: 'value2' }
    console.log(newItem)
    const hasil = await tambahBarang(newItem, supabase);
    console.log(hasil)

    const data = await ambilSemua(supabase);

    kiriman = {
      judul: 'Barang',
      data,
      kategori: 'semua',
    }

    res.render('i/items', kiriman)
  } catch (error) {
    console.error('Error adding item:', error.message);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

app.get('/items/tambah', (req, res) => {
  kiriman = {
    judul: "tambah Barang"
  }
  res.render('i/tambahBarang', kiriman)
});


app.get('/admin', verifyToken, authorizeAdmin, async (req, res) => {
  const userId = req.user.userId;
  const userNama = req.user.username;
  const role = req.user.role;

  const data = await getUserByUsernameSupabase(userNama, supabase)

  const kiriman = {
    judul: "King",
    userId,
    role: role || "npc",
    data,
  }

  try {
    res.render("i/admin", kiriman)
  } catch (error) {
    console.error('Error di rute /profil-saya:', error);
    res.status(500).json({ message: 'Gagal mengambil data profil.' });
  }
});

app.get('/login', async(req, res) => {
  const kiriman = {
    judul: 'login'
  }

  res.render("i/login", kiriman)
})

app.post('/login', async (req, res) => {
  const { name, password } = req.body;
  console.log('Menerima permintaan login untuk:', name);

  if (!name || !password) {
    // Jika validasi gagal, kirim JSON dan jangan redirect dari sini
    return res.status(400).json({ message: 'Nama (username) dan password diperlukan.' });
  }

  try {
    const loginResult = await cobaLogin({ name, password }, supabase);

    if (loginResult.success && loginResult.token) {
      // Login berhasil, sematkan token di HTTP-Only cookie
      res.cookie('authToken', loginResult.token, {
        httpOnly: true, // Cookie tidak bisa diakses oleh JavaScript sisi klien
        secure: process.env.NODE_ENV === 'production', // Kirim hanya melalui HTTPS di produksi
        sameSite: 'strict', // Membantu melindungi dari serangan CSRF
        maxAge: 3600000 // Masa berlaku cookie (misalnya, 1 jam dalam milidetik)
        // path: '/' // Cookie berlaku untuk semua path (default)
      });
      console.log('Token disematkan di cookie, redirecting ke /admin');
      // Setelah cookie diatur, redirect ke halaman admin
      // Klien akan menerima cookie dan kemudian dialihkan.
      return res.redirect('/admin');
    } else {
      // Login gagal (username/password salah, atau tidak ada token yang dihasilkan)
      console.log('Login gagal:', loginResult.message);
      // Redirect ke halaman login lagi dengan pesan error (opsional, atau kirim JSON)
      // Untuk konsistensi, jika ingin menampilkan pesan di halaman login,
      // Anda mungkin perlu menggunakan flash messages atau query params.
      // Di sini kita akan redirect saja.
      return res.redirect('/login?error=authfailed'); // Atau kirim respons JSON
      // return res.status(401).json({ message: loginResult.message || 'Username atau password salah.' });
    }
  } catch (error) {
    console.error('Error di rute /login:', error);
    // Redirect ke halaman login dengan pesan error umum
    return res.redirect('/login?error=servererror'); // Atau kirim respons JSON
    // return res.status(500).json({ message: 'Terjadi kesalahan internal saat mencoba login.' });
  }
  // Baris ini seharusnya tidak pernah tercapai jika logika di atas sudah benar dengan return
});

app.get('/logout', (req, res) => {
  res.clearCookie('authToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/' // Penting: path harus cocok dengan saat cookie diatur
  });
  console.log('User logout, cookie authToken dihapus.');
  res.redirect('/login?message=logoutsuccess');
});


app.get('/lahirkan', async(req, res) => {
  const kiriman = {
    judul: 'create user'
  }

  res.render("i/lahirkan", kiriman)
})
app.post('/lahirkan', async(req, res) => {
  const { name, password } = req.body;
  console.log(req.body)

  const regis = await prosesRegistrasi({ name, password }, supabase)

  console.log(regis)

  
  if (!name || !password) {
    // Jika validasi gagal, kirim JSON dan jangan redirect dari sini
    return res.status(400).json({ message: 'Nama (username) dan password diperlukan.' });
  }

  try {
    const loginResult = await cobaLogin({ name, password }, supabase);

    if (loginResult.success && loginResult.token) {
      // Login berhasil, sematkan token di HTTP-Only cookie
      res.cookie('authToken', loginResult.token, {
        httpOnly: true, // Cookie tidak bisa diakses oleh JavaScript sisi klien
        secure: process.env.NODE_ENV === 'production', // Kirim hanya melalui HTTPS di produksi
        sameSite: 'strict', // Membantu melindungi dari serangan CSRF
        maxAge: 3600000 // Masa berlaku cookie (misalnya, 1 jam dalam milidetik)
        // path: '/' // Cookie berlaku untuk semua path (default)
      });
      console.log('Token disematkan di cookie, redirecting ke /admin');
      // Setelah cookie diatur, redirect ke halaman admin
      // Klien akan menerima cookie dan kemudian dialihkan.
      return res.redirect('/admin');
    } else {
      // Login gagal (username/password salah, atau tidak ada token yang dihasilkan)
      console.log('Login gagal:', loginResult.message);
      // Redirect ke halaman login lagi dengan pesan error (opsional, atau kirim JSON)
      // Untuk konsistensi, jika ingin menampilkan pesan di halaman login,
      // Anda mungkin perlu menggunakan flash messages atau query params.
      // Di sini kita akan redirect saja.
      return res.redirect('/login?error=authfailed'); // Atau kirim respons JSON
      // return res.status(401).json({ message: loginResult.message || 'Username atau password salah.' });
    }
  } catch (error) {
    console.error('Error di rute /login:', error);
    // Redirect ke halaman login dengan pesan error umum
    return res.redirect('/login?error=servererror'); // Atau kirim respons JSON
    // return res.status(500).json({ message: 'Terjadi kesalahan internal saat mencoba login.' });
  }
})



// Mengimpor rute pengguna
const userRoutes = require('./routes/lainRoutes'); // Sesuaikan path jika struktur folder berbeda

// Menggunakan rute pengguna dengan prefix '/api/users'
// Semua rute yang didefinisikan di lainRutes.js akan diawali dengan /api/users
// Contoh: GET /api/users/ akan ditangani oleh userRoutes.get('/') di lainRutes.js
// Contoh: POST /api/users/ akan ditangani oleh userRoutes.post('/') di lainRutes.js
app.use('/empu', userRoutes);

// Middleware untuk menangani rute yang tidak ditemukan (404)
app.use((req, res, next) => {
  res.status(404).send("Maaf, halaman yang Anda cari tidak ditemukan.");
});




const storage = multer.memoryStorage();
const MAX_FILE_SIZE_KB = 30; // Batas ukuran file dalam KB
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_KB * 1024; // Konversi ke byte

const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: MAX_FILE_SIZE_BYTES // Batas ukuran file 30KB
  }, 
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error(`Error: Hanya file gambar (jpeg, jpg, png, gif) yang diizinkan! Ukuran maksimal ${MAX_FILE_SIZE_KB}KB.`));
  }
});




// Menjalankan server
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
  console.log('Terhubung ke Supabase project:', supabaseUrl.substring(0, supabaseUrl.indexOf('.co') + 3) + '...'); // Hanya menampilkan bagian awal URL
});