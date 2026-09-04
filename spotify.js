/* ========================================
   JSong Lyrics — Spotify Integration
   (Fetching public profile via Vercel API)
   ======================================== */

(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);
    const userProfile = $('#spotify-user');
    const userAvatar = $('#spotify-avatar');
    const userName = $('#spotify-name');
    
    const widget = $('#spotify-now-playing');
    const cover = $('#sp-cover');
    const title = $('#sp-title');
    const artist = $('#sp-artist');

    async function fetchSpotifyData() {
        try {
            // Memanggil Vercel Serverless Function
            const res = await fetch('/api/spotify');
            
            if (!res.ok) {
                console.warn('Spotify API belum dikonfigurasi atau sedang error.');
                return;
            }

            const data = await res.json();
            
            // 1. Tampilkan Profil
            if (data.profile) {
                userProfile.style.display = 'flex';
                userName.textContent = data.profile.name || 'Spotify User';
                if (data.profile.avatarUrl) {
                    userAvatar.src = data.profile.avatarUrl;
                } else {
                    userAvatar.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%231DB954"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>';
                }
            }

            // 2. Tampilkan Now Playing
            if (data.track) {
                widget.classList.add('show');
                title.textContent = data.track.title;
                artist.textContent = data.track.artist;
                cover.src = data.track.albumImageUrl;

                if (data.isPlaying) {
                    $('.sp-equalizer').style.display = 'flex';
                } else {
                    $('.sp-equalizer').style.display = 'none'; // pause equalizer jika musik dijeda
                }
            } else {
                widget.classList.remove('show');
            }

        } catch (err) {
            console.error('Error fetching Spotify API:', err);
        }
    }

    // ── Start ──
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            fetchSpotifyData();
            setInterval(fetchSpotifyData, 10000); // Polling tiap 10 detik
        });
    } else {
        fetchSpotifyData();
        setInterval(fetchSpotifyData, 10000);
    }

})();
