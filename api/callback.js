export default async function handler(req, res) {
    const code = req.query.code || null;
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
    
    if (!client_id || !client_secret) {
        return res.status(400).send("SPOTIFY_CLIENT_ID atau SPOTIFY_CLIENT_SECRET belum diatur di Vercel!");
    }

    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    const redirect_uri = `${protocol}://${host}/api/callback`;

    if (!code) {
        return res.status(400).send('Kode otorisasi tidak ditemukan dari Spotify.');
    }

    const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
    
    try {
        const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                Authorization: `Basic ${basic}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            })
        });

        const data = await tokenRes.json();
        
        if (data.refresh_token) {
            res.send(`
                <div style="font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <h1 style="color: #1DB954;">✅ Sukses!</h1>
                    <p>Ini adalah <b>Refresh Token</b> rahasia kamu:</p>
                    <textarea readonly rows="5" style="width: 100%; padding: 10px; font-family: monospace; font-size: 14px; margin-bottom: 20px;">${data.refresh_token}</textarea>
                    <p><b>Langkah Selanjutnya:</b></p>
                    <ol>
                        <li>Copy teks di dalam kotak di atas.</li>
                        <li>Buka dashboard Vercel project ini > Settings > Environment Variables.</li>
                        <li>Buat variabel baru bernama <code>SPOTIFY_REFRESH_TOKEN</code> dan paste teks tersebut sebagai nilainya.</li>
                        <li>Simpan (Save), lalu lakukan <b>Redeploy</b> project kamu di Vercel.</li>
                        <li>Selesai! Widget Now Playing di aplikasimu akan berjalan otomatis.</li>
                    </ol>
                </div>
            `);
        } else {
            res.status(400).send('Gagal mendapatkan refresh token. Respon dari Spotify: ' + JSON.stringify(data));
        }
    } catch (err) {
        res.status(500).send('Terjadi error: ' + err.message);
    }
}
