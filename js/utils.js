/* ============================================
   BLACK ANCESTRAL ORIGINS — Utility Functions
   Storage, Search, Helpers
   ============================================ */

/**
 * showGuideArrow(selector, label)
 *
 * Global function: displays a gold (#FFB830) glowing animated arrow
 * pointing to the element matching `selector`. Arrow appears on top
 * of all elements (z-index 9999+) for exactly 3 seconds, then disappears.
 * Also shows a pulsing gold highlight ring around the target.
 *
 * If the target is a sidebar nav-item and the sidebar is closed,
 * it opens the sidebar first, then points.
 * If the target is scrolled off-screen, it scrolls into view first.
 *
 * @param {string} selector - CSS selector (supports comma-separated fallbacks)
 * @param {string} [label]  - Optional text label shown below the arrow
 */
var _guideArrowTimer = null;

function showGuideArrow(selector, label) {
    // Ensure arrow + ring elements exist in DOM
    if (!document.getElementById('bao-pointer-arrow')) {
        var arrow = document.createElement('div');
        arrow.id = 'bao-pointer-arrow';
        arrow.className = 'bao-pointer-arrow';
        arrow.innerHTML = '<div class="pointer-arrow-inner">&#9660;</div><div class="pointer-arrow-label"></div>';
        arrow.style.display = 'none';
        document.body.appendChild(arrow);
    }
    if (!document.getElementById('bao-target-highlight')) {
        var ring = document.createElement('div');
        ring.id = 'bao-target-highlight';
        ring.className = 'bao-target-highlight';
        ring.style.display = 'none';
        document.body.appendChild(ring);
    }

    // Clear any existing arrow
    clearTimeout(_guideArrowTimer);
    _hideGuideArrow();

    // Resolve comma-separated selectors — find first visible match
    var selectors = selector.split(',').map(function(s) { return s.trim(); });
    var target = null;
    for (var i = 0; i < selectors.length; i++) {
        var el = document.querySelector(selectors[i]);
        if (el) {
            var r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
                target = el;
                break;
            }
        }
    }

    // If target is a sidebar nav-item and sidebar is hidden, open sidebar first then retry
    if (!target) {
        for (var j = 0; j < selectors.length; j++) {
            if (selectors[j].indexOf('nav-item') !== -1) {
                var navEl = document.querySelector(selectors[j]);
                if (navEl) {
                    var sidebar = document.getElementById('sidebar');
                    if (sidebar && !sidebar.classList.contains('open')) {
                        sidebar.classList.add('open');
                        var overlay = document.getElementById('sidebar-overlay');
                        if (overlay) overlay.classList.add('active');
                    }
                    setTimeout(function() { showGuideArrow(selector, label); }, 400);
                    return;
                }
            }
        }
        return; // Element not found anywhere
    }

    // Scroll into view if off-screen
    var rect = target.getBoundingClientRect();
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(function() { _positionGuideArrow(target, label || ''); }, 500);
    } else {
        _positionGuideArrow(target, label || '');
    }
}

function _positionGuideArrow(target, labelText) {
    var arrow = document.getElementById('bao-pointer-arrow');
    var ring = document.getElementById('bao-target-highlight');
    if (!arrow || !target) return;

    var rect = target.getBoundingClientRect();

    // Position arrow centered above target
    arrow.style.left = (rect.left + rect.width / 2 - 22) + 'px';
    arrow.style.top = Math.max(4, rect.top - 58) + 'px';
    arrow.classList.add('active');

    // Set label
    var labelEl = arrow.querySelector('.pointer-arrow-label');
    if (labelEl) {
        labelEl.textContent = labelText;
        labelEl.style.display = labelText ? 'block' : 'none';
    }

    // Show highlight ring around target
    if (ring) {
        var pad = 6;
        ring.style.left = (rect.left - pad) + 'px';
        ring.style.top = (rect.top - pad) + 'px';
        ring.style.width = (rect.width + pad * 2) + 'px';
        ring.style.height = (rect.height + pad * 2) + 'px';
        ring.style.display = 'block';
    }

    // Auto-hide after 8 seconds so users can clearly see the arrow
    _guideArrowTimer = setTimeout(function() {
        _hideGuideArrow();
    }, 8000);
}

