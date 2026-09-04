export default function handler(req, res) {
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    
    if (!client_id) {
        return res.status(400).send("Variabel SPOTIFY_CLIENT_ID belum di-setting di Vercel!");
    }

    // Ambil host otomatis (mendukung vercel app url)
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    const redirect_uri = `${protocol}://${host}/api/callback`;
    
    const scopes = 'user-read-private user-read-email user-read-currently-playing';
    
    const params = new URLSearchParams({
        response_type: 'code',
        client_id,
        scope: scopes,
        redirect_uri,
    });
    
    res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
}
