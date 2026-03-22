/* ============================================
   BLACK ANCESTRAL ORIGINS — Core Application
   Navigation, Routing, Initialization
   ============================================ */

/* ============================================
   ELEVENLABS TTS — Staged for activation
   Set ELEVENLABS_API_KEY to enable real voice
   Falls back to browser speechSynthesis if empty
   ============================================ */
const ELEVENLABS_API_KEY = "";
const ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

const BAO_ElevenLabs = {
    currentAudio: null,
    isPlaying: false,

    isEnabled: function() {
        return ELEVENLABS_API_KEY && ELEVENLABS_API_KEY.length > 10;
    },

    playClip: async function(text, onStart, onEnd) {
        if (!this.isEnabled()) {
            console.warn('[BAO-11Labs] API key missing — using browser TTS fallback');
            return false;
        }

        this.stop();

        try {
            if (onStart) onStart();
            this.isPlaying = true;

            var response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + ELEVENLABS_VOICE_ID, {
                method: 'POST',
                headers: {
                    'xi-api-key': ELEVENLABS_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    model_id: 'eleven_monolingual_v1',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.7
                    }
                })
            });

            if (!response.ok) {
                console.error('[BAO-11Labs] API error:', response.status);
                this.isPlaying = false;
                if (onEnd) onEnd();
                return false;
            }

            var audioBlob = await response.blob();
            var audioUrl = URL.createObjectURL(audioBlob);
            var audio = new Audio(audioUrl);

            this.currentAudio = audio;

            audio.onended = function() {
                URL.revokeObjectURL(audioUrl);
                BAO_ElevenLabs.currentAudio = null;
                BAO_ElevenLabs.isPlaying = false;
                if (onEnd) onEnd();
            };

            audio.onerror = function(e) {
                console.error('[BAO-11Labs] Playback error:', e);
                URL.revokeObjectURL(audioUrl);
                BAO_ElevenLabs.currentAudio = null;
                BAO_ElevenLabs.isPlaying = false;
                if (onEnd) onEnd();
            };

            await audio.play();
            return true;

        } catch (error) {
            console.error('[BAO-11Labs] Error:', error);
            this.isPlaying = false;
            if (onEnd) onEnd();
            return false;
        }
    },

    stop: function() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
        this.isPlaying = false;
    }
};

/* ============================================
   SMART RESOURCE RANKING — Scoring & Badges
   ============================================ */
const BAO_ResourceRank = {
    getScore: function(r) {
        var score = 0;
        var st = r.sourceType || '';
        if (st === 'government') score += 50;
        else if (st === 'academic') score += 40;
        else if (st === 'nonprofit') score += 30;
        else if (st === 'dna_company') score += 20;
        if (r.verified === true) score += 25;
        score += (r.priority || 0) * 10;
        return score;
    },

    getBadge: function(sourceType) {
        if (sourceType === 'government') return '\uD83C\uDFDB\uFE0F Government';
        if (sourceType === 'academic') return '\uD83D\uDCDA Academic';
        if (sourceType === 'dna_company') return '\uD83E\uDDEC DNA Service';
        if (sourceType === 'nonprofit') return '\uD83C\uDF0D Research';
        return '';
    },

    getBadgeClass: function(sourceType) {
        if (sourceType === 'government') return 'rank-govt';
        if (sourceType === 'academic') return 'rank-academic';
        if (sourceType === 'dna_company') return 'rank-dna';
        if (sourceType === 'nonprofit') return 'rank-nonprofit';
        return '';
    },

    getRanked: function(category, limit) {
        var resources = (BAO_DATA.resources || []).filter(function(r) { return r.category === category; });
        var scored = resources.map(function(r) {
            var copy = {};
            for (var k in r) copy[k] = r[k];
            copy._score = BAO_ResourceRank.getScore(r);
            return copy;
        });
        scored.sort(function(a, b) { return b._score - a._score; });
        return limit ? scored.slice(0, limit) : scored;
    }
};

