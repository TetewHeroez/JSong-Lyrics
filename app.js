/* ========================================
   JSong Lyrics — Application Logic
   ======================================== */

(function () {
    'use strict';

    // ── State ──
    let SONGS_LIST = [];
    let SONGS_CACHE = {};
    let currentSongId = null;
    let showAllFurigana = false;
    let showTranslation = false;

    // ── DOM References ──
    const $ = (sel) => document.querySelector(sel);
    const songList = $('#song-list');
    const lyricsContainer = $('#lyrics-container');
    const welcomeScreen = $('#welcome-screen');
    const songTitle = $('#song-title');
    const songArtist = $('#song-artist');
    const toggleFuriganaBtn = $('#toggle-furigana');
    const toggleTranslationBtn = $('#toggle-translation');
    const sidebar = $('#sidebar');
    const sidebarOverlay = $('#sidebar-overlay');
    const menuBtn = $('#menu-btn');
    const sidebarClose = $('#sidebar-close');
    const fontSlider = $('#font-size-slider');
    const spotifyEmbedContainer = $('#spotify-embed-container');
    const spotifyIframe = $('#spotify-iframe');
    const youtubeIframe = $('#youtube-iframe');

    // ── Initialization ──
    async function init() {
        bindEvents();
        try {
            const res = await fetch('index.json');
            if (!res.ok) throw new Error("Gagal mengambil index lagu");
            SONGS_LIST = await res.json();
            // Auto-load saved song or first song
            const savedSongId = localStorage.getItem('jsong_current_song');
            if (savedSongId && SONGS_LIST.some(s => s.id === savedSongId)) {
                loadSong(savedSongId);
            } else if (SONGS_LIST.length > 0) {
                loadSong(SONGS_LIST[0].id);
            }
        } catch (e) {
            console.error('Failed to load song index:', e);
            songList.innerHTML = '<div style="padding: 10px; color: var(--text-secondary);">Gagal memuat daftar lagu. Pastikan jalankan via Live Server.</div>';
        }
    }

    // ── Song List ──
    function renderSongList() {
        // preserve current scroll if it exists, otherwise use localstorage
        let currentScroll = songList.scrollTop;
        if (currentScroll === 0) {
            const savedSidebarScroll = localStorage.getItem('jsong_sidebar_scroll');
            if (savedSidebarScroll) {
                currentScroll = parseInt(savedSidebarScroll, 10);
            }
        }

        songList.innerHTML = SONGS_LIST.map(song => `
            <button class="song-item ${song.id === currentSongId ? 'active' : ''}"
                    data-id="${song.id}"
                    id="song-btn-${song.id}">
                <span class="song-item-title">${song.title}</span>
                <span class="song-item-artist">${song.artist}</span>
            </button>
        `).join('');

        requestAnimationFrame(() => {
            songList.scrollTop = currentScroll;
        });
    }

    // ── Load & Render Song ──
    async function loadSong(songId) {
        const songMeta = SONGS_LIST.find(s => s.id === songId);
        if (!songMeta) return;

        let song = SONGS_CACHE[songId];
        
        if (!song) {
            // Tampilkan loading kalau perlu
            lyricsContainer.innerHTML = '<div style="text-align: center; margin-top: 40px; color: var(--text-secondary);">Memuat lirik...</div>';
            
            try {
                const res = await fetch(songMeta.file);
                song = await res.json();
                SONGS_CACHE[songId] = song;
            } catch (e) {
                console.error('Failed to load song data:', e);
                lyricsContainer.innerHTML = '<div style="text-align: center; margin-top: 40px; color: #ec4899;">Gagal memuat lirik.</div>';
                return;
            }
        }
        currentSongId = songId;
        localStorage.setItem('jsong_current_song', songId);
        songTitle.textContent = song.title;
        songArtist.textContent = song.artist;

        // Update Embed Iframe
        if (songMeta.spotifyId) {
            spotifyIframe.src = `https://open.spotify.com/embed/track/${songMeta.spotifyId}?utm_source=generator`;
            spotifyIframe.style.display = 'block';
            if (youtubeIframe) {
                youtubeIframe.style.display = 'none';
                youtubeIframe.src = '';
            }
            spotifyEmbedContainer.style.display = 'block';
        } else if (songMeta.youtubeId) {
            if (youtubeIframe) {
                youtubeIframe.src = `https://www.youtube.com/embed/${songMeta.youtubeId}`;
                youtubeIframe.style.display = 'block';
            }
            spotifyIframe.style.display = 'none';
            spotifyIframe.src = '';
            spotifyEmbedContainer.style.display = 'block';
        } else {
            spotifyEmbedContainer.style.display = 'none';
            spotifyIframe.src = '';
            if (youtubeIframe) youtubeIframe.src = '';
        }

        // Update Track Stats
        const songStatsList = document.getElementById('song-stats-list');
        if (songStatsList && songMeta.stats) {
            const min = Math.floor(songMeta.stats.durationMs / 60000);
            const sec = Math.floor((songMeta.stats.durationMs % 60000) / 1000).toString().padStart(2, '0');
            
            songStatsList.innerHTML = `
                <div class="stat-row">
                    <span class="stat-label">Album</span>
                    <span class="stat-val">${escapeHtml(songMeta.stats.album)}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Rilis</span>
                    <span class="stat-val">${escapeHtml(songMeta.stats.releaseDate)}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Durasi</span>
                    <span class="stat-val">${min}:${sec}</span>
                </div>
            `;
            document.getElementById('song-stats-container').style.display = 'block';
        } else if (songStatsList) {
            document.getElementById('song-stats-container').style.display = 'none';
        }

        // Reset per-word furigana states when switching songs
        // (global toggle state persists across songs)

        welcomeScreen.style.display = 'none';
        renderLyrics(song);
        renderSongList();
        closeSidebar();

        // Restore scroll position or scroll to top
        const savedScroll = localStorage.getItem(`jsong_scroll_${songId}`);
        if (savedScroll) {
            // Need a slight delay to ensure DOM is fully painted before scrolling
            requestAnimationFrame(() => {
                lyricsContainer.scrollTop = parseInt(savedScroll, 10);
            });
        } else {
            lyricsContainer.scrollTop = 0;
        }
    }

    function renderLyrics(song) {
        const linesHtml = song.lines.map((line, li) => {
            if (line.empty) {
                return '<div class="lyrics-line lyrics-empty"></div>';
            }

            const segHtml = line.segments.map((seg, si) => {
                if (seg.ruby) {
                    // Kanji with furigana — clickable
                    return `<span class="word" data-l="${li}" data-s="${si}" tabindex="0">`
                        + `<span class="reading">${seg.ruby}</span>`
                        + `<span class="base">${escapeHtml(seg.text)}</span>`
                        + `</span>`;
                }
                // Plain text (hiragana, katakana, punctuation)
                return `<span class="text">${escapeHtml(seg.text)}</span>`;
            }).join('');

            const transHtml = line.translation
                ? `<div class="translation">${escapeHtml(line.translation)}</div>`
                : '';

            return `<div class="lyrics-line">`
                + `<div class="japanese-line">${segHtml}</div>`
                + transHtml
                + `</div>`;
        }).join('');

        // Wrap in lyrics-wrapper for max-width centering
        lyricsContainer.innerHTML = `<div class="lyrics-wrapper">${linesHtml}</div>`;

        // Re-apply global toggle classes
        lyricsContainer.classList.toggle('show-all-furigana', showAllFurigana);
        lyricsContainer.classList.toggle('show-translation', showTranslation);
    }

    // ── Event Binding ──
    function bindEvents() {
        // Toggle all furigana
        toggleFuriganaBtn.addEventListener('click', () => {
            showAllFurigana = !showAllFurigana;
            lyricsContainer.classList.toggle('show-all-furigana', showAllFurigana);
            toggleFuriganaBtn.classList.toggle('active', showAllFurigana);
        });

        // Font size slider
        if (fontSlider) {
            fontSlider.addEventListener('input', (e) => {
                document.documentElement.style.setProperty('--font-scale', e.target.value);
            });
        }

        // Toggle translation
        toggleTranslationBtn.addEventListener('click', () => {
            showTranslation = !showTranslation;
            lyricsContainer.classList.toggle('show-translation', showTranslation);
            toggleTranslationBtn.classList.toggle('active', showTranslation);
        });

        // Per-word furigana toggle (event delegation)
        lyricsContainer.addEventListener('click', (e) => {
            const word = e.target.closest('.word');
            if (word) {
                word.classList.toggle('show-word-furigana');
            }
        });

        // Keyboard support for word toggle
        lyricsContainer.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                const word = e.target.closest('.word');
                if (word) {
                    e.preventDefault();
                    word.classList.toggle('show-word-furigana');
                }
            }
        });

        // Save scroll position for lyrics
        let scrollTimeout;
        lyricsContainer.addEventListener('scroll', () => {
            if (currentSongId) {
                // Debounce saving to localStorage to avoid performance hits
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    localStorage.setItem(`jsong_scroll_${currentSongId}`, lyricsContainer.scrollTop);
                }, 100);
            }
        });

        // Save scroll position for sidebar
        let sidebarScrollTimeout;
        songList.addEventListener('scroll', () => {
            clearTimeout(sidebarScrollTimeout);
            sidebarScrollTimeout = setTimeout(() => {
                localStorage.setItem('jsong_sidebar_scroll', songList.scrollTop);
            }, 100);
        });

        // Song list click
        songList.addEventListener('click', (e) => {
            const item = e.target.closest('.song-item');
            if (item) loadSong(item.dataset.id);
        });



        // Sidebar
        menuBtn.addEventListener('click', openSidebar);
        sidebarClose.addEventListener('click', closeSidebar);
        sidebarOverlay.addEventListener('click', closeSidebar);

        // Keyboard shortcut: Escape to close sidebar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeSidebar();
            }
        });
    }

    // ── Sidebar Helpers ──
    function openSidebar() {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('open');
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('open');
    }

    // ── Utilities ──
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ── Start ──
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
