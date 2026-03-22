/* ============================================
   BLACK ANCESTRAL ORIGINS — Page Renderers
   All 18 pages
   ============================================ */

/* ============================================
   BAO_TTS — Global Text-to-Speech Controller
   ONE singleton. Survives re-renders. Full diagnostics.
   ============================================ */
var BAO_TTS = {
    // === State ===
    currentClipId: null,
    currentUtterance: null,
    currentChunks: [],
    currentChunkIndex: 0,
    isPlaying: false,
    isPaused: false,
    playbackToken: 0,
    watchdogTimer: null,
    resumeTimer: null,
    pollTimer: null,
    retryCount: 0,
    maxRetries: 2,
    lastEventTime: 0,
    startTime: 0,
    onDone: null,
    userActivated: false,
    visibilityBound: false,
    lastClickTime: 0,
    selectedVoice: null,
    voiceReady: false,

    // === Log storage — accessible via window.__baoTtsLogs ===
    logs: [],

    log: function(msg, data) {
        var elapsed = ((Date.now() - (this.startTime || Date.now())) / 1000).toFixed(2);
        var entry = '[BAO-TTS ' + elapsed + 's] ' + msg;
        if (data !== undefined) entry += ' | ' + JSON.stringify(data);
        this.logs.push(entry);
        window.__baoTtsLogs = this.logs;
        console.log(entry);
    },

    // === Chunking: 160-220 chars, sentence boundaries ===
    createChunks: function(text) {
        if (!text || !text.trim()) return [];
        var maxLen = 180;
        var chunks = [];
        // Split on sentence-ending punctuation followed by space
        var sentences = text.replace(/([.!?;:])\s+/g, '$1\x00').split('\x00');
        var current = '';
        for (var i = 0; i < sentences.length; i++) {
            var s = sentences[i].trim();
            if (!s) continue;
            if (current.length + s.length + 1 <= maxLen) {
                current += (current ? ' ' : '') + s;
            } else {
                if (current) chunks.push(current);
                if (s.length <= maxLen) {
                    current = s;
                } else {
                    // Break long sentence at comma
                    var parts = s.split(/,\s*/);
                    var piece = '';
                    for (var j = 0; j < parts.length; j++) {
                        if (piece.length + parts[j].length + 2 <= maxLen) {
                            piece += (piece ? ', ' : '') + parts[j];
                        } else {
                            if (piece) chunks.push(piece);
                            if (parts[j].length <= maxLen) {
                                piece = parts[j];
                            } else {
                                // Break at word boundaries
                                var words = parts[j].split(/\s+/);
                                var wb = '';
                                for (var w = 0; w < words.length; w++) {
                                    if (wb.length + words[w].length + 1 <= maxLen) {
                                        wb += (wb ? ' ' : '') + words[w];
                                    } else {
                                        if (wb) chunks.push(wb);
                                        wb = words[w];
                                    }
                                }
                                piece = wb;
                            }
                        }
                    }
                    current = piece;
                }
            }
        }
        if (current) chunks.push(current);
        return chunks;
    },

    // === Voice selection — prefer English, Google/Samsung ===
    getVoice: function() {
        if (this.selectedVoice) return this.selectedVoice;
        try {
            var voices = window.speechSynthesis.getVoices();
            if (!voices || voices.length === 0) return null;
            // Prefer: Google US English > Samsung > any local English > any English > first
            var pref = ['Google US English', 'Google UK English', 'Samsung', 'Microsoft'];
            for (var p = 0; p < pref.length; p++) {
                for (var v = 0; v < voices.length; v++) {
                    if (voices[v].name.indexOf(pref[p]) >= 0 && voices[v].lang.indexOf('en') === 0) {
                        this.selectedVoice = voices[v];
                        return this.selectedVoice;
                    }
                }
            }
            // Fallback: any local English voice
            var localEn = voices.find(function(v) { return v.lang.indexOf('en') === 0 && v.localService; });
            if (localEn) { this.selectedVoice = localEn; return localEn; }
            // Any English
            var anyEn = voices.find(function(v) { return v.lang.indexOf('en') === 0; });
            if (anyEn) { this.selectedVoice = anyEn; return anyEn; }
            this.selectedVoice = voices[0];
            return voices[0];
        } catch(e) { return null; }
    },

    // === Bind visibility/focus handlers (once) ===
    bindVisibility: function() {
        if (this.visibilityBound) return;
        this.visibilityBound = true;
        var self = this;

        document.addEventListener('visibilitychange', function() {
            if (!self.isPlaying) return;
            var vis = document.visibilityState;
            self.log('VISIBILITY', { state: vis, speaking: window.speechSynthesis.speaking });
            if (vis === 'visible') {
                setTimeout(function() { self.recoverIfInterrupted('visibility'); }, 400);
            }
        });

        window.addEventListener('focus', function() {
            if (!self.isPlaying) return;
            self.log('FOCUS', { speaking: window.speechSynthesis.speaking, paused: window.speechSynthesis.paused });
            setTimeout(function() { self.recoverIfInterrupted('focus'); }, 500);
        });

        window.addEventListener('blur', function() {
            if (self.isPlaying) {
                self.log('BLUR', { speaking: window.speechSynthesis.speaking });
                self.lastEventTime = Date.now();
            }
        });
    },

    // === Recovery: if speech died silently, replay current chunk ===
    recoverIfInterrupted: function(reason) {
        if (!this.isPlaying) return;
        if (window.speechSynthesis.speaking || window.speechSynthesis.paused) return;
        // Speech is not speaking and not paused — it died
        if (this.retryCount >= this.maxRetries) {
            this.log('RECOVERY_EXHAUSTED — skipping chunk', { reason: reason, retries: this.retryCount });
            this.retryCount = 0;
            this.currentChunkIndex++;
            this.speakChunk();
            return;
        }
        this.retryCount++;
        this.log('RECOVERY', { reason: reason, retry: this.retryCount, chunkIdx: this.currentChunkIndex });
        try { window.speechSynthesis.cancel(); } catch(e) {}
        var self = this;
        setTimeout(function() { self.speakChunk(); }, 250);
    },

    // === Main entry: play a clip ===
    playClip: function(clipId, text, onDone) {
        var self = this;
        var now = Date.now();

        // Debounce rapid clicks (<300ms)
        if (now - self.lastClickTime < 300) {
            self.log('DEBOUNCE — ignoring rapid click');
            return;
        }
        self.lastClickTime = now;

        // Same clip = toggle
        if (self.isPlaying && self.currentClipId === clipId) {
            self.log('TOGGLE_STOP', { clipId: clipId });
            self.stop();
            return;
        }

        // New clip — stop previous
        if (self.isPlaying) {
            self.log('STOP_PREVIOUS', { prevClip: self.currentClipId, newClip: clipId });
            self.cleanup();
        }

        if (!window.speechSynthesis) {
            self.log('ERROR: speechSynthesis not available');
            BAO_Utils.toast('\u26A0 Voice playback is not supported on this device', 'warning');
            if (onDone) onDone();
            return;
        }

        // Reset state
        self.logs = [];
        self.startTime = Date.now();
        window.__baoTtsLogs = self.logs;
        self.currentClipId = clipId;
        self.onDone = onDone || null;
        self.retryCount = 0;
        self.playbackToken++;
        var token = self.playbackToken;

        // Prime audio system from user gesture (Android/iOS)
        if (!self.userActivated) {
            try {
                var primer = new SpeechSynthesisUtterance('');
                primer.volume = 0;
                window.speechSynthesis.speak(primer);
                window.speechSynthesis.cancel();
                self.userActivated = true;
                self.log('PRIMER_FIRED');
            } catch(e) {}
        }

        // Validate text
        if (!text || !text.trim()) {
            self.log('ERROR: empty text');
            if (onDone) onDone();
            return;
        }

        // Create chunks
        self.currentChunks = self.createChunks(text);
        self.currentChunkIndex = 0;
        self.isPlaying = true;
        self.isPaused = false;

        self.log('PLAY_START', {
            clipId: clipId,
            textLen: text.length,
            first100: text.substring(0, 100),
            last100: text.substring(Math.max(0, text.length - 100)),
            totalChunks: self.currentChunks.length,
            chunkLens: self.currentChunks.map(function(c) { return c.length; }),
            ua: navigator.userAgent.substring(0, 100),
            visibility: document.visibilityState
        });

        // Bind visibility handlers once
        self.bindVisibility();

        // Wait for voices if needed
        var voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
            self.voiceReady = true;
            self.log('VOICES_READY', { count: voices.length, selected: (self.getVoice() || {}).name });
            self.speakChunk();
        } else {
            self.log('VOICES_LOADING');
            var loaded = false;
            var handler = function() {
                if (loaded) return;
                loaded = true;
                window.speechSynthesis.removeEventListener('voiceschanged', handler);
                self.voiceReady = true;
                var v = window.speechSynthesis.getVoices();
                self.log('VOICES_LOADED', { count: v.length, selected: (self.getVoice() || {}).name });
                if (self.playbackToken === token) self.speakChunk();
            };
            window.speechSynthesis.addEventListener('voiceschanged', handler);
            setTimeout(function() {
                if (!loaded) { loaded = true; self.log('VOICES_TIMEOUT'); if (self.playbackToken === token) self.speakChunk(); }
            }, 600);
        }
    },

    // === Speak one chunk by index ===
    speakChunk: function() {
        var self = this;
        var token = self.playbackToken;

        if (!self.isPlaying || self.currentChunkIndex >= self.currentChunks.length) {
            self.log('ALL_CHUNKS_DONE', { processed: self.currentChunkIndex, total: self.currentChunks.length });
            self.cleanup();
            if (self.onDone) { var cb = self.onDone; self.onDone = null; cb(); }
            return;
        }

        // Cancel stale state
        try { window.speechSynthesis.cancel(); } catch(e) {}

        var idx = self.currentChunkIndex;
        var chunk = self.currentChunks[idx];
        self.retryCount = 0;
        var chunkNum = idx + 1;
        var totalC = self.currentChunks.length;

        self.log('CHUNK_' + chunkNum + '/' + totalC + '_SPEAK', {
            len: chunk.length,
            text: chunk.substring(0, 60) + (chunk.length > 60 ? '...' : '')
        });

        var utt = new SpeechSynthesisUtterance(chunk);
        utt.rate = 0.92;
        utt.pitch = 1.0;
        utt.volume = 1.0;
        utt.lang = 'en-US';
        self.currentUtterance = utt;

        var voice = self.getVoice();
        if (voice) utt.voice = voice;

        var chunkDone = false;
        var chunkStartMs = 0;

        utt.onstart = function() {
            if (token !== self.playbackToken) return;
            chunkStartMs = Date.now();
            self.lastEventTime = chunkStartMs;
            self.log('CHUNK_' + chunkNum + '_STARTED', { atMs: chunkStartMs - self.startTime });
        };

        utt.onend = function() {
            if (token !== self.playbackToken || chunkDone) return;
            chunkDone = true;
            var dur = chunkStartMs ? ((Date.now() - chunkStartMs) / 1000).toFixed(2) : '?';
            self.log('CHUNK_' + chunkNum + '_ENDED', { duration: dur + 's' });
            self.lastEventTime = Date.now();
            self.clearTimers();
            self.currentChunkIndex++;
            setTimeout(function() { if (token === self.playbackToken) self.speakChunk(); }, 120);
        };

        utt.onpause = function() {
            if (token !== self.playbackToken) return;
            self.log('CHUNK_' + chunkNum + '_PAUSED');
            self.lastEventTime = Date.now();
        };

        utt.onresume = function() {
            if (token !== self.playbackToken) return;
            self.log('CHUNK_' + chunkNum + '_RESUMED');
            self.lastEventTime = Date.now();
        };

        utt.onerror = function(ev) {
            if (token !== self.playbackToken || chunkDone) return;
            chunkDone = true;
            var err = ev ? ev.error : 'unknown';
            var dur = chunkStartMs ? ((Date.now() - chunkStartMs) / 1000).toFixed(2) : '?';
            self.log('CHUNK_' + chunkNum + '_ERROR', { error: err, duration: dur + 's', visibility: document.visibilityState });
            self.lastEventTime = Date.now();
            self.clearTimers();

            if (err === 'interrupted') {
                // We caused this via cancel() — advance
                self.currentChunkIndex++;
                setTimeout(function() { if (token === self.playbackToken) self.speakChunk(); }, 120);
            } else if (err === 'not-allowed') {
                self.log('BLOCKED — needs user gesture');
                BAO_Utils.toast('\u26A0 Tap the speaker button to enable voice playback', 'warning');
                self.stop();
            } else if (self.retryCount < self.maxRetries) {
                self.retryCount++;
                self.log('RETRY_CHUNK', { err: err, attempt: self.retryCount });
                setTimeout(function() { if (token === self.playbackToken) self.speakChunk(); }, 350);
            } else {
                self.log('SKIP_CHUNK', { err: err, exhaustedRetries: true });
                self.retryCount = 0;
                self.currentChunkIndex++;
                setTimeout(function() { if (token === self.playbackToken) self.speakChunk(); }, 120);
            }
        };

        window.speechSynthesis.speak(utt);

        // === Chrome pause bug workaround: pulse every 3s ===
        self.clearTimers();
        self.resumeTimer = setInterval(function() {
            if (token !== self.playbackToken || !self.isPlaying) { self.clearTimers(); return; }
            try {
                if (window.speechSynthesis.paused) {
                    self.log('FORCE_RESUME (stuck pause)');
                    window.speechSynthesis.resume();
                } else if (window.speechSynthesis.speaking) {
                    window.speechSynthesis.pause();
                    setTimeout(function() { if (self.isPlaying) window.speechSynthesis.resume(); }, 60);
                }
            } catch(e) {}
        }, 3000);

        // === Polling watchdog: every 2s check if speech silently died ===
        self.pollTimer = setInterval(function() {
            if (token !== self.playbackToken || !self.isPlaying || chunkDone) { clearInterval(self.pollTimer); self.pollTimer = null; return; }
            var speaking = window.speechSynthesis.speaking;
            var paused = window.speechSynthesis.paused;
            if (!speaking && !paused && chunkStartMs > 0 && (Date.now() - chunkStartMs) > 1800) {
                self.log('WATCHDOG_DEAD', { chunk: chunkNum, silentMs: Date.now() - self.lastEventTime, vis: document.visibilityState });
                chunkDone = true;
                clearInterval(self.pollTimer); self.pollTimer = null;
                self.clearTimers();
                if (self.retryCount < self.maxRetries) {
                    self.retryCount++;
                    self.log('WATCHDOG_RETRY', { attempt: self.retryCount });
                    setTimeout(function() { if (token === self.playbackToken) self.speakChunk(); }, 300);
                } else {
                    self.log('WATCHDOG_SKIP');
                    self.retryCount = 0;
                    self.currentChunkIndex++;
                    setTimeout(function() { if (token === self.playbackToken) self.speakChunk(); }, 200);
                }
            }
            if (paused && chunkStartMs > 0) {
                self.log('WATCHDOG_FORCE_RESUME');
                try { window.speechSynthesis.resume(); } catch(e) {}
            }
        }, 2000);

        // === Hard timeout per chunk ===
        var hardMs = Math.max(chunk.length * 110, 5000) + 6000;
        self.watchdogTimer = setTimeout(function() {
            if (token !== self.playbackToken || chunkDone || !self.isPlaying) return;
            self.log('HARD_TIMEOUT', { chunk: chunkNum, ms: hardMs });
            chunkDone = true;
            self.clearTimers();
            try { window.speechSynthesis.cancel(); } catch(e) {}
            self.currentChunkIndex++;
            setTimeout(function() { if (token === self.playbackToken) self.speakChunk(); }, 200);
        }, hardMs);
    },

    // === Controls ===
    stop: function() {
        if (this.isPlaying) this.log('STOP');
        this.cleanup();
        if (this.onDone) { var cb = this.onDone; this.onDone = null; cb(); }
    },

    pause: function() {
        if (!this.isPlaying || this.isPaused) return;
        this.isPaused = true;
        this.log('PAUSE');
        try { window.speechSynthesis.pause(); } catch(e) {}
    },

    resume: function() {
        if (!this.isPlaying || !this.isPaused) return;
        this.isPaused = false;
        this.log('RESUME');
        try { window.speechSynthesis.resume(); } catch(e) {}
    },

    toggle: function(clipId, text, onDone) {
        if (this.isPlaying && this.currentClipId === clipId) {
            this.stop();
        } else {
            this.playClip(clipId, text, onDone);
        }
    },

    clearTimers: function() {
        if (this.resumeTimer) { clearInterval(this.resumeTimer); this.resumeTimer = null; }
        if (this.watchdogTimer) { clearTimeout(this.watchdogTimer); this.watchdogTimer = null; }
        if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
    },

    cleanup: function() {
        var wasPlaying = this.isPlaying;
        this.isPlaying = false;
        this.isPaused = false;
        this.currentClipId = null;
        this.currentUtterance = null;
        this.currentChunks = [];
        this.currentChunkIndex = 0;
        this.playbackToken++;
        this.clearTimers();
        try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch(e) {}
        if (wasPlaying) {
            var totalTime = ((Date.now() - this.startTime) / 1000).toFixed(2);
            this.log('CLEANUP', { totalTime: totalTime + 's' });
        }
    }
};

window.BAO_TTS = BAO_TTS;
window.__baoTtsLogs = BAO_TTS.logs;

const BAO_Pages = {

    // =========== 1. HOME ===========
    home() {
        const profile = BAO_Utils.profile.getProfile();
        const ancestors = BAO_Utils.ancestors.getAll();
        const docs = BAO_Utils.documents.getAll();
        const tree = BAO_Utils.familyTree.getTree();
        const people = BAO_Utils.familyTree.getAllPeople(tree);

        return `
        <div class="page-enter">
            <div class="hero-section kente-border">
                <span class="feather">&#129718;</span><span class="feather">&#129718;</span><span class="feather">&#129718;</span><span class="feather">&#129718;</span><span class="feather">&#129718;</span><span class="feather">&#129718;</span><span class="feather">&#129718;</span><span class="feather">&#129718;</span>
                <div class="hero-logo-wrap">
                    <img src="https://i.imgur.com/9nZL5sz.jpeg" alt="Black Ancestral Origins" class="hero-logo-img">
                </div>
                <div class="hero-badge">Black Indigenous Freedmen Heritage</div>
                <h1 class="hero-title">Know Your Roots.<br>Reclaim Your Heritage.</h1>
                <p class="hero-subtitle">AI-Powered Black Ancestral Research Platform with Verified Historical Sources</p>
                <p style="font-size:0.84rem;color:var(--text-muted);max-width:520px;margin:0 auto 18px;line-height:1.6;">Trace your ancestry through the Dawes Rolls, Freedmen Records, and Tribal Census Records of the Five Civilized Tribes.</p>
                <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-bottom:18px;">
                    <span style="font-size:0.7rem;padding:4px 12px;background:rgba(76,175,80,0.1);border:1px solid rgba(76,175,80,0.3);border-radius:16px;color:#81C784;">&#10003; Verified Sources Integrated</span>
                    <span style="font-size:0.7rem;padding:4px 12px;background:rgba(255,184,48,0.08);border:1px solid rgba(255,184,48,0.2);border-radius:16px;color:var(--accent);">&#128220; Dawes Rolls Database</span>
                    <span style="font-size:0.7rem;padding:4px 12px;background:rgba(255,184,48,0.08);border:1px solid rgba(255,184,48,0.2);border-radius:16px;color:var(--accent);">&#128240; Freedmen Bureau Records</span>
                    <span style="font-size:0.7rem;padding:4px 12px;background:rgba(255,184,48,0.08);border:1px solid rgba(255,184,48,0.2);border-radius:16px;color:var(--accent);">&#129516; ${BAO_DATA.resources.filter(function(r){return r.category==='DNA';}).length} DNA Resources</span>
                </div>
                <div class="hero-actions">
                    <button class="btn btn-accent btn-lg" onclick="BAO_App.navigate('dawes-rolls')">&#128269; Search Verified Records</button>
                    <button class="btn btn-secondary btn-lg" onclick="BAO_App.navigate('getting-started')">&#128218; Getting Started Guide</button>
                </div>
            </div>

            <div class="quick-actions">
                <div class="quick-action-card" onclick="BAO_App.navigate('family-tree')">
                    <div class="quick-action-icon">&#127795;</div>
                    <div class="quick-action-title">Family Tree</div>
                    <div class="quick-action-desc">${people.length} people</div>
                </div>
                <div class="quick-action-card" onclick="BAO_App.navigate('dawes-rolls')">
                    <div class="quick-action-icon">&#128220;</div>
                    <div class="quick-action-title">Dawes Rolls</div>
                    <div class="quick-action-desc">${BAO_DATA.dawesRolls.length} records</div>
                </div>
                <div class="quick-action-card" onclick="BAO_App.navigate('freedmen-records')">
                    <div class="quick-action-icon">&#128240;</div>
                    <div class="quick-action-title">Freedmen Records</div>
                    <div class="quick-action-desc">${BAO_DATA.freedmenRecords.length} records</div>
                </div>
                <div class="quick-action-card" onclick="BAO_App.navigate('historical-timeline')">
                    <div class="quick-action-icon">&#9200;</div>
                    <div class="quick-action-title">Timeline</div>
                    <div class="quick-action-desc">${BAO_DATA.timeline.length} events</div>
                </div>
            </div>

            <div class="grid-2 section-mb">
                <div class="card">
                    <div class="home-section-title">Research Progress</div>
                    <div class="grid-2">
                        <div class="stat-card card"><div class="stat-value">${ancestors.length}</div><div class="stat-label">Ancestors Saved</div></div>
                        <div class="stat-card card"><div class="stat-value">${docs.length}</div><div class="stat-label">Documents</div></div>
                    </div>
                    <div style="margin-top:16px">
                        <div style="display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:6px">
                            <span>Overall Completion</span>
                            <span style="color:var(--accent)">${Math.min(Math.round((ancestors.length + docs.length) / 20 * 100), 100)}%</span>
                        </div>
                        <div class="progress-bar"><div class="progress-fill" style="width:${Math.min((ancestors.length + docs.length) / 20 * 100, 100)}%"></div></div>
                    </div>
                </div>

                <div class="card">
                    <div class="home-section-title">Recent Activity</div>
                    ${BAO_DATA.notifications.map(n => `
                        <div class="recent-activity-item">
                            <div class="activity-icon">${n.type === 'match' ? '&#128269;' : n.type === 'community' ? '&#128172;' : '&#128161;'}</div>
                            <div class="activity-text">
                                <p><strong>${n.title}</strong></p>
                                <p>${n.description}</p>
                                <div class="activity-time">${n.time}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="card section-mb">
                <div class="home-section-title">Featured Historical Event</div>
                <div style="display:flex;gap:20px;flex-wrap:wrap">
                    <div style="flex:1;min-width:250px">
                        <h3 style="color:var(--accent);margin-bottom:8px">The 1866 Reconstruction Treaties</h3>
                        <p style="color:var(--text-secondary);font-size:0.92rem;line-height:1.7">After the Civil War, the Five Civilized Tribes signed new treaties granting Freedmen full citizenship rights including land allotments. These treaties remain the legal foundation for Freedmen rights today.</p>
                        <button class="btn btn-secondary btn-sm" style="margin-top:12px" onclick="BAO_App.navigate('historical-timeline')">Explore Full Timeline &rarr;</button>
                    </div>
                    <div style="flex:0 0 200px;display:flex;flex-direction:column;gap:8px">
                        <div class="stat-card card" style="padding:12px"><div class="stat-value" style="font-size:1.4rem">5</div><div class="stat-label">Tribes Signed</div></div>
                        <div class="stat-card card" style="padding:12px"><div class="stat-value" style="font-size:1.4rem">1866</div><div class="stat-label">Treaty Year</div></div>
                    </div>
                </div>
            </div>
        </div>`;
    },

    // =========== 2. GETTING STARTED ===========
    'getting-started'() {
        const steps = BAO_DATA.gettingStartedSteps;
        return `
        <div class="page-enter">
            <h2 style="margin-bottom:8px">Getting Started</h2>
            <p style="color:var(--text-secondary);margin-bottom:24px">Your step-by-step guide to researching Black Indigenous Freedmen ancestry.</p>

            <div class="info-callout section-mb">
                <h4>&#128161; Before You Begin</h4>
                <p>Researching Freedmen ancestry requires patience and persistence. Records were often incomplete, names were changed, and family connections were deliberately severed. Every piece of information you find is a victory.</p>
            </div>

            <div class="steps-container">
                ${steps.map((s, i) => `
                    <div class="step-item">
                        <div class="step-number">${i + 1}</div>
                        <div class="step-content">
                            <h3>${s.title}</h3>
                            <p>${s.description}</p>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="card section-mb" style="margin-top:28px">
                <h3 style="margin-bottom:12px">Key Record Types for Freedmen Research</h3>
                <div class="grid-2">
                    <div class="card" style="border-left:3px solid var(--accent)">
                        <h4>Dawes Rolls (1898-1914)</h4>
                        <p style="font-size:0.88rem;color:var(--text-secondary)">The most important starting point. Lists Freedmen enrolled as citizens of the Five Civilized Tribes. Includes names, ages, tribal affiliation, and card numbers.</p>
                    </div>
                    <div class="card" style="border-left:3px solid var(--kente-green)">
                        <h4>Freedmen Bureau Records (1865-1872)</h4>
                        <p style="font-size:0.88rem;color:var(--text-secondary)">Marriage records, labor contracts, and ration lists from the Bureau of Refugees, Freedmen, and Abandoned Lands.</p>
                    </div>
                    <div class="card" style="border-left:3px solid var(--kente-red)">
                        <h4>Tribal Census Records (1850, 1860)</h4>
                        <p style="font-size:0.88rem;color:var(--text-secondary)">Federal census records listing Freedmen ancestors by age, sex, and color under tribal member names. Rarely include names of enrolled individuals.</p>
                    </div>
                    <div class="card" style="border-left:3px solid var(--info)">
                        <h4>Tribal Census Rolls</h4>
                        <p style="font-size:0.88rem;color:var(--text-secondary)">1880 Cherokee Census, 1890 Wallace Roll, 1896 Kern-Clifton Roll. These earlier rolls can establish pre-Dawes family connections.</p>
                    </div>
                </div>
            </div>

            <div style="text-align:center;padding:20px">
                <button class="btn btn-accent btn-lg" onclick="BAO_App.navigate('dawes-rolls')">Start Searching the Dawes Rolls &rarr;</button>
            </div>
        </div>`;
    },

    // =========== 3. FAMILY TREE ===========
    'family-tree'() {
        const tree = BAO_Utils.familyTree.getTree();

        // Assign skin-tone emoji icons with feather headband ON TOP of head
        function getAvatar(name, gender, idx) {
            var isFemale = gender === 'F' || /^(Mary|Clara|Dorothy|Sarah|Martha|Annie|Emma|Lucy|Betty|Rose|Ruth|Nancy|Alice|Ella|Edith|Minnie|Lillian|Grace|Ida|Bertha|Patience|Lucinda|Delia|Hannah|Rachel|Susie|Peggy)/i.test(name);
            var src = isFemale ? 'https://i.imgur.com/T13NIA3.png' : 'https://i.imgur.com/07Jjczy.png';
            return '<img src="' + src + '" alt="' + name + '" class="tree-avatar-img">';
        }

        // Collect all people into generational layers
        function collectGenerations(node, depth, gens) {
            if (!node) return;
            if (!gens[depth]) gens[depth] = [];
            gens[depth].push(node);
            if (node.children) {
                node.children.forEach(function(c) { collectGenerations(c, depth + 1, gens); });
            }
        }

        var generations = [];
        collectGenerations(tree, 0, generations);
        var genLabels = ['Patriarch / Matriarch', '2nd Generation', '3rd Generation', '4th Generation', '5th Generation', '6th Generation'];
        var personIdx = 0;

        function renderNode(n, idx) {
            var avatar = getAvatar(n.name, n.gender, idx);
            return '<div class="tree-node" onclick="BAO_Pages.showPersonModal(\'' + n.id + '\')" data-id="' + n.id + '">' +
                '<div class="tree-node-avatar">' + avatar + '</div>' +
                '<div class="tree-node-name">' + n.name + '</div>' +
                '<div class="tree-node-dates">' + (n.birth || '?') + ' — ' + (n.death || 'Living') + '</div>' +
                (n.tribe ? '<div class="tree-node-tribe">' + n.tribe + '</div>' : '') +
            '</div>';
        }

        // Build the visual tree with lines
        function renderTreeHTML() {
            var html = '';
            var globalIdx = 0;

            for (var g = 0; g < generations.length; g++) {
                var gen = generations[g];
                var label = genLabels[g] || ('Generation ' + (g + 1));

                html += '<div class="tree-gen-label">— ' + label + ' —</div>';

                // Render couples/singles row
                html += '<div class="tree-level">';
                for (var p = 0; p < gen.length; p++) {
                    var person = gen[p];
                    if (person.spouse) {
                        html += '<div class="tree-couple">';
                        html += renderNode(person, globalIdx++);
                        html += '<div class="tree-couple-bond"></div>';
                        html += renderNode(person.spouse, globalIdx++);
                        html += '</div>';
                    } else {
                        html += renderNode(person, globalIdx++);
                    }
                }
                html += '</div>';

                // Draw connecting lines to next generation
                if (g < generations.length - 1) {
                    var nextGen = generations[g + 1];
                    // Vertical line down from parent row
                    html += '<div class="tree-vline"></div>';
                    // Horizontal line spanning children
                    if (nextGen.length > 1) {
                        var spanWidth = Math.min(nextGen.length * 140, 600);
                        html += '<div class="tree-hline-container"><div class="tree-hline" style="width:' + spanWidth + 'px;"></div></div>';
                    }
                    // Branch drop lines for each child
                    html += '<div class="tree-branch-lines">';
                    for (var c = 0; c < nextGen.length; c++) {
                        html += '<div class="tree-branch-drop"><div class="tree-vline"></div></div>';
                    }
                    html += '</div>';
                }
            }
            return html;
        }

        return `
        <div class="page-enter">
            <div class="tree-toolbar">
                <div>
                    <h2 style="margin-bottom:4px">&#127795; Ancestral Family Tree</h2>
                    <p style="color:var(--text-secondary);font-size:0.88rem">Black Indigenous Freedmen Heritage — Five Civilized Tribes</p>
                </div>
                <div style="display:flex;gap:8px">
                    <button class="btn btn-primary btn-sm" onclick="BAO_Pages.addFamilyMember()">+ Add Person</button>
                    <button class="btn btn-secondary btn-sm" onclick="BAO_Pages.resetTree()">Reset to Sample</button>
                </div>
            </div>
            <div class="tree-canvas">
                ${renderTreeHTML()}
            </div>
            <div class="card section-mb" style="margin-top:20px">
                <h4 style="margin-bottom:8px">&#128161; Tips</h4>
                <p style="font-size:0.88rem;color:var(--text-secondary)">Click any ancestor to view their details. Each person displays a 🪶 feather headband representing their indigenous Freedmen heritage. Gold connecting lines show direct lineage between generations. Use "Add Person" to grow your tree.</p>
            </div>
        </div>`;
    },

    // =========== 4. ANCESTOR PROFILES ===========
    'ancestor-profiles'() {
        const ancestors = BAO_Utils.ancestors.getAll();
        return `
        <div class="page-enter">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px">
                <div>
                    <h2 style="margin-bottom:4px">Ancestor Profiles</h2>
                    <p style="color:var(--text-secondary);font-size:0.88rem">${ancestors.length} ancestors documented</p>
                </div>
                <button class="btn btn-primary" onclick="BAO_Pages.addAncestorForm()">+ Add Ancestor</button>
            </div>

            ${ancestors.length === 0 ? `
                <div class="empty-state">
                    <div class="empty-state-icon">&#128100;</div>
                    <h3>No Ancestors Added Yet</h3>
                    <p style="margin-bottom:16px">Start building your ancestral records by adding your first ancestor.</p>
                    <button class="btn btn-accent" onclick="BAO_Pages.addAncestorForm()">+ Add Your First Ancestor</button>
                </div>
            ` : `
                <div style="display:flex;flex-direction:column;gap:12px">
                    ${ancestors.map(a => `
                        <div class="card ancestor-card" onclick="BAO_Pages.showAncestorDetail('${a.id}')">
                            <div class="ancestor-mini-avatar">${BAO_Utils.profile.getInitials(a.name)}</div>
                            <div style="flex:1">
                                <h4>${BAO_Utils.escapeHTML(a.name)}</h4>
                                <p style="font-size:0.82rem;color:var(--text-muted)">${a.birth || '?'} — ${a.death || 'Unknown'} | ${a.tribe || 'Unknown tribe'}</p>
                                ${a.rollNumber ? `<span class="badge badge-gold">Roll #${a.rollNumber}</span>` : ''}
                            </div>
                            <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();BAO_Pages.deleteAncestor('${a.id}')">Delete</button>
                        </div>
                    `).join('')}
                </div>
            `}

            <div class="card section-mb" style="margin-top:24px">
                <div class="home-section-title">Quick-Add from Dawes Rolls</div>
                <p style="color:var(--text-secondary);font-size:0.88rem;margin-bottom:12px">Click any record below to add as an ancestor profile.</p>
                <div style="display:flex;flex-direction:column;gap:8px">
                    ${BAO_DATA.dawesRolls.slice(0, 5).map(r => `
                        <div class="card" style="padding:12px;cursor:pointer;border-left:3px solid var(--accent)" onclick="BAO_Pages.quickAddAncestor('${r.id}')">
                            <div style="display:flex;justify-content:space-between;align-items:center">
                                <div><strong>${r.name}</strong> <span style="color:var(--text-muted);font-size:0.82rem">— Roll #${r.rollNumber}, ${r.tribe}</span></div>
                                <span style="color:var(--accent);font-size:0.82rem">+ Add</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>`;
    },

    // =========== 5. DAWES ROLLS ===========
    'dawes-rolls'() {
        return `
        <div class="page-enter">
            <h2 style="margin-bottom:4px">Dawes Rolls Search</h2>
            <p style="color:var(--text-secondary);margin-bottom:20px">Search enrollment records of the Five Civilized Tribes Freedmen (1898-1914)</p>

            <div class="records-search">
                <input type="text" id="dawes-search-input" placeholder="Search by name, roll number, or location..." oninput="BAO_Pages.filterDawesRolls()">
                <select id="dawes-tribe-filter" onchange="BAO_Pages.filterDawesRolls()">
                    <option value="">All Tribes</option>
                    <option value="Cherokee">Cherokee</option>
                    <option value="Creek">Creek</option>
                    <option value="Choctaw">Choctaw</option>
                    <option value="Chickasaw">Chickasaw</option>
                    <option value="Seminole">Seminole</option>
                </select>
                <select id="dawes-status-filter" onchange="BAO_Pages.filterDawesRolls()">
                    <option value="">All Statuses</option>
                    <option value="Approved">Approved</option>
                    <option value="Denied">Denied</option>
                </select>
            </div>

            <div class="card" style="margin-bottom:16px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
                <span style="font-size:0.88rem;color:var(--text-secondary)"><span id="dawes-count">${BAO_DATA.dawesRolls.length}</span> records found</span>
                <span class="badge badge-gold">Freedmen Rolls</span>
            </div>

            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Roll #</th>
                            <th>Name</th>
                            <th>Tribe</th>
                            <th>Age</th>
                            <th>Sex</th>
                            <th>Post Office</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="dawes-table-body">
                        ${BAO_DATA.dawesRolls.map(r => `
                            <tr data-id="${r.id}" data-tribe="${r.tribe}" data-status="${r.status}" data-search="${r.name.toLowerCase()} ${r.rollNumber} ${r.postOffice.toLowerCase()}">
                                <td style="font-weight:600;color:var(--accent)">${r.rollNumber}</td>
                                <td>${r.name}</td>
                                <td><span class="badge badge-gold" style="cursor:pointer" onclick="event.stopPropagation();BAO_Pages.showTribalNationInfo('${r.tribe}')">${r.tribe}</span></td>
                                <td>${r.age}</td>
                                <td>${r.sex}</td>
                                <td>${r.postOffice}</td>
                                <td><span class="badge ${r.status === 'Approved' ? 'badge-green' : 'badge-red'}">${r.status}</span></td>
                                <td><button class="btn btn-secondary btn-sm" onclick="BAO_Pages.showDawesDetail('${r.id}')">View</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    // =========== 6. FREEDMEN RECORDS ===========
    'freedmen-records'() {
        return `
        <div class="page-enter">
            <h2 style="margin-bottom:4px">Freedmen Records</h2>
            <p style="color:var(--text-secondary);margin-bottom:20px">Treaty of 1866 records documenting freed persons of the Five Civilized Tribes</p>

            <div class="records-search">
                <input type="text" id="freedmen-search" placeholder="Search by name, tribe, or location..." oninput="BAO_Pages.filterFreedmenRecords()">
                <select id="freedmen-tribe" onchange="BAO_Pages.filterFreedmenRecords()">
                    <option value="">All Tribes</option>
                    <option value="Cherokee">Cherokee</option>
                    <option value="Creek">Creek</option>
                    <option value="Choctaw">Choctaw</option>
                    <option value="Chickasaw">Chickasaw</option>
                    <option value="Seminole">Seminole</option>
                </select>
            </div>

            <div id="freedmen-list" style="display:flex;flex-direction:column;gap:12px">
                ${BAO_DATA.freedmenRecords.map(r => `
                    <div class="card record-card" data-tribe="${r.tribe}" data-search="${r.name.toLowerCase()} ${r.tribe.toLowerCase()} ${r.location.toLowerCase()}" onclick="BAO_Pages.showFreedmenDetail('${r.id}')">
                        <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:8px">
                            <div>
                                <h4>${r.name}</h4>
                                <p style="font-size:0.82rem;color:var(--text-muted)">${r.tribe} Freedman — ${r.location}</p>
                            </div>
                            <span class="badge badge-gold">${r.type}</span>
                        </div>
                        <div style="margin-top:10px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;font-size:0.82rem">
                            <div><span style="color:var(--text-muted)">Former Owner:</span> ${r.formerOwner}</div>
                            <div><span style="color:var(--text-muted)">Occupation:</span> ${r.occupation}</div>
                            <div><span style="color:var(--text-muted)">Family Size:</span> ${r.familySize}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>`;
    },

    // =========== 7. TRIBAL CENSUS RECORDS ===========
    'slave-schedules'() {
        return `
        <div class="page-enter">
            <h2 style="margin-bottom:4px">Tribal Census Records</h2>
            <p style="color:var(--text-secondary);margin-bottom:16px">Federal census records of Freedmen ancestors in the Five Civilized Tribes and surrounding territories (1850-1860)</p>

            <div class="info-callout section-mb">
                <h4>&#9888;&#65039; Important Context</h4>
                <p>Tribal census records rarely listed the names of Freedmen individuals — only their age, sex, and color. The "Possible Name" column represents our best effort to connect these records with known Freedmen based on age, location, and tribal member matches.</p>
            </div>

            <div class="records-search">
                <input type="text" id="slave-search" placeholder="Search by owner, county, or possible name..." oninput="BAO_Pages.filterSlaveSchedules()">
                <select id="slave-year" onchange="BAO_Pages.filterSlaveSchedules()">
                    <option value="">All Years</option>
                    <option value="1850">1850</option>
                    <option value="1860">1860</option>
                </select>
            </div>

            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Year</th>
                            <th>County/Nation</th>
                            <th>Tribal Member</th>
                            <th>Person #</th>
                            <th>Age</th>
                            <th>Sex</th>
                            <th>Color</th>
                            <th>Possible Name</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="slave-table-body">
                        ${BAO_DATA.slaveSchedules.map(r => `
                            <tr data-year="${r.year}" data-search="${r.owner.toLowerCase()} ${r.county.toLowerCase()} ${(r.possibleName || '').toLowerCase()}">
                                <td>${r.year}</td>
                                <td>${r.county}</td>
                                <td>${r.owner}</td>
                                <td>${r.slaveNumber}</td>
                                <td>${r.age}</td>
                                <td>${r.sex}</td>
                                <td>${r.color}</td>
                                <td style="color:var(--accent);font-style:italic">${r.possibleName || 'Unknown'}</td>
                                <td><button class="btn btn-secondary btn-sm" onclick="BAO_Pages.showSlaveScheduleDetail('${r.id}')">View</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    // =========== 8. LAND ALLOTMENTS ===========
    'land-allotments'() {
        return `
        <div class="page-enter">
            <h2 style="margin-bottom:4px">Land Allotments</h2>
            <p style="color:var(--text-secondary);margin-bottom:20px">Freedmen land allotment records from Indian Territory (1901-1910)</p>

            <div class="allotment-map-placeholder">
                <div class="map-icon">&#127757;</div>
                <p>Indian Territory Allotment Map</p>
                <p style="font-size:0.78rem">Interactive map visualization — locations marked below</p>
            </div>

            <div class="records-search">
                <input type="text" id="allotment-search" placeholder="Search by name, tribe, or location..." oninput="BAO_Pages.filterAllotments()">
                <select id="allotment-tribe" onchange="BAO_Pages.filterAllotments()">
                    <option value="">All Tribes</option>
                    <option value="Cherokee">Cherokee</option>
                    <option value="Creek">Creek</option>
                    <option value="Choctaw">Choctaw</option>
                    <option value="Chickasaw">Chickasaw</option>
                    <option value="Seminole">Seminole</option>
                </select>
            </div>

            <div id="allotment-list" style="display:flex;flex-direction:column;gap:12px">
                ${BAO_DATA.landAllotments.map(r => `
                    <div class="card allotment-card" data-tribe="${r.tribe}" data-search="${r.allottee.toLowerCase()} ${r.tribe.toLowerCase()} ${r.location.toLowerCase()}" onclick="BAO_Pages.showAllotmentDetail('${r.id}')">
                        <div class="allotment-title">${r.allottee} — Roll #${r.rollNumber}</div>
                        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;font-size:0.85rem">
                            <div><span style="color:var(--text-muted)">Tribe:</span> ${r.tribe}</div>
                            <div><span style="color:var(--text-muted)">Acreage:</span> ${r.acreage} acres</div>
                            <div><span style="color:var(--text-muted)">Location:</span> ${r.location}</div>
                            <div><span style="color:var(--text-muted)">Section:</span> ${r.section}</div>
                            <div><span style="color:var(--text-muted)">Status:</span> <span class="badge badge-green">${r.status}</span></div>
                            <div><span style="color:var(--text-muted)">Date:</span> ${BAO_Utils.formatDate(r.datePatented)}</div>
                        </div>
                        <p style="margin-top:8px;font-size:0.82rem;color:var(--text-muted);font-style:italic">${r.notes}</p>
                    </div>
                `).join('')}
            </div>
        </div>`;
    },

    // =========== 9. DNA & HERITAGE ===========
    'dna-heritage'() {
        const regions = BAO_DATA.heritageRegions;
        let cumPercent = 0;
        const conicStops = regions.map(r => {
            const start = cumPercent;
            cumPercent += r.percentage;
            return `${r.color} ${start}% ${cumPercent}%`;
        }).join(', ');

        return `
        <div class="page-enter dna-heritage-page">

            <!-- ===== HERO BANNER ===== -->
            <div class="dna-hero">
                <div class="dna-hero-bg"></div>
                <div class="dna-hero-content">
                    <div class="dna-hero-icon">&#129516;</div>
                    <h1 class="dna-hero-title">DNA &amp; Heritage</h1>
                    <p class="dna-hero-subtitle">The Definitive Guide to Tracing Black Indigenous Freedmen Ancestry Through DNA Science and Historical Records</p>
                    <div class="dna-hero-stats">
                        <div class="dna-stat-pill"><span class="dna-stat-num">6</span> Comprehensive Guides</div>
                        <div class="dna-stat-pill"><span class="dna-stat-num">3</span> DNA Testing Companies</div>
                        <div class="dna-stat-pill"><span class="dna-stat-num">12+</span> Haplogroups Covered</div>
                    </div>
                </div>
            </div>

            <!-- ===== TABLE OF CONTENTS ===== -->
            <div class="dna-toc card">
                <h3 class="dna-toc-title">&#128214; Table of Contents</h3>
                <div class="dna-toc-grid">
                    <a class="dna-toc-item" onclick="document.getElementById('dna-sec-1').scrollIntoView({behavior:'smooth',block:'start'})">
                        <span class="dna-toc-num">01</span>
                        <span class="dna-toc-label">Getting Your DNA Tested</span>
                    </a>
                    <a class="dna-toc-item" onclick="document.getElementById('dna-sec-2').scrollIntoView({behavior:'smooth',block:'start'})">
                        <span class="dna-toc-num">02</span>
                        <span class="dna-toc-label">Interpreting Indigenous Markers</span>
                    </a>
                    <a class="dna-toc-item" onclick="document.getElementById('dna-sec-3').scrollIntoView({behavior:'smooth',block:'start'})">
                        <span class="dna-toc-num">03</span>
                        <span class="dna-toc-label">Paper Trail Research Guide</span>
                    </a>
                    <a class="dna-toc-item" onclick="document.getElementById('dna-sec-4').scrollIntoView({behavior:'smooth',block:'start'})">
                        <span class="dna-toc-num">04</span>
                        <span class="dna-toc-label">Combining DNA + Paper Trails</span>
                    </a>
                    <a class="dna-toc-item" onclick="document.getElementById('dna-sec-5').scrollIntoView({behavior:'smooth',block:'start'})">
                        <span class="dna-toc-num">05</span>
                        <span class="dna-toc-label">Freedmen Haplogroups</span>
                    </a>
                    <a class="dna-toc-item" onclick="document.getElementById('dna-sec-6').scrollIntoView({behavior:'smooth',block:'start'})">
                        <span class="dna-toc-num">06</span>
                        <span class="dna-toc-label">Uploading DNA Results</span>
                    </a>
                </div>
            </div>

            <!-- ===== HERITAGE COMPOSITION WHEEL ===== -->
            <div class="dna-composition-section section-mb">
                <div class="grid-2">
                    <div class="card" style="text-align:center">
                        <h3 class="dna-section-subtitle">&#127752; Heritage Composition</h3>
                        <p class="dna-note">Typical composition found among Black Indigenous Freedmen descendants</p>
                        <div class="dna-wheel" style="background:conic-gradient(${conicStops});margin:0 auto 20px"></div>
                        <p class="dna-disclaimer-small">Sample composition — actual results vary per individual based on family lineage and tribal affiliation</p>
                    </div>
                    <div class="card">
                        <h3 class="dna-section-subtitle">Regional Breakdown</h3>
                        <div class="heritage-breakdown">
                            ${regions.map(r => `
                                <div class="heritage-item">
                                    <div class="heritage-color" style="background:${r.color}"></div>
                                    <div class="heritage-info">
                                        <div class="heritage-name">${r.name}</div>
                                        <div class="heritage-desc">${r.description}</div>
                                    </div>
                                    <div class="heritage-percent">${r.percentage}%</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <!-- ===== IMPORTANT NOTICE ===== -->
            <div class="dna-notice card section-mb">
                <div class="dna-notice-icon">&#9888;&#65039;</div>
                <div class="dna-notice-content">
                    <h4>Critical Understanding for Freedmen Descendants</h4>
                    <p>DNA testing is a <strong>powerful supplemental tool</strong>, but it alone cannot prove or disprove tribal citizenship. The 1866 treaties between the United States and the Five Civilized Tribes granted citizenship to Freedmen based on <strong>social and legal status within the tribal nations</strong> — not blood quantum. Your rights as a Freedmen descendant are rooted in treaty law, documented enrollment, and historical records. DNA evidence strengthens your research but should always be combined with the paper trail.</p>
                </div>
            </div>

            <!-- ============================================================ -->
            <!-- SECTION 1: STEP-BY-STEP DNA TESTING GUIDE                   -->
            <!-- ============================================================ -->
            <div id="dna-sec-1" class="dna-section">
                <div class="dna-section-header">
                    <span class="dna-section-number">01</span>
                    <div>
                        <h2 class="dna-section-title">Step-by-Step Guide to DNA Testing</h2>
                        <p class="dna-section-desc">How to get the right DNA test for tracing Black Indigenous ancestry</p>
                    </div>
                </div>

                <!-- Step 1 -->
                <div class="dna-step card">
                    <div class="dna-step-header">
                        <div class="dna-step-badge">Step 1</div>
                        <h3>Choose the Right Type of DNA Test</h3>
                    </div>
                    <p>Not all DNA tests are created equal. For tracing Black Indigenous Freedmen ancestry, you need to understand the three main types of DNA tests and which ones to prioritize:</p>
                    <div class="dna-test-types">
                        <div class="dna-test-type">
                            <div class="dna-test-type-header">
                                <span class="dna-test-icon">&#127902;</span>
                                <h4>Autosomal DNA (atDNA)</h4>
                                <span class="dna-badge dna-badge-essential">Essential</span>
                            </div>
                            <p>Tests DNA inherited from <strong>both parents</strong> going back 5-7 generations. This is your primary test — it reveals ethnicity percentages including Indigenous American markers and connects you with living relatives across all family lines.</p>
                            <ul class="dna-detail-list">
                                <li>Covers all ancestral lines (maternal and paternal)</li>
                                <li>Shows ethnicity estimates including Indigenous American percentages</li>
                                <li>Matches you with genetic relatives in the testing company's database</li>
                                <li>Best for finding cousin matches who share Freedmen ancestry</li>
                                <li>Effective for approximately 5-7 generations back (~150-200 years)</li>
                            </ul>
                        </div>
                        <div class="dna-test-type">
                            <div class="dna-test-type-header">
                                <span class="dna-test-icon">&#128105;</span>
                                <h4>Mitochondrial DNA (mtDNA)</h4>
                                <span class="dna-badge dna-badge-recommended">Recommended</span>
                            </div>
                            <p>Traces your <strong>direct maternal line</strong> — your mother's mother's mother, going back thousands of years. This test reveals your maternal haplogroup, which can indicate deep Indigenous American ancestry.</p>
                            <ul class="dna-detail-list">
                                <li>Traces unbroken maternal line back 10,000+ years</li>
                                <li>Identifies maternal haplogroups (A, B, C, D are Indigenous American)</li>
                                <li>Cannot be diluted by admixture — stays constant through maternal line</li>
                                <li>Both men and women can take this test</li>
                                <li>Available through FamilyTreeDNA (full sequence)</li>
                            </ul>
                        </div>
                        <div class="dna-test-type">
                            <div class="dna-test-type-header">
                                <span class="dna-test-icon">&#128104;</span>
                                <h4>Y-DNA (Paternal)</h4>
                                <span class="dna-badge dna-badge-recommended">Recommended</span>
                            </div>
                            <p>Traces your <strong>direct paternal line</strong> — your father's father's father. Only biological males can take this test. It reveals your paternal haplogroup, which can indicate Indigenous American paternal ancestry.</p>
                            <ul class="dna-detail-list">
                                <li>Traces unbroken paternal line back 10,000+ years</li>
                                <li>Identifies paternal haplogroups (Q and C are Indigenous American)</li>
                                <li>Only available to biological males (females can have a male relative test)</li>
                                <li>Especially valuable for Freedmen whose surnames often trace to tribal nations</li>
                                <li>Available through FamilyTreeDNA (Y-37, Y-111, or Big Y-700)</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- Step 2 -->
                <div class="dna-step card">
                    <div class="dna-step-header">
                        <div class="dna-step-badge">Step 2</div>
                        <h3>Select Your Testing Company</h3>
                    </div>
                    <p>Each company has different strengths. For Black Indigenous Freedmen research, we recommend testing with <strong>multiple companies</strong> for the most complete picture.</p>

                    <div class="dna-company-grid">
                        <!-- FamilyTreeDNA -->
                        <div class="dna-company-card dna-company-ftdna">
                            <div class="dna-company-header">
                                <h4>FamilyTreeDNA</h4>
                                <span class="dna-badge dna-badge-best">Best for Freedmen</span>
                            </div>
                            <div class="dna-company-body">
                                <div class="dna-company-rating">
                                    <span class="dna-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                                    <span>Top Pick for Indigenous Research</span>
                                </div>
                                <p class="dna-company-desc">The <strong>only company</strong> offering all three test types (autosomal, mtDNA, and Y-DNA). FamilyTreeDNA has the largest Y-DNA and mtDNA databases in the world, making it the gold standard for deep ancestral lineage testing.</p>
                                <h5 class="dna-company-subhead">Why It's Best for Freedmen Research:</h5>
                                <ul class="dna-detail-list">
                                    <li><strong>Full mtDNA Sequence</strong> — Identifies exact maternal haplogroup subclade, confirming Indigenous American maternal lines (A2, B2, C1, D1)</li>
                                    <li><strong>Y-DNA Testing (Y-37 to Big Y-700)</strong> — Traces paternal lineage through haplogroup Q (Indigenous American) with extreme precision</li>
                                    <li><strong>Family Finder (Autosomal)</strong> — Ethnicity estimate with "Americas" category that can show Indigenous markers</li>
                                    <li><strong>Haplogroup Projects</strong> — Join the Native American Y-DNA or mtDNA haplogroup projects to connect with other Indigenous descendants</li>
                                    <li><strong>Chromosome Browser</strong> — Compare DNA segments with matches to identify shared Indigenous ancestry segments</li>
                                </ul>
                                <div class="dna-company-tests">
                                    <h5 class="dna-company-subhead">Recommended Tests to Order:</h5>
                                    <div class="dna-test-item"><span class="dna-test-price">~$79</span> Family Finder (Autosomal) — Start here</div>
                                    <div class="dna-test-item"><span class="dna-test-price">~$159</span> mtDNA Full Sequence — Maternal haplogroup</div>
                                    <div class="dna-test-item"><span class="dna-test-price">~$119</span> Y-DNA 37 — Paternal lineage (males only)</div>
                                    <div class="dna-test-item"><span class="dna-test-price">~$449</span> Big Y-700 — Most detailed paternal test available</div>
                                </div>
                            </div>
                        </div>

                        <!-- AncestryDNA -->
                        <div class="dna-company-card dna-company-ancestry">
                            <div class="dna-company-header">
                                <h4>AncestryDNA</h4>
                                <span class="dna-badge dna-badge-good">Best Database Size</span>
                            </div>
                            <div class="dna-company-body">
                                <div class="dna-company-rating">
                                    <span class="dna-stars">&#9733;&#9733;&#9733;&#9733;&#9734;</span>
                                    <span>Largest Genetic Database</span>
                                </div>
                                <p class="dna-company-desc">With over <strong>22 million people</strong> in their database, AncestryDNA gives you the best chance of finding genetic relatives. Their "Indigenous Americas" ethnicity category and ThruLines feature are powerful tools.</p>
                                <h5 class="dna-company-subhead">Key Features for Freedmen Research:</h5>
                                <ul class="dna-detail-list">
                                    <li><strong>Largest Database</strong> — 22+ million people means more potential relative matches</li>
                                    <li><strong>ThruLines</strong> — Automatically connects your DNA matches to your family tree, showing possible common ancestors</li>
                                    <li><strong>Indigenous Americas Category</strong> — Shows "Indigenous Americas — North" if you carry Indigenous markers</li>
                                    <li><strong>Genetic Communities</strong> — May show "Oklahoma Settlers & Indian Territory" community for Freedmen descendants</li>
                                    <li><strong>Shared Matches</strong> — Find clusters of relatives who all descend from the same Freedmen ancestor</li>
                                </ul>
                                <div class="dna-company-tests">
                                    <h5 class="dna-company-subhead">Available Test:</h5>
                                    <div class="dna-test-item"><span class="dna-test-price">~$99</span> AncestryDNA Kit — Autosomal only (no mtDNA or Y-DNA)</div>
                                    <div class="dna-test-item"><span class="dna-test-price">~$199</span> AncestryDNA + Traits — Includes trait reports</div>
                                </div>
                                <div class="dna-company-note">
                                    <strong>Important:</strong> AncestryDNA only offers autosomal testing. For mtDNA and Y-DNA haplogroup analysis, you will need FamilyTreeDNA.
                                </div>
                            </div>
                        </div>

                        <!-- 23andMe -->
                        <div class="dna-company-card dna-company-23andme">
                            <div class="dna-company-header">
                                <h4>23andMe</h4>
                                <span class="dna-badge dna-badge-good">Best for Haplogroups</span>
                            </div>
                            <div class="dna-company-body">
                                <div class="dna-company-rating">
                                    <span class="dna-stars">&#9733;&#9733;&#9733;&#9733;&#9734;</span>
                                    <span>Haplogroup + Health Reports</span>
                                </div>
                                <p class="dna-company-desc">23andMe provides <strong>basic haplogroup assignments</strong> with their autosomal test (both maternal and paternal), plus health carrier reports. Their "Indigenous American" ancestry category is useful.</p>
                                <h5 class="dna-company-subhead">Key Features for Freedmen Research:</h5>
                                <ul class="dna-detail-list">
                                    <li><strong>Haplogroup Assignments</strong> — Provides both maternal (mtDNA) and paternal (Y-DNA) haplogroups with the standard autosomal test</li>
                                    <li><strong>Ancestry Composition</strong> — "Indigenous American" percentage with sub-regional breakdown</li>
                                    <li><strong>DNA Relatives</strong> — Find genetic matches and see shared DNA percentages</li>
                                    <li><strong>Ancestry Timeline</strong> — Estimates when you had a 100% Indigenous American ancestor in your lineage</li>
                                    <li><strong>Chromosome Painting</strong> — Visual display showing which chromosomes carry Indigenous markers</li>
                                </ul>
                                <div class="dna-company-tests">
                                    <h5 class="dna-company-subhead">Available Tests:</h5>
                                    <div class="dna-test-item"><span class="dna-test-price">~$99</span> Ancestry + Traits — Ethnicity + basic haplogroups</div>
                                    <div class="dna-test-item"><span class="dna-test-price">~$199</span> Health + Ancestry — Adds health carrier reports</div>
                                </div>
                                <div class="dna-company-note">
                                    <strong>Note:</strong> 23andMe's haplogroup assignments are less detailed than FamilyTreeDNA's dedicated mtDNA/Y-DNA tests, but they provide a quick baseline at a lower cost.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Step 3 -->
                <div class="dna-step card">
                    <div class="dna-step-header">
                        <div class="dna-step-badge">Step 3</div>
                        <h3>Order and Take Your Test</h3>
                    </div>
                    <div class="dna-steps-list">
                        <div class="dna-step-detail">
                            <div class="dna-step-detail-num">3a</div>
                            <div>
                                <h4>Order Your Kit Online</h4>
                                <p>Visit the testing company's website and order your preferred test kit. Most kits arrive within 3-5 business days. Watch for holiday sales — AncestryDNA and 23andMe frequently offer 50% off during holidays.</p>
                            </div>
                        </div>
                        <div class="dna-step-detail">
                            <div class="dna-step-detail-num">3b</div>
                            <div>
                                <h4>Provide Your Sample</h4>
                                <p><strong>AncestryDNA &amp; 23andMe:</strong> Spit into the provided collection tube (about 2ml of saliva). Do not eat, drink, smoke, or chew gum for 30 minutes before providing your sample.<br>
                                <strong>FamilyTreeDNA:</strong> Swab the inside of your cheek with the provided cotton swabs for 45-60 seconds each. Two swabs are usually provided.</p>
                            </div>
                        </div>
                        <div class="dna-step-detail">
                            <div class="dna-step-detail-num">3c</div>
                            <div>
                                <h4>Mail Your Kit Back</h4>
                                <p>Seal your sample in the provided prepaid return package and drop it in the mail. Most kits include a prepaid shipping label.</p>
                            </div>
                        </div>
                        <div class="dna-step-detail">
                            <div class="dna-step-detail-num">3d</div>
                            <div>
                                <h4>Wait for Results</h4>
                                <p>Processing times vary:<br>
                                <strong>AncestryDNA:</strong> 6-8 weeks<br>
                                <strong>23andMe:</strong> 3-5 weeks<br>
                                <strong>FamilyTreeDNA Family Finder:</strong> 4-6 weeks<br>
                                <strong>FamilyTreeDNA mtDNA/Y-DNA:</strong> 6-12 weeks</p>
                            </div>
                        </div>
                        <div class="dna-step-detail">
                            <div class="dna-step-detail-num">3e</div>
                            <div>
                                <h4>Download Your Raw Data</h4>
                                <p>Once results are ready, <strong>immediately download your raw DNA data file</strong>. This allows you to upload to other databases for free (see Section 6). Each company provides a downloadable .txt or .zip file containing your raw genotype data.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ============================================================ -->
            <!-- SECTION 2: INTERPRETING INDIGENOUS MARKERS                   -->
            <!-- ============================================================ -->
            <div id="dna-sec-2" class="dna-section">
                <div class="dna-section-header">
                    <span class="dna-section-number">02</span>
                    <div>
                        <h2 class="dna-section-title">Interpreting Indigenous DNA Markers</h2>
                        <p class="dna-section-desc">Understanding what your results mean for Black Indigenous Freedmen ancestry</p>
                    </div>
                </div>

                <div class="dna-step card">
                    <h3 class="dna-card-title">&#129516; What to Look For in Your Ethnicity Estimate</h3>
                    <p>When you receive your autosomal DNA results, look specifically for these categories that indicate Indigenous ancestry:</p>

                    <div class="dna-marker-grid">
                        <div class="dna-marker-card">
                            <div class="dna-marker-header">
                                <span class="dna-marker-icon">&#127758;</span>
                                <h4>Indigenous Americas — North</h4>
                            </div>
                            <p>This is the <strong>primary category</strong> you're looking for. Any percentage here indicates inherited Indigenous American DNA. For Freedmen descendants, even 1-5% can be significant, as Indigenous DNA may have been diluted over generations but the cultural and legal connection remains strong through the Dawes Rolls and 1866 treaties.</p>
                            <div class="dna-marker-detail">
                                <span class="dna-marker-label">Typical range for Freedmen descendants:</span>
                                <span class="dna-marker-value">1% — 35%</span>
                            </div>
                        </div>
                        <div class="dna-marker-card">
                            <div class="dna-marker-header">
                                <span class="dna-marker-icon">&#127757;</span>
                                <h4>Indigenous Americas — Central &amp; South</h4>
                            </div>
                            <p>Some Freedmen descendants show markers in this category due to the historical migration patterns of Indigenous peoples across the Americas. The Five Civilized Tribes had complex trade and kinship networks extending southward.</p>
                            <div class="dna-marker-detail">
                                <span class="dna-marker-label">Also check for:</span>
                                <span class="dna-marker-value">"Indigenous Americas — Mexico" category</span>
                            </div>
                        </div>
                        <div class="dna-marker-card">
                            <div class="dna-marker-header">
                                <span class="dna-marker-icon">&#127775;</span>
                                <h4>Unassigned or Broadly Categories</h4>
                            </div>
                            <p>DNA testing companies sometimes cannot assign DNA segments to a specific region. "Broadly East Asian &amp; Indigenous American" or "Unassigned" segments may actually contain Indigenous American DNA that the algorithm couldn't confidently categorize. These should not be dismissed.</p>
                            <div class="dna-marker-detail">
                                <span class="dna-marker-label">Why this matters:</span>
                                <span class="dna-marker-value">May contain hidden Indigenous markers</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="dna-step card">
                    <h3 class="dna-card-title">&#128300; Understanding Haplogroups</h3>
                    <p>Haplogroups are genetic population groups that trace deep ancestral lineages. They are assigned through mtDNA (maternal) and Y-DNA (paternal) testing.</p>

                    <div class="dna-callout dna-callout-gold">
                        <h4>Why Haplogroups Matter for Freedmen</h4>
                        <p>While autosomal DNA gets diluted with each generation (you only inherit 50% from each parent), <strong>haplogroups do NOT get diluted</strong>. Your maternal haplogroup is passed unchanged from mother to daughter for thousands of years. If you carry an Indigenous American haplogroup (A, B, C, or D for maternal; Q or C for paternal), it is <strong>definitive proof</strong> of Indigenous ancestry in that specific lineage — no matter how many generations ago.</p>
                    </div>

                    <h4 class="dna-subheading">Maternal Haplogroups (mtDNA) — Indigenous American:</h4>
                    <div class="dna-haplo-grid">
                        <div class="dna-haplo-card">
                            <div class="dna-haplo-letter">A</div>
                            <div class="dna-haplo-info">
                                <h5>Haplogroup A (A2, A2a, A2b, A2c, A2d)</h5>
                                <p>The <strong>most common</strong> Indigenous American maternal haplogroup. Found widely among Cherokee, Choctaw, Creek, and other southeastern tribes. Subclades A2a-A2d are exclusively Indigenous American.</p>
                                <div class="dna-haplo-freq">Found in: ~30-40% of Indigenous Americans</div>
                            </div>
                        </div>
                        <div class="dna-haplo-card">
                            <div class="dna-haplo-letter">B</div>
                            <div class="dna-haplo-info">
                                <h5>Haplogroup B (B2, B2a, B2b)</h5>
                                <p>Second most common Indigenous haplogroup. Particularly prevalent among southwestern and southeastern tribes including Chickasaw and Choctaw. B2 and its subclades are Indigenous American specific.</p>
                                <div class="dna-haplo-freq">Found in: ~25-30% of Indigenous Americans</div>
                            </div>
                        </div>
                        <div class="dna-haplo-card">
                            <div class="dna-haplo-letter">C</div>
                            <div class="dna-haplo-info">
                                <h5>Haplogroup C (C1, C1b, C1c, C1d, C4c)</h5>
                                <p>Found across both North and South Indigenous populations. C1b, C1c, C1d, and C4c subclades are specifically Indigenous American. Particularly found among Creek and Seminole peoples.</p>
                                <div class="dna-haplo-freq">Found in: ~15-20% of Indigenous Americans</div>
                            </div>
                        </div>
                        <div class="dna-haplo-card">
                            <div class="dna-haplo-letter">D</div>
                            <div class="dna-haplo-info">
                                <h5>Haplogroup D (D1, D2, D3, D4h3a)</h5>
                                <p>Less common in the Southeast but still present. D1 is the primary Indigenous American subclade. Some Freedmen descendants carry this haplogroup, particularly those with Seminole or Creek connections.</p>
                                <div class="dna-haplo-freq">Found in: ~10-15% of Indigenous Americans</div>
                            </div>
                        </div>
                        <div class="dna-haplo-card">
                            <div class="dna-haplo-letter">X</div>
                            <div class="dna-haplo-info">
                                <h5>Haplogroup X (X2a, X2g)</h5>
                                <p>The rarest Indigenous American haplogroup. Found primarily among northeastern and Great Lakes tribes but also documented among Cherokee. X2a is the Indigenous American specific subclade.</p>
                                <div class="dna-haplo-freq">Found in: ~3-5% of Indigenous Americans</div>
                            </div>
                        </div>
                    </div>

                    <h4 class="dna-subheading">Paternal Haplogroups (Y-DNA) — Indigenous American:</h4>
                    <div class="dna-haplo-grid">
                        <div class="dna-haplo-card">
                            <div class="dna-haplo-letter dna-haplo-y">Q</div>
                            <div class="dna-haplo-info">
                                <h5>Haplogroup Q (Q-M242, Q-M3, Q-L54)</h5>
                                <p>The <strong>primary Indigenous American paternal haplogroup</strong>. Q-M3 (also called Q1a2a1a1) is found almost exclusively in Indigenous peoples of the Americas. If you carry this haplogroup, it is strong evidence of Indigenous paternal ancestry. Common subclades in the Five Tribes region include Q-M3 and Q-L54.</p>
                                <div class="dna-haplo-freq">Found in: ~75-90% of Indigenous American males</div>
                            </div>
                        </div>
                        <div class="dna-haplo-card">
                            <div class="dna-haplo-letter dna-haplo-y">C</div>
                            <div class="dna-haplo-info">
                                <h5>Haplogroup C (C-P39, C-M217)</h5>
                                <p>The second Indigenous American paternal haplogroup, though much less common than Q. C-P39 is found specifically among North American Indigenous peoples. More common among northern tribes but documented among southeastern groups.</p>
                                <div class="dna-haplo-freq">Found in: ~5-10% of Indigenous American males</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="dna-step card">
                    <h3 class="dna-card-title">&#128202; Reading Your Ethnicity Estimate by Company</h3>
                    <div class="dna-company-results">
                        <div class="dna-result-company">
                            <h4>On AncestryDNA:</h4>
                            <ul class="dna-detail-list">
                                <li>Go to <strong>"DNA Story"</strong> or <strong>"Ethnicity Estimate"</strong></li>
                                <li>Look for <strong>"Indigenous Americas — North"</strong> category</li>
                                <li>Click on it to see sub-regions (may show "Eastern Woodlands" for Five Tribes area)</li>
                                <li>Check <strong>"Genetic Communities"</strong> — look for "Oklahoma &amp; Indian Territory" related communities</li>
                                <li>Review <strong>"DNA Matches"</strong> and filter by shared ethnicity: Indigenous Americas</li>
                            </ul>
                        </div>
                        <div class="dna-result-company">
                            <h4>On 23andMe:</h4>
                            <ul class="dna-detail-list">
                                <li>Go to <strong>"Ancestry Composition"</strong></li>
                                <li>Look for <strong>"Indigenous American"</strong> under East Asian &amp; Indigenous American</li>
                                <li>Click <strong>"Scientific Detail"</strong> to see confidence levels (50%, 70%, 90%)</li>
                                <li>Check <strong>"Ancestry Timeline"</strong> — shows estimated generation of your most recent 100% Indigenous ancestor</li>
                                <li>View <strong>"Chromosome Painting"</strong> — Indigenous segments shown on each chromosome</li>
                                <li>Check your <strong>Maternal Haplogroup</strong> and <strong>Paternal Haplogroup</strong> assignments</li>
                            </ul>
                        </div>
                        <div class="dna-result-company">
                            <h4>On FamilyTreeDNA:</h4>
                            <ul class="dna-detail-list">
                                <li>Go to <strong>"myOrigins"</strong> for ethnicity estimates</li>
                                <li>Look for <strong>"Americas"</strong> category — this includes Indigenous American ancestry</li>
                                <li>For mtDNA: Go to <strong>"mtDNA Results"</strong> to see your maternal haplogroup and matches</li>
                                <li>For Y-DNA: Go to <strong>"Y-DNA Results"</strong> to see your paternal haplogroup and matches</li>
                                <li>Use the <strong>"Chromosome Browser"</strong> to compare shared DNA segments with Indigenous matches</li>
                                <li>Join the <strong>Native American</strong> haplogroup project for specialized analysis</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ============================================================ -->
            <!-- SECTION 3: PAPER TRAIL RESEARCH GUIDE                        -->
            <!-- ============================================================ -->
            <div id="dna-sec-3" class="dna-section">
                <div class="dna-section-header">
                    <span class="dna-section-number">03</span>
                    <div>
                        <h2 class="dna-section-title">Tracing Ancestry Through Paper Trails</h2>
                        <p class="dna-section-desc">The essential documentary evidence for proving Black Indigenous Freedmen lineage</p>
                    </div>
                </div>

                <div class="dna-callout dna-callout-gold card">
                    <h4>&#128214; Paper Trails Are the Foundation</h4>
                    <p>For Freedmen descendants, <strong>documentary evidence is the most important proof</strong> of your ancestral connection to the Five Civilized Tribes. The Dawes Commission enrollment records, Freedmen's Bureau records, census records, and land allotment documents create an unbroken chain connecting you to your ancestors. These records carry legal weight that DNA alone cannot provide.</p>
                </div>

                <!-- Dawes Rolls -->
                <div class="dna-step card">
                    <div class="dna-step-header">
                        <div class="dna-step-badge dna-step-badge-record">Record Type 1</div>
                        <h3>Dawes Rolls (1898-1914)</h3>
                    </div>
                    <p>The Dawes Rolls are the <strong>single most important record</strong> for establishing Freedmen ancestry. Created by the Dawes Commission (formally the Commission to the Five Civilized Tribes), these rolls enrolled members of the Cherokee, Choctaw, Chickasaw, Creek, and Seminole nations including their Freedmen.</p>

                    <div class="dna-record-details">
                        <div class="dna-record-section">
                            <h4>&#128196; What the Dawes Rolls Contain:</h4>
                            <ul class="dna-detail-list">
                                <li><strong>Roll Number</strong> — Unique enrollment number for each person</li>
                                <li><strong>Card Number</strong> — Census card number (families grouped on same card)</li>
                                <li><strong>Name</strong> — Full name of the enrollee</li>
                                <li><strong>Age &amp; Sex</strong> — At time of enrollment</li>
                                <li><strong>Blood Quantum</strong> — For "By Blood" enrollees (Freedmen were listed separately)</li>
                                <li><strong>Tribal Affiliation</strong> — Cherokee, Choctaw, Chickasaw, Creek, or Seminole</li>
                                <li><strong>Category</strong> — "Freedmen," "By Blood," "Minor," "New Born," or "Minor Freedmen"</li>
                                <li><strong>Post Office Address</strong> — Residence at time of enrollment</li>
                                <li><strong>Parents' Names</strong> — Sometimes listed on the census card</li>
                            </ul>
                        </div>
                        <div class="dna-record-section">
                            <h4>&#128269; How to Search the Dawes Rolls:</h4>
                            <div class="dna-steps-list dna-steps-compact">
                                <div class="dna-step-detail">
                                    <div class="dna-step-detail-num">1</div>
                                    <div>
                                        <h4>Start at the National Archives</h4>
                                        <p>Visit <strong>catalog.archives.gov</strong> and search for "Dawes Rolls" or "Final Rolls of Citizens and Freedmen of the Five Civilized Tribes." The original records are in Record Group 75.</p>
                                    </div>
                                </div>
                                <div class="dna-step-detail">
                                    <div class="dna-step-detail-num">2</div>
                                    <div>
                                        <h4>Search by Ancestor Name</h4>
                                        <p>Use the Access to Archival Databases (AAD) at <strong>aad.archives.gov/aad</strong> — search the "Final Rolls" database. Try surname variations, maiden names, and phonetic spellings.</p>
                                    </div>
                                </div>
                                <div class="dna-step-detail">
                                    <div class="dna-step-detail-num">3</div>
                                    <div>
                                        <h4>Request the Full Census Card</h4>
                                        <p>Once you find your ancestor's roll number, request the corresponding <strong>Dawes Census Card</strong> from the National Archives. These cards contain family relationships, prior roll references, and enrollment notes.</p>
                                    </div>
                                </div>
                                <div class="dna-step-detail">
                                    <div class="dna-step-detail-num">4</div>
                                    <div>
                                        <h4>Check Application Jackets</h4>
                                        <p>The <strong>Enrollment Application Jackets</strong> contain the actual testimony given to the Dawes Commission — often including detailed family histories, birth dates, relationships, and even physical descriptions. These are goldmines of genealogical information.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="dna-pro-tip">
                        <strong>&#128161; Pro Tip:</strong> Many Freedmen were enrolled using their enslaver's surname within the tribal nation. If you can't find your ancestor under their known surname, try searching under the name of the tribal citizen who held them. The Dawes census cards often reference earlier rolls (like the 1880 Cherokee Census or 1885 Choctaw Census) that can extend your research further back.
                    </div>
                </div>

                <!-- Freedmen's Bureau -->
                <div class="dna-step card">
                    <div class="dna-step-header">
                        <div class="dna-step-badge dna-step-badge-record">Record Type 2</div>
                        <h3>Freedmen's Bureau Records (1865-1872)</h3>
                    </div>
                    <p>The Bureau of Refugees, Freedmen, and Abandoned Lands (Freedmen's Bureau) operated from 1865-1872 and created vital records for newly freed people, including those in Indian Territory.</p>

                    <div class="dna-record-details">
                        <div class="dna-record-section">
                            <h4>&#128196; What These Records Contain:</h4>
                            <ul class="dna-detail-list">
                                <li><strong>Labor Contracts</strong> — Agreements between Freedmen and employers, listing names, ages, and family members</li>
                                <li><strong>Marriage Records</strong> — Formal registration of marriages, often listing prior relationships and children</li>
                                <li><strong>Ration Lists</strong> — Rolls of people receiving food and supplies, listing family units</li>
                                <li><strong>Hospital Records</strong> — Medical treatment records with physical descriptions and family connections</li>
                                <li><strong>School Records</strong> — Enrollment of Freedmen children in Bureau schools</li>
                                <li><strong>Complaints &amp; Correspondence</strong> — Letters and petitions that often mention family members and living situations</li>
                            </ul>
                        </div>
                        <div class="dna-record-section">
                            <h4>&#128269; Where to Find These Records:</h4>
                            <ul class="dna-detail-list">
                                <li><strong>FamilySearch.org</strong> — Free digitized Freedmen's Bureau records, searchable by name and location</li>
                                <li><strong>Fold3.com</strong> — Extensive Freedmen's Bureau records collection (subscription required)</li>
                                <li><strong>National Archives</strong> — Record Group 105, organized by state and sub-district</li>
                                <li><strong>Freedmen &amp; Southern Society Project</strong> — University of Maryland's research collection</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- Census Records -->
                <div class="dna-step card">
                    <div class="dna-step-header">
                        <div class="dna-step-badge dna-step-badge-record">Record Type 3</div>
                        <h3>Federal &amp; Tribal Census Records</h3>
                    </div>

                    <div class="dna-census-grid">
                        <div class="dna-census-card">
                            <h4>&#127463; Federal Census (1860-1940)</h4>
                            <ul class="dna-detail-list">
                                <li><strong>1870 Census</strong> — First census to list all Freedmen by name (critical starting point)</li>
                                <li><strong>1880 Census</strong> — Lists birthplaces of parents, helping trace origins</li>
                                <li><strong>1900 Census</strong> — Includes year of birth, marriage year, and mother's number of children</li>
                                <li><strong>1910 Census</strong> — May show Indian Territory residents and tribal affiliations</li>
                                <li><strong>1920 &amp; 1930 Census</strong> — Oklahoma statehood records; look for "Indian" or "Negro" racial designations</li>
                            </ul>
                            <p class="dna-note">Access free at <strong>FamilySearch.org</strong> or <strong>Ancestry.com</strong> (library edition free at public libraries)</p>
                        </div>
                        <div class="dna-census-card">
                            <h4>&#127466; Tribal Census Rolls</h4>
                            <ul class="dna-detail-list">
                                <li><strong>Cherokee Census (1880, 1890, 1896)</strong> — Pre-Dawes tribal enrollment including Freedmen</li>
                                <li><strong>Choctaw Census (1885, 1896)</strong> — Lists Freedmen separately with family groups</li>
                                <li><strong>Creek Census (1895)</strong> — Creek Freedmen listed with town affiliations</li>
                                <li><strong>Chickasaw Census (1896)</strong> — Freedmen enrollment attempts</li>
                                <li><strong>Seminole Census (1897-1898)</strong> — Seminole Freedmen bands documented</li>
                            </ul>
                            <p class="dna-note">Available through the <strong>Oklahoma Historical Society</strong> and <strong>National Archives Fort Worth</strong></p>
                        </div>
                    </div>
                </div>

                <!-- Land Records -->
                <div class="dna-step card">
                    <div class="dna-step-header">
                        <div class="dna-step-badge dna-step-badge-record">Record Type 4</div>
                        <h3>Land Allotment Records</h3>
                    </div>
                    <p>Under the Dawes Act, enrolled tribal citizens (including Freedmen) received individual land allotments in Indian Territory. These records are incredibly detailed and connect directly to Dawes Roll numbers.</p>

                    <div class="dna-record-details">
                        <div class="dna-record-section">
                            <h4>&#128196; What Land Records Contain:</h4>
                            <ul class="dna-detail-list">
                                <li><strong>Allotment Number</strong> — Tied directly to the enrollee's Dawes Roll number</li>
                                <li><strong>Legal Land Description</strong> — Section, township, and range of the allotted land</li>
                                <li><strong>Acreage</strong> — Freedmen typically received 40 acres; "By Blood" members received 160 acres</li>
                                <li><strong>Homestead vs. Surplus</strong> — Each allotment was divided into homestead (inalienable) and surplus (could be sold)</li>
                                <li><strong>Transfer Records</strong> — Records of land sales, often revealing economic pressures on Freedmen families</li>
                                <li><strong>Heirship Records</strong> — When an allottee died, heirship proceedings list all descendants</li>
                            </ul>
                        </div>
                        <div class="dna-record-section">
                            <h4>&#128269; Where to Find Land Records:</h4>
                            <ul class="dna-detail-list">
                                <li><strong>Bureau of Indian Affairs (BIA)</strong> — Muskogee Area Office maintains allotment records</li>
                                <li><strong>National Archives Fort Worth</strong> — Record Group 75, Indian Territory land records</li>
                                <li><strong>Oklahoma County Courthouses</strong> — Deed records for land transactions after allotment</li>
                                <li><strong>Bureau of Land Management (GLO)</strong> — Online patent search at glorecords.blm.gov</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- Vital Records -->
                <div class="dna-step card">
                    <div class="dna-step-header">
                        <div class="dna-step-badge dna-step-badge-record">Record Type 5</div>
                        <h3>Vital Records &amp; Other Sources</h3>
                    </div>
                    <div class="dna-vital-grid">
                        <div class="dna-vital-card">
                            <h4>&#128300; Birth &amp; Death Records</h4>
                            <p>Oklahoma vital records date from statehood (1908). Earlier records may exist through tribal governments, churches, and Indian agency reports. Check the Oklahoma State Department of Health for certificates.</p>
                        </div>
                        <div class="dna-vital-card">
                            <h4>&#128141; Marriage Records</h4>
                            <p>Tribal marriage records pre-statehood are invaluable. After 1908, check Oklahoma county clerk offices. Church marriage registers often predate civil records by decades.</p>
                        </div>
                        <div class="dna-vital-card">
                            <h4>&#9968;&#65039; Cemetery &amp; Church Records</h4>
                            <p>Freedmen churches (Baptist and Methodist) in Indian Territory kept baptismal, marriage, and burial records. The Oklahoma Cemetery Index (okgenweb.org) has thousands of listings.</p>
                        </div>
                        <div class="dna-vital-card">
                            <h4>&#128225; Indian Agency Records</h4>
                            <p>The Five Civilized Tribes Agency maintained school records, annuity rolls, and per capita payment records that list Freedmen and their families. Found in Record Group 75 at the National Archives.</p>
                        </div>
                        <div class="dna-vital-card">
                            <h4>&#128240; Newspaper Archives</h4>
                            <p>Indian Territory newspapers like the <em>Indian Chieftain</em>, <em>Cherokee Advocate</em>, and <em>Muskogee Phoenix</em> published legal notices, land sales, and community news about Freedmen families. Search at Chronicling America (Library of Congress).</p>
                        </div>
                        <div class="dna-vital-card">
                            <h4>&#128218; Military Records</h4>
                            <p>Many Freedmen served in the U.S. Colored Troops (USCT) and later Indian Territory military units. Service records, pension files, and Compiled Military Service Records are available through the National Archives and Fold3.</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ============================================================ -->
            <!-- SECTION 4: COMBINING DNA + PAPER TRAILS                      -->
            <!-- ============================================================ -->
            <div id="dna-sec-4" class="dna-section">
                <div class="dna-section-header">
                    <span class="dna-section-number">04</span>
                    <div>
                        <h2 class="dna-section-title">Combining DNA + Paper Trail Research</h2>
                        <p class="dna-section-desc">Build the strongest possible case for your Black Indigenous Freedmen ancestry</p>
                    </div>
                </div>

                <div class="dna-step card">
                    <h3 class="dna-card-title">&#128279; The Power of Combined Evidence</h3>
                    <p>Neither DNA nor paper trails alone tell the complete story. The most compelling proof of Black Indigenous Freedmen ancestry comes from <strong>combining multiple lines of evidence</strong>. Here is a systematic approach:</p>

                    <div class="dna-combo-timeline">
                        <div class="dna-combo-phase">
                            <div class="dna-combo-phase-header">
                                <div class="dna-combo-phase-num">Phase 1</div>
                                <h4>Start With What You Know</h4>
                            </div>
                            <ul class="dna-detail-list">
                                <li>Interview living family members about tribal connections, family stories, and ancestral locations</li>
                                <li>Collect family documents: birth certificates, obituaries, family Bibles, old photos</li>
                                <li>Document every ancestor name, date, and location you can gather</li>
                                <li>Record oral histories — these often contain clues not found in any official record</li>
                                <li>Note any mentions of Indian Territory, Oklahoma Territory, or specific tribal nations</li>
                            </ul>
                        </div>

                        <div class="dna-combo-phase">
                            <div class="dna-combo-phase-header">
                                <div class="dna-combo-phase-num">Phase 2</div>
                                <h4>Take DNA Tests</h4>
                            </div>
                            <ul class="dna-detail-list">
                                <li>Order FamilyTreeDNA Family Finder + mtDNA Full Sequence (minimum recommendation)</li>
                                <li>Also test with AncestryDNA for their larger database of matches</li>
                                <li>If male, add Y-DNA testing at FamilyTreeDNA</li>
                                <li>Download raw DNA data from each company</li>
                                <li>Upload raw data to GEDmatch, MyHeritage, and FamilyTreeDNA (see Section 6)</li>
                                <li>Test the oldest living generation in your family — their DNA contains more ancestral information</li>
                            </ul>
                        </div>

                        <div class="dna-combo-phase">
                            <div class="dna-combo-phase-header">
                                <div class="dna-combo-phase-num">Phase 3</div>
                                <h4>Search the Paper Trail</h4>
                            </div>
                            <ul class="dna-detail-list">
                                <li>Search the Dawes Rolls using ancestor names, locations, and surname variants</li>
                                <li>Request Dawes Census Cards and Application Jackets from the National Archives</li>
                                <li>Search Freedmen's Bureau records at FamilySearch.org and Fold3</li>
                                <li>Check the 1870-1930 federal censuses for Indian Territory / Oklahoma</li>
                                <li>Search tribal census rolls (pre-Dawes) for earlier documentation</li>
                                <li>Request land allotment records from the BIA Muskogee office</li>
                            </ul>
                        </div>

                        <div class="dna-combo-phase">
                            <div class="dna-combo-phase-header">
                                <div class="dna-combo-phase-num">Phase 4</div>
                                <h4>Cross-Reference DNA Matches with Records</h4>
                            </div>
                            <ul class="dna-detail-list">
                                <li><strong>Identify shared matches</strong> — Find DNA matches who also have Five Tribes ancestry</li>
                                <li><strong>Build shared trees</strong> — Collaborate with DNA matches to identify common ancestors on the Dawes Rolls</li>
                                <li><strong>Triangulate DNA segments</strong> — If 3+ people share the same DNA segment AND the same Dawes Roll ancestor, that's powerful confirmation</li>
                                <li><strong>Map Indigenous DNA segments</strong> — Use GEDmatch tools to identify which chromosome segments are Indigenous American</li>
                                <li><strong>Connect haplogroups to family lines</strong> — If your mtDNA haplogroup is A2 and your documented maternal line traces to a Cherokee Freedmen ancestor, the DNA confirms the paper trail</li>
                            </ul>
                        </div>

                        <div class="dna-combo-phase">
                            <div class="dna-combo-phase-header">
                                <div class="dna-combo-phase-num">Phase 5</div>
                                <h4>Build Your Evidence Portfolio</h4>
                            </div>
                            <ul class="dna-detail-list">
                                <li>Create a comprehensive ancestor profile with all documentary evidence</li>
                                <li>Include DNA test results showing Indigenous American percentages and haplogroups</li>
                                <li>Attach copies of Dawes Roll cards, census records, and land allotments</li>
                                <li>Document the chain of descent from your Dawes Roll ancestor to yourself</li>
                                <li>Include DNA match evidence showing genetic connections to other known Freedmen descendants</li>
                                <li>Store everything in your <strong onclick="BAO_App.navigate('document-vault')" style="color:var(--accent);cursor:pointer;text-decoration:underline">Document Vault</strong></li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="dna-step card">
                    <h3 class="dna-card-title">&#9989; Evidence Strength Checklist</h3>
                    <p>Use this checklist to evaluate how strong your combined evidence is:</p>
                    <div class="dna-checklist">
                        <div class="dna-check-item dna-check-gold">
                            <span class="dna-check-icon">&#9733;</span>
                            <div>
                                <h4>Direct Dawes Roll Enrollment</h4>
                                <p>Your ancestor appears on the Dawes Rolls as a Freedmen enrollee — strongest possible documentary evidence</p>
                            </div>
                        </div>
                        <div class="dna-check-item dna-check-gold">
                            <span class="dna-check-icon">&#9733;</span>
                            <div>
                                <h4>Indigenous Haplogroup (mtDNA or Y-DNA)</h4>
                                <p>You carry haplogroup A, B, C, D, X (maternal) or Q, C (paternal) — definitive proof of Indigenous lineage in that line</p>
                            </div>
                        </div>
                        <div class="dna-check-item dna-check-strong">
                            <span class="dna-check-icon">&#10004;</span>
                            <div>
                                <h4>Indigenous American Autosomal DNA</h4>
                                <p>Your ethnicity estimate shows Indigenous Americas percentage — strong supporting evidence</p>
                            </div>
                        </div>
                        <div class="dna-check-item dna-check-strong">
                            <span class="dna-check-icon">&#10004;</span>
                            <div>
                                <h4>DNA Match Triangulation</h4>
                                <p>Multiple DNA matches who share a common Dawes Roll ancestor — confirms specific lineage connection</p>
                            </div>
                        </div>
                        <div class="dna-check-item dna-check-moderate">
                            <span class="dna-check-icon">&#10003;</span>
                            <div>
                                <h4>Freedmen's Bureau Records</h4>
                                <p>Ancestor appears in Bureau labor contracts, marriage records, or ration lists in Indian Territory</p>
                            </div>
                        </div>
                        <div class="dna-check-item dna-check-moderate">
                            <span class="dna-check-icon">&#10003;</span>
                            <div>
                                <h4>Federal Census in Indian Territory</h4>
                                <p>Ancestor listed in 1870-1910 census in Indian Territory or early Oklahoma</p>
                            </div>
                        </div>
                        <div class="dna-check-item dna-check-moderate">
                            <span class="dna-check-icon">&#10003;</span>
                            <div>
                                <h4>Land Allotment Records</h4>
                                <p>Ancestor received land allotment tied to Dawes Roll enrollment</p>
                            </div>
                        </div>
                        <div class="dna-check-item dna-check-supporting">
                            <span class="dna-check-icon">&#8226;</span>
                            <div>
                                <h4>Family Oral History</h4>
                                <p>Consistent family stories about tribal connections, Indian Territory, or specific tribal affiliations</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ============================================================ -->
            <!-- SECTION 5: COMMON FREEDMEN HAPLOGROUPS                       -->
            <!-- ============================================================ -->
            <div id="dna-sec-5" class="dna-section">
                <div class="dna-section-header">
                    <span class="dna-section-number">05</span>
                    <div>
                        <h2 class="dna-section-title">Common Haplogroups in Freedmen Descendants</h2>
                        <p class="dna-section-desc">Understanding the genetic lineages found among Black Indigenous Freedmen communities</p>
                    </div>
                </div>

                <div class="dna-step card">
                    <h3 class="dna-card-title">&#129516; The Genetic Mosaic of Freedmen Descendants</h3>
                    <p>Black Indigenous Freedmen descendants carry a unique combination of haplogroups reflecting their complex heritage — Indigenous American, West &amp; Central heritage, and European admixture from the colonial period. Below are the haplogroups most commonly found in Freedmen descendant communities:</p>

                    <h4 class="dna-subheading">&#128105; Maternal Haplogroups (mtDNA) Found in Freedmen Descendants:</h4>
                    <div class="dna-haplo-table">
                        <div class="dna-haplo-row dna-haplo-row-header">
                            <span>Haplogroup</span>
                            <span>Origin</span>
                            <span>Frequency</span>
                            <span>Significance</span>
                        </div>
                        <div class="dna-haplo-row">
                            <span class="dna-haplo-cell-name">L2a</span>
                            <span>West &amp; Central</span>
                            <span>~20%</span>
                            <span>Most common L haplogroup among Freedmen; indicates deep ancestral connection to the Senegambia and Sierra Leone regions</span>
                        </div>
                        <div class="dna-haplo-row">
                            <span class="dna-haplo-cell-name">L3</span>
                            <span>West &amp; Central</span>
                            <span>~15%</span>
                            <span>Broad haplogroup with many subclades; parent group of haplogroups M and N which migrated out of the continent</span>
                        </div>
                        <div class="dna-haplo-row">
                            <span class="dna-haplo-cell-name">L1b</span>
                            <span>West &amp; Central</span>
                            <span>~10%</span>
                            <span>Common in the Gulf of Guinea region; found in Freedmen communities across all Five Tribes</span>
                        </div>
                        <div class="dna-haplo-row dna-haplo-row-indigenous">
                            <span class="dna-haplo-cell-name">A2</span>
                            <span>Indigenous American</span>
                            <span>~8%</span>
                            <span>Indigenous maternal haplogroup; <strong>definitive proof of Indigenous maternal ancestry</strong> — common among Cherokee and Choctaw lines</span>
                        </div>
                        <div class="dna-haplo-row dna-haplo-row-indigenous">
                            <span class="dna-haplo-cell-name">B2</span>
                            <span>Indigenous American</span>
                            <span>~5%</span>
                            <span>Second most common Indigenous maternal haplogroup; found among Chickasaw and Choctaw descendant lines</span>
                        </div>
                        <div class="dna-haplo-row dna-haplo-row-indigenous">
                            <span class="dna-haplo-cell-name">C1</span>
                            <span>Indigenous American</span>
                            <span>~3%</span>
                            <span>Found among Creek and Seminole Freedmen descendant lines; less common but highly significant</span>
                        </div>
                        <div class="dna-haplo-row">
                            <span class="dna-haplo-cell-name">H</span>
                            <span>European</span>
                            <span>~5%</span>
                            <span>European maternal haplogroup; reflects colonial-era European admixture in some Freedmen lines</span>
                        </div>
                        <div class="dna-haplo-row">
                            <span class="dna-haplo-cell-name">U6</span>
                            <span>North / Mediterranean</span>
                            <span>~2%</span>
                            <span>Found in some Freedmen families; may indicate North or Mediterranean ancestry</span>
                        </div>
                    </div>

                    <h4 class="dna-subheading" style="margin-top:30px">&#128104; Paternal Haplogroups (Y-DNA) Found in Freedmen Descendants:</h4>
                    <div class="dna-haplo-table">
                        <div class="dna-haplo-row dna-haplo-row-header">
                            <span>Haplogroup</span>
                            <span>Origin</span>
                            <span>Frequency</span>
                            <span>Significance</span>
                        </div>
                        <div class="dna-haplo-row">
                            <span class="dna-haplo-cell-name">E1b1a</span>
                            <span>West &amp; Central</span>
                            <span>~45%</span>
                            <span>Most common paternal haplogroup; found broadly across West and Central regions</span>
                        </div>
                        <div class="dna-haplo-row dna-haplo-row-indigenous">
                            <span class="dna-haplo-cell-name">Q-M3</span>
                            <span>Indigenous American</span>
                            <span>~8%</span>
                            <span><strong>Primary Indigenous paternal haplogroup</strong>; definitive proof of Indigenous paternal ancestry</span>
                        </div>
                        <div class="dna-haplo-row">
                            <span class="dna-haplo-cell-name">R1b</span>
                            <span>European</span>
                            <span>~15%</span>
                            <span>Common European paternal haplogroup; reflects colonial-era European admixture</span>
                        </div>
                        <div class="dna-haplo-row dna-haplo-row-indigenous">
                            <span class="dna-haplo-cell-name">Q-L54</span>
                            <span>Indigenous American</span>
                            <span>~3%</span>
                            <span>Parent clade of Q-M3; also Indigenous American but found more broadly across the Americas</span>
                        </div>
                        <div class="dna-haplo-row dna-haplo-row-indigenous">
                            <span class="dna-haplo-cell-name">C-P39</span>
                            <span>Indigenous American</span>
                            <span>~2%</span>
                            <span>Rare but significant Indigenous paternal haplogroup; more common in northern tribes but documented in southeast</span>
                        </div>
                        <div class="dna-haplo-row">
                            <span class="dna-haplo-cell-name">R1a</span>
                            <span>European/Eurasian</span>
                            <span>~3%</span>
                            <span>Less common European haplogroup; may also indicate Eurasian connections</span>
                        </div>
                        <div class="dna-haplo-row">
                            <span class="dna-haplo-cell-name">E1b1b</span>
                            <span>North / Mediterranean</span>
                            <span>~4%</span>
                            <span>Found in North and Mediterranean regions; appears in some Freedmen descendant lines</span>
                        </div>
                    </div>

                    <div class="dna-callout dna-callout-gold" style="margin-top:24px">
                        <h4>&#128161; Key Takeaway</h4>
                        <p>If you carry haplogroup <strong>A2, B2, C1, D1, or X2a</strong> (maternal) or <strong>Q-M3, Q-L54, or C-P39</strong> (paternal), you have <strong>unambiguous genetic proof</strong> of Indigenous American ancestry in that direct lineage. This evidence is independent of autosomal DNA percentages and cannot be diluted by admixture — it traces your unbroken maternal or paternal line back thousands of years.</p>
                    </div>
                </div>
            </div>

            <!-- ============================================================ -->
            <!-- SECTION 6: UPLOADING DNA RESULTS                             -->
            <!-- ============================================================ -->
            <div id="dna-sec-6" class="dna-section">
                <div class="dna-section-header">
                    <span class="dna-section-number">06</span>
                    <div>
                        <h2 class="dna-section-title">Uploading DNA Results to Databases</h2>
                        <p class="dna-section-desc">Maximize your matches and research by sharing your DNA data across multiple platforms</p>
                    </div>
                </div>

                <div class="dna-step card">
                    <h3 class="dna-card-title">&#128228; Why Upload Your Raw DNA Data?</h3>
                    <p>Each testing company only shows you matches within their own database. By downloading your raw DNA data and uploading it to other platforms, you can <strong>dramatically increase</strong> the number of potential relative matches — often for free. This is especially important for Freedmen research because your Indigenous relatives may have tested with a different company.</p>
                </div>

                <div class="dna-step card">
                    <h3 class="dna-card-title">Step-by-Step: Download Your Raw Data</h3>

                    <div class="dna-upload-steps">
                        <div class="dna-upload-company">
                            <h4>&#128229; From AncestryDNA:</h4>
                            <ol class="dna-numbered-list">
                                <li>Log in to your Ancestry account at <strong>ancestry.com</strong></li>
                                <li>Click the <strong>DNA</strong> tab in the top navigation</li>
                                <li>Click <strong>"Settings"</strong> (gear icon in the upper right)</li>
                                <li>Scroll down to <strong>"Download Raw DNA Data"</strong></li>
                                <li>Click <strong>"Download"</strong> — you'll receive an email confirmation</li>
                                <li>Click the link in the email to download your .zip file</li>
                                <li>Save the file — it contains your raw genotype data in a .txt format</li>
                            </ol>
                        </div>
                        <div class="dna-upload-company">
                            <h4>&#128229; From 23andMe:</h4>
                            <ol class="dna-numbered-list">
                                <li>Log in at <strong>23andme.com</strong></li>
                                <li>Go to <strong>"Browse Raw Data"</strong> under the DNA menu, or go to Settings</li>
                                <li>Scroll to <strong>"Download Raw Data"</strong></li>
                                <li>Click <strong>"Submit Request"</strong></li>
                                <li>Confirm via email and download the .zip file</li>
                                <li>The file will be in a .txt format compatible with most upload platforms</li>
                            </ol>
                        </div>
                        <div class="dna-upload-company">
                            <h4>&#128229; From FamilyTreeDNA:</h4>
                            <ol class="dna-numbered-list">
                                <li>Log in at <strong>familytreedna.com</strong></li>
                                <li>Go to your <strong>"Family Finder"</strong> results</li>
                                <li>Click the <strong>"Download Raw Data"</strong> button</li>
                                <li>Choose <strong>"Build 37 Raw Data Concatenated"</strong> for maximum compatibility</li>
                                <li>Download the .csv.gz file</li>
                            </ol>
                        </div>
                    </div>
                </div>

                <div class="dna-step card">
                    <h3 class="dna-card-title">Step-by-Step: Upload to Free Databases</h3>

                    <div class="dna-upload-grid">
                        <div class="dna-upload-platform">
                            <div class="dna-upload-platform-header">
                                <h4>GEDmatch</h4>
                                <span class="dna-badge dna-badge-essential">Essential</span>
                            </div>
                            <p class="dna-upload-desc">The most important free platform for Freedmen research. GEDmatch allows you to compare your DNA with people who tested at ANY company, and offers specialized admixture calculators that break down Indigenous American heritage in detail.</p>
                            <h5>Upload Steps:</h5>
                            <ol class="dna-numbered-list">
                                <li>Go to <strong>gedmatch.com</strong> and create a free account</li>
                                <li>Click <strong>"Generic Upload"</strong> from the main page</li>
                                <li>Select your testing company from the dropdown</li>
                                <li>Upload your raw DNA .zip or .txt file</li>
                                <li>Wait 24-48 hours for processing</li>
                                <li>Once processed, use <strong>"One-to-Many"</strong> to find matches across all companies</li>
                                <li>Use <strong>"Admixture Heritage"</strong> calculators (try "Dodecad World9" or "Eurogenes K13") for detailed Indigenous American breakdown</li>
                                <li>Use the <strong>"Chromosome Browser"</strong> to compare specific DNA segments with Indigenous matches</li>
                            </ol>
                            <div class="dna-pro-tip">
                                <strong>&#128161; Freedmen Research Tip:</strong> Use GEDmatch's "Are your parents related?" tool to check for endogamy (common in small tribal communities). This helps you correctly interpret shared DNA amounts with matches.
                            </div>
                        </div>

                        <div class="dna-upload-platform">
                            <div class="dna-upload-platform-header">
                                <h4>MyHeritage</h4>
                                <span class="dna-badge dna-badge-recommended">Recommended</span>
                            </div>
                            <p class="dna-upload-desc">MyHeritage has a growing database and excellent tools for matching and family tree building. Upload is free; some advanced features require a subscription.</p>
                            <h5>Upload Steps:</h5>
                            <ol class="dna-numbered-list">
                                <li>Go to <strong>myheritage.com/dna</strong> and create a free account</li>
                                <li>Click <strong>"Upload DNA Data"</strong></li>
                                <li>Select your file and upload</li>
                                <li>Wait 2-4 weeks for DNA matching to complete</li>
                                <li>Review your ethnicity estimate and DNA matches</li>
                                <li>Use their <strong>Theory of Family Relativity</strong> to connect DNA matches to potential common ancestors</li>
                            </ol>
                        </div>

                        <div class="dna-upload-platform">
                            <div class="dna-upload-platform-header">
                                <h4>FamilyTreeDNA</h4>
                                <span class="dna-badge dna-badge-recommended">Recommended</span>
                            </div>
                            <p class="dna-upload-desc">If you tested elsewhere, upload to FamilyTreeDNA to access their Chromosome Browser and join haplogroup projects.</p>
                            <h5>Upload Steps:</h5>
                            <ol class="dna-numbered-list">
                                <li>Go to <strong>familytreedna.com</strong> and create an account</li>
                                <li>Click <strong>"Autosomal Transfer"</strong></li>
                                <li>Upload your raw data file from AncestryDNA or 23andMe</li>
                                <li>Basic matching is free; unlock advanced features for ~$19</li>
                                <li>Join the <strong>Native American Y-DNA</strong> or <strong>mtDNA projects</strong> for specialized matching</li>
                            </ol>
                        </div>

                        <div class="dna-upload-platform">
                            <div class="dna-upload-platform-header">
                                <h4>DNA.Land</h4>
                                <span class="dna-badge dna-badge-good">Optional</span>
                            </div>
                            <p class="dna-upload-desc">A free research-oriented platform from the New York Genome Center. Provides ancestry analysis and contributes to genetic research.</p>
                            <h5>Upload Steps:</h5>
                            <ol class="dna-numbered-list">
                                <li>Go to <strong>dna.land</strong> and register</li>
                                <li>Upload your raw DNA data file</li>
                                <li>Receive ancestry analysis and relative matching</li>
                                <li>Your data contributes to scientific research (opt-in)</li>
                            </ol>
                        </div>
                    </div>
                </div>

                <div class="dna-step card">
                    <h3 class="dna-card-title">&#128274; Privacy &amp; Safety Tips</h3>
                    <div class="dna-privacy-grid">
                        <div class="dna-privacy-item">
                            <span class="dna-privacy-icon">&#128274;</span>
                            <div>
                                <h4>Read Privacy Policies</h4>
                                <p>Before uploading, read each platform's privacy policy. Understand how your data will be stored, shared, and whether you can delete it later.</p>
                            </div>
                        </div>
                        <div class="dna-privacy-item">
                            <span class="dna-privacy-icon">&#128272;</span>
                            <div>
                                <h4>Use Strong Passwords</h4>
                                <p>Your DNA data is uniquely personal. Use unique, strong passwords for each genealogy platform and enable two-factor authentication when available.</p>
                            </div>
                        </div>
                        <div class="dna-privacy-item">
                            <span class="dna-privacy-icon">&#128101;</span>
                            <div>
                                <h4>Manage Match Visibility</h4>
                                <p>Most platforms let you control whether you appear in other people's match lists. Adjust these settings according to your comfort level.</p>
                            </div>
                        </div>
                        <div class="dna-privacy-item">
                            <span class="dna-privacy-icon">&#128451;</span>
                            <div>
                                <h4>Keep Backup Copies</h4>
                                <p>Always keep your raw DNA data files saved locally. Store copies in your <strong onclick="BAO_App.navigate('document-vault')" style="color:var(--accent);cursor:pointer;text-decoration:underline">Document Vault</strong> and on a USB drive.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ===== DNA RESOURCES — Pulled dynamically from Resource Library ===== -->
            <div class="dna-section" style="margin-top:24px;">
                <div class="dna-section-header">
                    <span class="dna-section-number">&#128279;</span>
                    <div>
                        <h2 class="dna-section-title">DNA &amp; Heritage Resources</h2>
                        <p class="dna-section-desc">Curated from the Resource Library — testing services, guides, and research tools</p>
                    </div>
                </div>
                <div id="dna-resource-preview" class="dna-resource-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin-top:16px;">
                    ${BAO_ResourceRank.getRanked('DNA', 6).map(function(r, idx){
                        var badge = BAO_ResourceRank.getBadge(r.sourceType);
                        var badgeCls = BAO_ResourceRank.getBadgeClass(r.sourceType);
                        var isTop = idx === 0;
                        return '<a href="' + r.url + '" target="_blank" rel="noopener" class="card' + (isTop ? ' dna-res-card-top' : '') + '" style="display:block;text-decoration:none;padding:16px;border:1px solid var(--border-color);transition:all 0.2s ease;cursor:pointer;position:relative;">' +
                            (badge ? '<span class="rank-badge ' + badgeCls + '">' + badge + '</span>' : '') +
                            '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">' +
                                '<span style="font-size:1.4rem;">' + r.icon + '</span>' +
                                '<span style="font-size:0.7rem;padding:3px 10px;background:rgba(255,184,48,0.1);border:1px solid rgba(255,184,48,0.25);border-radius:12px;color:var(--accent);font-weight:600;">' + r.type + '</span>' +
                                (r.verified ? '<span style="font-size:0.65rem;color:var(--success);">&#10003; Verified</span>' : '') +
                            '</div>' +
                            '<h4 style="margin:0 0 6px;font-size:0.9rem;color:var(--text-primary);line-height:1.3;">' + r.title + '</h4>' +
                            '<p style="margin:0;font-size:0.78rem;color:var(--text-muted);line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">' + r.description + '</p>' +
                        '</a>';
                    }).join('')}
                </div>
                <div style="text-align:center;margin-top:16px;">
                    <button class="btn btn-secondary" onclick="BAO_App.navigate('resources')" style="font-size:0.85rem;">View Full Resource Library &#8594;</button>
                </div>
            </div>

            <!-- ===== NEXT STEPS CTA ===== -->
            <div class="dna-cta-section">
                <div class="dna-cta-card card">
                    <h3>&#127793; Ready to Begin Your Research?</h3>
                    <p>Now that you understand DNA testing, haplogroups, paper trail research, and how to combine them, start building your ancestry proof today.</p>
                    <div class="dna-cta-buttons">
                        <button class="btn btn-primary" onclick="BAO_App.navigate('dawes-rolls')">&#128220; Search Dawes Rolls</button>
                        <button class="btn btn-secondary" onclick="BAO_App.navigate('freedmen-records')">&#128240; Browse Freedmen Records</button>
                        <button class="btn btn-secondary" onclick="BAO_App.navigate('ancestor-profiles')">&#128100; Ancestor Profiles</button>
                        <button class="btn btn-secondary" onclick="BAO_App.navigate('document-vault')">&#128451; Document Vault</button>
                    </div>
                </div>
            </div>

        </div>`;
    },

    // =========== 10. FREEDMEN MIGRATION ROUTES (Leaflet.js) ===========
    'migration-routes'() {
        setTimeout(function(){ BAO_MigrationMap.init(); }, 100);
        var legend = [
            {id:'choctaw',color:'#FFB830',label:'Choctaw (1831–33)'},
            {id:'cherokee',color:'#E8443A',label:'Cherokee (1836–39)'},
            {id:'creek',color:'#4ECDC4',label:'Creek (1836–37)'},
            {id:'chickasaw',color:'#C084FC',label:'Chickasaw (1837–38)'},
            {id:'seminole',color:'#F59E0B',label:'Seminole (1836–42)'},
            {id:'great-migration',color:'#818CF8',label:'Great Migration (1910–70)'},
            {id:'exoduster',color:'#F97316',label:'Exoduster (1879)'},
            {id:'choctaw-real-example',color:'#E0A96D',label:'&#128220; Historical Example'}
        ];
        return `
        <div class="page-enter">
            <h2 style="margin-bottom:4px">Freedmen Migration Routes</h2>
            <p style="color:var(--text-secondary);margin-bottom:16px">Interactive cinematic map tracing forced removal and migration of the Five Civilized Tribes and their Freedmen</p>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">
                <button class="mmap-action-btn" onclick="BAO_MigrationMap.startStory()">&#127916; Start Migration Story</button>
                <button class="mmap-action-btn mmap-action-secondary" onclick="BAO_MigrationMap.highlightAncestorRoute()">&#128100; Show Ancestor Route</button>
                <button class="mmap-action-btn mmap-action-secondary" onclick="BAO_MigrationMap.resetHighlight()">&#128260; Reset View</button>
            </div>
            <div class="map-container section-mb" style="background:#050310;border:1px solid rgba(255,184,48,0.12);overflow:hidden;position:relative;border-radius:16px;">
                <div id="leaflet-migration-map" style="width:100%;height:500px;background:#050310;z-index:1;"></div>
                <div id="mmap-ancestor-label" class="mmap-ancestor-label" style="display:none;"></div>
                <div id="mmap-focus-label" class="mmap-focus-label" style="display:none;"></div>
                <div id="mmap-story-panel" class="mmap-story-panel" style="display:none;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <span style="font-size:0.72rem;color:#FFB830;font-family:Cinzel,serif;letter-spacing:1px;">MIGRATION STORY</span>
                        <button onclick="BAO_MigrationMap.exitStory()" style="background:none;border:none;color:#FFB830;cursor:pointer;font-size:1.1rem;">&times;</button>
                    </div>
                    <div id="mmap-story-content"></div>
                    <div style="margin-top:10px;">
                        <div style="height:3px;background:rgba(255,184,48,0.1);border-radius:3px;overflow:hidden;margin-bottom:10px;">
                            <div id="mmap-story-progress" style="height:100%;background:#FFB830;width:0%;transition:width 0.6s ease;border-radius:3px;"></div>
                        </div>
                        <div style="display:flex;gap:8px;">
                            <button id="mmap-story-prev" class="mmap-story-btn" onclick="BAO_MigrationMap.prevStory()">&#9664; Prev</button>
                            <button id="mmap-story-next" class="mmap-story-btn mmap-story-btn-primary" onclick="BAO_MigrationMap.nextStory()">Next &#9654;</button>
                        </div>
                    </div>
                </div>
                <div class="mmap-legend">
                    ${legend.map(function(li){return '<button class="mmap-legend-pill mmap-filter-active" id="mf-'+li.id+'" onclick="BAO_MigrationMap.toggleFilter(\''+li.id+'\')"><span class="mmap-legend-dot" style="background:'+li.color+';"></span>'+li.label+'</button>';}).join('')}
                    <span class="mmap-legend-sep">|</span>
                    <button class="mmap-legend-pill mmap-filter-active" id="mf-ancestors" onclick="BAO_MigrationMap.toggleFilter('ancestors')">&#128100; Ancestors</button>
                    <button class="mmap-legend-pill mmap-filter-off" id="mf-sources" onclick="BAO_MigrationMap.toggleFilter('sources')">&#128218; Sources</button>
                </div>
            </div>
            <div class="mmap-filter-panel">
                <h4 style="margin:0 0 10px;color:var(--accent);font-family:Cinzel,serif;font-size:0.85rem;">&#9881; Layer Controls</h4>
                <div style="display:flex;flex-wrap:wrap;gap:6px;">
                    ${legend.map(function(li){return '<button class="mmap-filter-btn mmap-filter-active" onclick="BAO_MigrationMap.toggleFilter(\''+li.id+'\');this.classList.toggle(\'mmap-filter-active\');this.classList.toggle(\'mmap-filter-off\');" style="border-color:'+li.color+';color:'+li.color+';">'+li.label+'</button>';}).join('')}
                    <button class="mmap-filter-btn mmap-filter-active" onclick="BAO_MigrationMap.toggleFilter('ancestors');this.classList.toggle('mmap-filter-active');this.classList.toggle('mmap-filter-off');" style="border-color:#FFB830;color:#FFB830;">&#128100; Ancestors</button>
                    <button class="mmap-filter-btn mmap-filter-off" onclick="BAO_MigrationMap.toggleFilter('sources');this.classList.toggle('mmap-filter-active');this.classList.toggle('mmap-filter-off');" style="border-color:#FFB830;color:#FFB830;">&#128218; Historical Sources</button>
                </div>
            </div>
            <h3 style="margin:28px 0 16px;color:var(--accent);font-family:'Cinzel',serif;">Historical Migration Details</h3>
            <div style="display:flex;flex-direction:column;gap:12px">
                ${BAO_DATA.migrationRoutes.map(function(r,i) {
                    var colors = ['#FFB830','#E8443A','#4ECDC4','#C084FC','#F59E0B','#818CF8','#F97316'];
                    var icons = ['&#127963;','&#128167;','&#9876;','&#128156;','&#127796;','&#127747;','&#128652;'];
                    var c = colors[i % colors.length];
                    var ic = icons[i % icons.length];
                    var rgbMap = {'#FFB830':'255,184,48','#E8443A':'232,68,58','#4ECDC4':'78,205,196','#C084FC':'192,132,252','#F59E0B':'245,158,11','#818CF8':'129,140,248','#F97316':'249,115,22'};
                    var rgb = rgbMap[c] || '255,184,48';
                    return '<div class="card route-card" style="border-left:3px solid '+c+';">' +
                        '<div class="route-icon" style="background:rgba('+rgb+',0.12);color:'+c+';border-radius:12px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;">'+ic+'</div>' +
                        '<div style="flex:1">' +
                            '<h4 style="color:'+c+'">'+r.name+'</h4>' +
                            '<div style="display:flex;align-items:center;gap:8px;margin:6px 0;font-size:0.88rem">' +
                                '<span style="color:var(--text-secondary)">'+r.from+'</span>' +
                                '<span style="color:'+c+';font-size:1.1rem">&#10141;</span>' +
                                '<span style="color:var(--accent)">'+r.to+'</span>' +
                            '</div>' +
                            '<p style="font-size:0.85rem;color:var(--text-muted);line-height:1.6">'+r.description+'</p>' +
                            '<span class="tag" style="background:rgba('+rgb+',0.12);color:'+c+';border-color:transparent;">'+r.period+'</span>' +
                        '</div>' +
                    '</div>';
                }).join('')}
            </div>
        </div>`;
    },

    // =========== 11. HISTORICAL TIMELINE ===========
    'historical-timeline'() {
        const categories = ['all', 'origins', 'enslavement', 'removal', 'civil-war', 'treaty', 'dawes', 'statehood', 'modern'];
        return `
        <div class="page-enter">
            <h2 style="margin-bottom:4px">Historical Timeline</h2>
            <p style="color:var(--text-secondary);margin-bottom:20px">Key events in the history of Black Indigenous Freedmen</p>

            <div class="timeline-filter">
                ${categories.map(c => `
                    <button class="timeline-filter-btn ${c === 'all' ? 'active' : ''}" onclick="BAO_Pages.filterTimeline('${c}')" data-cat="${c}">
                        ${c === 'all' ? 'All Events' : c.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </button>
                `).join('')}
            </div>

            <div class="timeline" id="timeline-container">
                ${BAO_DATA.timeline.map(t => `
                    <div class="timeline-item" data-category="${t.category}">
                        <div class="timeline-dot"></div>
                        <div class="timeline-year">${t.year}</div>
                        <div class="timeline-content">
                            <h4>${t.title}</h4>
                            <p>${t.description}</p>
                            <span class="timeline-tag">${t.category.replace('-', ' ')}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>`;
    },

    // =========== 12. NAME ORIGINS ===========
    'name-origins'() {
        return `
        <div class="page-enter">
            <h2 style="margin-bottom:4px">Name Origins</h2>
            <p style="color:var(--text-secondary);margin-bottom:24px">Understanding the origins and significance of Freedmen surnames</p>

            <div class="info-callout section-mb">
                <h4>&#128221; About Freedmen Names</h4>
                <p>After emancipation, formerly enslaved people chose or were assigned surnames. Many took the names of former enslavers, while others chose names reflecting their new status, Indigenous heritage, or aspirations. Understanding naming patterns is a crucial genealogical tool.</p>
            </div>

            <div class="records-search section-mb-sm">
                <input type="text" id="name-search" placeholder="Search surnames..." oninput="BAO_Pages.filterNames()" style="flex:1">
            </div>

            <div class="grid-2" id="name-list">
                ${BAO_DATA.nameOrigins.map(n => `
                    <div class="card name-card" data-search="${n.name.toLowerCase()} ${n.origin.toLowerCase()} ${n.context.toLowerCase()}">
                        <div class="name-display">${n.name}</div>
                        <div class="name-meaning">"${n.meaning}"</div>
                        <div class="name-origin-label">Origin</div>
                        <p style="font-size:0.88rem;color:var(--text-secondary);margin-bottom:10px">${n.origin}</p>
                        <div class="name-origin-label">Historical Context</div>
                        <p style="font-size:0.85rem;color:var(--text-muted)">${n.context}</p>
                        <div style="margin-top:10px"><span class="badge badge-gold">${n.frequency}</span></div>
                    </div>
                `).join('')}
            </div>
        </div>`;
    },

    // =========== 13. DOCUMENT VAULT ===========
    'document-vault'() {
        const docs = BAO_Utils.documents.getAll();
        const categories = ['All', 'Enrollment Card', 'Census Record', 'Land Patent', 'Marriage Certificate', 'Death Certificate', 'Military Record', 'Photograph', 'Scanned Document', 'Other'];
        const docCount = docs.length;
        const scannedCount = docs.filter(d => d.fileData).length;
        const totalSize = docs.reduce((sum, d) => sum + (d.fileSize || 0), 0);

        return `
        <div class="page-enter">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px">
                <div>
                    <h2 style="margin-bottom:4px">&#128451; Document Vault</h2>
                    <p style="color:var(--text-secondary);font-size:0.88rem">${docCount} documents stored${scannedCount > 0 ? ' · ' + scannedCount + ' with files' : ''}${totalSize > 0 ? ' · ' + (totalSize / 1024).toFixed(0) + ' KB' : ''}</p>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap">
                    <button class="btn btn-accent btn-sm" onclick="BAO_Pages.scanDocument()" style="display:flex;align-items:center;gap:6px">&#128247; Scan Document</button>
                    <button class="btn btn-primary btn-sm" onclick="BAO_Pages.uploadDocumentAdvanced()" style="display:flex;align-items:center;gap:6px">&#128228; Upload File</button>
                    <button class="btn btn-secondary btn-sm" onclick="BAO_Pages.uploadDocument()">+ Quick Add</button>
                </div>
            </div>

            <!-- Scanner & Upload Zone -->
            <div class="vault-action-cards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:24px">
                <div class="card" style="cursor:pointer;text-align:center;padding:24px 16px;border:2px dashed rgba(255,184,48,0.25);transition:all 0.3s" onclick="BAO_Pages.scanDocument()" onmouseover="this.style.borderColor='rgba(255,184,48,0.5)'" onmouseout="this.style.borderColor='rgba(255,184,48,0.25)'">
                    <div style="font-size:2.5rem;margin-bottom:8px">&#128247;</div>
                    <h4 style="color:var(--accent);margin-bottom:4px">Scan Document</h4>
                    <p style="font-size:0.78rem;color:var(--text-muted)">Use your camera to scan physical documents, Dawes cards, certificates</p>
                </div>
                <div class="card" style="cursor:pointer;text-align:center;padding:24px 16px;border:2px dashed rgba(255,184,48,0.25);transition:all 0.3s" onclick="BAO_Pages.uploadDocumentAdvanced()" onmouseover="this.style.borderColor='rgba(255,184,48,0.5)'" onmouseout="this.style.borderColor='rgba(255,184,48,0.25)'">
                    <div style="font-size:2.5rem;margin-bottom:8px">&#128228;</div>
                    <h4 style="color:var(--accent);margin-bottom:4px">Upload File</h4>
                    <p style="font-size:0.78rem;color:var(--text-muted)">Upload photos, PDFs, or images from your device</p>
                </div>
                <div class="card" style="cursor:pointer;text-align:center;padding:24px 16px;border:2px dashed rgba(255,184,48,0.25);transition:all 0.3s" onclick="BAO_Pages.uploadDocument()" onmouseover="this.style.borderColor='rgba(255,184,48,0.5)'" onmouseout="this.style.borderColor='rgba(255,184,48,0.25)'">
                    <div style="font-size:2.5rem;margin-bottom:8px">&#128221;</div>
                    <h4 style="color:var(--accent);margin-bottom:4px">Quick Add</h4>
                    <p style="font-size:0.78rem;color:var(--text-muted)">Create a document record with name, category, and notes</p>
                </div>
            </div>

            <!-- Category filter -->
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">
                ${categories.map((c, i) => `<button class="tag ${i === 0 ? 'tag-active' : ''}" onclick="BAO_Pages.filterVaultDocs('${c}', this)" style="cursor:pointer">${c}</button>`).join('')}
            </div>

            <!-- Document Grid -->
            ${docs.length === 0 ? `
                <div class="empty-state">
                    <div class="empty-state-icon">&#128451;</div>
                    <h3>Your Vault is Empty</h3>
                    <p style="margin-bottom:16px">Scan or upload documents to build your genealogical archive. Store Dawes cards, certificates, photos, and records.</p>
                    <button class="btn btn-accent" onclick="BAO_Pages.scanDocument()">&#128247; Scan Your First Document</button>
                </div>
            ` : `
                <div class="vault-grid" id="vault-doc-grid">
                    ${docs.map(d => {
                        const icon = d.fileData ? (d.fileType === 'application/pdf' ? '&#128196;' : '&#128247;') : (d.type === 'image' ? '&#128247;' : '&#128196;');
                        const hasPreview = d.fileData && d.fileType && d.fileType.startsWith('image/');
                        return `
                        <div class="vault-item" onclick="BAO_Pages.viewDocument('${d.id}')" data-category="${d.category || 'Other'}">
                            ${hasPreview ? `<div class="vault-thumb" style="background-image:url(${d.fileData});background-size:cover;background-position:center;height:100px;border-radius:8px;margin-bottom:8px"></div>` : `<div class="vault-icon">${icon}</div>`}
                            <div class="vault-name">${BAO_Utils.escapeHTML(d.name)}</div>
                            <div class="vault-meta">${d.category || 'Uncategorized'} — ${BAO_Utils.formatDate(d.uploadedAt)}</div>
                            ${d.fileSize ? `<div style="font-size:0.68rem;color:var(--text-muted);margin-top:2px">${(d.fileSize / 1024).toFixed(1)} KB</div>` : ''}
                        </div>`;
                    }).join('')}
                </div>
            `}

            <div class="card section-mb" style="margin-top:24px">
                <h3 style="margin-bottom:12px">&#128161; Suggested Documents to Collect</h3>
                <div class="grid-2">
                    ${['Dawes Enrollment Cards', 'Land Allotment Patents', 'Marriage Certificates', 'Death Certificates', 'Census Records', 'Freedmen Bureau Records', 'Military Service Records', 'Church Records'].map(d => `
                        <div style="display:flex;align-items:center;gap:10px;padding:8px 0">
                            <span style="color:var(--accent)">&#9744;</span>
                            <span style="font-size:0.88rem">${d}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>`;
    },

    // =========== 14. PHOTO GALLERY ===========
    // ========== PHOTO STORE (Scalable, Indexed) ==========
    _photoStore: null,
    _getPhotoStore: function() {
        if (!this._photoStore) {
            var all = BAO_Utils.photos.getAll();
            var store = { byId: {}, allIds: [] };
            all.forEach(function(p) { store.byId[p.id] = p; store.allIds.push(p.id); });
            this._photoStore = store;
        }
        return this._photoStore;
    },
    _photoStoreAdd: function(photo) {
        var store = this._getPhotoStore();
        store.byId[photo.id] = photo;
        store.allIds.push(photo.id);
    },
    _photoInsightCache: {},

    'photo-gallery'() {
        var store = this._getPhotoStore();
        var count = store.allIds.length;
        var placeholders = [
            { label: 'Family Portrait c.1900', icon: '&#128247;' },
            { label: 'Homestead Photo', icon: '&#127968;' },
            { label: 'Fort Gibson, I.T.', icon: '&#127961;' },
            { label: 'Community Gathering', icon: '&#128101;' },
            { label: 'Church in Boley, OK', icon: '&#9962;' },
            { label: 'Allotment Land', icon: '&#127806;' },
        ];

        // Render only first 50 photos (lazy batch)
        var visibleIds = store.allIds.slice(0, 50);

        return `
        <div class="page-enter">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px">
                <div>
                    <h2 style="margin-bottom:4px">Historical Archive</h2>
                    <p style="color:var(--text-secondary);font-size:0.88rem">${count} photos uploaded · AI-powered analysis</p>
                </div>
                <button class="btn btn-primary" onclick="BAO_Pages.uploadPhoto()">+ Upload Photo</button>
            </div>

            <div class="info-callout section-mb" style="border-color:rgba(255,184,48,0.2);">
                <h4>&#128270; Intelligent Photo Analysis</h4>
                <p>Upload any historical photo and our analysis engine will extract visual clues, match time periods, and connect it to Freedmen genealogy records. Add names, dates, and tribe info for the most accurate insights.</p>
            </div>

            <div class="gallery-grid" id="photo-grid">
                ${visibleIds.map(function(pid) {
                    var p = store.byId[pid];
                    var hasImg = p && p.dataUrl;
                    var tagBadge = p && p.tags && p.tags.tribe ? '<span class="pg-tag-badge">'+p.tags.tribe+'</span>' : '';
                    return '<div class="gallery-item" onclick="BAO_Pages.viewPhoto(\''+pid+'\')">' +
                        (hasImg ? '<img src="'+p.dataUrl+'" alt="'+BAO_Utils.escapeHTML(p.caption||'')+'" class="gallery-img" loading="lazy">' : '<div class="gallery-item-placeholder">&#128247;</div>') +
                        '<div class="gallery-item-overlay">'+BAO_Utils.escapeHTML(p.caption||'Untitled')+tagBadge+'</div>' +
                    '</div>';
                }).join('')}
                ${count === 0 ? placeholders.map(function(p) {
                    return '<div class="gallery-item" style="opacity:0.5"><div class="gallery-item-placeholder">'+p.icon+'</div><div class="gallery-item-overlay">'+p.label+' (Sample)</div></div>';
                }).join('') : ''}
            </div>
            ${count > 50 ? '<button class="btn btn-secondary" style="width:100%;margin-top:16px;" onclick="BAO_Pages._loadMorePhotos()">Load More Photos</button>' : ''}

            <div class="info-callout" style="margin-top:24px">
                <h4>&#128247; Preserving Visual History</h4>
                <p>Photographs are precious links to our ancestors. Scan old photos at high resolution, label them with names and dates, and share copies with family members. Every image preserved is a victory against erasure.</p>
            </div>
        </div>`;
    },

    // =========== 15. ORAL HISTORIES ===========
    'oral-histories'() {
        const histories = BAO_Utils.oralHistories.getAll();

        // Educational voice clip entries
        const voiceClips = [
            { id: 'vc1', title: 'Freedmen Storytelling Traditions', narrator: 'Elder Narration', duration: '3:20', icon: '&#128483;', audio: '',
              content: 'Among the Black Indigenous Freedmen of the Five Civilized Tribes, oral storytelling was survival. Enslaved Africans within the Choctaw, Cherokee, Creek, Chickasaw, and Seminole Nations preserved genealogies and cultural identities through spoken narratives. When written records excluded Black people, the spoken word became the primary archive. Elders recounted ancestors, homesteads, forced marches, and traditions of both African and Indigenous heritage. These stories carried coded information about family connections, land ownership, and tribal leaders who advocated for Freedmen rights.' },
            { id: 'vc2', title: 'Oral History and Genealogy Research', narrator: 'Research Guide', duration: '4:10', icon: '&#128270;', audio: '',
              content: 'Oral history is one of the most powerful tools for Freedmen genealogy research. Official records like the Dawes Rolls and Freedmen Bureau documents often contain errors or omissions. Oral histories fill these gaps. When an elder mentions a specific county, tribe, or migration route, that single detail can unlock an entire research pathway. Researchers should interview family members about surnames, tribal towns, Trail of Tears stories, land allotments, and Dawes Roll card numbers. Even fragments can be cross-referenced with archival records.' },
            { id: 'vc3', title: 'Preserving Cultural Practices', narrator: 'Cultural Preservation', duration: '3:45', icon: '&#127928;', audio: '',
              content: 'Black Indigenous Freedmen blended African spiritual traditions with Native American practices. Families preserved herbal medicine, farming techniques, music combining African rhythms with tribal songs, and spiritual ceremonies honoring both lineages. Creek Freedmen maintained stomp dances alongside African call-and-response singing. Choctaw Freedmen preserved traditional foodways like banaha alongside African cooking. These practices lived in the voices of grandmothers and community elders. Today, organizations work to record these traditions before they are lost.' },
            { id: 'vc4', title: 'Freedmen Women as History Keepers', narrator: 'Women\'s History', duration: '4:00', icon: '&#128105;&#127999;', audio: '',
              content: 'Freedmen women served as the primary keepers of family stories. They memorized entire family lines, burial locations, and land allotments. In Choctaw and Cherokee communities, women practiced kitchen table genealogy during meals, quilting circles, and church gatherings. They could recite six generations from memory, knew which Dawes Roll cards listed family members, and tracked which allotments were lost to land grafters. Their voices are irreplaceable historical documents.' },
            { id: 'vc5', title: 'Recording Your Family Oral History', narrator: 'How-To Guide', duration: '3:55', icon: '&#127908;', audio: '',
              content: 'Recording family oral history is essential for Freedmen descendants. Identify the oldest living relatives. Prepare questions about grandparents, Oklahoma origins, Dawes Rolls, and land allotments. Use your phone to record conversations. Ask about names, places, and dates that connect to written records. Listen for patterns across family members. Preserve recordings by sharing with family and storing digital copies in multiple locations.' }
        ];

        return `
        <div class="page-enter">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px">
                <div>
                    <h2 style="margin-bottom:4px">Oral Histories</h2>
                    <p style="color:var(--text-secondary);font-size:0.88rem">Preserving the spoken word of our ancestors</p>
                </div>
                <button class="btn btn-primary" onclick="BAO_Pages.addOralHistory()">+ Record New Story</button>
            </div>

            <div class="info-callout section-mb">
                <h4>&#127908; Why Oral Histories Matter</h4>
                <p>For Black Indigenous Freedmen, oral traditions preserved knowledge that was excluded from official records. Elders carry memories of family connections, place names, cultural practices, and survival strategies that no document can capture.</p>
            </div>

            <!-- Educational Voice Clips Section -->
            <div class="card section-mb" style="border:1px solid rgba(255,184,48,0.15);">
                <h3 style="color:var(--accent);margin-bottom:4px;">&#127911; Educational Voice Clips</h3>
                <p style="color:var(--text-muted);font-size:0.78rem;margin-bottom:12px;">Tap play to hear content read aloud.</p>
                <audio id="global-oral-audio" preload="auto" style="display:none;"></audio>
                <audio id="global-oral-audio" preload="auto" style="display:none;"></audio>
                <div class="oh-grid">
                    ${voiceClips.map(vc => {
                        var hasAudio = vc.audio && vc.audio.length > 3;
                        return `
                    <div class="oh-card" id="oral-clip-${vc.id}">
                        <div class="oh-card-row">
                            <button class="bao-speak-btn oh-play" id="oral-btn-${vc.id}" data-audio="${vc.audio || ''}" onclick="BAO_Pages.playOralClip('${vc.id}')" title="${hasAudio ? 'Play audio' : 'Play AI narration'}">
                                <span id="oral-icon-${vc.id}">&#9654;</span>
                            </button>
                            <div class="oh-card-info">
                                <div class="oh-card-header">
                                    <span class="oh-card-icon">${vc.icon}</span>
                                    <h4 class="oh-card-title">${vc.title}</h4>
                                </div>
                                <div class="oh-card-meta">${vc.narrator} · ${vc.duration}${hasAudio ? '' : ' · <span style="color:var(--accent);font-size:0.68rem;">AI narration (temporary)</span>'}</div>
                                <p class="oh-card-text" id="oral-text-${vc.id}">${vc.content}</p>
                                <button class="oh-expand-btn" onclick="BAO_Pages.expandOralClip('${vc.id}')" id="oral-expand-${vc.id}">Read more &#9660;</button>
                            </div>
                        </div>
                    </div>`;
                    }).join('')}
                </div>
            </div>

            <!-- User Recorded Histories -->
            <h3 style="margin-bottom:12px;color:var(--text-primary);">&#128214; Your Recorded Stories</h3>
            <div style="display:flex;flex-direction:column;gap:12px">
                ${histories.length > 0 ? histories.map(h => {
                    const bars = Array.from({length: 40}, () => Math.floor(Math.random() * 25) + 5);
                    return `
                    <div class="card audio-card">
                        <div class="audio-icon">&#9654;</div>
                        <div class="audio-info">
                            <h4>${h.title}</h4>
                            <div class="audio-meta">Narrator: ${h.narrator} | ${h.year} | ${h.duration}</div>
                            <p style="font-size:0.85rem;color:var(--text-muted);margin-top:4px">${h.description}</p>
                            <div class="audio-waveform">
                                ${bars.map(b => `<div class="wave-bar" style="height:${b}px"></div>`).join('')}
                            </div>
                            <div style="margin-top:8px">${h.tags.map(t => `<span class="tag">${t}</span>`).join(' ')}</div>
                        </div>
                    </div>`;
                }).join('') : `<div class="card" style="text-align:center;padding:30px;color:var(--text-muted);"><p>No recorded stories yet. Tap "Record New Story" to preserve your family's oral traditions.</p></div>`}
            </div>
        </div>`;
    },

    // =========== 16. COMMUNITY ===========
    community() {
        var tribes = ['Cherokee', 'Choctaw', 'Creek', 'Chickasaw', 'Seminole'];
        return `
        <div class="page-enter">
            <h2 style="margin-bottom:4px">Community</h2>
            <p style="color:var(--text-secondary);margin-bottom:20px">Connect with fellow Freedmen descendants and researchers</p>

            <div class="card section-mb comm-compose">
                <textarea id="community-post-input" placeholder="Share a discovery, ask a question, or tell your story..." class="comm-textarea"></textarea>
                <div class="comm-compose-bar">
                    <div class="comm-tribe-selector">
                        <span style="color:var(--text-muted);font-size:0.8rem;margin-right:6px">Tribe tag:</span>
                        ${tribes.map(t => `<button class="comm-tribe-tag" data-tribe="${t}" onclick="this.classList.toggle('active')">${t}</button>`).join('')}
                    </div>
                    <button class="btn btn-accent" onclick="BAO_Pages.submitPost()">Share with Community</button>
                </div>
            </div>

            <div class="tabs">
                <button class="tab-btn active" onclick="BAO_Pages.switchCommunityTab(this,'all')">All Posts</button>
                <button class="tab-btn" onclick="BAO_Pages.switchCommunityTab(this,'discoveries')">Discoveries</button>
                <button class="tab-btn" onclick="BAO_Pages.switchCommunityTab(this,'tips')">Research Tips</button>
                <button class="tab-btn" onclick="BAO_Pages.switchCommunityTab(this,'rights')">Rights &amp; Advocacy</button>
            </div>

            <div id="community-feed">
                ${this._renderCommunityPosts()}
            </div>
            <div id="community-discoveries" class="comm-tab-content" style="display:none">
                ${this._renderDiscoveries()}
            </div>
            <div id="community-tips" class="comm-tab-content" style="display:none">
                ${this._renderResearchTips()}
            </div>
            <div id="community-rights" class="comm-tab-content" style="display:none">
                ${this._renderRightsContent()}
            </div>
        </div>`;
    },

    _renderPostHTML(p, index) {
        var tribeArr = p.tribe ? (Array.isArray(p.tribe) ? p.tribe : [p.tribe]) : [];
        var tribeTagsHTML = tribeArr.length ? tribeArr.map(function(t) { return '<span class="post-tribe-badge">' + t + '</span>'; }).join('') : '';
        var pinnedBadge = p.pinned ? '<span class="post-pinned-badge">&#128204; Pinned</span>' : '';
        var repliesHTML = '';
        if (p.replies && p.replies.length) {
            repliesHTML = '<div class="post-replies">' + p.replies.map(function(r, ri) {
                return '<div class="post-reply"><div class="reply-header"><span class="reply-avatar">' + (r.avatar || r.author.charAt(0)) + '</span><span class="reply-author">' + r.author + '</span><span class="reply-time">' + r.time + '</span></div><div class="reply-body">' + r.content + '</div></div>';
            }).join('') + '</div>';
        }
        return '<div class="card community-post' + (p.pinned ? ' post-pinned' : '') + '" data-post-index="' + index + '">' +
            (pinnedBadge ? '<div style="margin-bottom:8px">' + pinnedBadge + '</div>' : '') +
            '<div class="post-header"><div class="post-avatar">' + p.avatar + '</div><div><div class="post-author">' + p.author + '</div><div class="post-time">' + p.time + ' &middot; ' + p.topic + '</div>' + (tribeTagsHTML ? '<div style="margin-top:4px">' + tribeTagsHTML + '</div>' : '') + '</div><button class="post-pin-btn" onclick="BAO_Pages.togglePin(' + index + ')" title="Pin post">&#128204;</button></div>' +
            '<div class="post-body">' + p.content + '</div>' +
            '<div class="post-actions">' +
                '<button class="post-action-btn post-like-btn' + (p._liked ? ' liked' : '') + '" onclick="BAO_Pages.toggleLike(' + index + ')">&#10084; <span>' + p.likes + '</span></button>' +
                '<button class="post-action-btn" onclick="BAO_Pages.toggleReplyBox(' + index + ')">&#128172; <span>' + ((p.replies && p.replies.length) || p.comments || 0) + '</span> replies</button>' +
                '<button class="post-action-btn" onclick="BAO_Utils.toast(\'Link copied!\',\'success\')">&#128279; Share</button>' +
            '</div>' +
            repliesHTML +
            '<div class="post-reply-box" id="reply-box-' + index + '" style="display:none">' +
                '<textarea id="reply-input-' + index + '" class="reply-textarea" placeholder="Write a reply..."></textarea>' +
                '<button class="btn btn-accent btn-sm" onclick="BAO_Pages.addReply(' + index + ')">Reply</button>' +
            '</div>' +
        '</div>';
    },

    _renderCommunityPosts() {
        var sorted = BAO_DATA.communityPosts.slice().sort(function(a, b) { return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0); });
        var self = this;
        return sorted.map(function(p) {
            var origIndex = BAO_DATA.communityPosts.indexOf(p);
            return self._renderPostHTML(p, origIndex);
        }).join('');
    },

    _renderDiscoveries() {
        var discoveries = BAO_DATA.communityDiscoveries || [];
        if (!discoveries.length) return '<div class="empty-state"><div class="empty-state-icon">&#128270;</div><h3>No Discoveries Yet</h3><p>Be the first to share a genealogy discovery!</p></div>';
        return discoveries.map(function(d) {
            var typeIcon = {'dawes_card':'&#128220;','dna_result':'&#129516;','document':'&#128196;','citizenship':'&#128220;','photo':'&#128247;'}[d.type] || '&#128196;';
            var verifiedBadge = d.verified ? '<span class="discovery-verified">&#9989; Verified</span>' : '';
            return '<div class="card discovery-card"><div class="discovery-header"><span class="discovery-type-icon">' + typeIcon + '</span><div><div class="discovery-author">' + d.author + ' ' + verifiedBadge + '</div><div class="discovery-time">' + d.time + '</div></div></div>' +
                '<h4 class="discovery-title">' + d.title + '</h4>' +
                '<p class="discovery-desc">' + d.description + '</p>' +
                '<div class="discovery-meta"><span class="discovery-type-badge">' + (d.type || '').replace(/_/g, ' ') + '</span>' +
                (d.tribe ? '<span class="post-tribe-badge">' + d.tribe + '</span>' : '') +
                '</div></div>';
        }).join('');
    },

    _renderResearchTips() {
        var tips = BAO_DATA.communityResearchTips || [];
        if (!tips.length) return '<div class="empty-state"><div class="empty-state-icon">&#128161;</div><h3>No Research Tips Yet</h3></div>';
        return tips.map(function(tip, i) {
            var stepsHTML = tip.steps ? tip.steps.map(function(s, si) { return '<div class="tip-step"><span class="tip-step-num">' + (si + 1) + '</span><span>' + s + '</span></div>'; }).join('') : '';
            return '<div class="card research-tip-card"><div class="tip-header" onclick="BAO_Pages.toggleTipExpand(' + i + ')"><span class="tip-icon">&#128161;</span><div><h4 class="tip-title">' + tip.title + '</h4><div class="tip-category" style="color:var(--text-muted);font-size:0.78rem">' + (tip.category || '') + ' &middot; ' + (tip.difficulty || '') + '</div></div><span class="tip-expand-arrow" id="tip-arrow-' + i + '">&#9660;</span></div>' +
                '<div class="tip-body" id="tip-body-' + i + '" style="display:none"><p style="color:var(--text-secondary);margin-bottom:12px">' + (tip.description || '') + '</p>' + stepsHTML +
                (tip.proTip ? '<div class="tip-protip">&#11088; Pro Tip: ' + tip.proTip + '</div>' : '') +
                '</div></div>';
        }).join('');
    },

    _renderRightsContent() {
        var rights = BAO_DATA.communityRightsContent || {};
        var newsHTML = (rights.news || []).map(function(n) {
            return '<div class="card rights-news-card"><div class="rights-news-date">' + (n.date || '') + '</div><h4>' + (n.title || '') + '</h4><p style="color:var(--text-secondary);font-size:0.88rem">' + (n.content || n.summary || '') + '</p>' +
                (n.tribe ? '<span class="rights-news-category">' + n.tribe + '</span>' : '') + '</div>';
        }).join('');

        var contactsHTML = (rights.tribalContacts || []).map(function(c) {
            return '<div class="card tribal-contact-card"><h4>' + c.tribe + '</h4>' +
                '<div class="contact-detail">&#128222; ' + c.phone + '</div>' +
                '<div class="contact-detail">&#128205; ' + c.address + '</div>' +
                '<div class="contact-detail"><a href="' + c.website + '" target="_blank" rel="noopener" style="color:var(--accent)">' + c.website + '</a></div>' +
                (c.enrollmentNote ? '<div class="contact-dept">' + c.enrollmentNote + '</div>' : '') + '</div>';
        }).join('');

        var legalHTML = (rights.legalResources || []).map(function(l) {
            var legalUrl = l.website || l.url || '#';
            return '<div class="card legal-resource-card"><h4>' + l.name + '</h4><p style="color:var(--text-secondary);font-size:0.85rem">' + l.description + '</p>' +
                '<a href="' + legalUrl + '" target="_blank" rel="noopener" class="btn btn-accent btn-sm" style="margin-top:8px">Visit Website &#8599;</a></div>';
        }).join('');

        var campaignsHTML = (rights.advocacyCampaigns || []).map(function(c) {
            var statusText = c.status || 'Active';
            var statusClass = statusText.replace(/\s/g, '-').toLowerCase();
            return '<div class="card campaign-card"><div class="campaign-status ' + statusClass + '">' + statusText + '</div><h4>' + (c.title || c.name || '') + '</h4><p style="color:var(--text-secondary);font-size:0.85rem">' + (c.description || '') + '</p>' +
                (c.goal ? '<div style="margin-top:8px"><span style="color:var(--accent);font-weight:600">Goal:</span> <span style="color:var(--text-secondary)">' + c.goal + '</span></div>' : '') +
                (c.action ? '<div style="margin-top:8px;color:var(--accent);font-size:0.85rem">&#9758; ' + c.action + '</div>' : '') +
                '</div>';
        }).join('');

        return '<div class="rights-section"><h3 style="color:var(--accent);margin-bottom:12px">&#128240; Latest News</h3>' + newsHTML + '</div>' +
            '<div class="rights-section"><h3 style="color:var(--accent);margin-bottom:12px">&#128222; Tribal Contacts</h3><div class="tribal-contacts-grid">' + contactsHTML + '</div></div>' +
            '<div class="rights-section"><h3 style="color:var(--accent);margin-bottom:12px">&#9878; Legal Resources</h3>' + legalHTML + '</div>' +
            '<div class="rights-section"><h3 style="color:var(--accent);margin-bottom:12px">&#9994; Advocacy Campaigns</h3>' + campaignsHTML + '</div>';
    },

    // =========== 17. RESOURCES ===========
    resources() {
        const categories = ['All', 'Government', 'Website', 'Book', 'Organization', 'Museum', 'DNA'];
        const totalResources = BAO_DATA.resources.length;
        const catCounts = {};
        BAO_DATA.resources.forEach(r => { catCounts[r.category] = (catCounts[r.category] || 0) + 1; });

        return `
        <div class="page-enter">
            <h2 style="margin-bottom:4px">&#128279; Resource Library</h2>
            <p style="color:var(--text-secondary);margin-bottom:8px">${totalResources} curated resources for Black Indigenous Freedmen genealogy research</p>
            <p style="color:var(--text-muted);font-size:0.78rem;margin-bottom:20px;font-style:italic">All resources are specifically about Black Indigenous Freedmen of the Five Civilized Tribes — Cherokee, Choctaw, Creek, Chickasaw &amp; Seminole Nations</p>

            <!-- Category Stats -->
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
                ${categories.map((c, i) => {
                    const count = c === 'All' ? totalResources : (catCounts[c] || 0);
                    return '<button class="tab-btn ' + (i === 0 ? 'active' : '') + '" onclick="BAO_Pages.filterResources(this,\'' + c + '\')">' + c + ' <span style="font-size:0.7rem;opacity:0.7">(' + count + ')</span></button>';
                }).join('')}
            </div>

            <!-- Section Headers with Resources -->
            <div id="resources-list" style="display:flex;flex-direction:column;gap:10px">

                <div class="resource-section-header" style="font-family:Cinzel,serif;font-size:0.85rem;color:#FFB830;letter-spacing:1px;padding:8px 0;border-bottom:1px solid rgba(255,184,48,0.15);margin-top:8px">&#128220; DAWES ROLLS &amp; GOVERNMENT ARCHIVES</div>

                ${BAO_DATA.resources.filter(r => r.category === 'Government').map(r => `
                    <div class="card resource-card" data-category="${r.category}" style="display:flex;align-items:flex-start;gap:14px">
                        <div class="resource-icon-wrap" style="font-size:1.6rem;flex-shrink:0;width:40px;text-align:center">${r.icon}</div>
                        <div class="resource-info" style="flex:1">
                            <h4 style="color:var(--text-primary);margin-bottom:4px">${r.title}</h4>
                            <p style="font-size:0.82rem;color:var(--text-secondary);line-height:1.5;margin-bottom:6px">${r.description}</p>
                            <div style="display:flex;align-items:center;gap:8px;margin-top:2px">
                                <span class="badge badge-gold" style="font-size:0.68rem">${r.type}</span>
                                <a href="${r.url}" target="_blank" rel="noopener noreferrer" style="font-size:0.72rem;font-weight:600;color:#FFB830;text-decoration:none;display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border:1px solid rgba(255,184,48,0.3);border-radius:12px;transition:all 0.2s" onmouseover="this.style.background='rgba(255,184,48,0.15)';this.style.borderColor='rgba(255,184,48,0.6)'" onmouseout="this.style.background='transparent';this.style.borderColor='rgba(255,184,48,0.3)'">Visit &#8599;</a>
                            </div>
                        </div>
                    </div>
                `).join('')}

                <div class="resource-section-header" style="font-family:Cinzel,serif;font-size:0.85rem;color:#FFB830;letter-spacing:1px;padding:8px 0;border-bottom:1px solid rgba(255,184,48,0.15);margin-top:16px">&#127760; RESEARCH WEBSITES</div>

                ${BAO_DATA.resources.filter(r => r.category === 'Website').map(r => `
                    <div class="card resource-card" data-category="${r.category}" style="display:flex;align-items:flex-start;gap:14px">
                        <div class="resource-icon-wrap" style="font-size:1.6rem;flex-shrink:0;width:40px;text-align:center">${r.icon}</div>
                        <div class="resource-info" style="flex:1">
                            <h4 style="color:var(--text-primary);margin-bottom:4px">${r.title}</h4>
                            <p style="font-size:0.82rem;color:var(--text-secondary);line-height:1.5;margin-bottom:6px">${r.description}</p>
                            <div style="display:flex;align-items:center;gap:8px;margin-top:2px">
                                <span class="badge badge-gold" style="font-size:0.68rem">${r.type}</span>
                                <a href="${r.url}" target="_blank" rel="noopener noreferrer" style="font-size:0.72rem;font-weight:600;color:#FFB830;text-decoration:none;display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border:1px solid rgba(255,184,48,0.3);border-radius:12px;transition:all 0.2s" onmouseover="this.style.background='rgba(255,184,48,0.15)';this.style.borderColor='rgba(255,184,48,0.6)'" onmouseout="this.style.background='transparent';this.style.borderColor='rgba(255,184,48,0.3)'">Visit &#8599;</a>
                            </div>
                        </div>
                    </div>
                `).join('')}

                <div class="resource-section-header" style="font-family:Cinzel,serif;font-size:0.85rem;color:#FFB830;letter-spacing:1px;padding:8px 0;border-bottom:1px solid rgba(255,184,48,0.15);margin-top:16px">&#128214; BOOKS ON BLACK INDIGENOUS FREEDMEN HISTORY</div>

                ${BAO_DATA.resources.filter(r => r.category === 'Book').map(r => `
                    <div class="card resource-card" data-category="${r.category}" style="display:flex;align-items:flex-start;gap:14px">
                        <div class="resource-icon-wrap" style="font-size:1.6rem;flex-shrink:0;width:40px;text-align:center">${r.icon}</div>
                        <div class="resource-info" style="flex:1">
                            <h4 style="color:var(--text-primary);margin-bottom:4px">${r.title}</h4>
                            <p style="font-size:0.82rem;color:var(--text-secondary);line-height:1.5;margin-bottom:6px">${r.description}</p>
                            <div style="display:flex;align-items:center;gap:8px;margin-top:2px">
                                <span class="badge badge-gold" style="font-size:0.68rem">${r.type}</span>
                                <a href="${r.url}" target="_blank" rel="noopener noreferrer" style="font-size:0.72rem;font-weight:600;color:#FFB830;text-decoration:none;display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border:1px solid rgba(255,184,48,0.3);border-radius:12px;transition:all 0.2s" onmouseover="this.style.background='rgba(255,184,48,0.15)';this.style.borderColor='rgba(255,184,48,0.6)'" onmouseout="this.style.background='transparent';this.style.borderColor='rgba(255,184,48,0.3)'">Visit &#8599;</a>
                            </div>
                        </div>
                    </div>
                `).join('')}

                <div class="resource-section-header" style="font-family:Cinzel,serif;font-size:0.85rem;color:#FFB830;letter-spacing:1px;padding:8px 0;border-bottom:1px solid rgba(255,184,48,0.15);margin-top:16px">&#129309; ORGANIZATIONS &amp; MUSEUMS</div>

                ${BAO_DATA.resources.filter(r => r.category === 'Organization' || r.category === 'Museum').map(r => `
                    <div class="card resource-card" data-category="${r.category}" style="display:flex;align-items:flex-start;gap:14px">
                        <div class="resource-icon-wrap" style="font-size:1.6rem;flex-shrink:0;width:40px;text-align:center">${r.icon}</div>
                        <div class="resource-info" style="flex:1">
                            <h4 style="color:var(--text-primary);margin-bottom:4px">${r.title}</h4>
                            <p style="font-size:0.82rem;color:var(--text-secondary);line-height:1.5;margin-bottom:6px">${r.description}</p>
                            <div style="display:flex;align-items:center;gap:8px;margin-top:2px">
                                <span class="badge badge-gold" style="font-size:0.68rem">${r.type}</span>
                                <a href="${r.url}" target="_blank" rel="noopener noreferrer" style="font-size:0.72rem;font-weight:600;color:#FFB830;text-decoration:none;display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border:1px solid rgba(255,184,48,0.3);border-radius:12px;transition:all 0.2s" onmouseover="this.style.background='rgba(255,184,48,0.15)';this.style.borderColor='rgba(255,184,48,0.6)'" onmouseout="this.style.background='transparent';this.style.borderColor='rgba(255,184,48,0.3)'">Visit &#8599;</a>
                            </div>
                        </div>
                    </div>
                `).join('')}

                <div class="resource-section-header" style="font-family:Cinzel,serif;font-size:0.85rem;color:#FFB830;letter-spacing:1px;padding:8px 0;border-bottom:1px solid rgba(255,184,48,0.15);margin-top:16px">&#129516; DNA &amp; INDIGENOUS ANCESTRY TESTING</div>

                ${BAO_DATA.resources.filter(r => r.category === 'DNA').map(r => `
                    <div class="card resource-card" data-category="${r.category}" style="display:flex;align-items:flex-start;gap:14px">
                        <div class="resource-icon-wrap" style="font-size:1.6rem;flex-shrink:0;width:40px;text-align:center">${r.icon}</div>
                        <div class="resource-info" style="flex:1">
                            <h4 style="color:var(--text-primary);margin-bottom:4px">${r.title}</h4>
                            <p style="font-size:0.82rem;color:var(--text-secondary);line-height:1.5;margin-bottom:6px">${r.description}</p>
                            <div style="display:flex;align-items:center;gap:8px;margin-top:2px">
                                <span class="badge badge-gold" style="font-size:0.68rem">${r.type}</span>
                                <a href="${r.url}" target="_blank" rel="noopener noreferrer" style="font-size:0.72rem;font-weight:600;color:#FFB830;text-decoration:none;display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border:1px solid rgba(255,184,48,0.3);border-radius:12px;transition:all 0.2s" onmouseover="this.style.background='rgba(255,184,48,0.15)';this.style.borderColor='rgba(255,184,48,0.6)'" onmouseout="this.style.background='transparent';this.style.borderColor='rgba(255,184,48,0.3)'">Visit &#8599;</a>
                            </div>
                        </div>
                    </div>
                `).join('')}

            </div>

            <div class="card" style="margin-top:24px;padding:20px;border-left:3px solid var(--accent)">
                <p style="font-size:0.85rem;color:var(--text-secondary);line-height:1.6">&#128161; <strong style="color:var(--accent)">Research Tip:</strong> Start with the Dawes Rolls to identify your ancestor's enrollment card number. Then cross-reference with Freedmen Bureau records and Indian Territory census data. Contact the specific tribal enrollment office for citizenship application requirements.</p>
            </div>
        </div>`;
    },

    // =========== 18. SETTINGS ===========
    settings() {
        const profile = BAO_Utils.profile.getProfile();
        return `
        <div class="page-enter">
            <h2 style="margin-bottom:20px">Settings</h2>

            <div class="settings-section">
                <h3>Profile</h3>
                <div class="input-group">
                    <label>Your Name</label>
                    <input type="text" id="settings-name" value="${BAO_Utils.escapeHTML(profile.name)}" placeholder="Enter your name">
                </div>
                <div class="input-group">
                    <label>Email</label>
                    <input type="email" id="settings-email" value="${BAO_Utils.escapeHTML(profile.email || '')}" placeholder="your@email.com">
                </div>
                <div class="input-group">
                    <label>Tribal Affiliations (comma separated)</label>
                    <input type="text" id="settings-tribes" value="${(profile.tribes || []).join(', ')}" placeholder="e.g. Cherokee Freedmen, Creek Freedmen">
                </div>
                <div class="input-group">
                    <label>Research Goals</label>
                    <textarea id="settings-goals" placeholder="What are you hoping to discover?">${BAO_Utils.escapeHTML(profile.researchGoals || '')}</textarea>
                </div>
                <button class="btn btn-primary" onclick="BAO_Pages.saveSettings()">Save Profile</button>
            </div>

            <div class="settings-section">
                <h3>Preferences</h3>
                <div class="setting-row">
                    <div class="setting-info">
                        <h4>Notifications</h4>
                        <p>Receive alerts for record matches and community activity</p>
                    </div>
                    <label class="toggle"><input type="checkbox" id="settings-notif" ${profile.notifications !== false ? 'checked' : ''}><span class="toggle-slider"></span></label>
                </div>
                <div class="setting-row">
                    <div class="setting-info">
                        <h4>Auto-Save</h4>
                        <p>Automatically save changes to family tree and profiles</p>
                    </div>
                    <label class="toggle"><input type="checkbox" id="settings-autosave" ${profile.autoSave !== false ? 'checked' : ''}><span class="toggle-slider"></span></label>
                </div>
            </div>

            <div class="settings-section">
                <h3>Data Management</h3>
                <div class="setting-row">
                    <div class="setting-info">
                        <h4>Export All Data</h4>
                        <p>Download all your research data as JSON</p>
                    </div>
                    <button class="btn btn-secondary btn-sm" onclick="BAO_Pages.exportData()">Export</button>
                </div>
                <div class="setting-row">
                    <div class="setting-info">
                        <h4>Clear All Data</h4>
                        <p>Remove all saved ancestors, documents, and settings</p>
                    </div>
                    <button class="btn btn-danger btn-sm" onclick="BAO_Pages.clearAllData()">Clear Data</button>
                </div>
            </div>

            <!-- Disclaimers & Legal -->
            <div class="settings-section" style="margin-top:24px;">
                <h3 style="color:var(--accent)">&#9878; Legal &amp; Disclaimers</h3>
                <div class="setting-row" style="cursor:pointer" onclick="BAO_App.navigate('disclaimers')">
                    <div class="setting-info">
                        <h4>View Full Disclaimers</h4>
                        <p>Educational content, copyright, privacy, tribal citizenship &amp; more</p>
                    </div>
                    <span style="color:var(--accent);font-size:1.2rem">&#10145;</span>
                </div>
            </div>

            <div class="card" style="margin-top:20px;text-align:center;padding:30px">
                <p style="font-family:Cinzel,serif;font-size:1.2rem;color:var(--accent);margin-bottom:8px">Black Ancestral Origins</p>
                <p style="font-size:0.82rem;color:var(--text-muted)">Version 1.0 — Built for Black Indigenous Freedmen Descendants</p>
                <p style="font-size:0.78rem;color:var(--text-muted);margin-top:4px">Preserving Heritage. Reclaiming History. Connecting Generations.</p>
                <p style="font-size:0.7rem;color:var(--text-muted);margin-top:10px;opacity:0.7">&copy; ${new Date().getFullYear()} Black Ancestral Origins. All rights reserved.</p>
            </div>
        </div>`;
    },

    // =========== 20. VIDEO LEARNING CENTER ===========

    // Video library — set paths when Pictory MP4s are ready
    _videoLibrary: {
        'dawes-rolls-guide': '',
        'five-tribes-history': '',
        'tribal-citizenship': '',
        'dna-testing': '',
        'treaties-1866': '',
        'trail-of-tears': ''
    },

    'video-learning'() {
        var slideshows = BAO_DATA.videoSlideshows || [];
        var self = this;
        return `
        <div class="page-enter">
            <div class="vlc-header">
                <div class="vlc-header-icon">&#127916;</div>
                <h2 class="vlc-title">Video Learning Center</h2>
                <p class="vlc-subtitle">Interactive educational courses about Black Indigenous Freedmen heritage</p>
                <div class="vlc-stat-row">
                    <div class="vlc-stat"><span class="vlc-stat-num">${slideshows.length}</span> Courses</div>
                    <div class="vlc-stat"><span class="vlc-stat-num">${slideshows.reduce(function(a,s){return a+s.slides.length;},0)}</span> Slides</div>
                    <div class="vlc-stat"><span class="vlc-stat-num">100%</span> Free</div>
                </div>
            </div>

            <div class="vlc-grid">
                ${slideshows.map(function(s, i) {
                    return '<div class="card vlc-card">' +
                        '<div class="vlc-thumbnail" style="background:linear-gradient(135deg,' + s.color + '22,' + s.color + '08)">' +
                            '<div class="vlc-thumb-icon" style="color:' + s.color + '">' + s.icon + '</div>' +
                            '<div class="vlc-thumb-slides">' + s.slides.length + ' slides</div>' +
                        '</div>' +
                        '<div class="vlc-card-body">' +
                            '<h3 class="vlc-card-title">' + s.title + '</h3>' +
                            '<p class="vlc-card-desc">' + s.description + '</p>' +
                            '<button class="btn vlc-play-btn" data-video-id="' + s.id + '" data-slide-idx="' + i + '" onclick="BAO_Pages.startCourse(this)" style="border-color:' + s.color + ';color:' + s.color + '">&#9654; Start Learning</button>' +
                        '</div>' +
                    '</div>';
                }).join('')}
            </div>

            <!-- Video Modal -->
            <div id="vlc-video-modal" class="vlc-video-modal vlc-video-hidden">
                <div class="vlc-video-container">
                    <button class="vlc-video-close" onclick="BAO_Pages.closeVideoModal()" aria-label="Close">&times;</button>
                    <video id="vlc-main-video" controls playsinline style="width:100%;max-height:80vh;border-radius:12px;outline:none;background:#000;"></video>
                </div>
            </div>
        </div>`;
    },

    // Route: try video first, fall back to slideshow
    startCourse(btn) {
        var videoId = btn.getAttribute('data-video-id');
        var slideIdx = parseInt(btn.getAttribute('data-slide-idx'), 10);
        var videoSrc = this._videoLibrary[videoId] || '';

        if (videoSrc) {
            // Play video
            var modal = document.getElementById('vlc-video-modal');
            var video = document.getElementById('vlc-main-video');
            if (modal && video) {
                video.src = videoSrc;
                modal.classList.remove('vlc-video-hidden');
                video.play().catch(function(){});
            }
        } else {
            // No video yet — fall back to interactive slideshow
            this.openSlideshow(slideIdx);
        }
    },

    closeVideoModal() {
        var modal = document.getElementById('vlc-video-modal');
        var video = document.getElementById('vlc-main-video');
        if (video) {
            video.pause();
            video.removeAttribute('src');
            video.load();
        }
        if (modal) modal.classList.add('vlc-video-hidden');
    },

    _slideshowTransitioning: false,

    openSlideshow(index) {
        var show = (BAO_DATA.videoSlideshows || [])[index];
        if (!show) return;
        this._currentSlideshow = show;
        this._currentSlideIndex = 0;
        this._slideshowTransitioning = false;
        this._createSlideshowOverlay();
    },

    _createSlideshowOverlay() {
        var show = this._currentSlideshow;
        var existing = document.getElementById('vlc-slideshow-overlay');
        if (existing) existing.remove();

        var overlay = document.createElement('div');
        overlay.id = 'vlc-slideshow-overlay';
        overlay.className = 'vlc-overlay';
        overlay.innerHTML =
            '<div class="vlc-overlay-inner">' +
                '<div class="vlc-overlay-header">' +
                    '<div class="vlc-overlay-title-wrap"><span class="vlc-overlay-icon" style="color:' + show.color + '">' + show.icon + '</span><span class="vlc-overlay-course">' + show.title + '</span></div>' +
                    '<button class="vlc-close-btn" onclick="BAO_Pages.closeSlideshow()">&times;</button>' +
                '</div>' +
                '<div class="vlc-progress-bar"><div id="vlc-progress" class="vlc-progress-fill" style="width:' + (100 / show.slides.length).toFixed(0) + '%;background:' + show.color + '"></div></div>' +
                '<div class="vlc-slide-counter" id="vlc-counter">Slide 1 of ' + show.slides.length + '</div>' +
                '<div class="vlc-slide-stage">' +
                    '<div class="vlc-slide-content vlc-slide-visible" id="vlc-slide-panel"></div>' +
                '</div>' +
                '<div class="vlc-nav-btns">' +
                    '<button class="btn vlc-nav-btn vlc-prev-btn" id="vlc-prev" onclick="BAO_Pages.prevSlide()" disabled>&#10094; Previous</button>' +
                    '<button class="btn vlc-nav-btn vlc-next-btn" id="vlc-next" onclick="BAO_Pages.nextSlide()" style="background:' + show.color + ';border-color:' + show.color + '">Next &#10095;</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(overlay);
        this._populateSlideContent();
        requestAnimationFrame(function() { overlay.classList.add('vlc-overlay-active'); });
    },

    _populateSlideContent() {
        var show = this._currentSlideshow;
        var si = this._currentSlideIndex;
        var slide = show.slides[si];
        var panel = document.getElementById('vlc-slide-panel');
        if (!panel) return;
        panel.innerHTML =
            '<button class="bao-speak-btn vlc-speak-pos" id="vlc-speak-btn" onclick="BAO_Pages.toggleSlideSpeech()" title="Read slide aloud">&#128264;</button>' +
            '<h2 class="vlc-slide-title" style="color:' + show.color + '">' + slide.title + '</h2>' +
            '<p class="vlc-slide-text">' + slide.content + '</p>' +
            (slide.fact ? '<div class="vlc-slide-fact" style="border-color:' + show.color + '"><span class="vlc-fact-label" style="color:' + show.color + '">&#128161; Key Fact:</span> ' + slide.fact + '</div>' : '');
    },

    _updateSlideshowChrome() {
        var show = this._currentSlideshow;
        var si = this._currentSlideIndex;
        var total = show.slides.length;
        var progress = document.getElementById('vlc-progress');
        var counter = document.getElementById('vlc-counter');
        var prevBtn = document.getElementById('vlc-prev');
        var nextBtn = document.getElementById('vlc-next');
        if (progress) progress.style.width = ((si + 1) / total * 100).toFixed(0) + '%';
        if (counter) counter.textContent = 'Slide ' + (si + 1) + ' of ' + total;
        if (prevBtn) prevBtn.disabled = si === 0;
        if (nextBtn) nextBtn.innerHTML = si === total - 1 ? '&#10003; Complete' : 'Next &#10095;';
    },

    _transitionSlide(newIndex) {
        if (this._slideshowTransitioning) return;
        this.stopSlideSpeech();
        this._slideshowTransitioning = true;
        var self = this;
        var panel = document.getElementById('vlc-slide-panel');
        if (!panel) { this._slideshowTransitioning = false; return; }

        // Fade out current slide
        panel.classList.remove('vlc-slide-visible');
        panel.classList.add('vlc-slide-hidden');

        setTimeout(function() {
            // Update index and content while invisible
            self._currentSlideIndex = newIndex;
            self._populateSlideContent();
            self._updateSlideshowChrome();

            // Fade in new slide
            panel.classList.remove('vlc-slide-hidden');
            panel.classList.add('vlc-slide-visible');
            self._slideshowTransitioning = false;
        }, 400);
    },

    nextSlide() {
        if (!this._currentSlideshow || this._slideshowTransitioning) return;
        if (this._currentSlideIndex >= this._currentSlideshow.slides.length - 1) {
            this.closeSlideshow();
            BAO_Utils.toast('Course complete! Great job learning!', 'success');
            return;
        }
        this._transitionSlide(this._currentSlideIndex + 1);
    },

    prevSlide() {
        if (!this._currentSlideshow || this._currentSlideIndex <= 0 || this._slideshowTransitioning) return;
        this._transitionSlide(this._currentSlideIndex - 1);
    },

    closeSlideshow() {
        this.stopSlideSpeech();
        var overlay = document.getElementById('vlc-slideshow-overlay');
        if (overlay) {
            overlay.classList.remove('vlc-overlay-active');
            setTimeout(function() { overlay.remove(); }, 300);
        }
        this._currentSlideshow = null;
        this._currentSlideIndex = 0;
        this._slideshowTransitioning = false;
    },

    // ====== TTS WRAPPERS — delegates to global BAO_TTS controller ======
    toggleSlideSpeech() {
        // VLC audio removed — slides are visual-only until video files are added
        BAO_Utils.toast('Slide audio coming soon. Read the content below.', 'info');
    },

    stopSlideSpeech() {
        // No-op — audio system removed from VLC
    },

    // =========== 19. DISCLAIMERS ===========
    disclaimers() {
        const year = new Date().getFullYear();
        return `
        <div class="page-enter">
            <div style="text-align:center;margin-bottom:28px">
                <div style="font-size:2.4rem;margin-bottom:8px;">&#9878;</div>
                <h2 style="font-family:'Cinzel',serif;color:var(--accent);margin-bottom:6px;">Legal Disclaimers</h2>
                <p style="color:var(--text-secondary);font-size:0.88rem;">Black Ancestral Origins — Policies, Terms &amp; Legal Notices</p>
                <p style="color:var(--text-muted);font-size:0.75rem;margin-top:4px;">Last updated: March ${year}</p>
            </div>

            <!-- 1. Educational Content -->
            <div class="card" style="border-left:3px solid #FFB830;margin-bottom:14px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                    <span style="font-size:1.5rem;">&#128218;</span>
                    <h3 style="font-family:'Cinzel',serif;color:#FFB830;font-size:0.95rem;margin:0;">Educational Content Disclaimer</h3>
                </div>
                <p style="font-size:0.84rem;line-height:1.7;color:#d4cce4;">All content provided within Black Ancestral Origins is intended <strong style="color:#FFB830">strictly for educational and informational purposes only</strong>. Nothing contained in this application constitutes legal advice, professional genealogical certification, or official tribal documentation. The historical information, genealogical records, family tree data, and educational materials presented are designed to assist users in understanding Black Indigenous Freedmen heritage of the Five Civilized Tribes.</p>
                <p style="font-size:0.84rem;line-height:1.7;color:#d4cce4;margin-top:8px;">Users should consult with qualified legal professionals, certified genealogists, or tribal enrollment offices for matters relating to legal proceedings, tribal citizenship applications, or official documentation. This application is not a substitute for professional research services or legal counsel.</p>
            </div>

            <!-- 2. Copyright -->
            <div class="card" style="border-left:3px solid #E8443A;margin-bottom:14px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                    <span style="font-size:1.5rem;">&#169;</span>
                    <h3 style="font-family:'Cinzel',serif;color:#E8443A;font-size:0.95rem;margin:0;">Copyright Notice</h3>
                </div>
                <p style="font-size:0.84rem;line-height:1.7;color:#d4cce4;"><strong style="color:#E8443A">&copy; ${year} Black Ancestral Origins. All rights reserved.</strong></p>
                <p style="font-size:0.84rem;line-height:1.7;color:#d4cce4;margin-top:8px;">All original content within this application — including but not limited to text, graphics, user interface design, educational materials, chatbot knowledge base, family tree visualization, migration route data, and software code — is the intellectual property of Black Ancestral Origins and is protected by applicable copyright laws.</p>
                <p style="font-size:0.84rem;line-height:1.7;color:#d4cce4;margin-top:8px;">No portion of this application may be reproduced, distributed, modified, or republished without express written permission from Black Ancestral Origins. Historical records referenced within the app (Dawes Rolls, Freedmen Bureau records, tribal census data) are public domain documents; however, our presentation, organization, educational commentary, and supplementary content are proprietary.</p>
                <p style="font-size:0.84rem;line-height:1.7;color:#d4cce4;margin-top:8px;">Unauthorized use, reproduction, or distribution of any content from this application is strictly prohibited and may result in legal action.</p>
            </div>

            <!-- 3. Genealogy Research -->
            <div class="card" style="border-left:3px solid #4ECDC4;margin-bottom:14px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                    <span style="font-size:1.5rem;">&#128270;</span>
                    <h3 style="font-family:'Cinzel',serif;color:#4ECDC4;font-size:0.95rem;margin:0;">Genealogy Research Disclaimer</h3>
                </div>
                <p style="font-size:0.84rem;line-height:1.7;color:#d4cce4;">The genealogical information provided within Black Ancestral Origins is <strong style="color:#4ECDC4">based on historical records, academic research, and community knowledge</strong> and may not be 100% accurate in all cases. Historical records from the Dawes Commission era (1898-1914) contain known errors including misspelled names, incorrect ages, inconsistent tribal designations, and missing family connections.</p>
                <p style="font-size:0.84rem;line-height:1.7;color:#d4cce4;margin-top:8px;">Names of enslaved people were frequently recorded phonetically, and Freedmen were sometimes enrolled under different names than those used by their families. Ages and birth dates are often estimates. Family relationships documented on enrollment cards may be incomplete or contain errors introduced by Dawes Commission clerks.</p>
                <p style="font-size:0.84rem;line-height:1.7;color:#d4cce4;margin-top:8px;">Sample ancestor data included in the application is representative and educational in nature. Users are strongly encouraged to verify all genealogical information through primary source documents at the National Archives, Oklahoma Historical Society, and tribal enrollment offices.</p>
            </div>

            <!-- 4. Third Party Links -->
            <div class="card" style="border-left:3px solid #C084FC;margin-bottom:14px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                    <span style="font-size:1.5rem;">&#128279;</span>
                    <h3 style="font-family:'Cinzel',serif;color:#C084FC;font-size:0.95rem;margin:0;">Third-Party Links Disclaimer</h3>
                </div>
                <p style="font-size:0.84rem;line-height:1.7;color:#d4cce4;">Black Ancestral Origins contains links and references to <strong style="color:#C084FC">external websites, organizations, and resources</strong> that are provided solely for the convenience and reference of our users. These include tribal nation websites, government archives, DNA testing services, research organizations, and published works.</p>
                <p style="font-size:0.84rem;line-height:1.7;color:#d4cce4;margin-top:8px;">We do not control, endorse, or assume responsibility for the content, accuracy, privacy policies, or practices of any third-party websites or services. The inclusion of any external link does not imply endorsement, partnership, or affiliation. Users access third-party websites at their own risk and should review the terms and privacy policies of those sites independently.</p>
            </div>

            <!-- 5. Tribal Citizenship -->
            <div class="card" style="border-left:3px solid #F59E0B;margin-bottom:14px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                    <span style="font-size:1.5rem;">&#127963;</span>
                    <h3 style="font-family:'Cinzel',serif;color:#F59E0B;font-size:0.95rem;margin:0;">Tribal Citizenship Disclaimer</h3>
                </div>
                <p style="font-size:0.84rem;line-height:1.7;color:#d4cce4;"><strong style="color:#F59E0B">Black Ancestral Origins does not guarantee, promise, or certify tribal citizenship eligibility</strong> for any user. Tribal citizenship and enrollment are determined solely by the sovereign tribal nations — the Cherokee Nation, Choctaw Nation, Muscogee (Creek) Nation, Chickasaw Nation, and Seminole Nation of Oklahoma — according to their individual constitutions, laws, and enrollment criteria.</p>
                <p style="font-size:0.84rem;line-height:1.7;color:#d4cce4;margin-top:8px;">Information provided about tribal enrollment processes, required documents, and contact information is offered for educational guidance only and may change without notice as tribal nations update their policies. Users pursuing tribal citizenship should contact the relevant tribal enrollment office directly for the most current requirements and application procedures.</p>
                <p style="font-size:0.84rem;line-height:1.7;color:#d4cce4;margin-top:8px;">Each tribal nation has its own citizenship requirements. Descent from a Dawes Roll enrollee does not automatically guarantee citizenship in all tribes. The legal landscape regarding Freedmen citizenship rights is evolving and varies significantly between nations.</p>
            </div>

            <!-- 6. No Affiliation -->
            <div class="card" style="border-left:3px solid #F97316;margin-bottom:14px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                    <span style="font-size:1.5rem;">&#9888;</span>
                    <h3 style="font-family:'Cinzel',serif;color:#F97316;font-size:0.95rem;margin:0;">No Tribal Affiliation Disclaimer</h3>
                </div>
                <p style="font-size:0.84rem;line-height:1.7;color:#d4cce4;"><strong style="color:#F97316">Black Ancestral Origins is an independent educational platform</strong> and is not officially affiliated with, endorsed by, sponsored by, or connected to any tribal nation, tribal government, or tribal organization including but not limited to:</p>
                <ul style="font-size:0.84rem;line-height:1.8;color:#d4cce4;margin:10px 0 10px 20px;">
                    <li>The Cherokee Nation</li>
                    <li>The Choctaw Nation of Oklahoma</li>
                    <li>The Muscogee (Creek) Nation</li>
                    <li>The Chickasaw Nation</li>
                    <li>The Seminole Nation of Oklahoma</li>
                </ul>
                <p style="font-size:0.84rem;line-height:1.7;color:#d4cce4;">This application is also not affiliated with the Bureau of Indian Affairs (BIA), the National Archives and Records Administration (NARA), the Oklahoma Historical Society, or any other government agency. All tribal names, logos, and references are used solely for educational identification purposes.</p>
            </div>

            <!-- 7. Privacy -->
            <div class="card" style="border-left:3px solid #22C55E;margin-bottom:14px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                    <span style="font-size:1.5rem;">&#128274;</span>
                    <h3 style="font-family:'Cinzel',serif;color:#22C55E;font-size:0.95rem;margin:0;">Privacy &amp; Data Storage Disclaimer</h3>
                </div>
                <p style="font-size:0.84rem;line-height:1.7;color:#d4cce4;"><strong style="color:#22C55E">Your privacy is important to us.</strong> Black Ancestral Origins stores all user data — including uploaded documents, photographs, family tree information, ancestor profiles, oral histories, and application settings — <strong style="color:#22C55E">exclusively in your device\'s local browser storage (localStorage)</strong>.</p>
                <p style="font-size:0.84rem;line-height:1.7;color:#d4cce4;margin-top:8px;">This means:</p>
                <ul style="font-size:0.84rem;line-height:1.8;color:#d4cce4;margin:8px 0 8px 20px;">
                    <li><strong>No data is transmitted</strong> to external servers or cloud storage</li>
                    <li><strong>No personal information is collected</strong> by Black Ancestral Origins</li>
                    <li><strong>No cookies are used</strong> for tracking or advertising</li>
                    <li><strong>No third parties</strong> have access to your stored data</li>
                    <li><strong>Data persists</strong> only on the device and browser where it was created</li>
                </ul>
                <p style="font-size:0.84rem;line-height:1.7;color:#d4cce4;margin-top:8px;">Clearing your browser data or using the "Clear All Data" function in Settings will permanently delete all stored information. We strongly recommend using the Export function regularly to backup your research data. Black Ancestral Origins is not responsible for data loss due to browser clearing, device changes, or technical issues.</p>
            </div>

            <!-- Acceptance Notice -->
            <div style="text-align:center;padding:24px 16px;margin-top:8px;background:rgba(255,184,48,0.04);border:1px solid rgba(255,184,48,0.12);border-radius:12px;">
                <p style="font-family:'Cinzel',serif;font-size:0.9rem;color:var(--accent);margin-bottom:8px;">Acceptance of Terms</p>
                <p style="font-size:0.82rem;line-height:1.7;color:#a89bc2;">By using Black Ancestral Origins, you acknowledge that you have read, understood, and agree to all disclaimers outlined above. Continued use of this application constitutes acceptance of these terms.</p>
                <p style="font-size:0.75rem;color:var(--text-muted);margin-top:12px;">&copy; ${year} Black Ancestral Origins. All rights reserved.</p>
                <p style="font-size:0.7rem;color:var(--text-muted);margin-top:4px;font-style:italic;">Preserving Heritage. Reclaiming History. Connecting Generations.</p>
            </div>

            <div style="text-align:center;margin-top:16px;">
                <button class="btn btn-secondary btn-sm" onclick="BAO_App.navigate('settings')">&#10094; Back to Settings</button>
            </div>
        </div>`;
    },

    // =========== 20b. ABOUT THIS PROJECT ===========
    'about-project'() {
        var tag = function(t){ return '<span style="font-size:0.72rem;padding:4px 12px;background:rgba(255,184,48,0.08);border:1px solid rgba(255,184,48,0.2);border-radius:16px;color:var(--accent);">' + t + '</span>'; };
        var tech = function(t){ return '<span style="padding:7px 14px;background:rgba(255,184,48,0.06);border:1px solid rgba(255,184,48,0.15);border-radius:10px;font-size:0.8rem;color:var(--text-primary);font-weight:600;">' + t + '</span>'; };
        var feat = function(icon, title, desc){ return '<div style="display:flex;align-items:flex-start;gap:10px;padding:12px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;"><span style="font-size:1.2rem;">' + icon + '</span><div><h4 style="margin:0 0 4px;font-size:0.85rem;color:var(--text-primary);">' + title + '</h4><p style="margin:0;font-size:0.76rem;color:var(--text-muted);">' + desc + '</p></div></div>'; };
        var role = function(label, desc){ return '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;"><span style="color:var(--accent);font-weight:700;font-size:0.85rem;">' + label + '</span><span style="font-size:0.84rem;color:var(--text-secondary);">' + desc + '</span></div>'; };
        var stat = function(num, label){ return '<div class="card" style="text-align:center;padding:16px 10px;"><div style="font-size:1.6rem;font-weight:700;color:var(--accent);">' + num + '</div><div style="font-size:0.75rem;color:var(--text-muted);">' + label + '</div></div>'; };
        var prob = function(icon, title, desc){ return '<div style="display:flex;align-items:flex-start;gap:12px;padding:14px;background:linear-gradient(135deg,rgba(255,184,48,0.06),rgba(255,184,48,0.02));border:1px solid rgba(255,184,48,0.12);border-radius:12px;"><span style="font-size:1.3rem;flex-shrink:0;">' + icon + '</span><div><h4 style="margin:0 0 4px;font-size:0.88rem;color:var(--text-primary);">' + title + '</h4><p style="margin:0;font-size:0.82rem;line-height:1.6;color:var(--text-secondary);">' + desc + '</p></div></div>'; };

        return `
        <div class="page-enter">

            <!-- Hero -->
            <div style="text-align:center;margin-bottom:28px;">
                <div style="font-size:2.8rem;margin-bottom:8px;">&#128188;</div>
                <h1 style="font-family:'Cinzel',serif;color:var(--accent);font-size:1.6rem;margin-bottom:8px;">Portfolio &amp; Project Overview</h1>
                <p style="color:var(--text-secondary);font-size:0.9rem;line-height:1.6;max-width:600px;margin:0 auto;">A portfolio-level demonstration built for employers and clients showcasing full-stack front-end development, API integration, and data-driven architecture.</p>
            </div>

            <!-- Project Purpose -->
            <div style="padding:16px 20px;background:linear-gradient(135deg,rgba(255,184,48,0.08),rgba(255,184,48,0.02));border:1.5px solid rgba(255,184,48,0.25);border-radius:14px;margin-bottom:20px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                    <span style="font-size:1.2rem;">&#127919;</span>
                    <h3 style="font-family:'Cinzel',serif;font-size:0.95rem;color:var(--accent);margin:0;">Project Purpose</h3>
                </div>
                <p style="margin:0;font-size:0.86rem;line-height:1.7;color:var(--text-secondary);">This application is a <strong style="color:var(--accent);">portfolio-level demonstration</strong> showcasing the ability to design, architect, and build a complete production-grade web application from scratch. It demonstrates proficiency in front-end development, responsive design, API integration, data-driven systems, and user experience design — all built to a standard suitable for professional deployment.</p>
            </div>

            <!-- ========== FEATURED PROJECT ========== -->
            <div style="position:relative;margin-bottom:24px;">
                <div style="display:inline-block;padding:4px 14px;background:linear-gradient(135deg,#FFD060,#FFB830);border-radius:8px 8px 0 0;font-size:0.7rem;font-weight:700;color:#1A1020;letter-spacing:0.05em;">&#11088; FEATURED PROJECT</div>
                <div class="card" style="border-top:2px solid var(--accent);border-radius:0 12px 12px 12px;">
                    <h3 style="font-size:1.1rem;color:var(--text-primary);margin:0 0 8px;">Black Ancestral Origins Genealogy App</h3>
                    <p style="font-size:0.88rem;line-height:1.7;color:var(--text-secondary);margin:0 0 14px;">A responsive genealogy research platform focused on Black ancestry, Freedmen records, and Indigenous lineage, featuring dynamic data systems, chatbot assistance, and multimedia learning tools.</p>
                    <div style="display:flex;flex-wrap:wrap;gap:8px;">
                        ${tag('Genealogy Research')}${tag('Black Indigenous Heritage')}${tag('Freedmen Records')}${tag('Five Civilized Tribes')}${tag('Full-Stack Front-End')}
                    </div>
                </div>
            </div>

            <!-- Key Achievements -->
            <div class="card" style="margin-bottom:16px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
                    <span style="font-size:1.4rem;">&#127942;</span>
                    <h2 style="font-family:'Cinzel',serif;font-size:1.05rem;color:var(--accent);margin:0;">Key Achievements</h2>
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;">
                    <div style="padding:14px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;text-align:center;">
                        <div style="font-size:1.8rem;font-weight:700;color:var(--accent);">21+</div>
                        <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;">Fully functional pages built</div>
                    </div>
                    <div style="padding:14px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;text-align:center;">
                        <div style="font-size:1.8rem;font-weight:700;color:var(--success);">0</div>
                        <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;">JavaScript errors in production</div>
                    </div>
                    <div style="padding:14px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;text-align:center;">
                        <div style="font-size:1.8rem;font-weight:700;color:var(--accent);">100%</div>
                        <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;">Responsive across all devices</div>
                    </div>
                    <div style="padding:14px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;text-align:center;">
                        <div style="font-size:1.8rem;font-weight:700;color:var(--accent);">38+</div>
                        <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;">Verified external resources</div>
                    </div>
                    <div style="padding:14px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;text-align:center;">
                        <div style="font-size:1.8rem;font-weight:700;color:var(--accent);">6</div>
                        <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;">Dynamic data-driven systems</div>
                    </div>
                    <div style="padding:14px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;text-align:center;">
                        <div style="font-size:1.8rem;font-weight:700;color:var(--accent);">4</div>
                        <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;">API integrations</div>
                    </div>
                </div>
            </div>

            <!-- Live Demo / System Highlights -->
            <div class="card" style="margin-bottom:16px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
                    <span style="font-size:1.4rem;">&#9889;</span>
                    <h2 style="font-family:'Cinzel',serif;font-size:1.05rem;color:var(--accent);margin:0;">Live Demo &mdash; System Highlights</h2>
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px;">
                    ${feat('&#129302;', 'AI Chatbot Assistant', 'Roots AI Guide — 56 topics, personalization, research tracking, voice output, saved conversations')}
                    ${feat('&#128218;', 'Smart Resource Ranking', 'Scored and sorted by authority — government, academic, DNA service — with verified badges')}
                    ${feat('&#127916;', 'Video Learning System', '6 courses, 48 slides, MP4-ready video modal with slideshow fallback')}
                    ${feat('&#128506;', 'Interactive Migration Map', 'Leaflet.js with 7 animated gold routes, waypoint popups, and dark-themed tiles')}
                    ${feat('&#127897;', 'Oral History TTS Engine', 'Chunked speech queue, mobile-safe watchdog, visibility recovery, debounced controls')}
                    ${feat('&#128247;', 'Document Camera Scanner', 'Fullscreen getUserMedia with 4-level fallback, permission pre-check, flip camera')}
                </div>
            </div>

            <!-- View Live Sections -->
            <div class="card" style="margin-bottom:16px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
                    <span style="font-size:1.4rem;">&#128065;</span>
                    <h2 style="font-family:'Cinzel',serif;font-size:1.05rem;color:var(--accent);margin:0;">View Live Sections</h2>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:10px;">
                    <button class="btn btn-primary" onclick="BAO_App.navigate('dna-heritage')" style="font-size:0.82rem;">&#129516; DNA &amp; Heritage</button>
                    <button class="btn btn-secondary" onclick="BAO_App.navigate('resources')" style="font-size:0.82rem;">&#128218; Resource Library</button>
                    <button class="btn btn-secondary" onclick="BAO_App.navigate('video-learning')" style="font-size:0.82rem;">&#127916; Video Learning</button>
                    <button class="btn btn-secondary" onclick="BAO_App.navigate('migration-routes')" style="font-size:0.82rem;">&#128506; Migration Map</button>
                    <button class="btn btn-secondary" onclick="BAO_App.navigate('oral-histories')" style="font-size:0.82rem;">&#127897; Oral Histories</button>
                    <button class="btn btn-secondary" onclick="BAO_App.navigate('dawes-rolls')" style="font-size:0.82rem;">&#128220; Dawes Rolls</button>
                </div>
            </div>

            <!-- Key Features (preserved) -->
            <div class="card" style="margin-bottom:16px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
                    <span style="font-size:1.4rem;">&#10024;</span>
                    <h2 style="font-family:'Cinzel',serif;font-size:1.05rem;color:var(--accent);margin:0;">Key Features</h2>
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px;">
                    ${feat('&#128218;', 'Dynamic Resource Library', 'Data-driven with smart ranking, badges, and source verification')}
                    ${feat('&#129302;', 'AI Chatbot Assistant', 'Roots AI Guide with 56 topics, progress tracking, and voice')}
                    ${feat('&#127897;', 'Oral History Audio System', 'TTS with chunked playback, mobile-safe queue, and watchdog recovery')}
                    ${feat('&#127916;', 'Video Learning Center', '6 interactive courses with 48 slides, video-ready with slideshow fallback')}
                    ${feat('&#128247;', 'Photo Gallery &amp; Scanner', 'Camera integration with fullscreen overlay and multi-camera fallback')}
                    ${feat('&#128506;', 'Freedmen Migration Map', 'Leaflet.js interactive map with animated gold routes and waypoint popups')}
                    ${feat('&#128241;', 'Responsive Mobile-First UI', 'Optimized for Samsung Android, iPad Safari, and desktop Chrome')}
                </div>
            </div>

            <!-- Tech Stack (updated with AI tools) -->
            <div class="card" style="margin-bottom:16px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
                    <span style="font-size:1.4rem;">&#128736;</span>
                    <h2 style="font-family:'Cinzel',serif;font-size:1.05rem;color:var(--accent);margin:0;">Tech Stack</h2>
                </div>
                <h4 style="font-size:0.8rem;color:var(--text-muted);margin:0 0 8px;font-weight:600;letter-spacing:0.03em;">LANGUAGES &amp; FRAMEWORKS</h4>
                <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;">
                    ${tech('HTML5')}${tech('CSS3')}${tech('JavaScript (ES6+)')}${tech('Leaflet.js')}${tech('SPA Architecture')}
                </div>
                <h4 style="font-size:0.8rem;color:var(--text-muted);margin:0 0 8px;font-weight:600;letter-spacing:0.03em;">APIs &amp; INTEGRATIONS</h4>
                <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;">
                    ${tech('ElevenLabs')}${tech('Web Speech API')}${tech('getUserMedia')}${tech('localStorage')}${tech('Responsive Design')}
                </div>
                <h4 style="font-size:0.8rem;color:var(--text-muted);margin:0 0 8px;font-weight:600;letter-spacing:0.03em;">AI &amp; CONTENT TOOLS</h4>
                <div style="display:flex;flex-wrap:wrap;gap:8px;">
                    ${tech('ChatGPT')}${tech('Claude')}${tech('ElevenLabs')}${tech('Pictory')}
                </div>
            </div>

            <!-- Problem Solved (preserved) -->
            <div class="card" style="margin-bottom:16px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
                    <span style="font-size:1.4rem;">&#127919;</span>
                    <h2 style="font-family:'Cinzel',serif;font-size:1.05rem;color:var(--accent);margin:0;">Problem Solved</h2>
                </div>
                <div style="display:flex;flex-direction:column;gap:12px;">
                    ${prob('&#128269;', 'Scattered Resources, One Platform', 'Centralizes scattered genealogy resources — Dawes Rolls, Freedmen records, DNA guides, tribal contacts, and legal documents — into one structured, searchable platform.')}
                    ${prob('&#127793;', 'Access to Heritage', 'Improves access to Freedmen and Indigenous ancestry research for descendants of the Five Civilized Tribes who face unique barriers to tracing their heritage.')}
                    ${prob('&#128101;', 'Community Connection', 'Builds community among descendants through shared resources, educational content, interactive learning, and collaborative genealogy research tools.')}
                </div>
            </div>

            <!-- My Role (preserved) -->
            <div class="card" style="margin-bottom:16px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
                    <span style="font-size:1.4rem;">&#128104;&#8205;&#128187;</span>
                    <h2 style="font-family:'Cinzel',serif;font-size:1.05rem;color:var(--accent);margin:0;">My Role</h2>
                </div>
                <div style="display:flex;flex-direction:column;gap:8px;">
                    ${role('UI/UX', 'Designed the complete user interface and experience across 21+ pages')}
                    ${role('Front-End', 'Built full front-end architecture — SPA routing, state management, localStorage persistence')}
                    ${role('Systems', 'Implemented dynamic systems — resource ranking, TTS engine, camera scanner, chatbot')}
                    ${role('API', 'Integrated ElevenLabs TTS, Leaflet.js mapping, Web Speech API, and getUserMedia')}
                    ${role('Research', 'Curated 38+ verified resources, 50 educational tips, and 6 multimedia courses')}
                </div>
            </div>

            <!-- App Stats (preserved) -->
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:20px;">
                ${stat('21+', 'Pages')}${stat('38+', 'Resources')}${stat('48', 'Learning Slides')}${stat('50', 'Edu Tips')}${stat('7', 'Migration Routes')}${stat('5', 'Voice Clips')}
            </div>

            <!-- Additional Projects (placeholder grid) -->
            <div style="margin-bottom:16px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
                    <span style="font-size:1.4rem;">&#128193;</span>
                    <h2 style="font-family:'Cinzel',serif;font-size:1.05rem;color:var(--accent);margin:0;">Additional Projects</h2>
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;">
                    <div class="card" style="text-align:center;padding:32px 20px;border:1px dashed var(--border-color);opacity:0.6;">
                        <div style="font-size:2rem;margin-bottom:8px;">&#128679;</div>
                        <h4 style="color:var(--text-muted);margin:0 0 4px;font-size:0.88rem;">Coming Soon</h4>
                        <p style="color:var(--text-muted);font-size:0.76rem;margin:0;">Next project card will appear here</p>
                    </div>
                    <div class="card" style="text-align:center;padding:32px 20px;border:1px dashed var(--border-color);opacity:0.6;">
                        <div style="font-size:2rem;margin-bottom:8px;">&#128679;</div>
                        <h4 style="color:var(--text-muted);margin:0 0 4px;font-size:0.88rem;">Coming Soon</h4>
                        <p style="color:var(--text-muted);font-size:0.76rem;margin:0;">Next project card will appear here</p>
                    </div>
                </div>
            </div>

            <div style="text-align:center;margin-top:8px;">
                <button class="btn btn-primary" onclick="BAO_App.navigate('home')">&#127968; Back to Home</button>
            </div>

        </div>`;
    },

    // ============== INTERACTION HANDLERS ==============

    filterDawesRolls() {
        const q = (document.getElementById('dawes-search-input')?.value || '').toLowerCase();
        const tribe = document.getElementById('dawes-tribe-filter')?.value || '';
        const status = document.getElementById('dawes-status-filter')?.value || '';
        const rows = document.querySelectorAll('#dawes-table-body tr');
        let count = 0;
        rows.forEach(row => {
            const matchSearch = !q || row.dataset.search.includes(q);
            const matchTribe = !tribe || row.dataset.tribe === tribe;
            const matchStatus = !status || row.dataset.status === status;
            const show = matchSearch && matchTribe && matchStatus;
            row.style.display = show ? '' : 'none';
            if (show) count++;
        });
        const counter = document.getElementById('dawes-count');
        if (counter) counter.textContent = count;
    },

    filterFreedmenRecords() {
        const q = (document.getElementById('freedmen-search')?.value || '').toLowerCase();
        const tribe = document.getElementById('freedmen-tribe')?.value || '';
        document.querySelectorAll('#freedmen-list .card').forEach(card => {
            const matchSearch = !q || card.dataset.search.includes(q);
            const matchTribe = !tribe || card.dataset.tribe === tribe;
            card.style.display = (matchSearch && matchTribe) ? '' : 'none';
        });
    },

    filterSlaveSchedules() {
        const q = (document.getElementById('slave-search')?.value || '').toLowerCase();
        const year = document.getElementById('slave-year')?.value || '';
        document.querySelectorAll('#slave-table-body tr').forEach(row => {
            const matchSearch = !q || row.dataset.search.includes(q);
            const matchYear = !year || row.dataset.year === year;
            row.style.display = (matchSearch && matchYear) ? '' : 'none';
        });
    },

    filterAllotments() {
        const q = (document.getElementById('allotment-search')?.value || '').toLowerCase();
        const tribe = document.getElementById('allotment-tribe')?.value || '';
        document.querySelectorAll('#allotment-list .card').forEach(card => {
            const matchSearch = !q || card.dataset.search.includes(q);
            const matchTribe = !tribe || card.dataset.tribe === tribe;
            card.style.display = (matchSearch && matchTribe) ? '' : 'none';
        });
    },

    filterTimeline(cat) {
        document.querySelectorAll('.timeline-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
        document.querySelectorAll('.timeline-item').forEach(item => {
            item.style.display = (cat === 'all' || item.dataset.category === cat) ? '' : 'none';
        });
    },

    filterNames() {
        const q = (document.getElementById('name-search')?.value || '').toLowerCase();
        document.querySelectorAll('#name-list .card').forEach(card => {
            card.style.display = (!q || card.dataset.search.includes(q)) ? '' : 'none';
        });
    },

    filterResources(btn, category) {
        document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('#resources-list .card').forEach(card => {
            card.style.display = (category === 'All' || card.dataset.category === category) ? '' : 'none';
        });
    },

    showDawesDetail(id) {
        const r = BAO_DATA.dawesRolls.find(d => d.id === id);
        if (!r) return;

        // Tribe-specific historical context
        const tribeHistory = {
            'Cherokee': 'The Cherokee Nation held approximately 4,600 enslaved people by 1860. After the 2017 Cherokee Nation v. Nash ruling, Cherokee Freedmen descendants gained full citizenship rights based on the 1866 Treaty.',
            'Choctaw': 'The Choctaw Nation was the first removed to Indian Territory (1831-1833). By 1860, they held approximately 2,300 people in bondage. The 1866 Treaty required adoption of Freedmen.',
            'Creek': 'The Muscogee (Creek) Nation enrolled the largest number of Freedmen — approximately 6,800 individuals. Creek Freedmen received land allotments equal to Creek citizens by blood.',
            'Chickasaw': 'The Chickasaw Nation was the most resistant to Freedmen adoption. Chickasaw Freedmen received smaller allotments (40 acres vs. 320 for by-blood citizens) and still lack recognized citizenship.',
            'Seminole': 'Black Seminoles fought alongside Seminoles in the Seminole Wars. The Seminole Nation recognizes two Freedmen bands — Dosar Barkus and Caesar Bruner — with distinct political identity.'
        };
        const tribeColors = { 'Cherokee': '#E8443A', 'Choctaw': '#FFB830', 'Creek': '#4ECDC4', 'Chickasaw': '#C084FC', 'Seminole': '#F59E0B' };
        const tc = tribeColors[r.tribe] || '#FFB830';

        BAO_Utils.modal.show(`
            <div style="text-align:center;padding-bottom:16px;border-bottom:1px solid rgba(255,184,48,0.15);margin-bottom:16px;">
                <div style="font-size:3rem;margin-bottom:4px;">&#128220;</div>
                <h2 style="font-family:'Cinzel',serif;color:${tc};margin:4px 0;text-shadow:0 0 12px ${tc}44;">Dawes Roll Record</h2>
                <div style="font-size:0.82rem;color:#a89bc2;">Official Enrollment Document · Dawes Commission</div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">
                <div style="background:rgba(255,184,48,0.06);border:1px solid rgba(255,184,48,0.12);border-radius:8px;padding:10px;text-align:center;">
                    <div style="font-size:0.7rem;color:#8878a0;text-transform:uppercase;">Roll Number</div>
                    <div style="font-size:1.2rem;font-weight:700;color:var(--accent);">${r.rollNumber}</div>
                </div>
                <div style="background:rgba(255,184,48,0.06);border:1px solid rgba(255,184,48,0.12);border-radius:8px;padding:10px;text-align:center;">
                    <div style="font-size:0.7rem;color:#8878a0;text-transform:uppercase;">Card Number</div>
                    <div style="font-size:1.2rem;font-weight:700;color:${tc};">${r.cardNumber}</div>
                </div>
            </div>

            <div class="record-detail">
                <div class="record-label">Full Name</div><div class="record-value" style="font-weight:600">${r.name}</div>
                <div class="record-label">Tribe</div><div class="record-value"><span class="badge" style="background:${tc}22;color:${tc};border:1px solid ${tc}44;">${r.tribe} Freedman</span></div>
                <div class="record-label">Blood Quantum</div><div class="record-value">${r.bloodQuantum}</div>
                <div class="record-label">Age at Enrollment</div><div class="record-value">${r.age}</div>
                <div class="record-label">Sex</div><div class="record-value">${r.sex === 'M' ? 'Male' : 'Female'}</div>
                <div class="record-label">Post Office</div><div class="record-value">${r.postOffice}</div>
                <div class="record-label">Enrollment Date</div><div class="record-value">${BAO_Utils.formatDate(r.enrollDate)}</div>
                <div class="record-label">District</div><div class="record-value">${r.district}</div>
                <div class="record-label">Status</div><div class="record-value"><span class="badge ${r.status === 'Approved' ? 'badge-green' : 'badge-red'}">${r.status}</span></div>
            </div>

            <div style="margin-top:14px;padding:12px;background:rgba(255,184,48,0.05);border:1px solid rgba(255,184,48,0.12);border-radius:10px;">
                <div style="font-family:'Cinzel',serif;font-size:0.78rem;color:#FFB830;letter-spacing:1px;margin-bottom:6px;">&#128214; HISTORICAL NOTES</div>
                <p style="font-size:0.82rem;line-height:1.6;color:#c4bcd4;margin:0;">${r.notes}</p>
            </div>

            ${tribeHistory[r.tribe] ? `
            <div style="margin-top:10px;padding:12px;background:rgba(${tc === '#E8443A' ? '232,68,58' : tc === '#4ECDC4' ? '78,205,196' : tc === '#C084FC' ? '192,132,252' : tc === '#F59E0B' ? '245,158,11' : '255,184,48'},0.05);border:1px solid ${tc}22;border-radius:10px;">
                <div style="font-family:'Cinzel',serif;font-size:0.78rem;color:${tc};letter-spacing:1px;margin-bottom:6px;">&#127963; ${r.tribe.toUpperCase()} TRIBAL HISTORY</div>
                <p style="font-size:0.82rem;line-height:1.6;color:#c4bcd4;margin:0;">${tribeHistory[r.tribe]}</p>
            </div>` : ''}

            <div style="margin-top:16px;display:flex;gap:10px;justify-content:center;">
                <button class="btn btn-accent btn-sm" onclick="BAO_Pages.quickAddFromDawes('${r.id}')">+ Save as Ancestor</button>
                <button class="btn btn-secondary btn-sm" onclick="BAO_Utils.modal.hide()">Close</button>
            </div>
        `);
    },

    showFreedmenDetail(id) {
        const r = BAO_DATA.freedmenRecords.find(d => d.id === id);
        if (!r) return;
        BAO_Utils.modal.show(`
            <h2 style="margin-bottom:16px;color:var(--accent)">Freedmen Record</h2>
            <div class="record-detail">
                <div class="record-label">Name</div><div class="record-value">${r.name}</div>
                <div class="record-label">Tribe</div><div class="record-value">${r.tribe}</div>
                <div class="record-label">Contract Date</div><div class="record-value">${BAO_Utils.formatDate(r.contractDate)}</div>
                <div class="record-label">Former Owner</div><div class="record-value">${r.formerOwner}</div>
                <div class="record-label">Type</div><div class="record-value">${r.type}</div>
                <div class="record-label">Location</div><div class="record-value">${r.location}</div>
                <div class="record-label">Occupation</div><div class="record-value">${r.occupation}</div>
                <div class="record-label">Family Size</div><div class="record-value">${r.familySize} persons</div>
                <div class="record-label">Notes</div><div class="record-value" style="font-style:italic;color:var(--text-secondary)">${r.notes}</div>
            </div>
            <button class="btn btn-secondary btn-sm" style="margin-top:16px" onclick="BAO_Utils.modal.hide()">Close</button>
        `);
    },

    showSlaveScheduleDetail(id) {
        const r = BAO_DATA.slaveSchedules.find(d => d.id === id);
        if (!r) return;
        BAO_Utils.modal.show(`
            <h2 style="margin-bottom:16px;color:var(--accent)">Tribal Census Record Entry</h2>
            <div class="record-detail">
                <div class="record-label">Year</div><div class="record-value">${r.year}</div>
                <div class="record-label">State</div><div class="record-value">${r.state}</div>
                <div class="record-label">County/Nation</div><div class="record-value">${r.county}</div>
                <div class="record-label">Tribal Member</div><div class="record-value">${r.owner}</div>
                <div class="record-label">Person Number</div><div class="record-value">#${r.slaveNumber}</div>
                <div class="record-label">Age</div><div class="record-value">${r.age}</div>
                <div class="record-label">Sex</div><div class="record-value">${r.sex === 'M' ? 'Male' : 'Female'}</div>
                <div class="record-label">Color</div><div class="record-value">${r.color}</div>
                <div class="record-label">Possible Name</div><div class="record-value" style="color:var(--accent)">${r.possibleName || 'Unknown'}</div>
                <div class="record-label">Notes</div><div class="record-value" style="font-style:italic;color:var(--text-secondary)">${r.notes}</div>
            </div>
            <button class="btn btn-secondary btn-sm" style="margin-top:16px" onclick="BAO_Utils.modal.hide()">Close</button>
        `);
    },

    showAllotmentDetail(id) {
        const r = BAO_DATA.landAllotments.find(d => d.id === id);
        if (!r) return;
        BAO_Utils.modal.show(`
            <h2 style="margin-bottom:16px;color:var(--accent)">Land Allotment Record</h2>
            <div class="record-detail">
                <div class="record-label">Allottee</div><div class="record-value">${r.allottee}</div>
                <div class="record-label">Roll Number</div><div class="record-value">${r.rollNumber}</div>
                <div class="record-label">Tribe</div><div class="record-value">${r.tribe}</div>
                <div class="record-label">Acreage</div><div class="record-value">${r.acreage} acres</div>
                <div class="record-label">Location</div><div class="record-value">${r.location}</div>
                <div class="record-label">Legal Description</div><div class="record-value">${r.section}</div>
                <div class="record-label">Date Patented</div><div class="record-value">${BAO_Utils.formatDate(r.datePatented)}</div>
                <div class="record-label">Land Type</div><div class="record-value">${r.landType}</div>
                <div class="record-label">Status</div><div class="record-value"><span class="badge badge-green">${r.status}</span></div>
                <div class="record-label">Notes</div><div class="record-value" style="font-style:italic;color:var(--text-secondary)">${r.notes}</div>
            </div>
            <button class="btn btn-secondary btn-sm" style="margin-top:16px" onclick="BAO_Utils.modal.hide()">Close</button>
        `);
    },

    // ========== TRIBAL NATION INFO POPUPS ==========
    showTribalNationInfo(tribe) {
        const info = {
            'Cherokee': {
                color: '#E8443A', capital: 'Tahlequah, Oklahoma', population: '~440,000 citizens',
                removal: '1836–1839 (Trail of Tears)', freedmenCount: '~4,600 enslaved by 1860',
                treaty: 'Treaty of 1866 granted Freedmen full citizenship. Confirmed by Cherokee Nation v. Nash (2017).',
                history: 'The Cherokee Nation was the largest of the Five Civilized Tribes and held the most enslaved people after the Choctaw. The Cherokee had a complex society with a written constitution, newspaper (Cherokee Phoenix), and a syllabary developed by Sequoyah. During the Trail of Tears, approximately 4,000 Cherokee died along with an unknown number of enslaved Black people. After the Civil War, the 1866 Treaty required the Cherokee to adopt Freedmen as full citizens. This right was contested for over 150 years until the landmark 2017 Cherokee Nation v. Nash ruling confirmed Freedmen citizenship rights without blood quantum requirements.',
                freedmenStatus: 'RECOGNIZED — Cherokee Freedmen have full citizenship rights (since 2017 ruling)',
                keyFigure: 'Marilyn Vann — Led the decades-long fight for Cherokee Freedmen citizenship rights'
            },
            'Choctaw': {
                color: '#FFB830', capital: 'Durant, Oklahoma', population: '~200,000 citizens',
                removal: '1831–1833 (First tribe removed)', freedmenCount: '~2,300 enslaved by 1860',
                treaty: 'Treaty of 1866 (Choctaw-Chickasaw Treaty) required adoption of Freedmen within two years.',
                history: 'The Choctaw Nation was the first of the Five Civilized Tribes forcibly removed to Indian Territory. The Choctaw removal (1831-1833) was marked by extreme suffering — thousands died from exposure, starvation, and disease during winter marches from Mississippi. Enslaved Black people accompanied their Choctaw enslavers on this journey. The Choctaw established a new government in Indian Territory with their capital at Tuskahoma. After the Civil War, the 1866 Treaty gave a two-year window for Freedmen adoption. The Choctaw eventually adopted their Freedmen, though citizenship rights have been contested. The Dawes Commission enrolled Choctaw Freedmen separately from Choctaw by blood.',
                freedmenStatus: 'CONTESTED — Choctaw Freedmen descendants face ongoing citizenship challenges',
                keyFigure: 'Robert Williams (Card #2241) — Representative of Choctaw Freedmen enrolled on the Dawes Rolls'
            },
            'Creek': {
                color: '#4ECDC4', capital: 'Okmulgee, Oklahoma', population: '~90,000 citizens',
                removal: '1836–1837', freedmenCount: '~6,800 Freedmen enrolled on Dawes Rolls',
                treaty: 'Creek Treaty of 1866 promised Freedmen "all the rights and privileges of native citizens."',
                history: 'The Muscogee (Creek) Nation had one of the most established Freedmen communities among the Five Tribes. Creek Freedmen participated in tribal governance and sent representatives to the Creek National Council. The Creek Nation capital at Okmulgee was a center of Freedmen political activity. Creek Freedmen received land allotments equal in size to those of Creek citizens by blood — a significant distinction from the Chickasaw, where Freedmen received much smaller allotments. Today, Creek Freedmen descendants can apply for citizenship through the Muscogee (Creek) Nation.',
                freedmenStatus: 'PATHWAY EXISTS — Creek Freedmen can apply for citizenship with documented Dawes descent',
                keyFigure: 'Jake Simmons Jr. — Creek Freedman descendant who became a prominent oil businessman and civil rights leader'
            },
            'Chickasaw': {
                color: '#C084FC', capital: 'Ada, Oklahoma', population: '~75,000 citizens',
                removal: '1837–1838', freedmenCount: '~1,000 enslaved by 1860',
                treaty: '1866 Treaty gave two-year window for adoption — Chickasaw Nation never formally adopted Freedmen.',
                history: 'The Chickasaw Nation has the most contested relationship with Freedmen descendants. The powerful Colbert family — including Winchester Colbert, Holmes Colbert, and others — dominated Chickasaw politics for generations while also being among the largest holders of enslaved people. After the Civil War, the 1866 Treaty gave the Chickasaw two years to adopt their Freedmen, but this was never formally done. Chickasaw Freedmen received smaller land allotments (typically 40 acres compared to 320 acres for Chickasaw by blood). Today, Chickasaw citizenship requires blood quantum, effectively excluding all Freedmen descendants.',
                freedmenStatus: 'EXCLUDED — Chickasaw Freedmen descendants currently cannot obtain tribal citizenship',
                keyFigure: 'The Colbert Family — Prominent Chickasaw leaders whose enslaved Freedmen descendants carry the Colbert surname today'
            },
            'Seminole': {
                color: '#F59E0B', capital: 'Wewoka, Oklahoma', population: '~18,000 citizens',
                removal: '1836–1842 (Three Seminole Wars)', freedmenCount: '~2,000 Black Seminoles',
                treaty: 'Seminole Treaty of 1866 granted Freedmen bands political representation in tribal government.',
                history: 'The Seminole Nation had the most unique relationship with their Black members among all Five Tribes. Black Seminoles were not merely enslaved people — many lived in separate, semi-autonomous villages, bore arms, served as interpreters and warriors, and had their own leaders. Black Seminoles fought alongside Seminoles in the devastating Seminole Wars (1817-1858), making removal the most costly and protracted of all tribal removals. The Seminole Nation recognizes two distinct Freedmen bands — the Dosar Barkus Band and the Caesar Bruner Band — giving Seminole Freedmen a distinct political identity within the tribal nation. In 2000, the Seminole Nation controversially voted to exclude Freedmen, but federal intervention has kept the question unresolved.',
                freedmenStatus: 'DISPUTED — Two recognized Freedmen bands exist but citizenship remains contested',
                keyFigure: 'John Horse (Juan Caballo) — Black Seminole leader who fought in the Seminole Wars and led his people to freedom in Mexico'
            }
        };

        const t = info[tribe];
        if (!t) return;

        BAO_Utils.modal.show(`
            <div style="text-align:center;padding-bottom:16px;border-bottom:1px solid ${t.color}33;margin-bottom:16px;">
                <div style="font-size:3rem;margin-bottom:4px;">&#127963;</div>
                <h2 style="font-family:'Cinzel',serif;color:${t.color};margin:4px 0;text-shadow:0 0 12px ${t.color}44;">${tribe} Nation</h2>
                <div style="font-size:0.82rem;color:#a89bc2;">Five Civilized Tribes · Freedmen Heritage</div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">
                <div style="background:rgba(255,184,48,0.06);border:1px solid rgba(255,184,48,0.12);border-radius:8px;padding:10px;">
                    <div style="font-size:0.68rem;color:#8878a0;text-transform:uppercase;">Capital</div>
                    <div style="font-size:0.85rem;color:#e0d8eb;">${t.capital}</div>
                </div>
                <div style="background:rgba(255,184,48,0.06);border:1px solid rgba(255,184,48,0.12);border-radius:8px;padding:10px;">
                    <div style="font-size:0.68rem;color:#8878a0;text-transform:uppercase;">Population</div>
                    <div style="font-size:0.85rem;color:#e0d8eb;">${t.population}</div>
                </div>
                <div style="background:rgba(255,184,48,0.06);border:1px solid rgba(255,184,48,0.12);border-radius:8px;padding:10px;">
                    <div style="font-size:0.68rem;color:#8878a0;text-transform:uppercase;">Removal Period</div>
                    <div style="font-size:0.85rem;color:#e0d8eb;">${t.removal}</div>
                </div>
                <div style="background:rgba(255,184,48,0.06);border:1px solid rgba(255,184,48,0.12);border-radius:8px;padding:10px;">
                    <div style="font-size:0.68rem;color:#8878a0;text-transform:uppercase;">Freedmen Enslaved</div>
                    <div style="font-size:0.85rem;color:#e0d8eb;">${t.freedmenCount}</div>
                </div>
            </div>

            <div style="padding:12px;background:rgba(${t.color === '#E8443A' ? '232,68,58' : t.color === '#4ECDC4' ? '78,205,196' : t.color === '#C084FC' ? '192,132,252' : t.color === '#F59E0B' ? '245,158,11' : '255,184,48'},0.05);border:1px solid ${t.color}22;border-radius:10px;margin-bottom:12px;">
                <div style="font-family:'Cinzel',serif;font-size:0.78rem;color:${t.color};letter-spacing:1px;margin-bottom:6px;">&#128220; TRIBAL HISTORY</div>
                <p style="font-size:0.82rem;line-height:1.6;color:#c4bcd4;margin:0;">${t.history}</p>
            </div>

            <div style="padding:12px;background:rgba(255,184,48,0.05);border:1px solid rgba(255,184,48,0.12);border-radius:10px;margin-bottom:12px;">
                <div style="font-family:'Cinzel',serif;font-size:0.78rem;color:#FFB830;letter-spacing:1px;margin-bottom:6px;">&#9878; 1866 TREATY</div>
                <p style="font-size:0.82rem;line-height:1.6;color:#c4bcd4;margin:0;">${t.treaty}</p>
            </div>

            <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(${t.color === '#E8443A' ? '232,68,58' : t.color === '#4ECDC4' ? '78,205,196' : t.color === '#C084FC' ? '192,132,252' : t.color === '#F59E0B' ? '245,158,11' : '255,184,48'},0.08);border-radius:8px;margin-bottom:12px;border-left:3px solid ${t.color};">
                <span style="font-size:1.3rem;">&#128100;</span>
                <div>
                    <div style="font-size:0.72rem;color:#8878a0;">Key Historical Figure</div>
                    <div style="font-size:0.84rem;color:#e0d8eb;">${t.keyFigure}</div>
                </div>
            </div>

            <div style="padding:10px 14px;background:${t.freedmenStatus.startsWith('RECOGNIZED') ? 'rgba(76,175,80,0.1);border:1px solid rgba(76,175,80,0.3)' : t.freedmenStatus.startsWith('EXCLUDED') ? 'rgba(244,67,54,0.1);border:1px solid rgba(244,67,54,0.3)' : 'rgba(255,152,0,0.1);border:1px solid rgba(255,152,0,0.3)'};border-radius:8px;margin-bottom:16px;">
                <div style="font-size:0.72rem;color:#8878a0;text-transform:uppercase;margin-bottom:4px;">Freedmen Citizenship Status</div>
                <div style="font-size:0.84rem;font-weight:600;color:${t.freedmenStatus.startsWith('RECOGNIZED') ? '#4CAF50' : t.freedmenStatus.startsWith('EXCLUDED') ? '#F44336' : '#FF9800'};">${t.freedmenStatus}</div>
            </div>

            <button class="btn btn-secondary btn-sm" style="width:100%;" onclick="BAO_Utils.modal.hide()">Close</button>
        `);
    },

    // Detailed educational bios for each ancestor in the sample tree
    ancestorBios: {
        'root': {
            bio: 'Robert Williams was a Choctaw Freedman who lived in Atoka, Indian Territory. Born into enslavement within the Choctaw Nation before the Civil War, he gained his freedom following the Treaty of 1866. Robert was enrolled on the Dawes Rolls as Choctaw Freedman Card #2241, receiving a land allotment in Atoka County. As a farmer, he built a life for his family on Choctaw land, raising four children who would marry into Cherokee, Chickasaw, Creek, and Seminole Freedmen families — creating a legacy that spans all Five Civilized Tribes.',
            dawes: 'Enrolled on Dawes Rolls — Choctaw Freedman Card #2241. Listed at Atoka, Indian Territory. Enrollment jacket held at National Archives, Fort Worth, TX (Record Group 75).',
            tribalHistory: 'The Choctaw Nation was the first of the Five Civilized Tribes removed to Indian Territory (1831-1833). By 1860, the Choctaw held approximately 2,300 people in bondage. After the Civil War, the Treaty of 1866 required the Choctaw to adopt Freedmen, though full citizenship rights remain contested to this day.',
            occupation: 'Farmer — Atoka County, Choctaw Nation',
            location: 'Atoka, Indian Territory (present-day Atoka, Oklahoma)'
        },
        'spouse-root': {
            bio: 'Clara Williams (née unknown) was a Choctaw Freedwoman and wife of Robert Williams. Born around 1862 in the Choctaw Nation, she was likely enslaved by a Choctaw family before emancipation. After the Civil War, Clara and Robert established their homestead in the Atoka area. She was a homemaker and farmer who raised four children — James, Dorothy, Hannah, and Henry. Clara likely appears on Dawes Card #2241 alongside her husband.',
            dawes: 'Likely enrolled on same Dawes Card #2241 as spouse of Robert Williams. Check enrollment jacket for her maiden name, which could help trace her parents\' lineage to earlier Choctaw tribal census records.',
            tribalHistory: 'Choctaw Freedwomen played vital roles in family and community life after emancipation. Many maintained farms, raised children, and preserved oral histories. Despite their contributions, Choctaw Freedmen women were often listed only as dependents on their husbands\' enrollment cards.',
            occupation: 'Homemaker and Farmer',
            location: 'Atoka, Indian Territory'
        },
        'child-1': {
            bio: 'James Williams was the eldest son of Robert and Clara Williams. Born around 1885 in Indian Territory before Oklahoma statehood, James grew up as a Choctaw Freedman during the critical Dawes enrollment era. He married Lucinda Vann, a Cherokee Freedwoman whose surname connects to the powerful Vann family — one of the largest Cherokee enslaving families. Their marriage united Choctaw and Cherokee Freedmen lineages. James worked as a farmer and laborer, raising three children.',
            dawes: 'Likely listed as a minor child on Dawes Card #2241. Would have received his own land allotment as a minor Freedman in the Choctaw Nation. Check Choctaw allotment records for his individual parcel.',
            tribalHistory: 'Children of Freedmen who were minors during the Dawes enrollment (1898-1914) were listed on their parents\' cards but received separate land allotments. Many of these allotments were lost through "grafting" — schemes by white land speculators who defrauded Indigenous and Freedmen families of their land.',
            occupation: 'Farmer and Laborer',
            location: 'Atoka County, Choctaw Nation / Indian Territory'
        },
        'sp-child-1': {
            bio: 'Lucinda Vann was a Cherokee Freedwoman who married James Williams. The Vann surname is one of the most historically significant in Cherokee Freedmen history — James Vann and his son Joseph "Rich Joe" Vann were among the wealthiest Cherokee, holding hundreds of people in bondage at the Diamond Hill plantation in Georgia. After the Trail of Tears, the Vann family brought their enslaved people to Indian Territory. Lucinda\'s ancestors likely gained their freedom and the Vann name after the Civil War.',
            dawes: 'Enrolled on Cherokee Freedman rolls. The Vann name appears frequently on Cherokee Freedmen cards. Cross-reference with Cherokee Nation enrollment records to find her specific card number.',
            tribalHistory: 'The Cherokee Nation held more enslaved people than any other tribe — approximately 4,600 by 1860. After the landmark 2017 Cherokee Nation v. Nash ruling, Cherokee Freedmen descendants gained full citizenship rights based on the 1866 Treaty, without blood quantum requirements. This was a historic victory for Freedmen descendants.',
            occupation: 'Homemaker',
            location: 'Cherokee Nation / Choctaw Nation, Indian Territory'
        },
        'child-2': {
            bio: 'Dorothy Williams was the eldest daughter of Robert and Clara Williams. Born around 1890 in Indian Territory, she became a teacher and community leader among Freedmen families. Dorothy married Moses Colbert, a Chickasaw Freedman whose surname traces to the powerful Colbert dynasty — the most influential family in Chickasaw political history. Their union connected the Choctaw and Chickasaw Freedmen communities.',
            dawes: 'Likely enrolled as a minor on Dawes Card #2241. Born in Indian Territory before Oklahoma statehood (1907). Check Oklahoma school records and church registers for additional documentation.',
            tribalHistory: 'The Chickasaw Nation was the most resistant to Freedmen adoption. The Colbert family dominated Chickasaw politics for generations — Winchester Colbert, Holmes Colbert, and others were prominent leaders who also held people in bondage. Chickasaw Freedmen received smaller land allotments (40 acres vs. 320 acres for Chickasaw by blood) and still lack recognized citizenship today.',
            occupation: 'Teacher and Community Leader',
            location: 'Atoka, I.T. → Chickasaw Nation'
        },
        'sp-child-2': {
            bio: 'Moses Colbert was a Chickasaw Freedman descended from people enslaved by the Colbert family — the ruling dynasty of the Chickasaw Nation. The Colbert name appears throughout Chickasaw history, from Piominko and George Colbert in the 1700s to the territorial era. Moses worked as a farmer in the Chickasaw Nation, where Freedmen faced some of the harshest treatment among the Five Tribes.',
            dawes: 'Enrolled on Chickasaw Freedman rolls. The Colbert name is extensively documented in Chickasaw records. Check Chickasaw Freedman cards and allotment records at the Oklahoma Historical Society.',
            tribalHistory: 'Chickasaw Freedmen have the most difficult path to tribal citizenship. The 1866 Treaty gave a two-year window for adoption, but the Chickasaw Nation never formally adopted their Freedmen. Today, blood quantum is required for Chickasaw citizenship, effectively excluding all Freedmen descendants.',
            occupation: 'Farmer',
            location: 'Chickasaw Nation, Indian Territory'
        },
        'child-3': {
            bio: 'Hannah Williams was the second daughter of Robert and Clara Williams. Born around 1893, she married Caesar Bruner, a Seminole Freedman from the historic Bruner Band — one of two recognized Freedmen bands within the Seminole Nation. The Bruner Band (also called Caesar Bruner Band) was established after the Civil War and maintains its identity within the Seminole Nation to this day.',
            dawes: 'Enrolled as minor on Choctaw Freedman Card #2241. Her husband Caesar Bruner would appear on Seminole Freedman rolls under the Dosar Barkus or Caesar Bruner Band.',
            tribalHistory: 'The Seminole Nation had a unique relationship with their Black members. Black Seminoles fought alongside Seminoles in the devastating Seminole Wars (1817-1858), serving as warriors, interpreters, and scouts. The Seminole Nation recognizes two Freedmen bands — the Dosar Barkus Band and the Caesar Bruner Band — giving Seminole Freedmen a distinct political identity within the tribal nation.',
            occupation: 'Homemaker',
            location: 'Choctaw Nation → Seminole Nation, I.T.'
        },
        'sp-child-3': {
            bio: 'Caesar Bruner was a Seminole Freedman and member of the Caesar Bruner Band — one of two Freedmen bands recognized by the Seminole Nation. The Bruner Band takes its name from a historical Freedmen leader. Black Seminoles have a remarkable history of alliance with the Seminole people, fighting together against U.S. forces in the Seminole Wars. Caesar carried on this legacy of resilience and community leadership.',
            dawes: 'Enrolled on Seminole Freedman rolls. Seminole Freedmen were organized into two bands for enrollment purposes. Check Seminole Nation records in Wewoka, Oklahoma for enrollment details.',
            tribalHistory: 'Black Seminoles had more autonomy than enslaved people in other tribal nations. They lived in separate villages, bore arms, and had their own leaders. After removal to Indian Territory, the Seminole Nation maintained this semi-autonomous structure. In 2000, the Seminole Nation controversially voted to exclude Freedmen, but federal intervention has kept the citizenship question unresolved.',
            occupation: 'Farmer and Community Leader',
            location: 'Seminole Nation, Indian Territory (Wewoka area)'
        },
        'child-4': {
            bio: 'Henry Williams was the youngest son of Robert and Clara Williams. Born around 1896 in Indian Territory, just before Oklahoma statehood in 1907, Henry married Delia Checote, a Creek Freedwoman. The Checote surname is historically significant — Samuel Checote served as Principal Chief of the Creek Nation (1869-1875 and 1879-1883) and held enslaved people. Henry worked as a farmer in the Creek Nation territory.',
            dawes: 'May appear on Dawes Card #2241 as a minor, or on a separate "New Born" Freedman card if enrolled after the initial registration. Check both Choctaw Freedman and New Born rolls.',
            tribalHistory: 'The Creek (Muscogee) Nation enrolled the largest number of Freedmen of any tribe — approximately 6,800 individuals. The Creek Treaty of 1866 promised Freedmen "all the rights and privileges of native citizens." Creek Freedmen could participate in tribal government and received land allotments equal to those of Creek citizens by blood.',
            occupation: 'Farmer',
            location: 'Choctaw Nation → Creek Nation, Indian Territory'
        },
        'sp-child-4': {
            bio: 'Delia Checote was a Creek (Muscogee) Freedwoman whose surname connects to one of the most prominent Creek families. Samuel Checote, a Creek Chief, was among the tribal leaders who held people in bondage. After emancipation, the Checote name was adopted by Freedmen families connected to the Chief\'s household. Delia married Henry Williams, creating a Choctaw-Creek Freedmen family connection.',
            dawes: 'Enrolled on Creek (Muscogee) Freedman rolls. The Checote name is well-documented in Creek Nation records. Check the Muscogee Nation enrollment office in Okmulgee, Oklahoma.',
            tribalHistory: 'Creek Freedmen had relatively strong rights compared to other tribes. The Creek Nation capital at Okmulgee was a center of Freedmen political activity. Creek Freedmen elected representatives to the Creek National Council and participated in tribal governance. Today, Creek Freedmen descendants can apply for citizenship through the Muscogee Nation.',
            occupation: 'Homemaker and Farmer',
            location: 'Creek Nation, Indian Territory (Okmulgee area)'
        },
        'gc-1': {
            bio: 'Samuel Williams was the eldest grandson of Robert Williams, carrying forward the Williams Freedmen legacy into the 20th century. Born in 1910 in the newly formed state of Oklahoma, Samuel grew up in the post-allotment era when many Freedmen families were losing their land to grafters and speculators. He worked to preserve the family\'s Choctaw land allotment.',
            dawes: 'Born after initial Dawes enrollment but may appear on "New Born" or supplemental rolls. His parents\' enrollment on Card #2241 establishes his Choctaw Freedmen lineage.',
            tribalHistory: 'After Oklahoma statehood in 1907, Freedmen faced Jim Crow laws that stripped away many rights they had held in Indian Territory. Segregation, voter suppression, and land theft devastated Freedmen communities. Many families fled to all-Black towns like Boley, Taft, and Red Bird.',
            occupation: 'Farmer and Landowner',
            location: 'Atoka County, Oklahoma'
        },
        'gc-2': {
            bio: 'Ella Mae Williams was the granddaughter of Robert and Clara Williams. Born in 1913 in Oklahoma, she was named in the tradition of many Freedmen families who gave daughters names reflecting grace and resilience. Ella Mae lived through the Great Depression, the Dust Bowl, and the Civil Rights era, carrying forward her family\'s Choctaw Freedmen heritage.',
            dawes: 'Born after Dawes enrollment period. Her lineage traces through James Williams to Card #2241. Important for establishing descent for potential tribal citizenship claims.',
            tribalHistory: 'Freedmen women were the keepers of family history, passing down stories through oral tradition. Many preserved crucial documents — Dawes cards, allotment papers, and family photographs — that modern descendants use to trace their heritage.',
            occupation: 'Teacher',
            location: 'Atoka, Oklahoma'
        },
        'gc-3': {
            bio: 'George Williams was the youngest child of James and Lucinda (Vann) Williams. Born in 1916, he carried both Choctaw Freedmen (Williams) and Cherokee Freedmen (Vann) lineage. George grew up during the era of Oklahoma\'s all-Black towns, which were founded by Freedmen descendants seeking self-governance and freedom from discrimination.',
            dawes: 'Lineage established through Choctaw Freedman Card #2241 (father\'s side) and Cherokee Freedman rolls (mother\'s side — Vann family). Dual tribal heritage documented.',
            tribalHistory: 'Oklahoma was home to over 50 all-Black towns, more than any other state. Many were founded by Freedmen descendants of the Five Civilized Tribes. Towns like Boley, Taft, Red Bird, and Rentiesville represented the aspirations of Black Indigenous families for self-determination.',
            occupation: 'Laborer',
            location: 'Oklahoma'
        },
        'gc-4': {
            bio: 'Patience Colbert was the daughter of Dorothy Williams and Moses Colbert. Born in 1912, her name reflects a tradition common among Chickasaw Freedmen families. The name "Patience" appears on multiple Chickasaw Freedmen cards. She carried both Choctaw (Williams) and Chickasaw (Colbert) Freedmen heritage.',
            dawes: 'Lineage traces through Chickasaw Freedman rolls (Colbert family) and Choctaw Freedman Card #2241 (Williams family). Dual tribal Freedmen documentation.',
            tribalHistory: 'Chickasaw Freedmen received the smallest land allotments — typically 40 acres compared to 320 for Chickasaw citizens by blood. Despite contributing to the Chickasaw Nation for generations, Freedmen descendants remain excluded from citizenship. Legal challenges continue.',
            occupation: 'Homemaker',
            location: 'Chickasaw Nation area, Oklahoma'
        },
        'gc-5': {
            bio: 'Isaac Colbert was the son of Dorothy Williams and Moses Colbert. Named in a Biblical tradition common among Freedmen families, Isaac carried the prominent Chickasaw Colbert surname. He grew up during the turbulent post-statehood era when tribal governments were dissolved and Freedmen communities faced increasing discrimination.',
            dawes: 'Heritage documented through both Chickasaw Freedman rolls (Colbert) and Choctaw Freedman Card #2241 (Williams). The Colbert name is extensively recorded in Chickasaw Nation archives.',
            tribalHistory: 'The Curtis Act of 1898 dissolved tribal governments and mandated individual land allotments. This fundamentally changed life for Freedmen families, shifting from communal tribal land to individual ownership — making them vulnerable to land fraud and speculation.',
            occupation: 'Farmer',
            location: 'Oklahoma'
        },
        'gc-6': {
            bio: 'Rachel Bruner was the daughter of Hannah Williams and Caesar Bruner. Born in 1918, she carried Choctaw Freedmen (Williams) and Seminole Freedmen (Bruner Band) heritage. Rachel grew up in the Seminole Nation area near Wewoka, Oklahoma, where the Bruner Band maintained its community identity.',
            dawes: 'Seminole Freedmen heritage through the Caesar Bruner Band. Choctaw Freedmen lineage through Card #2241. The Bruner Band is one of two recognized Seminole Freedmen bands.',
            tribalHistory: 'The Seminole Nation is unique among the Five Tribes in recognizing distinct Freedmen bands with political representation. The Caesar Bruner Band and Dosar Barkus Band have their own leaders and participate in Seminole governance. This structure reflects the historical alliance between Black and Seminole people.',
            occupation: 'Community Organizer',
            location: 'Wewoka, Oklahoma (Seminole Nation)'
        },
        'gc-7': {
            bio: 'Thomas Williams was the eldest child of Henry Williams and Delia Checote. Born in 1920 in the Creek Nation area, Thomas carried both Choctaw Freedmen (Williams) and Creek Freedmen (Checote) heritage. He grew up in the Okmulgee area, the capital of the Creek Nation.',
            dawes: 'Creek Freedmen lineage through the Checote family. Choctaw Freedmen lineage through Card #2241. Creek Freedmen enrollment records are housed at the Muscogee Nation in Okmulgee.',
            tribalHistory: 'The Muscogee (Creek) Nation has been more receptive to Freedmen inclusion than some other tribes. Creek Freedmen descendants can apply for citizenship, though the process requires documented proof of descent from a Dawes Freedman enrollee. The Creek National Council has Freedmen representation.',
            occupation: 'Farmer and Veteran',
            location: 'Okmulgee, Oklahoma (Creek Nation)'
        },
        'gc-8': {
            bio: 'Susie Williams was the youngest child of Henry Williams and Delia Checote. Born in 1923, she was among the last generation to have direct connection to parents who lived in Indian Territory before statehood. Susie became a keeper of family stories, preserving the oral history of the Williams, Checote, and broader Freedmen experience.',
            dawes: 'Heritage documented through Creek Freedman rolls (Checote) and Choctaw Freedman Card #2241 (Williams). Her long life (1923-2010) made her a vital link between the Dawes era and modern descendants.',
            tribalHistory: 'Freedmen elders like Susie are irreplaceable sources of oral history. Many families only learned of their Dawes Roll connections through stories passed down by grandparents and great-grandparents. Preserving these oral histories is critical — once these voices are gone, their knowledge is lost forever.',
            occupation: 'Oral Historian and Community Elder',
            location: 'Oklahoma'
        }
    },

    showPersonModal(id) {
        const tree = BAO_Utils.familyTree.getTree();
        const person = BAO_Utils.familyTree.findNode(tree, id);
        if (!person) return;

        // Get the detailed bio, or build a default
        const bioData = this.ancestorBios[id] || null;

        // Determine tribe color
        const tribeColors = {
            'Cherokee': '#E8443A', 'Choctaw': '#FFB830', 'Creek': '#4ECDC4', 'Muscogee': '#4ECDC4',
            'Chickasaw': '#C084FC', 'Seminole': '#F59E0B'
        };
        let tribeColor = '#FFB830';
        const tribeName = person.tribe || '';
        for (const [key, color] of Object.entries(tribeColors)) {
            if (tribeName.toLowerCase().includes(key.toLowerCase())) { tribeColor = color; break; }
        }

        // Gender detection for avatar
        const isFemale = person.gender === 'F' || /^(Mary|Clara|Dorothy|Sarah|Hannah|Lucinda|Delia|Patience|Rachel|Susie|Ella|Peggy|Annie|Emma|Lucy|Betty|Rose|Ruth|Nancy|Alice|Edith|Minnie|Grace|Ida)/i.test(person.name);
        const portraitSrc = isFemale ? 'https://i.imgur.com/T13NIA3.png' : 'https://i.imgur.com/07Jjczy.png';

        // Build the rich modal content
        let html = `
            <div style="text-align:center;padding-bottom:16px;border-bottom:1px solid rgba(255,184,48,0.15);margin-bottom:16px;">
                <div style="width:80px;height:80px;border-radius:50%;overflow:hidden;margin:0 auto 8px;border:3px solid #FFB830;background:#000;box-shadow:0 0 12px rgba(255,184,48,0.4);">
                    <img src="${portraitSrc}" alt="${person.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;filter:brightness(1.2) contrast(1.05);">
                </div>
                <h2 style="font-family:'Cinzel',serif;color:${tribeColor};font-size:1.3rem;margin:8px 0 4px;text-shadow:0 0 12px ${tribeColor}44;">${person.name}</h2>
                <div style="font-size:0.88rem;color:#a89bc2;margin-bottom:8px;">${person.birth || '?'} — ${person.death || 'Living'}</div>
                <div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap;">
                    ${tribeName ? `<span class="badge" style="background:${tribeColor}22;color:${tribeColor};border:1px solid ${tribeColor}44;font-size:0.75rem;">${tribeName}</span>` : ''}
                    ${person.rollNumber ? `<span class="badge" style="background:rgba(255,184,48,0.12);color:#FFB830;border:1px solid rgba(255,184,48,0.3);font-size:0.75rem;">Dawes Card #${person.rollNumber}</span>` : ''}
                </div>
            </div>`;

        if (bioData) {
            html += `
            <div style="margin-bottom:14px;">
                <div style="font-family:'Cinzel',serif;font-size:0.78rem;color:${tribeColor};letter-spacing:1px;margin-bottom:6px;text-transform:uppercase;">&#128220; Life Story</div>
                <p style="font-size:0.84rem;line-height:1.7;color:#d4cce4;">${bioData.bio}</p>
            </div>`;

            if (bioData.occupation) {
                html += `
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:8px 12px;background:rgba(255,184,48,0.06);border-radius:8px;border-left:3px solid ${tribeColor};">
                    <span style="font-size:1.1rem;">&#128188;</span>
                    <div><span style="font-size:0.72rem;color:#8878a0;">Occupation</span><br><span style="font-size:0.84rem;color:#e0d8eb;">${bioData.occupation}</span></div>
                </div>`;
            }
            if (bioData.location) {
                html += `
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;padding:8px 12px;background:rgba(255,184,48,0.06);border-radius:8px;border-left:3px solid ${tribeColor};">
                    <span style="font-size:1.1rem;">&#128205;</span>
                    <div><span style="font-size:0.72rem;color:#8878a0;">Location</span><br><span style="font-size:0.84rem;color:#e0d8eb;">${bioData.location}</span></div>
                </div>`;
            }

            html += `
            <div style="margin-bottom:14px;padding:12px;background:rgba(255,184,48,0.05);border:1px solid rgba(255,184,48,0.12);border-radius:10px;">
                <div style="font-family:'Cinzel',serif;font-size:0.78rem;color:#FFB830;letter-spacing:1px;margin-bottom:6px;">&#128220; DAWES ROLLS CONNECTION</div>
                <p style="font-size:0.82rem;line-height:1.6;color:#c4bcd4;">${bioData.dawes}</p>
            </div>

            <div style="padding:12px;background:rgba(${tribeColor === '#E8443A' ? '232,68,58' : tribeColor === '#4ECDC4' ? '78,205,196' : tribeColor === '#C084FC' ? '192,132,252' : tribeColor === '#F59E0B' ? '245,158,11' : '255,184,48'},0.05);border:1px solid ${tribeColor}22;border-radius:10px;">
                <div style="font-family:'Cinzel',serif;font-size:0.78rem;color:${tribeColor};letter-spacing:1px;margin-bottom:6px;">&#127963; TRIBAL HISTORY</div>
                <p style="font-size:0.82rem;line-height:1.6;color:#c4bcd4;">${bioData.tribalHistory}</p>
            </div>`;
        } else {
            // Default for user-added ancestors
            html += `
            <div style="padding:14px;background:rgba(255,184,48,0.05);border:1px solid rgba(255,184,48,0.12);border-radius:10px;text-align:center;">
                <p style="font-size:0.85rem;color:#a89bc2;line-height:1.6;">This ancestor was added to your family tree. Tap "Edit" to add their biography, Dawes Roll connection, and tribal history.</p>
            </div>`;
        }

        html += `
            <div style="display:flex;gap:8px;margin-top:16px;justify-content:center;">
                <button class="btn btn-primary btn-sm" style="background:${tribeColor};" onclick="BAO_Utils.modal.hide()">Close</button>
            </div>`;

        BAO_Utils.modal.show(html);
    },

    addAncestorForm() {
        BAO_Utils.modal.show(`
            <h2 style="margin-bottom:16px">Add Ancestor</h2>
            <div class="input-group"><label>Full Name *</label><input type="text" id="anc-name" placeholder="Last, First"></div>
            <div class="grid-2">
                <div class="input-group"><label>Birth Year</label><input type="text" id="anc-birth" placeholder="e.g. 1855 or c.1855"></div>
                <div class="input-group"><label>Death Year</label><input type="text" id="anc-death" placeholder="e.g. 1920"></div>
            </div>
            <div class="grid-2">
                <div class="input-group"><label>Tribe</label>
                    <select id="anc-tribe"><option value="">Select...</option><option>Cherokee Freedman</option><option>Creek Freedman</option><option>Choctaw Freedman</option><option>Chickasaw Freedman</option><option>Seminole Freedman</option></select>
                </div>
                <div class="input-group"><label>Roll Number</label><input type="text" id="anc-roll" placeholder="Dawes Roll #"></div>
            </div>
            <div class="input-group"><label>Location</label><input type="text" id="anc-location" placeholder="e.g. Fort Gibson, I.T."></div>
            <div class="input-group"><label>Notes</label><textarea id="anc-notes" placeholder="Any additional information..."></textarea></div>
            <div style="display:flex;gap:10px;margin-top:16px">
                <button class="btn btn-accent" onclick="BAO_Pages.saveNewAncestor()">Save Ancestor</button>
                <button class="btn btn-secondary" onclick="BAO_Utils.modal.hide()">Cancel</button>
            </div>
        `);
    },

    saveNewAncestor() {
        const name = document.getElementById('anc-name')?.value?.trim();
        if (!name) { BAO_Utils.toast('Please enter a name', 'warning'); return; }
        BAO_Utils.ancestors.save({
            name,
            birth: document.getElementById('anc-birth')?.value?.trim() || '',
            death: document.getElementById('anc-death')?.value?.trim() || '',
            tribe: document.getElementById('anc-tribe')?.value || '',
            rollNumber: document.getElementById('anc-roll')?.value?.trim() || '',
            location: document.getElementById('anc-location')?.value?.trim() || '',
            notes: document.getElementById('anc-notes')?.value?.trim() || '',
        });
        BAO_Utils.modal.hide();
        BAO_Utils.toast('Ancestor saved!', 'success');
        BAO_App.navigate('ancestor-profiles');
    },

    quickAddAncestor(id) {
        const r = BAO_DATA.dawesRolls.find(d => d.id === id);
        if (!r) return;
        BAO_Utils.ancestors.save({
            name: r.name, birth: `c. ${new Date(r.enrollDate).getFullYear() - r.age}`,
            tribe: r.tribe + ' Freedman', rollNumber: r.rollNumber,
            location: r.postOffice, notes: r.notes
        });
        BAO_Utils.toast(`${r.name} added as ancestor!`, 'success');
        BAO_App.navigate('ancestor-profiles');
    },

    quickAddFromDawes(id) {
        this.quickAddAncestor(id);
        BAO_Utils.modal.hide();
    },

    deleteAncestor(id) {
        if (confirm('Remove this ancestor?')) {
            BAO_Utils.ancestors.remove(id);
            BAO_Utils.toast('Ancestor removed', 'info');
            BAO_App.navigate('ancestor-profiles');
        }
    },

    showAncestorDetail(id) {
        const a = BAO_Utils.ancestors.getById(id);
        if (!a) return;
        var _isFemale = a.gender === 'F' || /^(Mary|Clara|Dorothy|Sarah|Hannah|Lucinda|Delia|Patience|Rachel|Susie|Ella|Peggy|Annie|Emma|Lucy|Betty|Rose|Ruth|Nancy|Alice|Edith|Minnie|Grace|Ida)/i.test(a.name);
        var _portraitSrc = _isFemale ? 'https://i.imgur.com/T13NIA3.png' : 'https://i.imgur.com/07Jjczy.png';
        BAO_Utils.modal.show(`
            <div class="profile-header">
                <div class="profile-avatar-large" style="width:80px;height:80px;border-radius:50%;overflow:hidden;border:3px solid #FFB830;background:#000;box-shadow:0 0 12px rgba(255,184,48,0.4);display:flex;align-items:center;justify-content:center;"><img src="${_portraitSrc}" alt="${BAO_Utils.escapeHTML(a.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;filter:brightness(1.2) contrast(1.05);"></div>
                <div class="profile-info">
                    <h2>${BAO_Utils.escapeHTML(a.name)}</h2>
                    <div class="profile-dates">${a.birth || '?'} — ${a.death || 'Unknown'}</div>
                    <div class="profile-tags">
                        ${a.tribe ? `<span class="badge badge-gold">${a.tribe}</span>` : ''}
                        ${a.rollNumber ? `<span class="badge badge-blue">Roll #${a.rollNumber}</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="profile-detail-grid" style="margin-top:16px">
                <div class="profile-detail-item"><label>Location</label><span>${a.location || 'Unknown'}</span></div>
                <div class="profile-detail-item"><label>Created</label><span>${BAO_Utils.formatDate(a.createdAt)}</span></div>
            </div>
            ${a.notes ? `<div style="margin-top:16px"><label style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase">Notes</label><p style="margin-top:4px;color:var(--text-secondary);font-size:0.9rem">${BAO_Utils.escapeHTML(a.notes)}</p></div>` : ''}
            <button class="btn btn-secondary btn-sm" style="margin-top:16px" onclick="BAO_Utils.modal.hide()">Close</button>
        `);
    },

    addFamilyMember() {
        BAO_Utils.modal.show(`
            <h2 style="margin-bottom:16px">Add Family Member</h2>
            <div class="input-group"><label>Full Name *</label><input type="text" id="fm-name" placeholder="Full name"></div>
            <div class="grid-2">
                <div class="input-group"><label>Birth</label><input type="text" id="fm-birth" placeholder="Year"></div>
                <div class="input-group"><label>Death</label><input type="text" id="fm-death" placeholder="Year or leave blank"></div>
            </div>
            <div class="input-group"><label>Tribal Affiliation</label><input type="text" id="fm-tribe" placeholder="e.g. Cherokee Freedman"></div>
            <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:16px">New person will be added as a child of the root ancestor.</p>
            <div style="display:flex;gap:10px">
                <button class="btn btn-accent" onclick="BAO_Pages.saveFamilyMember()">Add to Tree</button>
                <button class="btn btn-secondary" onclick="BAO_Utils.modal.hide()">Cancel</button>
            </div>
        `);
    },

    saveFamilyMember() {
        const name = document.getElementById('fm-name')?.value?.trim();
        if (!name) { BAO_Utils.toast('Name is required', 'warning'); return; }
        const tree = BAO_Utils.familyTree.getTree();
        BAO_Utils.familyTree.addPerson(tree.id, {
            name,
            birth: document.getElementById('fm-birth')?.value?.trim() || '',
            death: document.getElementById('fm-death')?.value?.trim() || '',
            tribe: document.getElementById('fm-tribe')?.value?.trim() || '',
            children: []
        });
        BAO_Utils.modal.hide();
        BAO_Utils.toast('Family member added!', 'success');
        BAO_App.navigate('family-tree');
    },

    resetTree() {
        if (confirm('Reset to sample family tree? Your custom additions will be lost.')) {
            BAO_Utils.storage.remove('familyTree');
            BAO_Utils.toast('Tree reset to sample data', 'info');
            BAO_App.navigate('family-tree');
        }
    },

    uploadDocument() {
        BAO_Utils.modal.show(`
            <h2 style="margin-bottom:16px">Add Document Record</h2>
            <div class="input-group"><label>Document Name *</label><input type="text" id="doc-name" placeholder="e.g. Dawes Enrollment Card - Washington"></div>
            <div class="input-group"><label>Category</label>
                <select id="doc-category"><option>Census Record</option><option>Enrollment Card</option><option>Land Patent</option><option>Marriage Certificate</option><option>Death Certificate</option><option>Military Record</option><option>Photograph</option><option>Letter/Correspondence</option><option>Other</option></select>
            </div>
            <div class="input-group"><label>Notes</label><textarea id="doc-notes" placeholder="Description or notes about this document..."></textarea></div>
            <div style="display:flex;gap:10px;margin-top:12px">
                <button class="btn btn-accent" onclick="BAO_Pages.saveDocument()">Save Document</button>
                <button class="btn btn-secondary" onclick="BAO_Utils.modal.hide()">Cancel</button>
            </div>
        `);
    },

    saveDocument() {
        const name = document.getElementById('doc-name')?.value?.trim();
        if (!name) { BAO_Utils.toast('Name is required', 'warning'); return; }
        BAO_Utils.documents.save({
            name,
            category: document.getElementById('doc-category')?.value || 'Other',
            notes: document.getElementById('doc-notes')?.value?.trim() || '',
            type: 'document'
        });
        BAO_Utils.modal.hide();
        BAO_Utils.toast('Document saved!', 'success');
        BAO_App.navigate('document-vault');
    },

    // ============== CAMERA SCANNER ==============
    _cameraStream: null,
    _cameraFacing: 'environment',

    scanDocument() {
        console.log('[BAO Camera] scanDocument() called');
        console.log('[BAO Camera] Protocol:', location.protocol, 'Hostname:', location.hostname);
        console.log('[BAO Camera] navigator.mediaDevices exists:', !!navigator.mediaDevices);
        console.log('[BAO Camera] getUserMedia exists:', !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
        // Check for HTTPS (required for getUserMedia)
        if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            BAO_Utils.toast('Camera requires HTTPS. Please access via a secure URL.', 'warning');
        }
        // Check browser support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            BAO_Utils.toast('Camera not supported in this browser. Try Chrome or Safari.', 'warning');
            return;
        }

        // Remove any existing overlay
        var old = document.getElementById('scan-overlay');
        if (old) old.remove();

        // Build fullscreen camera overlay
        var overlay = document.createElement('div');
        overlay.id = 'scan-overlay';
        overlay.className = 'scan-overlay';
        overlay.innerHTML =
            '<div class="scan-overlay-inner">' +
                // Close button
                '<button class="scan-close-btn" onclick="BAO_Pages.closeScanOverlay()" title="Close">&times;</button>' +
                // Permission message (shown first)
                '<div id="scan-permission-msg" class="scan-permission-msg">' +
                    '<div style="font-size:3rem;margin-bottom:16px">&#128247;</div>' +
                    '<h3 style="color:#FFB830;font-family:Cinzel,serif;margin-bottom:10px">Camera Access Required</h3>' +
                    '<p style="color:var(--text-secondary);font-size:0.9rem;line-height:1.6;margin-bottom:8px">Tap the button below, then <strong style="color:#FFB830">Allow</strong> camera access when your browser asks for permission.</p>' +
                    '<p style="color:var(--text-muted);font-size:0.78rem;margin-bottom:20px">Place your document on a flat, dark surface for best results.</p>' +
                    '<button class="btn scan-start-btn" onclick="BAO_Pages.startCamera()">&#128247; Open Camera</button>' +
                '</div>' +
                // Camera view (hidden until camera starts)
                '<div id="scan-camera-view" class="scan-camera-view" style="display:none">' +
                    '<video id="scan-video" autoplay playsinline muted class="scan-video"></video>' +
                    '<canvas id="scan-canvas" style="display:none"></canvas>' +
                    '<img id="scan-captured" class="scan-captured" style="display:none">' +
                    // Top bar with flip camera
                    '<div class="scan-top-bar">' +
                        '<button class="scan-flip-btn" onclick="BAO_Pages.flipCamera()" title="Switch camera">&#128260;</button>' +
                    '</div>' +
                    // Bottom controls
                    '<div class="scan-bottom-bar">' +
                        '<button class="scan-capture-btn" id="scan-capture-btn" onclick="BAO_Pages.capturePhoto()"><div class="scan-capture-ring"></div></button>' +
                        '<button class="btn scan-action-btn" id="scan-retake-btn" onclick="BAO_Pages.retakePhoto()" style="display:none">&#128260; Retake</button>' +
                        '<button class="btn scan-action-btn scan-save-trigger" id="scan-save-btn" onclick="BAO_Pages.showScanSaveForm()" style="display:none">&#128190; Save to Vault</button>' +
                    '</div>' +
                '</div>' +
                // Save form (hidden until save tapped)
                '<div id="scan-save-form" class="scan-save-form" style="display:none">' +
                    '<h3 style="color:#FFB830;margin-bottom:14px">Save Document</h3>' +
                    '<div class="input-group"><label style="color:var(--text-secondary)">Document Name *</label><input type="text" id="scan-doc-name" placeholder="e.g. Dawes Card #2241 - Robert Williams" class="scan-input"></div>' +
                    '<div class="input-group"><label style="color:var(--text-secondary)">Category</label>' +
                        '<select id="scan-doc-category" class="scan-input"><option>Scanned Document</option><option>Enrollment Card</option><option>Census Record</option><option>Land Patent</option><option>Marriage Certificate</option><option>Death Certificate</option><option>Military Record</option><option>Photograph</option><option>Other</option></select>' +
                    '</div>' +
                    '<div class="input-group"><label style="color:var(--text-secondary)">Notes</label><textarea id="scan-doc-notes" placeholder="Description or notes..." class="scan-input" rows="2"></textarea></div>' +
                    '<button class="btn scan-start-btn" onclick="BAO_Pages.saveScanToVault()" style="width:100%">&#128451; Save to Document Vault</button>' +
                    '<button class="btn scan-action-btn" onclick="document.getElementById(\'scan-save-form\').style.display=\'none\'" style="width:100%;margin-top:8px">&#10094; Back</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(overlay);
        requestAnimationFrame(function() { overlay.classList.add('scan-overlay-active'); });

        // Pre-check permission: if already granted, auto-start camera
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'camera' }).then(function(status) {
                console.log('[BAO Camera] Permission pre-check state:', status.state);
                if (status.state === 'granted') {
                    BAO_Pages.startCamera();
                }
            }).catch(function(e) { console.log('[BAO Camera] Permission API not supported:', e.message); });
        }
    },

    startCamera() {
        var self = this;
        var permMsg = document.getElementById('scan-permission-msg');
        var camView = document.getElementById('scan-camera-view');
        var video = document.getElementById('scan-video');
        if (!video) return;

        // Show loading state
        if (permMsg) {
            permMsg.style.display = 'flex';
            permMsg.innerHTML = '<div style="font-size:2rem;margin-bottom:12px">&#9203;</div>' +
                '<p style="color:#FFB830;font-size:0.95rem;font-weight:700">Requesting camera access...</p>' +
                '<p style="color:#cccccc;font-size:0.85rem;margin-top:8px">When your browser shows a permission popup, tap <strong style="color:#FFB830">Allow</strong> to enable your camera.</p>' +
                '<p style="color:#999;font-size:0.75rem;margin-top:12px">If no popup appears, check your browser address bar for a blocked camera icon.</p>';
        }

        // Stop any existing stream first
        this.stopCamera();

        // Check permission state first (where supported)
        var permCheck = (navigator.permissions && navigator.permissions.query)
            ? navigator.permissions.query({ name: 'camera' }).catch(function() { return null; })
            : Promise.resolve(null);

        permCheck.then(function(permStatus) {
            // If permission explicitly denied, show message immediately
            if (permStatus && permStatus.state === 'denied') {
                self._showCameraError(permMsg, 'Camera permission is blocked. To fix this:\n\n1. Tap the lock/info icon in your browser address bar\n2. Find Camera and change it to Allow\n3. Reload the page and try again');
                return;
            }

            // Build the camera attempt chain: try each constraint set sequentially
            var facing = self._cameraFacing;
            var attempts = [
                // Attempt 1: exact facing mode with HD resolution
                { video: { facingMode: { exact: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
                // Attempt 2: preferred facing mode (not exact) with HD
                { video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
                // Attempt 3: opposite camera
                { video: { facingMode: facing === 'environment' ? 'user' : 'environment' }, audio: false },
                // Attempt 4: any camera, no constraints
                { video: true, audio: false }
            ];

            var tryNext = function(index) {
                if (index >= attempts.length) {
                    console.error('[BAO Camera] All ' + attempts.length + ' attempts failed');
                    self._showCameraError(permMsg, 'Could not access any camera on this device. Make sure camera permissions are allowed in your browser settings.');
                    return;
                }
                console.log('[BAO Camera] Attempt ' + (index + 1) + '/' + attempts.length, JSON.stringify(attempts[index]));
                navigator.mediaDevices.getUserMedia(attempts[index])
                .then(function(stream) {
                    console.log('[BAO Camera] SUCCESS on attempt ' + (index + 1) + ' — got stream with ' + stream.getTracks().length + ' track(s)');
                    stream.getTracks().forEach(function(t) {
                        console.log('[BAO Camera] Track: kind=' + t.kind + ' label=' + t.label + ' enabled=' + t.enabled + ' readyState=' + t.readyState);
                        var settings = t.getSettings ? t.getSettings() : {};
                        console.log('[BAO Camera] Track settings:', JSON.stringify(settings));
                    });
                    self._connectCameraStream(stream, video, permMsg, camView);
                })
                .catch(function(err) {
                    console.warn('[BAO Camera] Attempt ' + (index + 1) + ' FAILED:', err.name, err.message);
                    if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
                        self._showCameraError(permMsg, 'Camera permission was denied.\n\nTo allow camera access:\n1. Tap the lock icon (or site info icon) in your browser address bar\n2. Set Camera to Allow\n3. Reload the page and tap Open Camera again');
                    } else {
                        tryNext(index + 1);
                    }
                });
            };

            console.log('[BAO Camera] Starting camera attempts, facing:', facing);
            tryNext(0);
        });
    },

    _connectCameraStream: function(stream, video, permMsg, camView) {
        console.log('[BAO Camera] _connectCameraStream called');
        console.log('[BAO Camera] Stream tracks:', stream.getTracks().map(function(t) { return t.kind + ':' + t.label + ' enabled=' + t.enabled + ' readyState=' + t.readyState; }));
        this._cameraStream = stream;

        // *** CRITICAL FIX: Show camera view BEFORE assigning stream ***
        // When video element is inside display:none container, browsers skip frame decoding
        // resulting in a black video. We must make it visible first.
        if (permMsg) permMsg.style.display = 'none';
        if (camView) camView.style.display = 'flex';
        console.log('[BAO Camera] Camera view made visible BEFORE stream assignment');

        // Ensure video attributes are set before assigning stream
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        video.setAttribute('autoplay', '');
        video.setAttribute('playsinline', '');
        video.setAttribute('muted', '');

        // Reset any previous state
        video.style.display = 'block';
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'cover';
        video.style.backgroundColor = 'transparent';

        // Confirm video element has layout dimensions now that parent is visible
        console.log('[BAO Camera] Video element offsetWidth:', video.offsetWidth, 'offsetHeight:', video.offsetHeight);

        var uiReady = false;
        var showControls = function(source) {
            if (uiReady) return;
            uiReady = true;
            console.log('[BAO Camera] Controls ready (triggered by: ' + source + ')');
            console.log('[BAO Camera] Video dimensions: ' + video.videoWidth + 'x' + video.videoHeight);
            console.log('[BAO Camera] Video readyState: ' + video.readyState + ' paused: ' + video.paused);
            var captureBtn = document.getElementById('scan-capture-btn');
            var retakeBtn = document.getElementById('scan-retake-btn');
            var saveBtn = document.getElementById('scan-save-btn');
            if (captureBtn) captureBtn.style.display = '';
            if (retakeBtn) retakeBtn.style.display = 'none';
            if (saveBtn) saveBtn.style.display = 'none';
        };

        // Listen for all relevant video events for debugging
        var events = ['loadstart', 'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough', 'playing', 'play', 'error', 'stalled', 'suspend', 'waiting'];
        events.forEach(function(evt) {
            video.addEventListener(evt, function handler() {
                console.log('[BAO Camera] Video event: ' + evt + ' | readyState=' + video.readyState + ' | videoWidth=' + video.videoWidth + ' | paused=' + video.paused);
                if (evt === 'playing' || evt === 'canplay' || evt === 'loadeddata') {
                    showControls(evt + ' event');
                }
                if (evt === 'error') {
                    console.error('[BAO Camera] Video error:', video.error);
                }
                video.removeEventListener(evt, handler);
            });
        });

        // Assign the stream — this is the critical step
        // Done AFTER the element is visible and has layout dimensions
        console.log('[BAO Camera] Setting video.srcObject...');
        video.srcObject = stream;
        console.log('[BAO Camera] video.srcObject set. srcObject is null?', video.srcObject === null);

        // Force a layout recalc to ensure browser recognizes the visible video
        void video.offsetHeight;

        // Explicitly call play() — required on many mobile browsers
        var playPromise = video.play();
        if (playPromise && typeof playPromise.then === 'function') {
            playPromise.then(function() {
                console.log('[BAO Camera] video.play() resolved successfully');
                showControls('play() promise resolved');
            }).catch(function(playErr) {
                console.warn('[BAO Camera] video.play() rejected:', playErr.name, playErr.message);
                // Even if play() rejects, the autoplay attribute may handle it
                showControls('play() catch fallback');
            });
        } else {
            console.log('[BAO Camera] video.play() did not return a promise');
            showControls('play() no-promise fallback');
        }

        // Timeout fallback — if controls not ready after 4s, force them
        setTimeout(function() {
            if (!uiReady) {
                console.warn('[BAO Camera] TIMEOUT: Forcing controls after 4s');
                console.log('[BAO Camera] Final state — readyState:', video.readyState, 'paused:', video.paused, 'srcObject null?', video.srcObject === null, 'videoWidth:', video.videoWidth);
                showControls('timeout fallback');
                // One more attempt to play
                try { video.play(); } catch(e) {}
            }
        }, 4000);
    },

    _showCameraError: function(permMsg, msg) {
        if (!permMsg) return;
        var lines = msg.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });
        var htmlMsg = lines.map(function(l) {
            if (/^\d+\./.test(l)) return '<div style="color:#cccccc;font-size:0.85rem;text-align:left;padding:2px 0">  ' + l + '</div>';
            return '<p style="color:#cccccc;font-size:0.88rem;line-height:1.6;margin-bottom:8px">' + l + '</p>';
        }).join('');

        permMsg.innerHTML = '<div style="font-size:2.5rem;margin-bottom:12px">&#9888;</div>' +
            '<h3 style="color:#FFB830;font-family:Cinzel,serif;margin-bottom:12px">Camera Access Needed</h3>' +
            htmlMsg +
            '<button class="btn scan-start-btn" onclick="BAO_Pages.startCamera()" style="margin-top:16px">&#128260; Try Again</button>' +
            '<button class="btn scan-action-btn" onclick="BAO_Pages.closeScanOverlay()" style="margin-top:8px;width:100%">Close</button>';
        permMsg.style.display = 'flex';
    },

    flipCamera() {
        this._cameraFacing = this._cameraFacing === 'environment' ? 'user' : 'environment';
        this.startCamera();
    },

    capturePhoto() {
        var video = document.getElementById('scan-video');
        var canvas = document.getElementById('scan-canvas');
        var captured = document.getElementById('scan-captured');
        var captureBtn = document.getElementById('scan-capture-btn');
        var retakeBtn = document.getElementById('scan-retake-btn');
        var saveBtn = document.getElementById('scan-save-btn');
        if (!video || !canvas) return;

        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

        var dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        if (captured) {
            captured.src = dataUrl;
            captured.style.display = 'block';
        }
        video.style.display = 'none';
        this.stopCamera();

        if (captureBtn) captureBtn.style.display = 'none';
        if (retakeBtn) retakeBtn.style.display = '';
        if (saveBtn) saveBtn.style.display = '';
    },

    retakePhoto() {
        var captured = document.getElementById('scan-captured');
        var saveForm = document.getElementById('scan-save-form');
        if (captured) { captured.style.display = 'none'; captured.src = ''; }
        if (saveForm) saveForm.style.display = 'none';
        var video = document.getElementById('scan-video');
        if (video) video.style.display = 'block';
        this.startCamera();
    },

    showScanSaveForm() {
        var form = document.getElementById('scan-save-form');
        if (form) form.style.display = 'block';
        var nameInput = document.getElementById('scan-doc-name');
        if (nameInput) nameInput.focus();
    },

    saveScanToVault() {
        var nameInput = document.getElementById('scan-doc-name');
        var name = nameInput ? nameInput.value.trim() : '';
        if (!name) { BAO_Utils.toast('Document name is required', 'warning'); return; }
        var captured = document.getElementById('scan-captured');
        var fileData = captured ? captured.src : '';
        if (!fileData || fileData.length < 100) { BAO_Utils.toast('No image captured. Please retake.', 'warning'); return; }
        var fileSize = fileData.length ? Math.round(fileData.length * 0.75) : 0;

        var catSelect = document.getElementById('scan-doc-category');
        var notesInput = document.getElementById('scan-doc-notes');

        BAO_Utils.documents.save({
            name: name,
            category: catSelect ? catSelect.value : 'Scanned Document',
            notes: notesInput ? notesInput.value.trim() : '',
            type: 'image',
            fileData: fileData,
            fileType: 'image/jpeg',
            fileSize: fileSize,
            scanned: true
        });
        this.closeScanOverlay();
        BAO_Utils.toast('Document scanned and saved to vault!', 'success');
        BAO_App.navigate('document-vault');
    },

    stopCamera() {
        if (this._cameraStream) {
            this._cameraStream.getTracks().forEach(function(t) { t.stop(); });
            this._cameraStream = null;
        }
    },

    closeScanOverlay() {
        this.stopCamera();
        var overlay = document.getElementById('scan-overlay');
        if (overlay) {
            overlay.classList.remove('scan-overlay-active');
            setTimeout(function() { overlay.remove(); }, 300);
        }
    },

    // ============== FILE UPLOAD (Photos, PDFs, Images) ==============
    uploadDocumentAdvanced() {
        BAO_Utils.modal.show(`
            <h2 style="margin-bottom:16px">&#128228; Upload Document</h2>
            <p style="color:var(--text-secondary);font-size:0.88rem;margin-bottom:16px">Upload photos, PDFs, or images from your device.</p>
            <div id="upload-drop-zone" style="border:2px dashed rgba(255,184,48,0.3);border-radius:12px;padding:40px 20px;text-align:center;cursor:pointer;transition:all 0.3s;background:rgba(255,184,48,0.03)" onclick="document.getElementById('file-input-hidden').click()">
                <div style="font-size:3rem;margin-bottom:8px">&#128194;</div>
                <h4 style="color:var(--accent);margin-bottom:6px">Drop files here or click to browse</h4>
                <p style="font-size:0.78rem;color:var(--text-muted)">Accepts: JPG, PNG, GIF, PDF, WEBP — Max 5MB per file</p>
                <input type="file" id="file-input-hidden" accept="image/*,.pdf" multiple style="display:none" onchange="BAO_Pages.handleFileUpload(this.files)">
            </div>
            <div id="upload-preview-area" style="display:none;margin-top:16px">
                <div id="upload-preview-img" style="max-width:100%;max-height:300px;border-radius:10px;overflow:hidden;background:#0a0714;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,184,48,0.15)"></div>
                <div id="upload-file-info" style="margin-top:8px;font-size:0.82rem;color:var(--text-muted)"></div>
            </div>
            <div id="upload-save-form" style="display:none;margin-top:16px">
                <div class="input-group"><label>Document Name *</label><input type="text" id="upload-doc-name" placeholder="e.g. Marriage Certificate - 1898"></div>
                <div class="input-group"><label>Category</label>
                    <select id="upload-doc-category"><option>Scanned Document</option><option>Enrollment Card</option><option>Census Record</option><option>Land Patent</option><option>Marriage Certificate</option><option>Death Certificate</option><option>Military Record</option><option>Photograph</option><option>Letter/Correspondence</option><option>Other</option></select>
                </div>
                <div class="input-group"><label>Notes</label><textarea id="upload-doc-notes" placeholder="Description or notes about this document..."></textarea></div>
                <div style="display:flex;gap:10px">
                    <button class="btn btn-accent" onclick="BAO_Pages.saveUploadedDoc()" style="flex:1">&#128451; Save to Vault</button>
                    <button class="btn btn-secondary" onclick="BAO_Utils.modal.hide()">Cancel</button>
                </div>
            </div>
        `);

        // Drag and drop handlers
        const dropZone = document.getElementById('upload-drop-zone');
        if (dropZone) {
            dropZone.addEventListener('dragover', function(e) { e.preventDefault(); this.style.borderColor = '#FFB830'; this.style.background = 'rgba(255,184,48,0.08)'; });
            dropZone.addEventListener('dragleave', function() { this.style.borderColor = 'rgba(255,184,48,0.3)'; this.style.background = 'rgba(255,184,48,0.03)'; });
            dropZone.addEventListener('drop', function(e) { e.preventDefault(); this.style.borderColor = 'rgba(255,184,48,0.3)'; BAO_Pages.handleFileUpload(e.dataTransfer.files); });
        }
    },

    _pendingUpload: null,

    handleFileUpload(files) {
        if (!files || files.length === 0) return;
        const file = files[0];
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) { BAO_Utils.toast('File too large. Maximum 5MB.', 'warning'); return; }

        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
        if (!allowed.includes(file.type)) { BAO_Utils.toast('Unsupported file type. Use JPG, PNG, GIF, WEBP, or PDF.', 'warning'); return; }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            this._pendingUpload = { dataUrl, fileName: file.name, fileType: file.type, fileSize: file.size };

            const previewArea = document.getElementById('upload-preview-area');
            const previewImg = document.getElementById('upload-preview-img');
            const fileInfo = document.getElementById('upload-file-info');
            const saveForm = document.getElementById('upload-save-form');
            const dropZone = document.getElementById('upload-drop-zone');
            const nameInput = document.getElementById('upload-doc-name');

            if (dropZone) dropZone.style.display = 'none';
            if (previewArea) previewArea.style.display = 'block';
            if (saveForm) saveForm.style.display = 'block';

            if (file.type.startsWith('image/')) {
                previewImg.innerHTML = '<img src="' + dataUrl + '" style="max-width:100%;max-height:280px;border-radius:8px;cursor:pointer" onclick="BAO_Pages.fullScreenPreview(this.src)">';
            } else {
                previewImg.innerHTML = '<div style="padding:40px;text-align:center"><div style="font-size:4rem">&#128196;</div><p style="color:var(--accent);margin-top:8px">PDF Document</p></div>';
            }
            if (fileInfo) fileInfo.textContent = file.name + ' — ' + (file.size / 1024).toFixed(1) + ' KB — ' + file.type;
            if (nameInput && !nameInput.value) nameInput.value = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
            if (nameInput) nameInput.focus();
        };
        reader.readAsDataURL(file);
    },

    saveUploadedDoc() {
        const name = document.getElementById('upload-doc-name')?.value?.trim();
        if (!name) { BAO_Utils.toast('Document name is required', 'warning'); return; }
        if (!this._pendingUpload) { BAO_Utils.toast('No file selected', 'warning'); return; }

        BAO_Utils.documents.save({
            name,
            category: document.getElementById('upload-doc-category')?.value || 'Other',
            notes: document.getElementById('upload-doc-notes')?.value?.trim() || '',
            type: this._pendingUpload.fileType.startsWith('image/') ? 'image' : 'pdf',
            fileData: this._pendingUpload.dataUrl,
            fileType: this._pendingUpload.fileType,
            fileSize: this._pendingUpload.fileSize,
            fileName: this._pendingUpload.fileName
        });
        this._pendingUpload = null;
        BAO_Utils.modal.hide();
        BAO_Utils.toast('Document uploaded and saved!', 'success');
        BAO_App.navigate('document-vault');
    },

    // ============== FULL SCREEN PREVIEW ==============
    fullScreenPreview(src) {
        const overlay = document.createElement('div');
        overlay.id = 'fullscreen-preview';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:10000;display:flex;align-items:center;justify-content:center;cursor:pointer;animation:fadeIn 0.2s ease';
        overlay.innerHTML = '<img src="' + src + '" style="max-width:95%;max-height:95%;object-fit:contain;border-radius:8px;box-shadow:0 0 40px rgba(255,184,48,0.2)">' +
            '<div style="position:absolute;top:20px;right:24px;color:#FFB830;font-size:2rem;cursor:pointer;text-shadow:0 0 10px rgba(255,184,48,0.5)" onclick="event.stopPropagation();this.parentElement.remove()">✕</div>' +
            '<div style="position:absolute;bottom:20px;left:50%;transform:translateX(-50%);color:var(--text-muted);font-size:0.82rem">Click anywhere to close · Pinch to zoom on mobile</div>';
        overlay.addEventListener('click', function() { this.remove(); });
        overlay.querySelector('img').addEventListener('click', function(e) { e.stopPropagation(); });
        document.body.appendChild(overlay);
    },

    // ============== FILTER VAULT DOCS ==============
    filterVaultDocs(category, btn) {
        document.querySelectorAll('.vault-grid .vault-item').forEach(item => {
            if (category === 'All') { item.style.display = ''; }
            else { item.style.display = item.dataset.category === category ? '' : 'none'; }
        });
        document.querySelectorAll('.tag').forEach(t => t.classList.remove('tag-active'));
        if (btn) btn.classList.add('tag-active');
    },

    uploadPhoto() {
        var valScript = 'BAO_Pages._validatePhotoForm()';
        BAO_Utils.modal.show(`
            <h2 style="margin-bottom:4px">&#128247; Upload Historical Photo</h2>
            <p style="color:var(--text-muted);font-size:0.75rem;margin:0 0 16px;">All fields required for accurate historical analysis.</p>
            <div class="input-group"><label>Photo File *</label><input type="file" id="photo-file" accept="image/*" onchange="${valScript}" style="padding:8px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:8px;color:var(--text-primary);width:100%;box-sizing:border-box;"></div>
            <div class="input-group"><label>Caption / Description * <span style="color:var(--text-muted);font-size:0.7rem;">(min 10 chars)</span></label><input type="text" id="photo-caption" placeholder="e.g. Williams family portrait, Atoka I.T." oninput="${valScript}"></div>
            <div class="input-group"><label>Year or Date Range *</label><input type="text" id="photo-date" placeholder="e.g. 1905, c.1890, 1870s" oninput="${valScript}"></div>
            <div class="input-group"><label>Location *</label><input type="text" id="photo-location" placeholder="e.g. Coal County, Oklahoma" oninput="${valScript}"></div>
            <div class="input-group"><label>Tribe / Category *</label>
                <select id="photo-tribe" onchange="${valScript}" style="padding:8px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:8px;color:var(--text-primary);width:100%;">
                    <option value="">Select tribe / category...</option>
                    <option value="Choctaw">Choctaw</option><option value="Cherokee">Cherokee</option>
                    <option value="Creek">Creek (Muscogee)</option><option value="Chickasaw">Chickasaw</option>
                    <option value="Seminole">Seminole</option><option value="Freedmen">Freedmen (General)</option>
                    <option value="Other">Other</option>
                </select>
            </div>
            <div class="input-group"><label>People in Photo</label><input type="text" id="photo-people" placeholder="Names, separated by commas (optional)"></div>
            <div id="photo-val-msg" style="color:#F44336;font-size:0.78rem;min-height:20px;margin:8px 0;"></div>
            <div style="display:flex;gap:10px;">
                <button class="btn btn-accent" id="photo-save-btn" onclick="BAO_Pages.savePhoto()" disabled style="opacity:0.4;cursor:not-allowed;">&#128269; Upload & Analyze</button>
                <button class="btn btn-secondary" onclick="BAO_Utils.modal.hide()">Cancel</button>
            </div>
        `);
    },

    _validatePhotoForm: function() {
        var btn = document.getElementById('photo-save-btn');
        var msg = document.getElementById('photo-val-msg');
        if (!btn) return false;

        var caption = (document.getElementById('photo-caption')?.value || '').trim();
        var year = (document.getElementById('photo-date')?.value || '').trim();
        var location = (document.getElementById('photo-location')?.value || '').trim();
        var tribe = document.getElementById('photo-tribe')?.value || '';
        var fileInput = document.getElementById('photo-file');
        var hasFile = fileInput && fileInput.files && fileInput.files.length > 0;

        var issues = [];
        if (!hasFile) issues.push('Photo file');
        if (caption.length < 10) issues.push('Caption (min 10 chars)');
        if (!year) issues.push('Year');
        if (!location) issues.push('Location');
        if (!tribe) issues.push('Tribe / Category');

        if (issues.length > 0) {
            btn.disabled = true;
            btn.style.opacity = '0.4';
            btn.style.cursor = 'not-allowed';
            if (msg) msg.textContent = 'Required: ' + issues.join(', ');
            return false;
        } else {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            if (msg) msg.textContent = '';
            return true;
        }
    },

    // ========== AI VISION ANALYSIS (Canvas-based, offline-safe) ==========
    _analyzeImageVision: function(dataUrl, callback) {
        if (!dataUrl) { callback(null); return; }
        try {
            var img = new Image();
            img.onload = function() {
                var cvs = document.createElement('canvas');
                var w = Math.min(img.width, 400);
                var scale = w / img.width;
                cvs.width = w;
                cvs.height = img.height * scale;
                var ctx = cvs.getContext('2d');
                ctx.drawImage(img, 0, 0, cvs.width, cvs.height);
                var imgData = ctx.getImageData(0, 0, cvs.width, cvs.height);
                var d = imgData.data;
                var totalPx = cvs.width * cvs.height;

                // 1. Color distribution — detect sepia/B&W vs color
                var grayCount = 0, sepiaCount = 0, darkCount = 0;
                for (var i = 0; i < d.length; i += 16) { // sample every 4th pixel
                    var r = d[i], g = d[i+1], b = d[i+2];
                    var avg = (r + g + b) / 3;
                    if (Math.abs(r - g) < 15 && Math.abs(g - b) < 15) grayCount++;
                    if (r > g && g > b && r - b > 15 && r - b < 80) sepiaCount++;
                    if (avg < 60) darkCount++;
                }
                var sampled = totalPx / 4;
                var grayPct = grayCount / sampled;
                var sepiaPct = sepiaCount / sampled;
                var darkPct = darkCount / sampled;

                // 2. Estimate era from color profile
                var estimatedEra = null;
                var photoType = 'unknown';
                var confidence = 40;

                if (grayPct > 0.7) {
                    estimatedEra = '1850–1920';
                    photoType = 'B&W photograph';
                    confidence = 55;
                } else if (sepiaPct > 0.25) {
                    estimatedEra = '1860–1930';
                    photoType = 'Sepia/tintype';
                    confidence = 50;
                } else if (grayPct > 0.4 && sepiaPct > 0.1) {
                    estimatedEra = '1900–1950';
                    photoType = 'Faded photograph';
                    confidence = 45;
                } else {
                    estimatedEra = '1950–present';
                    photoType = 'Color photograph';
                    confidence = 35;
                }

                // 3. Composition — portrait vs landscape vs document
                var aspectRatio = cvs.width / cvs.height;
                var compositionType = 'unknown';
                if (aspectRatio > 0.6 && aspectRatio < 0.85) {
                    compositionType = 'portrait (vertical)';
                } else if (aspectRatio > 1.2 && aspectRatio < 1.8) {
                    compositionType = 'landscape (horizontal)';
                } else if (aspectRatio > 0.85 && aspectRatio < 1.2) {
                    compositionType = 'square format';
                } else {
                    compositionType = 'document/panoramic';
                }

                // 4. Brightness analysis — studio vs outdoor
                var brightPct = 0;
                for (var j = 0; j < d.length; j += 16) {
                    if ((d[j] + d[j+1] + d[j+2]) / 3 > 180) brightPct++;
                }
                brightPct = brightPct / sampled;
                var settingGuess = brightPct > 0.35 ? 'outdoor / bright setting' : darkPct > 0.5 ? 'dark / studio setting' : 'mixed lighting';

                // 5. Face region estimate (skin-tone pixel concentration in upper 40%)
                var skinCount = 0;
                var upperH = Math.floor(cvs.height * 0.4);
                for (var y = 0; y < upperH; y++) {
                    for (var x = 0; x < cvs.width; x += 3) {
                        var idx = (y * cvs.width + x) * 4;
                        var pr = d[idx], pg = d[idx+1], pb = d[idx+2];
                        // Broad skin tone detection (various ethnicities)
                        if (pr > 60 && pg > 40 && pb > 20 && pr > pb && (pr - pg) < 80 && pr < 250) skinCount++;
                    }
                }
                var skinPct = skinCount / (upperH * cvs.width / 3);
                var faceEstimate = skinPct > 0.25 ? 'faces likely detected' : skinPct > 0.1 ? 'possible face area' : 'no clear face region';
                var isGroupPhoto = false;
                // If skin-tone pixels are spread wide → multiple faces
                if (skinPct > 0.15 && cvs.width > 200) {
                    // Sample left third and right third for skin presence
                    var leftSkin = 0, rightSkin = 0;
                    var thirdW = Math.floor(cvs.width / 3);
                    for (var fy = 0; fy < upperH; fy += 3) {
                        for (var fx = 0; fx < thirdW; fx += 3) {
                            var li = (fy * cvs.width + fx) * 4;
                            if (d[li] > 60 && d[li+1] > 40 && d[li+2] > 20 && d[li] > d[li+2]) leftSkin++;
                            var ri = (fy * cvs.width + (cvs.width - thirdW + fx)) * 4;
                            if (d[ri] > 60 && d[ri+1] > 40 && d[ri+2] > 20 && d[ri] > d[ri+2]) rightSkin++;
                        }
                    }
                    if (leftSkin > 50 && rightSkin > 50) isGroupPhoto = true;
                }

                var result = {
                    estimatedEraRange: estimatedEra,
                    photoType: photoType,
                    compositionType: compositionType,
                    settingGuess: settingGuess,
                    faceEstimate: faceEstimate,
                    isGroupPhoto: isGroupPhoto,
                    colorProfile: grayPct > 0.7 ? 'B&W' : sepiaPct > 0.25 ? 'Sepia' : 'Color',
                    confidence: confidence
                };
                callback(result);
            };
            img.onerror = function() { callback(null); };
            img.src = dataUrl;
        } catch(e) {
            console.warn('[BAO-Vision] Analysis failed:', e);
            callback(null);
        }
    },

    // ========== SIGNAL EXTRACTION ==========
    _analyzePhotoSignals: function(filename, fileSize) {
        var signals = { possibleEra: null, qualityLevel: 'unknown', hasMetadata: false, filenameHints: [] };
        if (filename) {
            var fn = filename.toLowerCase();
            var yearMatch = fn.match(/(1[89]\d{2}|20[012]\d)/);
            if (yearMatch) { signals.possibleEra = parseInt(yearMatch[1]); signals.filenameHints.push('year:' + yearMatch[1]); }
            ['portrait','family','group','church','school','homestead','allotment','dawes','freedmen','cemetery'].forEach(function(kw) {
                if (fn.indexOf(kw) > -1) signals.filenameHints.push(kw);
            });
        }
        if (fileSize) {
            if (fileSize < 100000) signals.qualityLevel = 'low-scan';
            else if (fileSize < 500000) signals.qualityLevel = 'medium';
            else signals.qualityLevel = 'high-resolution';
        }
        return signals;
    },

    // ========== INSIGHT ENGINE (Non-guessing, accuracy-enforced) ==========
    _generateHistoricalInsight: function(photo) {
        var tags = photo.tags || {};
        var signals = photo.signals || {};
        var yearRaw = tags.year || '';
        var year = yearRaw ? parseInt(yearRaw.replace(/\D/g, '').substring(0, 4)) : signals.possibleEra;
        var tribe = tags.tribe || '';
        var location = tags.location || '';
        var insight = '', steps = [], records = [], confidence = 'Low';

        // ACCURACY GATE: If missing structured fields, block full insight
        var hasYear = !!year && year > 1700 && year < 2100;
        var hasTribe = !!tribe && tribe !== 'Other' && tribe !== 'Unknown';
        var hasLocation = !!location && location.length > 2;
        var hasAllRequired = hasYear && hasTribe && hasLocation;

        if (!hasAllRequired) {
            // NON-GUESSING RULE: Do not fabricate context
            insight = 'Not enough historical context to produce a reliable analysis.';
            if (!hasYear) insight += '\n• Year / date range not provided.';
            if (!hasTribe) insight += '\n• Tribe or cultural affiliation not specified.';
            if (!hasLocation) insight += '\n• Location not provided.';
            insight += '\n\nPlease provide year, location, and cultural affiliation for accurate historical insight. The system does not fabricate tribe, year, or historical events.';

            // Vision can still offer supporting clues (never as fact)
            var vision = photo.vision;
            if (vision && vision.estimatedEraRange) {
                insight += '\n\nVisual indicators suggest: ' + vision.colorProfile + ' photograph, possibly from ' + vision.estimatedEraRange + '. This is a visual estimate only — not a historical claim.';
            }
            if (vision && vision.isGroupPhoto) {
                steps.push('Group composition detected — identify and label individuals if possible');
            }
            steps.push('Add year, tribe, and location to unlock full historical analysis');
            return { insight: insight, researchSteps: steps, relatedRecords: records, confidenceLevel: 'Low' };
        }

        // ===== FULL INSIGHT (all required fields present) =====
        confidence = 'High';

        // Era classification
        if (year < 1866) {
            insight = 'This photo dates to the pre-Treaty era (' + year + '). During this period, Black people within the Five Civilized Tribes were still enslaved. Photographic technology was limited — daguerreotypes and tintypes were the primary formats.';
            records.push('Slave schedules (1850, 1860 Census)');
        } else if (year < 1898) {
            insight = 'This photo is from the Reconstruction / post-Treaty era (' + year + '). After the 1866 Treaties, Freedmen gained citizenship rights within their respective tribes. This was a period of community-building in Indian Territory.';
            records.push('Freedmen Bureau Records', '1890 Census (partial)');
        } else if (year < 1915) {
            insight = 'This photo dates to the Dawes Enrollment period (' + year + '). The Dawes Commission was actively enrolling members of the Five Civilized Tribes, including Freedmen. Family photos from this era may show individuals who appear on Dawes Roll cards.';
            records.push('Dawes Rolls (1898–1914)', 'Allotment Records', 'Land Patents');
        } else if (year < 1945) {
            insight = 'This photo is from the Oklahoma statehood / early modern era (' + year + '). After 1907 statehood, many Freedmen lost land through fraud and legal manipulation. This period also saw the beginning of the Great Migration northward.';
            records.push('Oklahoma County Records', 'U.S. Census (1920, 1930, 1940)');
        } else {
            insight = 'This photo dates to the modern era (' + year + '). Many Freedmen descendants during this period were reconnecting with tribal heritage and fighting for citizenship recognition.';
            records.push('Tribal enrollment records', 'Family oral histories');
        }

        // Tribe-specific historical context (NEVER fabricated — only from known data)
        var tribeContext = {
            'Choctaw': 'Choctaw Freedmen were among the first removed (1831–33). Search Choctaw Freedmen Dawes Roll cards and Choctaw Nation citizenship records.',
            'Cherokee': 'Cherokee Freedmen citizenship rights were affirmed in 2017. Search Cherokee Freedmen Dawes Roll cards at the Cherokee Nation registration office.',
            'Creek': 'Creek (Muscogee) Freedmen had early citizenship recognition after 1866. Search Creek Freedmen rolls and Muscogee Nation records.',
            'Chickasaw': 'Chickasaw Freedmen face unique citizenship challenges. Search Chickasaw Freedmen Dawes cards and the Chickasaw Historical Society.',
            'Seminole': 'Black Seminoles had an integrated role within the tribe. Search Seminole Freedmen bands and Florida/Oklahoma records.',
            'Freedmen': 'Freedmen of the Five Civilized Tribes were formerly enslaved people who gained citizenship through the 1866 Treaties. Search Freedmen rolls across all five tribes.'
        };
        if (tribeContext[tribe]) { insight += '\n\n' + tribeContext[tribe]; }

        // Location-specific (only when location data is user-provided, never assumed)
        var loc = location.toLowerCase();
        if (loc.indexOf('mississipp') > -1 || loc.indexOf('noxubee') > -1) {
            insight += '\n\nMississippi connection — this may link to pre-removal Choctaw/Chickasaw homeland records.';
            records.push('Mississippi state archives');
        }
        if (loc.indexOf('oklahoma') > -1 || loc.indexOf('indian territory') > -1 || loc.indexOf('atoka') > -1 || loc.indexOf('coal county') > -1) {
            insight += '\n\nIndian Territory / Oklahoma location — connects directly to Five Tribes Freedmen settlement areas.';
            records.push('Oklahoma Historical Society');
        }
        if (loc.indexOf('arkansas') > -1 || loc.indexOf('fort smith') > -1) {
            insight += '\n\nArkansas / Fort Smith — major staging point for Indian Removal.';
            records.push('Fort Smith National Historic Site records');
        }
        if (loc.indexOf('georgia') > -1 || loc.indexOf('new echota') > -1) {
            insight += '\n\nGeorgia connection — Cherokee homeland before the Trail of Tears.';
            records.push('Georgia state archives');
        }
        if (loc.indexOf('alabama') > -1) {
            insight += '\n\nAlabama connection — Creek homeland before removal.';
            records.push('Alabama state archives');
        }
        if (loc.indexOf('florida') > -1) {
            insight += '\n\nFlorida connection — Seminole homeland and site of the Seminole Wars.';
            records.push('Florida state archives');
        }

        // Vision as SUPPORTING data only (Step 7 — never overrides user input)
        var vision = photo.vision;
        if (vision) {
            if (vision.isGroupPhoto) {
                steps.unshift('Group photo detected — identify and label each individual');
            }
            // Only append vision if it provides additional (non-contradicting) info
            if (vision.estimatedEraRange) {
                insight += '\n\nVisual indicators suggest: ' + vision.colorProfile + ' ' + vision.photoType + ', ' + vision.compositionType + '. AI era estimate: ' + vision.estimatedEraRange + '.';
            }
        }

        // Research steps (always actionable)
        steps.push('Cross-reference names with Dawes Roll index');
        steps.push('Search Freedmen Bureau records for matching surnames');
        steps.push('Check U.S. Census records (' + (year < 1900 ? '1870, 1880, 1890' : year < 1920 ? '1900, 1910' : '1920, 1930, 1940') + ') for ' + location);
        if (hasTribe && tribe !== 'Freedmen') steps.push('Contact ' + tribe + ' Nation enrollment office');

        return { insight: insight, researchSteps: steps, relatedRecords: records, confidenceLevel: confidence };
    },

    // ========== SAVE WITH ANALYSIS ==========
    savePhoto() {
        // Enforce all required fields
        if (!this._validatePhotoForm()) {
            BAO_Utils.toast('Historical accuracy requires basic context. Please complete all fields.', 'warning');
            return;
        }
        var caption = document.getElementById('photo-caption')?.value?.trim();

        var fileInput = document.getElementById('photo-file');
        var file = fileInput && fileInput.files ? fileInput.files[0] : null;
        var signals = this._analyzePhotoSignals(file ? file.name : '', file ? file.size : 0);

        var photo = {
            caption: caption,
            date: document.getElementById('photo-date')?.value?.trim() || '',
            people: document.getElementById('photo-people')?.value?.trim() || '',
            tags: {
                year: document.getElementById('photo-date')?.value?.trim() || '',
                location: document.getElementById('photo-location')?.value?.trim() || '',
                tribe: document.getElementById('photo-tribe')?.value || '',
                name: document.getElementById('photo-people')?.value?.trim() || ''
            },
            signals: signals,
            uploadedAt: Date.now()
        };

        var self = this;

        // Read file as dataURL for thumbnail (compress if large)
        if (file) {
            var reader = new FileReader();
            reader.onload = function(e) {
                // Compress to max 800px for storage
                var img = new Image();
                img.onload = function() {
                    var cvs = document.createElement('canvas');
                    var maxW = 800;
                    var scale = Math.min(1, maxW / img.width);
                    cvs.width = img.width * scale;
                    cvs.height = img.height * scale;
                    cvs.getContext('2d').drawImage(img, 0, 0, cvs.width, cvs.height);
                    photo.dataUrl = cvs.toDataURL('image/jpeg', 0.7);
                    self._finalizeSavePhoto(photo);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            self._finalizeSavePhoto(photo);
        }
    },

    _finalizeSavePhoto: function(photo) {
        BAO_Utils.photos.save(photo);
        this._photoStoreAdd(photo);
        BAO_Utils.modal.hide();
        BAO_Utils.toast('Photo saved — analyzing...', 'success');

        // Generate and cache insight (rule-based, instant)
        var insight = this._generateHistoricalInsight(photo);
        this._photoInsightCache[photo.id] = insight;

        var self = this;
        var hidePopup = localStorage.getItem('bao_hide_photo_popup') === 'true';

        if (!hidePopup) {
            // Show popup immediately with rule-based insight
            setTimeout(function() { self._showPhotoEducationPopup(photo, insight); }, 400);

            // Run AI vision async — inject results after popup is visible (Step 8: non-blocking)
            if (photo.dataUrl) {
                self._analyzeImageVision(photo.dataUrl, function(visionResult) {
                    if (!visionResult) return;
                    photo.vision = visionResult;

                    // Merge vision into insight if it improves confidence
                    if (visionResult.estimatedEraRange && insight.confidenceLevel !== 'High') {
                        insight.visionEra = visionResult.estimatedEraRange;
                    }
                    self._photoInsightCache[photo.id] = insight;

                    // Inject vision section into existing popup (if still open)
                    var target = document.getElementById('pg-vision-slot');
                    if (target) {
                        var confPct = visionResult.confidence;
                        var wording = confPct >= 60 ? '' : ' (estimated based on visual patterns)';
                        target.innerHTML =
                            '<h4 style="color:var(--accent);font-size:0.82rem;margin:0 0 8px;">&#129504; AI Visual Analysis</h4>' +
                            '<div style="display:flex;flex-wrap:wrap;gap:6px;">' +
                                '<span class="pg-clue-tag">&#128247; ' + visionResult.photoType + '</span>' +
                                '<span class="pg-clue-tag">&#128197; ' + visionResult.estimatedEraRange + wording + '</span>' +
                                '<span class="pg-clue-tag">&#127912; ' + visionResult.compositionType + '</span>' +
                                '<span class="pg-clue-tag">&#127774; ' + visionResult.settingGuess + '</span>' +
                                '<span class="pg-clue-tag">&#128100; ' + (visionResult.isGroupPhoto ? 'Group photo' : visionResult.faceEstimate) + '</span>' +
                                '<span class="pg-clue-tag">&#127912; ' + visionResult.colorProfile + '</span>' +
                            '</div>' +
                            '<div style="margin-top:8px;font-size:0.7rem;color:var(--text-muted);font-style:italic;">Confidence: ' + confPct + '% — visual pattern analysis (not definitive)</div>';
                        target.style.animation = 'fadeIn 0.4s ease';
                    }
                });
            }
        } else {
            // Still run vision async for cache even without popup
            if (photo.dataUrl) {
                self._analyzeImageVision(photo.dataUrl, function(visionResult) {
                    if (visionResult) { photo.vision = visionResult; }
                });
            }
            BAO_App.navigate('photo-gallery');
        }
    },

    // ========== EDUCATION POPUP ==========
    _showPhotoEducationPopup: function(photo, insight) {
        var tags = photo.tags || {};
        var confColor = insight.confidenceLevel === 'High' ? '#4CAF50' : insight.confidenceLevel === 'Medium' ? '#FFB830' : '#F44336';

        var html =
            '<div class="pg-edu-popup">' +
                '<div style="font-size:0.68rem;color:var(--text-muted);font-style:italic;margin-bottom:10px;padding:6px 10px;background:rgba(255,184,48,0.04);border:1px solid rgba(255,184,48,0.1);border-radius:8px;">AI-assisted historical interpretation based on provided data and visual analysis.</div>' +
                '<h2 style="color:var(--accent);font-family:Cinzel,serif;margin:0 0 4px;">&#128220; Historical Analysis</h2>' +
                '<p style="color:var(--text-muted);font-size:0.78rem;margin:0 0 16px;">' + BAO_Utils.escapeHTML(photo.caption) + '</p>' +

                // Confidence badge
                '<div style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;background:rgba(' + (insight.confidenceLevel==='High'?'76,175,80':insight.confidenceLevel==='Medium'?'255,184,48':'244,67,54') + ',0.12);border:1px solid ' + confColor + ';border-radius:20px;font-size:0.72rem;color:' + confColor + ';font-weight:600;margin-bottom:16px;">' +
                    '<span style="width:8px;height:8px;border-radius:50%;background:' + confColor + ';"></span> Confidence: ' + insight.confidenceLevel +
                '</div>' +

                // Section 1 — Insight
                '<div class="pg-edu-section">' +
                    '<h4 style="color:var(--accent);font-size:0.82rem;margin:0 0 6px;">&#128161; Historical Insight</h4>' +
                    '<p style="font-size:0.84rem;color:var(--text-secondary);line-height:1.65;margin:0;white-space:pre-line;">' + BAO_Utils.escapeHTML(insight.insight) + '</p>' +
                '</div>' +

                // Section 2 — Visual Clues
                '<div class="pg-edu-section">' +
                    '<h4 style="color:var(--accent);font-size:0.82rem;margin:0 0 6px;">&#128065; Visual Clue Breakdown</h4>' +
                    '<div style="display:flex;flex-wrap:wrap;gap:6px;">' +
                        (tags.year ? '<span class="pg-clue-tag">&#128197; ' + tags.year + '</span>' : '<span class="pg-clue-tag pg-clue-unknown">&#128197; No date</span>') +
                        (tags.tribe ? '<span class="pg-clue-tag">&#127963; ' + tags.tribe + '</span>' : '') +
                        (tags.location ? '<span class="pg-clue-tag">&#128205; ' + tags.location + '</span>' : '') +
                        (photo.signals && photo.signals.qualityLevel ? '<span class="pg-clue-tag">&#128247; ' + photo.signals.qualityLevel + '</span>' : '') +
                        (photo.signals && photo.signals.filenameHints && photo.signals.filenameHints.length > 0 ? photo.signals.filenameHints.map(function(h){return '<span class="pg-clue-tag">&#128278; '+h+'</span>';}).join('') : '') +
                    '</div>' +
                '</div>' +

                // Section — AI Vision (injected async)
                '<div class="pg-edu-section" id="pg-vision-slot" style="min-height:20px;">' +
                    '<div style="font-size:0.72rem;color:var(--text-muted);font-style:italic;">&#129504; AI visual analysis processing...</div>' +
                '</div>' +

                // Section 3 — Research Pathways
                '<div class="pg-edu-section">' +
                    '<h4 style="color:var(--accent);font-size:0.82rem;margin:0 0 6px;">&#128218; Research Pathways</h4>' +
                    '<ol style="margin:0;padding-left:20px;font-size:0.82rem;color:var(--text-secondary);line-height:1.7;">' +
                        insight.researchSteps.map(function(s){return '<li>'+s+'</li>';}).join('') +
                    '</ol>' +
                '</div>' +

                // Section 4 — Possible Record Connections
                (insight.relatedRecords.length > 0 ?
                '<div class="pg-edu-section" style="background:rgba(255,184,48,0.04);border:1px solid rgba(255,184,48,0.15);border-radius:10px;padding:12px;">' +
                    '<h4 style="color:var(--accent);font-size:0.82rem;margin:0 0 6px;">&#128279; Possible Record Connections</h4>' +
                    '<div style="display:flex;flex-wrap:wrap;gap:6px;">' +
                        insight.relatedRecords.map(function(r){return '<span class="pg-record-tag">'+r+'</span>';}).join('') +
                    '</div>' +
                '</div>' : '') +

                // Section 5 — Action Buttons
                '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;">' +
                    '<button class="btn btn-accent" style="font-size:0.82rem;" onclick="BAO_App.navigate(\'dawes-rolls\');BAO_Utils.modal.hide();">Search Dawes Rolls</button>' +
                    '<button class="btn btn-secondary" style="font-size:0.82rem;" onclick="BAO_App.navigate(\'family-tree\');BAO_Utils.modal.hide();">Link to Ancestor</button>' +
                    '<button class="btn btn-secondary" style="font-size:0.82rem;" onclick="BAO_App.navigate(\'historical-timeline\');BAO_Utils.modal.hide();">View Timeline</button>' +
                '</div>' +

                // Don't show again
                '<label style="display:flex;align-items:center;gap:6px;margin-top:14px;font-size:0.72rem;color:var(--text-muted);cursor:pointer;">' +
                    '<input type="checkbox" id="pg-hide-popup" style="accent-color:#FFB830;" onchange="localStorage.setItem(\'bao_hide_photo_popup\',this.checked?\'true\':\'false\')">' +
                    'Don\'t show analysis popup after uploads' +
                '</label>' +

                '<button class="btn btn-secondary" style="width:100%;margin-top:12px;" onclick="BAO_Utils.modal.hide();BAO_App.navigate(\'photo-gallery\');">Close & View Gallery</button>' +
            '</div>';

        BAO_Utils.modal.show(html);
    },

    _loadMorePhotos: function() {
        // Stub for future lazy loading beyond 50
        BAO_Utils.toast('All photos loaded', 'info');
    },

    // ========== ORAL HISTORY — AUDIO FILE PLAYER (NO TTS) ==========
    _oralActiveId: null,
    _audioPlayingId: null,

    _getAudioPlayer: function() {
        var el = document.getElementById('global-oral-audio');
        if (!el) {
            el = document.createElement('audio');
            el.id = 'global-oral-audio';
            el.preload = 'auto';
            el.style.display = 'none';
            document.body.appendChild(el);
        }
        return el;
    },

    _stopAudioPlayer: function() {
        var audio = this._getAudioPlayer();
        audio.pause();
        audio.currentTime = 0;
        audio.removeAttribute('src');
        audio.load();
        this._audioPlayingId = null;
    },

    playOralClip(id) {
        var self = this;
        var btn = document.getElementById('oral-btn-' + id);
        var iconEl = document.getElementById('oral-icon-' + id);
        var textEl = document.getElementById('oral-text-' + id);
        var audioSrc = btn ? (btn.dataset.audio || '') : '';

        // If same clip is playing — toggle stop
        if (self._audioPlayingId === id || self._ttsPlaying) {
            self._stopAudioPlayer();
            self._stopTTSFallback();
            self._oralResetBtn(id);
            return;
        }

        // Stop any previous clip
        if (self._oralActiveId) {
            self._oralResetBtn(self._oralActiveId);
        }
        self._stopAudioPlayer();
        self._stopTTSFallback();

        // No audio file? Use TTS fallback
        if (!audioSrc || audioSrc.length < 4) {
            var text = textEl ? textEl.textContent : '';
            if (!text) return;
            self._oralActiveId = id;
            if (btn) btn.classList.add('bao-speak-active');
            if (iconEl) iconEl.innerHTML = '&#9724;';
            if (textEl) {
                textEl.classList.add('oh-expanded');
                var eb = document.getElementById('oral-expand-' + id);
                if (eb) eb.innerHTML = 'Collapse &#9650;';
            }
            self._playTTSFallback(text, function() { self._oralResetBtn(id); });
            return;
        }

        // ===== PLAY REAL AUDIO FILE =====
        self._oralActiveId = id;
        var audio = self._getAudioPlayer();

        // Activate UI
        if (btn) btn.classList.add('bao-speak-active');
        if (iconEl) iconEl.innerHTML = '&#9724;';

        // Expand text to follow along
        if (textEl) {
            textEl.classList.add('oh-expanded');
            var expandBtn = document.getElementById('oral-expand-' + id);
            if (expandBtn) expandBtn.innerHTML = 'Collapse &#9650;';
        }

        audio.src = audioSrc;
        self._audioPlayingId = id;

        audio.oncanplaythrough = function() {
            console.log('[BAO-Audio] Ready — duration: ' + audio.duration.toFixed(1) + 's');
        };

        audio.onended = function() {
            console.log('[BAO-Audio] Complete');
            self._audioPlayingId = null;
            self._oralResetBtn(id);
        };

        audio.onerror = function() {
            console.warn('[BAO-Audio] File load error: ' + audioSrc);
            self._audioPlayingId = null;
            self._oralResetBtn(id);
            BAO_Utils.toast('Could not load audio file.', 'warning');
        };

        audio.play().catch(function(err) {
            console.warn('[BAO-Audio] Play blocked: ' + err.message);
            self._audioPlayingId = null;
            self._oralResetBtn(id);
            BAO_Utils.toast('Tap again to play (browser requires user gesture).', 'info');
        });
    },

    _oralResetBtn(id) {
        this._oralActiveId = null;
        var btn = document.getElementById('oral-btn-' + id);
        var iconEl = document.getElementById('oral-icon-' + id);
        if (btn) btn.classList.remove('bao-speak-active');
        if (iconEl) iconEl.innerHTML = '&#9654;';
    },

    // ========== TTS FALLBACK (temporary until real audio files added) ==========
    _ttsPlaying: false,
    _ttsChunks: [],
    _ttsIndex: 0,
    _ttsCallback: null,
    _ttsResumeTimer: null,

    _playTTSFallback: function(text, onDone) {
        var self = this;
        if (!window.speechSynthesis) {
            console.warn('[BAO-TTS] speechSynthesis not supported');
            BAO_Utils.toast('Your browser does not support voice playback.', 'warning');
            if (onDone) onDone();
            return;
        }

        // HARD RESET — clear any lingering speech
        window.speechSynthesis.cancel();
        self._stopTTSFallback();

        // Chunk at hard max 100 chars — split on sentence then word boundaries
        var chunks = [];
        var sentences = text.replace(/([.!?])\s+/g, '$1|').split('|');
        var current = '';
        for (var i = 0; i < sentences.length; i++) {
            var s = sentences[i];
            // If single sentence exceeds 100, split on word boundary
            if (s.length > 100) {
                if (current.trim()) { chunks.push(current.trim()); current = ''; }
                var words = s.split(' ');
                var part = '';
                for (var w = 0; w < words.length; w++) {
                    if ((part + ' ' + words[w]).length > 100 && part.length > 0) {
                        chunks.push(part.trim());
                        part = words[w];
                    } else {
                        part = part ? part + ' ' + words[w] : words[w];
                    }
                }
                if (part.trim()) current = part;
            } else if ((current + ' ' + s).length > 100 && current.length > 0) {
                chunks.push(current.trim());
                current = s;
            } else {
                current = current ? current + ' ' + s : s;
            }
        }
        if (current.trim()) chunks.push(current.trim());

        self._ttsChunks = chunks;
        self._ttsIndex = 0;
        self._ttsCallback = onDone;
        self._ttsPlaying = true;
        self._ttsRetries = 0;

        console.log('[BAO-TTS] START: ' + chunks.length + ' chunks, ' + text.length + ' chars');

        // Force voice selection (must happen before first speak)
        self._ttsVoice = null;
        var voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            self._ttsVoice = voices.find(function(v){ return v.lang.indexOf('en') === 0; }) || voices[0];
        }

        // Small delay for mobile race condition, then speak INSIDE user-initiated call stack
        setTimeout(function() { self._speakNextChunk(); }, 50);
    },

    _speakNextChunk: function() {
        var self = this;
        if (!self._ttsPlaying || self._ttsIndex >= self._ttsChunks.length) {
            clearInterval(self._ttsResumeTimer);
            clearInterval(self._ttsWatchdog);
            self._ttsPlaying = false;
            console.log('[BAO-TTS] DONE: all ' + self._ttsChunks.length + ' chunks played');
            if (self._ttsCallback) self._ttsCallback();
            return;
        }

        var chunk = self._ttsChunks[self._ttsIndex];
        console.log('[BAO-TTS] Chunk ' + (self._ttsIndex + 1) + '/' + self._ttsChunks.length + ' (' + chunk.length + ' chars)');

        var utt = new SpeechSynthesisUtterance(chunk);
        utt.rate = 1.0;
        utt.pitch = 1.0;
        utt.volume = 1.0;

        // Force voice (retry if voices weren't loaded yet)
        if (!self._ttsVoice) {
            var voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                self._ttsVoice = voices.find(function(v){ return v.lang.indexOf('en') === 0; }) || voices[0];
            } else {
                console.warn('[BAO-TTS] No voices available yet');
            }
        }
        if (self._ttsVoice) utt.voice = self._ttsVoice;

        utt.onend = function() {
            clearInterval(self._ttsResumeTimer);
            clearInterval(self._ttsWatchdog);
            self._ttsRetries = 0;
            self._ttsIndex++;
            self._speakNextChunk();
        };

        utt.onerror = function(e) {
            console.warn('[BAO-TTS] ERROR chunk ' + self._ttsIndex + ': ' + (e.error || 'unknown'));
            clearInterval(self._ttsResumeTimer);
            clearInterval(self._ttsWatchdog);
            self._ttsIndex++;
            self._speakNextChunk();
        };

        // Hard cancel before each chunk (mobile safety)
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utt);

        // Chrome 15s pause/resume workaround
        clearInterval(self._ttsResumeTimer);
        self._ttsResumeTimer = setInterval(function() {
            if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
                window.speechSynthesis.pause();
                window.speechSynthesis.resume();
            }
        }, 7000);

        // FAILSAFE WATCHDOG: if speech stops but we're still "playing", restart
        clearInterval(self._ttsWatchdog);
        self._ttsWatchdog = setInterval(function() {
            if (!self._ttsPlaying) { clearInterval(self._ttsWatchdog); return; }
            if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
                self._ttsRetries = (self._ttsRetries || 0) + 1;
                if (self._ttsRetries > 2) {
                    console.warn('[BAO-TTS] WATCHDOG: max retries, advancing to next chunk');
                    self._ttsRetries = 0;
                    self._ttsIndex++;
                    clearInterval(self._ttsWatchdog);
                    self._speakNextChunk();
                } else {
                    console.warn('[BAO-TTS] WATCHDOG: speech stopped early, retry ' + self._ttsRetries);
                    window.speechSynthesis.cancel();
                    window.speechSynthesis.speak(utt);
                }
            }
        }, 3000);
    },

    _stopTTSFallback: function() {
        this._ttsPlaying = false;
        this._ttsChunks = [];
        this._ttsIndex = 0;
        this._ttsCallback = null;
        this._ttsRetries = 0;
        clearInterval(this._ttsResumeTimer);
        clearInterval(this._ttsWatchdog);
        if (window.speechSynthesis) window.speechSynthesis.cancel();
    },

    expandOralClip(id) {
        var textEl = document.getElementById('oral-text-' + id);
        var expandBtn = document.getElementById('oral-expand-' + id);
        if (!textEl) return;
        var isExpanded = textEl.classList.contains('oh-expanded');
        if (isExpanded) {
            textEl.classList.remove('oh-expanded');
            if (expandBtn) expandBtn.innerHTML = 'Read more &#9660;';
        } else {
            textEl.classList.add('oh-expanded');
            if (expandBtn) expandBtn.innerHTML = 'Collapse &#9650;';
        }
    },

    addOralHistory() {
        BAO_Utils.modal.show(`
            <h2 style="margin-bottom:16px">Record Oral History</h2>
            <div class="input-group"><label>Title *</label><input type="text" id="oh-title" placeholder="Title of this oral history"></div>
            <div class="input-group"><label>Narrator</label><input type="text" id="oh-narrator" placeholder="Who is telling this story?"></div>
            <div class="input-group"><label>Description</label><textarea id="oh-desc" placeholder="Summarize the story..."></textarea></div>
            <div class="input-group"><label>Tags (comma separated)</label><input type="text" id="oh-tags" placeholder="e.g. Cherokee, Family Stories, Land"></div>
            <div style="display:flex;gap:10px;margin-top:12px">
                <button class="btn btn-accent" onclick="BAO_Pages.saveOralHistory()">Save</button>
                <button class="btn btn-secondary" onclick="BAO_Utils.modal.hide()">Cancel</button>
            </div>
        `);
    },

    saveOralHistory() {
        const title = document.getElementById('oh-title')?.value?.trim();
        if (!title) { BAO_Utils.toast('Title is required', 'warning'); return; }
        BAO_Utils.oralHistories.save({
            title,
            narrator: document.getElementById('oh-narrator')?.value?.trim() || 'Unknown',
            year: new Date().getFullYear(),
            duration: '0:00',
            description: document.getElementById('oh-desc')?.value?.trim() || '',
            tags: (document.getElementById('oh-tags')?.value || '').split(',').map(t => t.trim()).filter(Boolean)
        });
        BAO_Utils.modal.hide();
        BAO_Utils.toast('Oral history saved!', 'success');
        BAO_App.navigate('oral-histories');
    },

    submitPost() {
        var input = document.getElementById('community-post-input');
        var content = input ? input.value.trim() : '';
        if (!content) { BAO_Utils.toast('Write something to share', 'warning'); return; }
        var profile = BAO_Utils.profile.getProfile();
        var selectedTribes = [];
        document.querySelectorAll('.comm-tribe-tag.active').forEach(function(btn) { selectedTribes.push(btn.dataset.tribe); });
        var post = {
            author: profile.name || 'Anonymous',
            avatar: BAO_Utils.profile.getInitials(profile.name),
            content: content, likes: 0, comments: 0, time: 'Just now', topic: 'General',
            tribe: selectedTribes, pinned: false, replies: [], _liked: false
        };
        BAO_DATA.communityPosts.unshift(post);
        input.value = '';
        document.querySelectorAll('.comm-tribe-tag.active').forEach(function(btn) { btn.classList.remove('active'); });
        BAO_Utils.toast('Posted to community!', 'success');
        var feed = document.getElementById('community-feed');
        if (feed) feed.innerHTML = this._renderCommunityPosts();
    },

    switchCommunityTab(btn, tab) {
        document.querySelectorAll('.tabs .tab-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var panels = ['community-feed', 'community-discoveries', 'community-tips', 'community-rights'];
        panels.forEach(function(id) { var el = document.getElementById(id); if (el) el.style.display = 'none'; });
        var showMap = { 'all': 'community-feed', 'discoveries': 'community-discoveries', 'tips': 'community-tips', 'rights': 'community-rights' };
        var target = document.getElementById(showMap[tab]);
        if (target) target.style.display = 'block';
    },

    toggleLike(index) {
        var post = BAO_DATA.communityPosts[index];
        if (!post) return;
        post._liked = !post._liked;
        post.likes = post._liked ? post.likes + 1 : Math.max(0, post.likes - 1);
        var card = document.querySelector('[data-post-index="' + index + '"]');
        if (card) {
            var likeBtn = card.querySelector('.post-like-btn');
            if (likeBtn) {
                likeBtn.classList.toggle('liked', post._liked);
                var span = likeBtn.querySelector('span');
                if (span) span.textContent = post.likes;
            }
        }
    },

    togglePin(index) {
        var post = BAO_DATA.communityPosts[index];
        if (!post) return;
        post.pinned = !post.pinned;
        BAO_Utils.toast(post.pinned ? 'Post pinned!' : 'Post unpinned', 'success');
        var feed = document.getElementById('community-feed');
        if (feed) feed.innerHTML = this._renderCommunityPosts();
    },

    toggleReplyBox(index) {
        var box = document.getElementById('reply-box-' + index);
        if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
    },

    addReply(index) {
        var input = document.getElementById('reply-input-' + index);
        var content = input ? input.value.trim() : '';
        if (!content) { BAO_Utils.toast('Write a reply first', 'warning'); return; }
        var post = BAO_DATA.communityPosts[index];
        if (!post) return;
        if (!post.replies) post.replies = [];
        var profile = BAO_Utils.profile.getProfile();
        post.replies.push({
            author: profile.name || 'Anonymous',
            avatar: BAO_Utils.profile.getInitials(profile.name),
            content: content,
            time: 'Just now'
        });
        input.value = '';
        var feed = document.getElementById('community-feed');
        if (feed) feed.innerHTML = this._renderCommunityPosts();
        BAO_Utils.toast('Reply posted!', 'success');
    },

    toggleTipExpand(index) {
        var body = document.getElementById('tip-body-' + index);
        var arrow = document.getElementById('tip-arrow-' + index);
        if (body) {
            var showing = body.style.display !== 'none';
            body.style.display = showing ? 'none' : 'block';
            if (arrow) arrow.innerHTML = showing ? '&#9660;' : '&#9650;';
        }
    },

    saveSettings() {
        const profile = {
            name: document.getElementById('settings-name')?.value?.trim() || 'Guest Researcher',
            email: document.getElementById('settings-email')?.value?.trim() || '',
            tribes: (document.getElementById('settings-tribes')?.value || '').split(',').map(t => t.trim()).filter(Boolean),
            researchGoals: document.getElementById('settings-goals')?.value?.trim() || '',
            notifications: document.getElementById('settings-notif')?.checked,
            autoSave: document.getElementById('settings-autosave')?.checked,
        };
        BAO_Utils.profile.saveProfile(profile);
        document.getElementById('user-display-name').textContent = profile.name;
        document.getElementById('user-avatar').textContent = BAO_Utils.profile.getInitials(profile.name);
        BAO_Utils.toast('Settings saved!', 'success');
    },

    exportData() {
        const data = {
            profile: BAO_Utils.profile.getProfile(),
            ancestors: BAO_Utils.ancestors.getAll(),
            documents: BAO_Utils.documents.getAll(),
            photos: BAO_Utils.photos.getAll(),
            familyTree: BAO_Utils.familyTree.getTree(),
            exportDate: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'bao-data-export.json'; a.click();
        URL.revokeObjectURL(url);
        BAO_Utils.toast('Data exported!', 'success');
    },

    clearAllData() {
        if (confirm('This will permanently delete ALL your saved data. Are you sure?')) {
            BAO_Utils.storage.clear();
            BAO_Utils.toast('All data cleared', 'info');
            BAO_App.navigate('home');
        }
    },

    viewDocument(id) {
        const doc = BAO_Utils.documents.getAll().find(d => d.id === id);
        if (!doc) return;
        const hasFile = doc.fileData;
        const isImage = hasFile && doc.fileType && doc.fileType.startsWith('image/');
        const isPdf = hasFile && doc.fileType === 'application/pdf';

        BAO_Utils.modal.show(`
            <h2 style="margin-bottom:12px">${BAO_Utils.escapeHTML(doc.name)}</h2>
            <p style="color:var(--text-muted);margin-bottom:4px">${doc.category || 'Uncategorized'} — Uploaded ${BAO_Utils.formatDate(doc.uploadedAt)}</p>
            ${doc.fileSize ? `<p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:8px">${(doc.fileSize / 1024).toFixed(1)} KB${doc.scanned ? ' · Scanned' : ''}${doc.fileName ? ' · ' + doc.fileName : ''}</p>` : ''}
            ${doc.notes ? `<p style="color:var(--text-secondary);margin-bottom:12px">${BAO_Utils.escapeHTML(doc.notes)}</p>` : ''}

            ${isImage ? `
                <div style="background:#0a0714;border-radius:10px;overflow:hidden;border:1px solid rgba(255,184,48,0.15);margin-bottom:16px;cursor:pointer" onclick="BAO_Pages.fullScreenPreview('${doc.fileData.substring(0, 100)}...')">
                    <img src="${doc.fileData}" style="width:100%;max-height:400px;object-fit:contain;display:block" onclick="event.stopPropagation();BAO_Pages.fullScreenPreview(this.src)">
                </div>
            ` : isPdf ? `
                <div style="background:#0a0714;border-radius:10px;padding:30px;text-align:center;border:1px solid rgba(255,184,48,0.15);margin-bottom:16px">
                    <div style="font-size:4rem">&#128196;</div>
                    <p style="color:var(--accent);margin-top:8px">PDF Document</p>
                </div>
            ` : `
                <div style="background:#0a0714;border-radius:10px;padding:30px;text-align:center;border:1px solid rgba(255,184,48,0.15);margin-bottom:16px">
                    <div style="font-size:3rem;opacity:0.4">&#128196;</div>
                    <p style="color:var(--text-muted);margin-top:8px">No file attached — metadata only</p>
                </div>
            `}

            <div style="display:flex;gap:8px;flex-wrap:wrap">
                ${hasFile ? `<button class="btn btn-accent btn-sm" onclick="BAO_Pages.fullScreenPreview(BAO_Utils.documents.getAll().find(d=>d.id==='${doc.id}').fileData)">&#128065; Full Screen</button>` : ''}
                ${hasFile ? `<button class="btn btn-primary btn-sm" onclick="BAO_Pages.downloadDocument('${doc.id}')">&#128190; Download</button>` : ''}
                <button class="btn btn-danger btn-sm" onclick="if(confirm('Delete this document permanently?')){BAO_Utils.documents.remove('${doc.id}');BAO_Utils.modal.hide();BAO_Utils.toast('Document deleted','info');BAO_App.navigate('document-vault')}">&#128465; Delete</button>
                <button class="btn btn-secondary btn-sm" onclick="BAO_Utils.modal.hide()">Close</button>
            </div>
        `);
    },

    downloadDocument(id) {
        const doc = BAO_Utils.documents.getAll().find(d => d.id === id);
        if (!doc || !doc.fileData) { BAO_Utils.toast('No file to download', 'warning'); return; }
        const a = document.createElement('a');
        a.href = doc.fileData;
        const ext = doc.fileType === 'application/pdf' ? '.pdf' : doc.fileType === 'image/png' ? '.png' : '.jpg';
        a.download = (doc.name || 'document').replace(/[^a-zA-Z0-9 _-]/g, '') + ext;
        document.body.appendChild(a);
        a.click();
        a.remove();
        BAO_Utils.toast('Download started!', 'success');
    },

    viewPhoto(id) {
        const photo = BAO_Utils.photos.getAll().find(p => p.id === id);
        if (!photo) return;
        BAO_Utils.modal.show(`
            <div style="text-align:center;padding:30px;background:var(--bg-elevated);border-radius:var(--radius-md);margin-bottom:16px">
                <span style="font-size:4rem;opacity:0.4">&#128247;</span>
                <p style="color:var(--text-muted);margin-top:8px">Photo placeholder</p>
            </div>
            <h3>${BAO_Utils.escapeHTML(photo.caption)}</h3>
            ${photo.date ? `<p style="color:var(--text-muted);font-size:0.88rem">${photo.date}</p>` : ''}
            ${photo.people ? `<p style="color:var(--text-secondary);font-size:0.88rem;margin-top:4px">People: ${BAO_Utils.escapeHTML(photo.people)}</p>` : ''}
            <button class="btn btn-secondary btn-sm" style="margin-top:12px" onclick="BAO_Utils.modal.hide()">Close</button>
        `);
    }
};
