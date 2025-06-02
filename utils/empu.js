const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Tentukan salt rounds. Angka yang lebih tinggi lebih aman tapi lebih lambat.
// 10-12 adalah nilai yang umum dan baik saat ini.
const saltRounds = 10;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET tidak diatur di file .env.");
  process.exit(1); // Keluar dari aplikasi jika JWT_SECRET tidak ada
}

async function hashPassword(passwordAsli) {
  try {
    const hashedPassword = await bcrypt.hash(passwordAsli, saltRounds);
    console.log('Password Asli:', passwordAsli);
    console.log('Password Hash:', hashedPassword);
    // Di sini Anda akan menyimpan hashedPassword ke database Anda
    // terkait dengan username pengguna.
    return hashedPassword;
  } catch (error) {
    console.error('Error saat hashing password:', error);
    throw error; // atau tangani error sesuai kebutuhan aplikasi Anda
  }
}

// Contoh penggunaan:
async function prosesRegistrasi({ name, password }, supabase) {

  console.log(`Mencoba registrasi untuk user: ${name}`);

  try {
    const hashUntukDisimpan = await hashPassword(password);
    // Ganti 'empu' dengan nama tabel pengguna Anda
    // Ganti 'name' dengan kolom name Anda dan 'stempel' dengan kolom hash password Anda
    const { data, error } = await supabase
      .from('empu')
      .insert([{ name: name, stempel: hashUntukDisimpan }])
      .select();

    if (error) {
      console.error('Error Supabase saat registrasi:', error.message);
      throw error;
    }
    console.log(`Untuk user ${name}, data tersimpan:`, data);
    return data[0]; // Mengembalikan data pengguna yang baru dibuat (atau konfirmasi sukses)
  } catch (err) {
    console.error('Registrasi gagal:', err.message);
    throw err; // Lempar error agar bisa ditangani di route handler
  }
}

// Jalankan contoh
// prosesRegistrasi('user_baru_123', 'P@sswOrdKuat!');

async function verifikasiPassword(passwordYangDimasukkan, hashedPasswordDariDB) {
  console.log( passwordYangDimasukkan, hashedPasswordDariDB )
  try {
    const cocok = await bcrypt.compare(passwordYangDimasukkan, hashedPasswordDariDB);
    if (cocok) {
      console.log('Password cocok! Login berhasil.');
      return true;
    } else {
      console.log('Password tidak cocok! Login gagal.');
      return false;
    }
  } catch (error) {
    console.error('Error saat verifikasi password:', error);
    throw error; // atau tangani error
  }
}

async function getUserByUsernameSupabase(usernameToFind, supabase) {
  if (!usernameToFind) {
    console.error('Username yang dicari tidak boleh kosong.');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('empu') // Nama tabel Anda
      .select('*') // Pilih semua kolom, atau sebutkan kolom spesifik: 'id, username, email'
      .eq('name', usernameToFind); // Filter: kolom 'username' sama dengan usernameToFind

    if (error) {
      console.error(`Error mengambil data pengguna "${usernameToFind}" dari Supabase:`, error.message);
      return null;
    }

    if (data && data.length > 0) {
      return data[0]; // Mengembalikan objek pengguna pertama yang cocok
    } else {
      console.log(`Pengguna dengan username "${usernameToFind}" tidak ditemukan.`);
      return null;
    }
  } catch (err) {
    console.error('Kesalahan tak terduga saat mengambil pengguna:', err);
    return null;
  }
}

// Contoh penggunaan:
async function cobaLogin(credentials, supabase) {
  // 'credentials' diharapkan objek seperti { name: 'username', password: 'password' }
  const { name: username, password } = credentials;
  console.log(`Mencoba login untuk user: ${username}`);

  const userFromDb = await getUserByUsernameSupabase(username, supabase);
  console.log("User dari DB saat login:", userFromDb);

  if (userFromDb && userFromDb.stempel) { // Pastikan user ada dan memiliki hash password ('stempel')
    const passwordValid = await verifikasiPassword(password, userFromDb.stempel);

    if (passwordValid) {
      // Password valid, buat JWT
      const payload = {
        userId: userFromDb.id, // Asumsikan tabel 'empu' memiliki kolom 'id' sebagai primary key
        username: userFromDb.name,
        role: userFromDb.role,
        // Anda bisa menambahkan data lain ke payload jika perlu (misalnya, peran pengguna)
        // HINDARI menyimpan data sensitif di payload token
      };

      // Buat token dengan masa berlaku (misalnya, 1 jam, 1 hari, dll.)
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }); // '1h' = 1 jam

      console.log(`Login berhasil untuk user: ${username}. Token dibuat.`);
      return {
        success: true,
        message: `Login berhasil untuk ${username}`,
        token: token,
        user: { // Kirim kembali info pengguna dasar (non-sensitif)
          id: userFromDb.id,
          username: userFromDb.name,
          role: userFromDb.role,
        }
      };
    } else {
      console.log(`Login gagal untuk user: ${username}. Password tidak valid.`);
      return { success: false, message: 'Username atau password salah.' };
    }
  } else {
    console.log(`Login gagal. User ${username} tidak ditemukan atau tidak memiliki hash password.`);
    return { success: false, message: 'Username atau password salah.' };
  }
}



