# GasMain Online

Kumpulan 8 game (Battleship, Tic-Tac-Toe, Connect Four, Othello, Uno, Ular Tangga, Ludo, Gaple) plus mabar online.
Server ditulis tanpa dependensi, jadi **tidak perlu `npm install`**. Cukup Node.js versi 18 ke atas.

## Isi folder
- `server.js`  : server (file statis + relay mabar lewat Server-Sent Events)
- `package.json`
- `public/index.html`  : lobi (daftar nama, musik, daftar game)
- `public/mp.js`  : jembatan mabar di browser
- `public/games/*.html`  : kedelapan game

## 1. Tes di HP lewat Termux (gratis, tanpa hosting)
```
pkg update
pkg install nodejs unzip
termux-setup-storage
cd ~/storage/downloads
unzip gasmain-online.zip
cd gasmain-online
node server.js
```
Buka browser di HP: `http://localhost:3000`

- Uji 2 pemain di satu HP: buka dua tab. Pakai satu tab biasa dan satu tab samaran supaya namanya bisa berbeda.
- Uji dengan HP atau laptop lain di Wi-Fi yang sama: cari IP HP dengan `ifconfig` (cari `wlan0`, bagian `inet`), lalu buka `http://IP-ITU:3000` di perangkat lain.
- Hentikan server dengan Ctrl+C.

## 2. Pasang di hosting supaya teman dari mana saja bisa ikut
Contoh memakai Render (gratis):
1. Buat akun GitHub, buat repository baru, lalu unggah `server.js`, `package.json`, dan folder `public`.
2. Buat akun di render.com, pilih New > Web Service, sambungkan repository tadi.
3. Isi: Runtime = Node, Build Command = (kosongkan atau `npm install`), Start Command = `node server.js`, Instance = Free.
4. Setelah selesai, kamu dapat alamat seperti `https://nama-kamu.onrender.com`. Bagikan alamat itu ke teman.

Catatan hosting gratis:
- Server tidur kalau 15 menit tidak ada yang buka. Pembukaan pertama bisa menunggu 30 sampai 60 detik.
- Room disimpan di memori. Kalau server tidur atau restart, room yang sedang berjalan hilang.
- Alternatif lain: Railway, Fly.io, Koyeb, atau VPS biasa. Semuanya cukup menjalankan `node server.js`.

## 3. Cara mabar
1. Kamu dan teman membuka alamat yang sama, lalu daftar nama di lobi.
2. Buka game yang sama, pilih **Mabar online**.
3. Satu orang menekan **Buat room**, lalu mengirim kode 5 huruf ke temannya.
4. Teman memasukkan kode itu, lalu menekan **Gabung**.

Game yang sudah bisa mabar (bertanda "Main + Mabar" di lobi): Battleship, Tic-Tac-Toe, Connect Four, Othello.
Tombol emoji saat mabar dikirim ke temanmu, bukan ke komputer.

## Pengaturan dan pemberitahuan
- Tombol gir (pojok kanan atas) membuka pengaturan dengan saklar kapsul: Efek suara, Musik (Battleship dan lobi), dan Tombol emoji. Di lobi, gir juga berisi Ganti nama. Pilihan tersimpan di browser.
- Saat mabar, kalau temanmu menutup tab, memutus koneksi, atau keluar, muncul pemberitahuan di bagian atas layar. Kalau itu terjadi di tengah game, kamu otomatis menang.
- Tombol keluar atau menyerah di tengah game (Tic-Tac-Toe, Connect Four, Othello, Battleship) dihitung kalah.

## Batas dan keamanan
- Tidak ada login. Siapa pun yang tahu kode room bisa masuk, jadi jangan taruh data pribadi di nama.
- Maksimal 500 room sekaligus, pesan maksimal 16 KB, maksimal 40 pesan per detik per pemain.
- Pemain yang terputus lebih dari 60 detik dikeluarkan dari room. Koneksi yang putus sebentar tersambung lagi sendiri.
- Room dihapus otomatis setelah 6 jam.