const BAO_App = {

    currentPage: 'home',

    pageNames: {
        'home': 'Home',
        'getting-started': 'Getting Started',
        'family-tree': 'Family Tree',
        'ancestor-profiles': 'Ancestor Profiles',
        'dawes-rolls': 'Dawes Rolls',
        'freedmen-records': 'Freedmen Records',
        'slave-schedules': 'Tribal Census Records',
        'land-allotments': 'Land Allotments',
        'dna-heritage': 'DNA & Heritage',
        'migration-routes': 'Freedmen Migration Routes',
        'historical-timeline': 'Historical Timeline',
        'name-origins': 'Name Origins',
        'document-vault': 'Document Vault',
        'photo-gallery': 'Historical Archive',
        'oral-histories': 'Oral Histories',
        'community': 'Community',
        'resources': 'Resource Library',
        'video-learning': 'Video Learning Center',
        'settings': 'Settings',
        'disclaimers': 'Disclaimers',
        'about-project': 'Portfolio & Project Overview',
    },

    _splashDismissed: false,

    dismissSplash() {
        if (this._splashDismissed) return;
        this._splashDismissed = true;
        const splash = document.getElementById('splash-screen');
        if (!splash) return;
        splash.classList.add('fade-out');
        // Remove from DOM after the CSS transition completes
        setTimeout(() => {
            if (splash.parentNode) splash.parentNode.removeChild(splash);
        }, 700);
    },

    init() {
        // ====== SPLASH SCREEN — robust dismissal ======
        // 1. Auto-dismiss after 3 seconds (smooth fade)
        const splashTimer = setTimeout(() => { this.dismissSplash(); }, 3000);

        // 2. Tap/click to skip immediately
        const splash = document.getElementById('splash-screen');
        if (splash) {
            const skipHandler = (e) => {
                e.preventDefault();
                clearTimeout(splashTimer);
                this.dismissSplash();
            };
            splash.addEventListener('click', skipHandler, { once: true });
            splash.addEventListener('touchstart', skipHandler, { once: true, passive: false });
        }

        // 2b. Fix baked-in checkered background by replacing light pixels with black
        var portraitDiv = document.querySelector('.splash-portrait');
        if (portraitDiv) {
            var bgImg = new Image();
            bgImg.crossOrigin = 'anonymous';
            bgImg.onload = function() {
                var cvs = document.createElement('canvas');
                cvs.width = bgImg.naturalWidth;
                cvs.height = bgImg.naturalHeight;
                var ctx = cvs.getContext('2d');
                // Fill black first, then draw image on top
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, cvs.width, cvs.height);
                ctx.drawImage(bgImg, 0, 0);
                // Now replace checkered pixels: any pixel where R>180 && G>180 && B>180 → make black
                var imgData = ctx.getImageData(0, 0, cvs.width, cvs.height);
                var d = imgData.data;
                for (var i = 0; i < d.length; i += 4) {
                    if (d[i] > 180 && d[i+1] > 180 && d[i+2] > 180) {
                        d[i] = 0; d[i+1] = 0; d[i+2] = 0; d[i+3] = 255;
                    }
                }
                ctx.putImageData(imgData, 0, 0);
                portraitDiv.style.backgroundImage = 'url(' + cvs.toDataURL('image/png') + ')';
            };
            bgImg.onerror = function() {
                // If CORS fails, keep the original — black bg still behind it
            };
            var currentBg = getComputedStyle(portraitDiv).backgroundImage;
            var urlMatch = currentBg.match(/url\(["']?(.+?)["']?\)/);
            if (urlMatch) bgImg.src = urlMatch[1];
        }

        // 3. Absolute fail-safe: force-remove at 5 seconds no matter what
        setTimeout(() => {
            const s = document.getElementById('splash-screen');
            if (s) {
                s.style.cssText = 'display:none !important;';
                if (s.parentNode) s.parentNode.removeChild(s);
                this._splashDismissed = true;
            }
        }, 5000);

        this.setupNavigation();
        this.setupSearch();
        this.setupNotifications();
        this.setupModal();
        this.loadProfile();

        // Handle hash routing
        const hash = window.location.hash.replace('#', '');
        if (hash && this.pageNames[hash]) {
            this.navigate(hash, false);
        } else {
            this.navigate('home', false);
        }

        // Hash change listener
        window.addEventListener('hashchange', () => {
            const h = window.location.hash.replace('#', '');
            if (h && this.pageNames[h] && h !== this.currentPage) {
                this.navigate(h, false);
            }
        });
    },

    setupNavigation() {
        const menuBtn = document.getElementById('menu-btn');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        const closeBtn = document.getElementById('sidebar-close');

        const openSidebar = () => {
            sidebar.classList.add('open');
            overlay.classList.add('active');
        };
        const closeSidebar = () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        };

        menuBtn?.addEventListener('click', openSidebar);
        overlay?.addEventListener('click', closeSidebar);
        closeBtn?.addEventListener('click', closeSidebar);

        // Nav item clicks
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                if (page) {
                    this.navigate(page);
                    closeSidebar();
                }
            });
        });
    },

    setupSearch() {
        const searchBtn = document.getElementById('global-search-btn');
        const searchOverlay = document.getElementById('search-overlay');
        const searchInput = document.getElementById('global-search-input');
        const searchClose = document.getElementById('search-close');
        const searchResults = document.getElementById('search-results');

        searchBtn?.addEventListener('click', () => {
            searchOverlay.classList.remove('hidden');
            searchInput.focus();
        });

        searchClose?.addEventListener('click', () => {
            searchOverlay.classList.add('hidden');
            searchInput.value = '';
            searchResults.innerHTML = '';
        });

        searchOverlay?.addEventListener('click', (e) => {
            if (e.target === searchOverlay) {
                searchOverlay.classList.add('hidden');
                searchInput.value = '';
                searchResults.innerHTML = '';
            }
        });

        const doSearch = BAO_Utils.debounce(() => {
            const q = searchInput.value.trim();
            if (q.length < 2) {
                searchResults.innerHTML = '';
                return;
            }
            const results = BAO_Utils.search.searchAll(q);
            if (results.length === 0) {
                searchResults.innerHTML = '<div class="search-result-item"><div class="search-result-title" style="color:var(--text-muted)">No results found</div></div>';
                return;
            }
            // Group by type
            var groups = {};
            results.forEach(function(r) {
                if (!groups[r.type]) groups[r.type] = [];
                groups[r.type].push(r);
            });

            // Highlight helper
            var esc = function(s) { return (s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
            var hl = function(text) {
                if (!text) return '';
                var safe = esc(text);
                var re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
                return safe.replace(re, '<span style="color:#FFB830;font-weight:700;">$1</span>');
            };

            var typeIcons = { 'Dawes Roll': '📜', 'Freedmen Record': '📰', 'Land Allotment': '🌍', 'Timeline': '⏰', 'Name Origin': '📝', 'Resource': '🔗', 'My Ancestor': '👤', 'Page': '📄', 'Photo': '📷', 'Community Post': '👥', 'Video Course': '🎬', 'Migration Route': '🗻', 'Oral History': '🎤', 'Tribal Census Record': '📖' };

            var html = '';
            Object.keys(groups).forEach(function(type) {
                html += '<div style="padding:6px 12px;font-size:0.7rem;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid var(--border-color);background:rgba(255,184,48,0.04);">' + (typeIcons[type] || '📋') + ' ' + type + ' (' + groups[type].length + ')</div>';
                groups[type].forEach(function(r) {
                    html += '<div class="search-result-item" onclick="BAO_App.navigate(\'' + r.page + '\');document.getElementById(\'search-overlay\').classList.add(\'hidden\');document.getElementById(\'global-search-input\').value=\'\'">' +
                        '<div class="search-result-title">' + hl(r.title) + '</div>' +
                        '<div class="search-result-desc">' + hl(r.desc) + '</div>' +
                    '</div>';
                });
            });
            searchResults.innerHTML = html;
        }, 200);

        searchInput?.addEventListener('input', doSearch);

        // Escape key closes search
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchOverlay?.classList.add('hidden');
                document.getElementById('notification-panel')?.classList.add('hidden');
                BAO_Utils.modal.hide();
            }
        });
    },

    setupNotifications() {
        const btn = document.getElementById('notification-btn');
        const panel = document.getElementById('notification-panel');
        const notifList = document.getElementById('notif-list');
        const clearBtn = document.getElementById('notif-clear');
        const badge = document.getElementById('notif-badge');

        // Populate notifications
        const renderNotifs = () => {
            notifList.innerHTML = BAO_DATA.notifications.length === 0
                ? '<div style="padding:20px;text-align:center;color:var(--text-muted)">No notifications</div>'
                : BAO_DATA.notifications.map(n => `
                    <div class="notif-item" onclick="BAO_App.handleNotifClick('${n.page || ''}','${n.id}')" style="cursor:pointer">
                        <div style="display:flex;align-items:center;gap:8px">
                            <span style="font-size:1.1rem">${n.type === 'match' ? '🔍' : n.type === 'community' ? '💬' : '💡'}</span>
                            <div class="notif-item-title">${n.title}</div>
                        </div>
                        <div class="notif-item-desc">${n.description}</div>
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
                            <div class="notif-item-time">${n.time}</div>
                            <span style="font-size:0.7rem;color:var(--accent);font-weight:600">Tap to view ›</span>
                        </div>
                    </div>
                `).join('');
            badge.textContent = BAO_DATA.notifications.length;
            badge.style.display = BAO_DATA.notifications.length > 0 ? 'flex' : 'none';
        };

        renderNotifs();

        btn?.addEventListener('click', (e) => {
            e.stopPropagation();
            panel.classList.toggle('hidden');
        });

        clearBtn?.addEventListener('click', () => {
            BAO_DATA.notifications = [];
            renderNotifs();
        });

        document.addEventListener('click', (e) => {
            if (!panel?.contains(e.target) && e.target !== btn) {
                panel?.classList.add('hidden');
            }
        });
    },

    handleNotifClick(page, notifId) {
        // Close notification panel
        document.getElementById('notification-panel')?.classList.add('hidden');
        // Navigate to the relevant page
        if (page) {
            this.navigate(page);
        }
        // Remove the clicked notification
        BAO_DATA.notifications = BAO_DATA.notifications.filter(n => n.id !== notifId);
        // Update badge count
        var badge = document.getElementById('notif-badge');
        if (badge) {
            badge.textContent = BAO_DATA.notifications.length;
            badge.style.display = BAO_DATA.notifications.length > 0 ? 'flex' : 'none';
        }
    },

    setupModal() {
        const overlay = document.getElementById('modal-overlay');
        const closeBtn = document.getElementById('modal-close');

        closeBtn?.addEventListener('click', () => BAO_Utils.modal.hide());
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) BAO_Utils.modal.hide();
        });
    },

    loadProfile() {
        const profile = BAO_Utils.profile.getProfile();
        const nameEl = document.getElementById('user-display-name');
        const avatarEl = document.getElementById('user-avatar');
        if (nameEl) nameEl.textContent = profile.name;
        if (avatarEl) avatarEl.textContent = BAO_Utils.profile.getInitials(profile.name);
    },

    _navHistory: [],

    navigate(page, updateHash = true) {
        if (!this.pageNames[page]) return;

        // Track history for back button
        if (this.currentPage && this.currentPage !== page) {
            if (!this._navHistory) this._navHistory = [];
            this._navHistory.push(this.currentPage);
            if (this._navHistory.length > 20) this._navHistory.shift();
        }

        // Stop any active speech when navigating away
        if (typeof BAO_TTS !== 'undefined' && BAO_TTS.isPlaying) {
            BAO_TTS.stop();
        }
        // Stop ElevenLabs audio if playing
        if (typeof BAO_ElevenLabs !== 'undefined') {
            BAO_ElevenLabs.stop();
        }
        // Stop audio file player and TTS fallback
        if (typeof BAO_Pages !== 'undefined') {
            if (typeof BAO_Pages._stopAudioPlayer === 'function') BAO_Pages._stopAudioPlayer();
            if (typeof BAO_Pages._stopTTSFallback === 'function') BAO_Pages._stopTTSFallback();
        }
        // Close video modal if open
        if (typeof BAO_Pages !== 'undefined' && typeof BAO_Pages.closeVideoModal === 'function') {
            BAO_Pages.closeVideoModal();
        }
        // Also stop VLC slideshow speech
        if (typeof BAO_Pages !== 'undefined' && typeof BAO_Pages.stopSlideSpeech === 'function') {
            BAO_Pages.stopSlideSpeech();
        }

        // Sync global appState
        if (typeof appState !== 'undefined') appState.currentPage = page;

        this.currentPage = page;

        // Update hash
        if (updateHash) {
            window.location.hash = page;
        }

        // Update sidebar nav active state
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Update bottom nav active state
        const bottomNavMap = {
            'home': 'home',
            'getting-started': 'home',
            'family-tree': 'family-tree',
            'ancestor-profiles': 'family-tree',
            'dawes-rolls': 'dawes-rolls',
            'freedmen-records': 'dawes-rolls',
            'slave-schedules': 'dawes-rolls',
            'land-allotments': 'dawes-rolls',
            'dna-heritage': 'historical-timeline',
            'migration-routes': 'historical-timeline',
            'historical-timeline': 'historical-timeline',
            'name-origins': 'historical-timeline',
            'document-vault': 'community',
            'photo-gallery': 'community',
            'oral-histories': 'community',
            'community': 'community',
            'resources': 'community',
            'video-learning': 'community',
            'settings': 'settings',
            'about-project': 'settings',
            'disclaimers': 'settings',
        };
        const activeBottomTab = bottomNavMap[page] || 'home';
        document.querySelectorAll('.bottom-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === activeBottomTab);
        });

        // Update page title
        const titleEl = document.getElementById('page-title');
        if (titleEl) titleEl.textContent = this.pageNames[page];

        // Render page
        const container = document.getElementById('page-container');
        if (!container) return;

        const pageFn = BAO_Pages[page] || BAO_Pages[page.replace(/-/g, '')];
        if (pageFn) {
            container.innerHTML = pageFn.call(BAO_Pages);
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">&#128679;</div>
                    <h3>Page Not Found</h3>
                    <p>The page "${page}" could not be loaded.</p>
                    <button class="btn btn-primary" style="margin-top:16px" onclick="BAO_App.navigate('home')">Go Home</button>
                </div>
            `;
        }

        // Inject educational tip banner
        this.injectTipBanner(container);
        this.injectDisclaimer(container);

        // Scroll to top
        container.scrollTop = 0;
        window.scrollTo(0, 0);

        // Show/hide back button (hide on home)
        var backBtn = document.getElementById('back-btn');
        if (backBtn) backBtn.style.display = page === 'home' ? 'none' : 'flex';
    },

    goBack() {
        if (this._navHistory && this._navHistory.length > 0) {
            var prev = this._navHistory.pop();
            this.navigate(prev, true);
        } else if (window.history.length > 1) {
            window.history.back();
        } else {
            this.navigate('home');
        }
    },

    // ============== ROTATING EDUCATIONAL TIPS ==============
    _tipState: null,

    _getTipState() {
        if (this._tipState) return this._tipState;
        try {
            var saved = localStorage.getItem('bao_tip_state');
            if (saved) this._tipState = JSON.parse(saved);
        } catch(e) {}
        if (!this._tipState) {
            this._tipState = { shownIndices: [], currentIndex: -1, lastRotation: 0 };
        }
        return this._tipState;
    },

    _saveTipState() {
        try { localStorage.setItem('bao_tip_state', JSON.stringify(this._tipState)); } catch(e) {}
    },

    getNextTip() {
        var tips = (BAO_DATA.educationalTips || []);
        if (!tips.length) return null;
        var state = this._getTipState();
        var now = Date.now();
        var ROTATION_MS = 48 * 60 * 60 * 1000; // 48 hours

        // If enough time passed or no tip yet, rotate
        if (state.currentIndex < 0 || (now - state.lastRotation) >= ROTATION_MS) {
            // Find unshown tips
            var available = [];
            for (var i = 0; i < tips.length; i++) {
                if (state.shownIndices.indexOf(i) === -1) available.push(i);
            }
            // If all shown, reset cycle
            if (available.length === 0) {
                state.shownIndices = [];
                for (var j = 0; j < tips.length; j++) available.push(j);
            }
            // Pick random from available
            var pick = available[Math.floor(Math.random() * available.length)];
            state.currentIndex = pick;
            state.shownIndices.push(pick);
            state.lastRotation = now;
            this._saveTipState();
        }
        return tips[state.currentIndex] || null;
    },

    injectTipBanner(container) {
        var tip = this.getNextTip();
        if (!tip) return;
        var banner = document.createElement('div');
        banner.className = 'edu-tip-banner';
        banner.innerHTML = '<div class="edu-tip-icon">&#128161;</div><div class="edu-tip-text"><span class="edu-tip-label">Did You Know?</span> ' + tip + '</div><button class="edu-tip-close" onclick="this.parentElement.remove()" title="Dismiss">&times;</button>';
        container.insertBefore(banner, container.firstChild);
    },

    injectDisclaimer(container) {
        if (!container) return;
        var existing = container.querySelector('.bao-disclaimer');
        if (existing) existing.remove();
        var bar = document.createElement('div');
        bar.className = 'bao-disclaimer';
        bar.innerHTML = 'This application is a portfolio demonstration. Some data is simulated for educational purposes. Verified sources are included where applicable.';
        container.appendChild(bar);
    }
};

// ============== GLOBAL ZOOM SYSTEM ==============
var BAO_Zoom = {
    level: 1,
    min: 0.7,
    max: 1.8,
    step: 0.1,
    target: null,

    init: function() {
        // Load saved zoom
        try { this.level = parseFloat(localStorage.getItem('bao_zoom') || '1') || 1; } catch(e) { this.level = 1; }
        this.target = document.getElementById('main-content');

        // Create controls
        var controls = document.createElement('div');
        controls.id = 'bao-zoom-controls';
        controls.className = 'bao-zoom-controls';
        controls.innerHTML =
            '<button class="bao-zoom-btn" onclick="BAO_Zoom.zoomIn()" title="Zoom In">+</button>' +
            '<button class="bao-zoom-btn bao-zoom-label" onclick="BAO_Zoom.reset()" title="Reset Zoom" id="bao-zoom-pct">100%</button>' +
            '<button class="bao-zoom-btn" onclick="BAO_Zoom.zoomOut()" title="Zoom Out">&minus;</button>';
        document.body.appendChild(controls);

        this.apply();
    },

    zoomIn: function() {
        if (this.level < this.max) { this.level = Math.round((this.level + this.step) * 10) / 10; this.apply(); }
    },

    zoomOut: function() {
        if (this.level > this.min) { this.level = Math.round((this.level - this.step) * 10) / 10; this.apply(); }
    },

    reset: function() {
        this.level = 1;
        this.apply();
    },

    apply: function() {
        if (!this.target) this.target = document.getElementById('main-content');
        if (!this.target) return;

        if (this.level === 1) {
            this.target.style.transform = '';
            this.target.style.transformOrigin = '';
            this.target.style.width = '';
        } else {
            this.target.style.transform = 'scale(' + this.level + ')';
            this.target.style.transformOrigin = 'top left';
            this.target.style.width = (100 / this.level) + '%';
        }

        // Update label
        var label = document.getElementById('bao-zoom-pct');
        if (label) label.textContent = Math.round(this.level * 100) + '%';

        // Save preference
        try { localStorage.setItem('bao_zoom', String(this.level)); } catch(e) {}
    },

    // ========== IMAGE ZOOM (double-tap + scroll wheel) ==========
    initImageZoom: function() {
        // Delegate — works on dynamically added images too
        document.addEventListener('dblclick', function(e) {
            var img = e.target.closest('.pg-photo-thumb, .photo-thumb, .gallery-img, img[data-zoomable]');
            if (!img) return;
            e.preventDefault();
            BAO_Zoom._toggleImageZoom(img);
        });

        // Scroll-wheel zoom on images
        document.addEventListener('wheel', function(e) {
            var img = e.target.closest('.pg-photo-thumb, .photo-thumb, .gallery-img, img[data-zoomable]');
            if (!img) return;
            e.preventDefault();
            var scale = parseFloat(img.dataset.zoomScale || '1');
            scale += e.deltaY * -0.002;
            scale = Math.min(Math.max(1, scale), 4);
            img.dataset.zoomScale = String(scale);
            img.style.transform = 'scale(' + scale + ')';
            img.style.transformOrigin = 'center';
            if (scale === 1) { img.style.transform = ''; }
        }, { passive: false });
    },

    _toggleImageZoom: function(img) {
        var current = parseFloat(img.dataset.zoomScale || '1');
        var next = current > 1.5 ? 1 : 2.5;
        img.dataset.zoomScale = String(next);
        img.style.transition = 'transform 0.25s ease';
        img.style.transformOrigin = 'center';
        img.style.transform = next === 1 ? '' : 'scale(' + next + ')';
    },

    // ========== MAP ZOOM SYNC ==========
    mapZoom: null,

    syncMapZoom: function() {
        if (typeof BAO_MigrationMap !== 'undefined' && BAO_MigrationMap.map) {
            var self = this;
            BAO_MigrationMap.map.on('zoomend', function() {
                self.mapZoom = BAO_MigrationMap.map.getZoom();
            });
            this.mapZoom = BAO_MigrationMap.map.getZoom();
        }
    },

    setMapZoom: function(level) {
        if (typeof BAO_MigrationMap !== 'undefined' && BAO_MigrationMap.map) {
            BAO_MigrationMap.map.setZoom(level);
            this.mapZoom = level;
        }
    }
};

// ============== INITIALIZE ON DOM READY ==============
document.addEventListener('DOMContentLoaded', () => {
    BAO_App.init();
    BAO_Zoom.init();
    BAO_Zoom.initImageZoom();
});