// Middleware untuk memverifikasi token JWT
// function verifyToken(req, res, next) {
//   const authHeader = req.headers['authToken'];
//   // Token dikirim dalam format: Bearer <TOKEN>
//   const token = authHeader && authHeader.split(' ')[1];

//   if (token == null) {
//     console.log('Akses ditolak: Token tidak disediakan.');
//     return res.status(401).json({ message: 'Akses ditolak. Token tidak disediakan.' }); // Unauthorized
//   }

//   jwt.verify(token, JWT_SECRET, (err, decodedPayload) => {
//     if (err) {
//       console.error('Verifikasi token gagal:', err.message);
//       if (err.name === 'TokenExpiredError') {
//         return res.status(401).json({ message: 'Token kedaluwarsa. Silakan login kembali.' });
//       }
//       return res.status(403).json({ message: 'Token tidak valid.' }); // Forbidden
//     }

//     // Jika token valid, simpan payload yang sudah didekode ke objek request
//     // agar bisa diakses oleh handler route berikutnya
//     req.user = decodedPayload; // req.user akan berisi { userId: ..., username: ... }
//     console.log('Token berhasil diverifikasi. User:', req.user);
//     next(); // Lanjutkan ke handler/middleware berikutnya
//   });
// }
function verifyToken(req, res, next) {
  // Ambil token dari cookie bernama 'authToken'
  // Ini memerlukan middleware cookie-parser sudah digunakan di app.js
  const token = req.cookies.authToken; // <--- DI SINI TOKEN DIAMBIL DARI COOKIE

  if (token == null) {
    console.log('Akses ditolak: Token tidak ditemukan di cookie.');
    // Redirect ke halaman login jika token tidak ada
    return res.redirect('/login?error=noauth');
  }

  jwt.verify(token, JWT_SECRET, (err, decodedPayload) => {
    if (err) {
      console.error('Verifikasi token gagal:', err.message);
      res.clearCookie('authToken'); // Hapus cookie token yang tidak valid
      if (err.name === 'TokenExpiredError') {
        return res.redirect('/login?error=expired');
      }
      return res.redirect('/login?error=invalidtoken');
    }

    // Jika token valid, simpan payload yang sudah didekode ke objek request
    req.user = decodedPayload;
    console.log('Token berhasil diverifikasi dari cookie. User:', req.user);
    next(); // Lanjutkan ke handler route berikutnya
  });
}
function authSession(req, res, next){
  const token = req.cookies.authToken; // <--- DI SINI TOKEN DIAMBIL DARI COOKIE

  if (token == null) {
    req.user = null
    next();
  } else {
    jwt.verify(token, JWT_SECRET, (err, decodedPayload) => {
      if (err) {
        console.error('Verifikasi token gagal:', err.message);
        res.clearCookie('authToken'); // Hapus cookie token yang tidak valid
        if (err.name === 'TokenExpiredError') {
          return res.redirect('/login?error=expired');
        }
        return res.redirect('/login?error=invalidtoken');
      }
  
      // Jika token valid, simpan payload yang sudah didekode ke objek request
      req.user = decodedPayload;
      console.log('Token berhasil diverifikasi dari cookie. User:', req.user);
      next(); // Lanjutkan ke handler route berikutnya
    });
  }
}

// Middleware untuk otorisasi admin
function authorizeAdmin(req, res, next) {
  // Middleware ini harus dijalankan SETELAH verifyToken
  if (req.user && req.user.role === 'ADMIN') {
    // console.log(`Otorisasi admin berhasil untuk user: ${req.user.username}`);
    next(); // Pengguna adalah admin, lanjutkan
  } else {
    console.log(`Otorisasi admin gagal. User: ${req.user ? req.user.username : 'Tidak ada'}, Peran: ${req.user ? req.user.role : 'Tidak ada'}`);
    // Kirim status Forbidden jika bukan admin
    // Anda bisa juga redirect ke halaman lain jika mau
    // res.status(403).send('<h1>Akses Ditolak</h1><p>Anda tidak memiliki izin untuk mengakses halaman ini.</p><p><a href="/">Kembali ke Beranda</a></p>');
    res.redirect('empu')
  }
}


module.exports = {
   getUserByUsernameSupabase, 
   cobaLogin, 
   prosesRegistrasi,
   verifyToken,
   authorizeAdmin,
   authSession
  }