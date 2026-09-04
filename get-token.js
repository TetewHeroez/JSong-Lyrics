const http = require('http');
const fs = require('fs');
const path = require('path');

// 1. Baca file .env
const envPath = path.join(__dirname, '.env');
let clientId = '';
let clientSecret = '';

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const idMatch = envContent.match(/SPOTIFY_CLIENT_ID=(.+)/);
    const secretMatch = envContent.match(/SPOTIFY_CLIENT_SECRET=(.+)/);
    if (idMatch) clientId = idMatch[1].trim();
    if (secretMatch) clientSecret = secretMatch[1].trim();
}

if (!clientId || !clientSecret || clientSecret.includes('paste_rahasia_kamu')) {
    console.log("\n❌ ERROR: Pastikan SPOTIFY_CLIENT_ID dan SPOTIFY_CLIENT_SECRET sudah diisi dengan benar di file .env!");
    process.exit(1);
}

const REDIRECT_URI = 'http://127.0.0.1:8888/callback';
const SCOPES = 'user-read-private user-read-email user-read-currently-playing';

// 2. Buat URL Otorisasi
const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
});

const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;

console.log("\n========================================================");
console.log("LANGKAH 1: Buka Dashboard Spotify Developer, lalu");
console.log("tambahkan URL berikut ini ke kolom 'Redirect URIs':");
console.log("👉 " + REDIRECT_URI);
console.log("========================================================");
console.log("\nLANGKAH 2: Jika sudah di-Save, klik (Ctrl+Click) link di bawah ini");
console.log("untuk login dan mendapatkan izin dari akun Spotify-mu:");
console.log("\n👉 " + authUrl + "\n");
console.log("Menunggu otorisasi... (Jangan tutup terminal ini)");

// 3. Buat server lokal mini untuk menangkap balasan dari Spotify
const server = http.createServer(async (req, res) => {
    if (req.url.startsWith('/callback')) {
        const urlObj = new URL(req.url, `http://${req.headers.host}`);
        const code = urlObj.searchParams.get('code');

        if (!code) {
            res.writeHead(400);
            res.end("Kode otorisasi tidak ditemukan. Coba lagi.");
            return;
        }

        // 4. Tukarkan kode dengan Refresh Token
        const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        
        try {
            const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${basic}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    code: code,
                    redirect_uri: REDIRECT_URI,
                    grant_type: 'authorization_code'
                })
            });

            const data = await tokenRes.json();
            
            if (data.refresh_token) {
                // Tampilkan sukses di browser
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(`
                    <div style="font-family:sans-serif;text-align:center;margin-top:50px;">
                        <h1 style="color:#1DB954">✅ Otorisasi Berhasil!</h1>
                        <p>Silakan buka kembali Terminal VS Code kamu untuk melihat Refresh Token.</p>
                        <p>Tab browser ini boleh ditutup.</p>
                    </div>
                `);
                
                // Cetak hasil di terminal
                console.log("\n🎉 BERHASIL MENDAPATKAN REFRESH TOKEN!\n");
                console.log("Ini adalah Refresh Token kamu. COPY teks di bawah ini:\n");
                console.log(data.refresh_token);
                console.log("\n========================================================");
                console.log("Langkah Terakhir: Paste token tersebut ke baris ke-3 di file .env kamu!");
                
                server.close();
                process.exit(0);
            } else {
                res.writeHead(400);
                res.end("Gagal mendapatkan refresh token.");
                console.log("Gagal:", data);
                server.close();
                process.exit(1);
            }
        } catch (err) {
            res.writeHead(500);
            res.end("Terjadi error: " + err.message);
            console.error("Error:", err.message);
            server.close();
            process.exit(1);
        }
    }
});

server.listen(8888, '127.0.0.1');