function _hideGuideArrow() {
    clearTimeout(_guideArrowTimer);
    var arrow = document.getElementById('bao-pointer-arrow');
    var ring = document.getElementById('bao-target-highlight');
    if (arrow) { arrow.classList.remove('active'); arrow.style.display = 'none'; }
    if (ring) { ring.style.display = 'none'; }
}

const BAO_Utils = {

    // ============== LOCAL STORAGE ==============
    storage: {
        prefix: 'bao_',

        get(key) {
            try {
                const data = localStorage.getItem(this.prefix + key);
                return data ? JSON.parse(data) : null;
            } catch { return null; }
        },

        set(key, value) {
            try {
                localStorage.setItem(this.prefix + key, JSON.stringify(value));
                return true;
            } catch { return false; }
        },

        remove(key) {
            localStorage.removeItem(this.prefix + key);
        },

        clear() {
            Object.keys(localStorage)
                .filter(k => k.startsWith(this.prefix))
                .forEach(k => localStorage.removeItem(k));
        }
    },

    // ============== USER PROFILE ==============
    profile: {
        getProfile() {
            return BAO_Utils.storage.get('profile') || {
                name: 'Guest Researcher',
                email: '',
                tribes: [],
                researchGoals: '',
                darkMode: true,
                notifications: true,
                autoSave: true
            };
        },

        saveProfile(data) {
            BAO_Utils.storage.set('profile', data);
        },

        getInitials(name) {
            if (!name) return '?';
            return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        }
    },

    // ============== GLOBAL SEARCH ==============
    search: {
        searchAll(query) {
            if (!query || query.length < 2) return [];
            const q = query.toLowerCase();
            const results = [];

            // Search Dawes Rolls
            BAO_DATA.dawesRolls.forEach(r => {
                if (r.name.toLowerCase().includes(q) || r.tribe.toLowerCase().includes(q) ||
                    r.postOffice.toLowerCase().includes(q) || String(r.rollNumber).includes(q)) {
                    results.push({ type: 'Dawes Roll', title: r.name, desc: `Roll #${r.rollNumber} — ${r.tribe} Freedman`, page: 'dawes-rolls', id: r.id });
                }
            });

            // Search Freedmen Records
            BAO_DATA.freedmenRecords.forEach(r => {
                if (r.name.toLowerCase().includes(q) || r.tribe.toLowerCase().includes(q) ||
                    r.location.toLowerCase().includes(q)) {
                    results.push({ type: 'Freedmen Record', title: r.name, desc: `${r.tribe} — ${r.location}`, page: 'freedmen-records', id: r.id });
                }
            });

            // Search Tribal Census Records
            BAO_DATA.slaveSchedules.forEach(r => {
                if (r.owner.toLowerCase().includes(q) || (r.possibleName && r.possibleName.toLowerCase().includes(q)) ||
                    r.county.toLowerCase().includes(q)) {
                    results.push({ type: 'Tribal Census Record', title: r.possibleName || `Unknown — ${r.owner}`, desc: `${r.year} ${r.county}`, page: 'slave-schedules', id: r.id });
                }
            });

            // Search Land Allotments
            BAO_DATA.landAllotments.forEach(r => {
                if (r.allottee.toLowerCase().includes(q) || r.location.toLowerCase().includes(q) ||
                    r.tribe.toLowerCase().includes(q)) {
                    results.push({ type: 'Land Allotment', title: r.allottee, desc: `${r.acreage} acres — ${r.tribe}`, page: 'land-allotments', id: r.id });
                }
            });

            // Search Timeline
            BAO_DATA.timeline.forEach(r => {
                if (r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)) {
                    results.push({ type: 'Timeline', title: r.title, desc: r.year, page: 'historical-timeline', id: null });
                }
            });

            // Search Name Origins
            BAO_DATA.nameOrigins.forEach(r => {
                if (r.name.toLowerCase().includes(q) || r.context.toLowerCase().includes(q)) {
                    results.push({ type: 'Name Origin', title: r.name, desc: r.meaning, page: 'name-origins', id: null });
                }
            });

            // Search Resources
            BAO_DATA.resources.forEach(r => {
                if (r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)) {
                    results.push({ type: 'Resource', title: r.title, desc: r.type, page: 'resources', id: r.id });
                }
            });

            // Search user-saved ancestors
            const savedAncestors = BAO_Utils.storage.get('ancestors') || [];
            savedAncestors.forEach(a => {
                if (a.name.toLowerCase().includes(q) || (a.tribe && a.tribe.toLowerCase().includes(q))) {
                    results.push({ type: 'My Ancestor', title: a.name, desc: a.tribe || 'Unknown tribe', page: 'ancestor-profiles', id: a.id });
                }
            });

            // Search Pages
            if (typeof BAO_App !== 'undefined' && BAO_App.pageNames) {
                Object.keys(BAO_App.pageNames).forEach(key => {
                    var name = BAO_App.pageNames[key];
                    if (name.toLowerCase().includes(q) || key.toLowerCase().includes(q)) {
                        results.push({ type: 'Page', title: name, desc: 'Navigate to ' + name, page: key, id: null });
                    }
                });
            }

            // Search user-saved photos
            var savedPhotos = BAO_Utils.storage.get('bao_photos') || [];
            savedPhotos.forEach(p => {
                var cap = (p.caption || '').toLowerCase();
                var tribe = (p.tribe || '').toLowerCase();
                var loc = (p.location || '').toLowerCase();
                var yr = (p.date || '').toLowerCase();
                if (cap.includes(q) || tribe.includes(q) || loc.includes(q) || yr.includes(q)) {
                    results.push({ type: 'Photo', title: p.caption || 'Untitled Photo', desc: [p.date, p.tribe, p.location].filter(Boolean).join(' — '), page: 'photo-gallery', id: p.id });
                }
            });

            // Search Community Posts
            if (BAO_DATA.communityPosts) {
                BAO_DATA.communityPosts.forEach(p => {
                    if ((p.title || '').toLowerCase().includes(q) || (p.content || '').toLowerCase().includes(q) || (p.author || '').toLowerCase().includes(q)) {
                        results.push({ type: 'Community Post', title: p.title || p.author, desc: (p.content || '').substring(0, 60), page: 'community', id: null });
                    }
                });
            }

            // Search Video Courses
            if (BAO_DATA.videoSlideshows) {
                BAO_DATA.videoSlideshows.forEach(v => {
                    if (v.title.toLowerCase().includes(q) || v.description.toLowerCase().includes(q)) {
                        results.push({ type: 'Video Course', title: v.title, desc: v.slides.length + ' slides', page: 'video-learning', id: null });
                    }
                });
            }

            // Search Migration Routes
            if (BAO_DATA.migrationRoutes) {
                BAO_DATA.migrationRoutes.forEach(r => {
                    var n = (r.name || '').toLowerCase();
                    var d = (r.description || '').toLowerCase();
                    if (n.includes(q) || d.includes(q) || (r.tribe || '').toLowerCase().includes(q)) {
                        results.push({ type: 'Migration Route', title: r.name, desc: r.description || '', page: 'migration-routes', id: null });
                    }
                });
            }

            // Search Oral History Clips
            if (BAO_DATA.voiceClips) {
                BAO_DATA.voiceClips.forEach(vc => {
                    if (vc.title.toLowerCase().includes(q) || vc.content.toLowerCase().includes(q)) {
                        results.push({ type: 'Oral History', title: vc.title, desc: vc.narrator + ' · ' + vc.duration, page: 'oral-histories', id: null });
                    }
                });
            }

            return results.slice(0, 25);
        }
    },

    // ============== FAMILY TREE ==============
    familyTree: {
        getTree() {
            return BAO_Utils.storage.get('familyTree') || BAO_DATA.sampleFamilyTree;
        },

        saveTree(tree) {
            BAO_Utils.storage.set('familyTree', tree);
        },

        addPerson(parentId, person) {
            const tree = this.getTree();
            const parent = this.findNode(tree, parentId);
            if (parent) {
                if (!parent.children) parent.children = [];
                person.id = 'person_' + Date.now();
                parent.children.push(person);
                this.saveTree(tree);
                return person;
            }
            return null;
        },

        findNode(node, id) {
            if (node.id === id) return node;
            if (node.spouse && node.spouse.id === id) return node.spouse;
            if (node.children) {
                for (const child of node.children) {
                    const found = this.findNode(child, id);
                    if (found) return found;
                }
            }
            return null;
        },

        getAllPeople(node, list = []) {
            if (!node) return list;
            list.push(node);
            if (node.spouse) list.push(node.spouse);
            if (node.children) {
                node.children.forEach(c => this.getAllPeople(c, list));
            }
            return list;
        }
    },

    // ============== ANCESTORS ==============
    ancestors: {
        getAll() {
            return BAO_Utils.storage.get('ancestors') || [];
        },

        save(ancestor) {
            const all = this.getAll();
            ancestor.id = ancestor.id || 'anc_' + Date.now();
            ancestor.createdAt = ancestor.createdAt || new Date().toISOString();
            ancestor.updatedAt = new Date().toISOString();
            const idx = all.findIndex(a => a.id === ancestor.id);
            if (idx >= 0) {
                all[idx] = ancestor;
            } else {
                all.push(ancestor);
            }
            BAO_Utils.storage.set('ancestors', all);
            return ancestor;
        },

        remove(id) {
            const all = this.getAll().filter(a => a.id !== id);
            BAO_Utils.storage.set('ancestors', all);
        },

        getById(id) {
            return this.getAll().find(a => a.id === id);
        }
    },

    // ============== DOCUMENTS ==============
    documents: {
        getAll() {
            return BAO_Utils.storage.get('documents') || [];
        },

        save(doc) {
            const all = this.getAll();
            doc.id = doc.id || 'doc_' + Date.now();
            doc.uploadedAt = doc.uploadedAt || new Date().toISOString();
            all.push(doc);
            BAO_Utils.storage.set('documents', all);
            return doc;
        },

        remove(id) {
            const all = this.getAll().filter(d => d.id !== id);
            BAO_Utils.storage.set('documents', all);
        }
    },

    // ============== PHOTOS ==============
    photos: {
        getAll() {
            return BAO_Utils.storage.get('photos') || [];
        },

        save(photo) {
            const all = this.getAll();
            photo.id = photo.id || 'photo_' + Date.now();
            photo.uploadedAt = new Date().toISOString();
            all.push(photo);
            BAO_Utils.storage.set('photos', all);
            return photo;
        },

        remove(id) {
            const all = this.getAll().filter(p => p.id !== id);
            BAO_Utils.storage.set('photos', all);
        }
    },

    // ============== ORAL HISTORIES ==============
    oralHistories: {
        getAll() {
            const saved = BAO_Utils.storage.get('oralHistories') || [];
            return [...BAO_DATA.oralHistories, ...saved];
        },

        save(history) {
            const saved = BAO_Utils.storage.get('oralHistories') || [];
            history.id = history.id || 'oh_' + Date.now();
            saved.push(history);
            BAO_Utils.storage.set('oralHistories', saved);
            return history;
        }
    },

    // ============== TOAST NOTIFICATIONS ==============
    toast(message, type = 'info', duration = 3500) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
        toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    // ============== MODAL ==============
    modal: {
        show(contentHTML) {
            const overlay = document.getElementById('modal-overlay');
            const body = document.getElementById('modal-body');
            if (overlay && body) {
                body.innerHTML = contentHTML;
                overlay.classList.remove('hidden');
            }
        },

        hide() {
            const overlay = document.getElementById('modal-overlay');
            if (overlay) overlay.classList.add('hidden');
        }
    },

    // ============== HELPERS ==============
    formatDate(dateStr) {
        if (!dateStr) return 'Unknown';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch {
            return dateStr;
        }
    },

    generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    debounce(fn, delay = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    },

    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    truncate(str, len = 100) {
        if (!str || str.length <= len) return str;
        return str.substring(0, len) + '...';
    }
};
