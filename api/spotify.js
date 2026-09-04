export default async function handler(req, res) {
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
    const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;

    if (!client_id || !client_secret || !refresh_token) {
        return res.status(500).json({ error: 'Missing Spotify Environment Variables' });
    }

    const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
    const TOKEN_ENDPOINT = `https://accounts.spotify.com/api/token`;

    try {
        // 1. Dapatkan Access Token baru menggunakan Refresh Token
        const tokenResponse = await fetch(TOKEN_ENDPOINT, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${basic}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token,
            }),
        });

        const tokenData = await tokenResponse.json();
        
        if (!tokenResponse.ok) {
            return res.status(500).json({ error: 'Failed to get access token', details: tokenData });
        }

        const access_token = tokenData.access_token;

        // 2. Ambil data Profil
        const profileResponse = await fetch('https://api.spotify.com/v1/me', {
            headers: { Authorization: `Bearer ${access_token}` },
        });
        const profileData = await profileResponse.json();

        // 3. Ambil data Now Playing
        const nowPlayingResponse = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        let isPlaying = false;
        let track = null;

        if (nowPlayingResponse.status === 200) {
            const nowPlayingData = await nowPlayingResponse.json();
            if (nowPlayingData.item) {
                isPlaying = nowPlayingData.is_playing;
                track = {
                    title: nowPlayingData.item.name,
                    artist: nowPlayingData.item.artists.map((a) => a.name).join(', '),
                    albumImageUrl: nowPlayingData.item.album.images[0]?.url,
                    songUrl: nowPlayingData.item.external_urls.spotify
                };
            }
        }

        // 4. Kirim respons ke frontend
        // Set Cache-Control header supaya Vercel tidak menyajikan data basi terlalu lama
        res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate=5');
        
        return res.status(200).json({
            profile: {
                name: profileData.display_name,
                avatarUrl: profileData.images?.[0]?.url || ''
            },
            isPlaying,
            track
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
