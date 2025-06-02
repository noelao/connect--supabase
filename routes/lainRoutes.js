const express = require('express');
const empu = express.Router(); // Membuat instance Router baru
const { verifyToken, getUserByUsernameSupabase } = require('../utils/empu')
const path = require('path')

// supabase
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Gunakan Service Key untuk operasi backend
if (!supabaseUrl || !supabaseKey) {
  console.error("Error: Pastikan SUPABASE_URL dan SUPABASE_SERVICE_KEY sudah diatur di file .env Anda.");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);



empu.get('/', verifyToken, async (req, res) => {
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
    res.render("e/empu", kiriman)
  } catch (error) {
    console.error('Error di rute /profil-saya:', error);
    res.status(500).json({ message: 'Gagal mengambil data profil.' });
  }
});

empu.get('/id/:id', verifyToken, async (req, res) => {
  const userId = req.user.userId;
  const userNama = req.user.username;
  const role = req.user.role;

  const ini = req.params.id

  const data = await getUserByUsernameSupabase(userNama, supabase)

  const kiriman = {
    judul: "King",
    userId,
    role: role || "npc",
    data,
  }

  try {
    res.render("e/empu", kiriman)
  } catch (error) {
    console.error('Error di rute /profil-saya:', error);
    res.status(500).json({ message: 'Gagal mengambil data profil.' });
  }
});



// Mengekspor router agar bisa digunakan di file lain (misalnya, server.js)
module.exports = empu;
