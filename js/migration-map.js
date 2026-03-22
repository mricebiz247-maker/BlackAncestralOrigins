/* ============================================
   FREEDMEN MIGRATION ROUTES — Leaflet.js Map
   Cinematic dark-themed interactive map with
   animated routes, story mode, filters, and
   ancestor route highlighting
   ============================================ */

var BAO_MigrationMap = {

    map: null,
    initialized: false,
    animationFrames: [],
    routeLayers: {},      // keyed by route id for filter toggling
    markerLayers: {},     // keyed by type: 'tribal','ancestor','source'
    allLayers: [],        // every layer added to map
    storyMode: null,      // story mode state
    activeRouteId: null,  // focused route state

    // ========== ROUTE DATA ==========
    routes: [
        {
            id: 'choctaw', tribe: 'Choctaw',
            name: 'Choctaw Removal (1831–1833)',
            color: '#FFB830', weight: 3.5,
            dateRange: '1831–1833',
            summary: 'First tribe removed. Choctaw people and their Freedmen ancestors marched from Mississippi to Indian Territory through harsh winter conditions.',
            significance: 'Set the precedent for all subsequent Indian removals. Approximately 2,500 Choctaw died during the march. Enslaved Black people walked alongside.',
            source: 'National Archives, Choctaw Nation Records',
            action: { label: 'Search Dawes Rolls', page: 'dawes-rolls' },
            path: [
                [32.35,-89.39],[32.47,-90.18],[33.00,-91.05],[33.45,-91.55],
                [33.95,-92.10],[34.30,-92.40],[34.50,-93.05],[34.75,-94.10],
                [34.70,-94.80],[34.60,-95.40],[34.38,-95.98],[34.75,-96.68]
            ]
        },
        {
            id: 'cherokee', tribe: 'Cherokee',
            name: 'Cherokee Trail of Tears (1836–1839)',
            color: '#E8443A', weight: 3.5,
            dateRange: '1836–1839',
            summary: 'Forced removal of Cherokee Nation. ~4,000 Cherokee died along with unknown numbers of enslaved Black Indigenous people.',
            significance: 'The most widely documented removal. Cherokee Freedmen fought for citizenship rights that persist to this day.',
            source: 'Cherokee Nation Archives, Smithsonian NMAI',
            action: { label: 'View Records', page: 'freedmen-records' },
            path: [
                [34.87,-83.38],[35.05,-84.00],[35.60,-84.50],[36.16,-85.50],
                [36.17,-86.78],[36.50,-87.35],[37.05,-88.60],[37.20,-89.50],
                [37.08,-89.95],[36.75,-90.40],[36.40,-91.80],[36.10,-93.20],
                [36.00,-94.20],[35.95,-94.85],[35.90,-95.00]
            ]
        },
        {
            id: 'creek', tribe: 'Creek',
            name: 'Creek (Muscogee) Removal (1836–1837)',
            color: '#4ECDC4', weight: 3,
            dateRange: '1836–1837',
            summary: 'Muscogee (Creek) people and their Freedmen ancestors forcibly relocated from Alabama to Indian Territory.',
            significance: 'Creek Freedmen received some of the earliest citizenship recognition after the 1866 Treaty.',
            source: 'Muscogee Nation Archives',
            action: { label: 'View Records', page: 'freedmen-records' },
            path: [
                [32.38,-85.38],[32.50,-86.50],[32.80,-87.50],[33.10,-88.70],
                [33.40,-89.70],[33.70,-90.50],[34.10,-91.40],[34.50,-92.50],
                [34.90,-93.80],[35.40,-95.10],[35.47,-95.96]
            ]
        },
        {
            id: 'chickasaw', tribe: 'Chickasaw',
            name: 'Chickasaw Removal (1837–1838)',
            color: '#C084FC', weight: 2.8,
            dateRange: '1837–1838',
            summary: 'Chickasaw people moved from northern Mississippi/Alabama. Freedmen ancestors accompanied them to Indian Territory.',
            significance: 'The Chickasaw and Choctaw Nations shared territory initially. Chickasaw Freedmen faced unique citizenship challenges.',
            source: 'Chickasaw Nation Archives',
            action: { label: 'Search Dawes Rolls', page: 'dawes-rolls' },
            path: [
                [34.26,-88.72],[34.20,-89.50],[34.50,-90.20],[34.80,-91.00],
                [34.90,-92.00],[34.70,-93.30],[34.60,-94.40],[34.50,-96.40],
                [34.18,-97.14]
            ]
        },
        {
            id: 'seminole', tribe: 'Seminole',
            name: 'Seminole Removal (1836–1842)',
            color: '#F59E0B', weight: 3,
            dateRange: '1836–1842',
            summary: 'Black Seminoles fought alongside Seminoles in the most expensive Indian wars. Many were captured and recaptured during removal.',
            significance: 'Black Seminoles had a uniquely integrated role within the tribe, often serving as interpreters and warriors.',
            source: 'Seminole Nation Archives, Fort Mose Historical Society',
            action: { label: 'View Records', page: 'freedmen-records' },
            path: [
                [27.95,-81.75],[28.80,-82.50],[29.65,-83.00],[30.45,-84.28],
                [30.40,-86.50],[30.30,-87.90],[30.00,-89.50],[30.95,-90.07],
                [31.50,-91.40],[32.50,-92.00],[33.60,-93.50],[34.50,-94.50],
                [35.20,-96.00]
            ]
        },
        {
            id: 'great-migration', tribe: 'Post-Tribal',
            name: 'Great Migration North (1910–1970)',
            color: '#818CF8', weight: 2.5,
            dateRange: '1910–1970',
            summary: 'Freedmen descendants joined millions moving north to escape Jim Crow, seeking opportunity in industrial cities.',
            significance: 'Transformed American demographics. Many Freedmen families lost tribal connections during this period.',
            source: 'Smithsonian National Museum of African American History',
            action: { label: 'Explore Timeline', page: 'historical-timeline' },
            path: [
                [35.47,-97.52],[36.15,-97.00],[37.00,-97.30],[38.00,-97.00],
                [38.97,-95.68],[39.10,-94.58],[39.80,-93.50],[40.50,-91.50],
                [41.50,-89.50],[41.88,-87.63]
            ]
        },
        {
            id: 'exoduster', tribe: 'Post-Tribal',
            name: 'Exoduster Movement (1879)',
            color: '#F97316', weight: 2.5,
            dateRange: '1879',
            summary: 'Black families including Freedmen fled racial violence to establish free communities in Kansas.',
            significance: 'Created historic all-Black towns like Nicodemus, Kansas — a symbol of self-determination.',
            source: 'Kansas Historical Society, NPS Nicodemus NHS',
            action: { label: 'Explore Timeline', page: 'historical-timeline' },
            path: [
                [34.75,-96.68],[35.47,-97.52],[36.40,-97.80],[37.10,-97.90],
                [37.69,-97.34],[38.40,-98.20],[39.00,-99.30],[39.39,-99.73]
            ]
        },
        {
            id: 'choctaw-real-example', tribe: 'Choctaw', isRealData: true,
            name: 'Choctaw Removal — Historical Example',
            color: '#E0A96D', weight: 3.5,
            dateRange: '1831–1833',
            summary: 'Documented Choctaw removal route based on historical records. Families from Noxubee and Lowndes counties were marched through Vicksburg, across the Mississippi River, through Arkansas swamps, to settlements near Skullyville in Indian Territory.',
            significance: 'Set precedent for all Trail of Tears migrations. This route is reconstructed from National Archives removal muster rolls and Choctaw Agency correspondence.',
            source: 'National Archives RG 75 / Choctaw Agency Records',
            action: { label: 'Search Dawes Rolls', page: 'dawes-rolls' },
            path: [
                [33.10,-88.56],[32.90,-89.20],[32.35,-89.39],[32.35,-90.18],
                [32.47,-90.88],[33.00,-91.20],[33.40,-91.55],[33.80,-92.10],
                [34.10,-92.80],[34.50,-93.40],[34.75,-94.10],[34.93,-94.70],
                [35.10,-95.00],[35.23,-95.40]
            ]
        }
    ],

    // ========== LOCATION MARKERS ==========
    markers: [
        { lat:34.38, lng:-95.98, name:'Atoka, Indian Territory', sub:'Williams Family — Dawes Card #2241', color:'#FFB830', type:'ancestor', tribe:'Choctaw', pulse:true },
        { lat:35.90, lng:-95.00, name:'Tahlequah', sub:'Cherokee Nation Capital', color:'#E8443A', type:'tribal' },
        { lat:35.47, lng:-95.96, name:'Okmulgee', sub:'Creek Nation Capital', color:'#4ECDC4', type:'tribal' },
        { lat:34.75, lng:-96.68, name:'Tuskahoma', sub:'Choctaw Nation Capital', color:'#FFB830', type:'tribal' },
        { lat:34.18, lng:-97.14, name:'Tishomingo', sub:'Chickasaw Nation Capital', color:'#C084FC', type:'tribal' },
        { lat:35.20, lng:-96.00, name:'Wewoka', sub:'Seminole Nation Capital', color:'#F59E0B', type:'tribal' },
        { lat:32.35, lng:-89.39, name:'Mississippi', sub:'Choctaw Homeland', color:'#FFB830', type:'origin' },
        { lat:34.87, lng:-83.38, name:'New Echota, GA', sub:'Cherokee Homeland', color:'#E8443A', type:'origin' },
        { lat:32.38, lng:-85.38, name:'Alabama', sub:'Creek Homeland', color:'#4ECDC4', type:'origin' },
        { lat:27.95, lng:-81.75, name:'Florida', sub:'Seminole Homeland', color:'#F59E0B', type:'origin' },
        { lat:34.26, lng:-88.72, name:'N. Mississippi', sub:'Chickasaw Homeland', color:'#C084FC', type:'origin' },
        { lat:41.88, lng:-87.63, name:'Chicago', sub:'Great Migration Destination', color:'#818CF8', type:'destination' },
        { lat:39.39, lng:-99.73, name:'Nicodemus, KS', sub:'Exoduster Settlement', color:'#F97316', type:'destination' }
    ],

    // ========== WAYPOINTS ==========
    waypoints: [
        { lat:33.12, lng:-88.56, name:'Noxubee County, Mississippi', date:'Pre-1831', event:'Origin homeland of many Choctaw-held enslaved Africans. One of the highest concentrations of enslaved Black people in Mississippi.', connection:'Freedmen ancestors from this region later appeared on Choctaw Freedmen Dawes Roll cards.' },
        { lat:34.00, lng:-95.40, name:'Choctaw Nation Boundary', date:'1831–1907', event:'Eastern boundary of the Choctaw Nation in Indian Territory. After removal, Freedmen were brought here and later emancipated.', connection:'The 1866 Treaty granted Freedmen citizenship rights. Many settled along this boundary.' },
        { lat:35.39, lng:-94.40, name:'Fort Smith, Arkansas', date:'1838–1842', event:'Major staging point for Indian Removal. Thousands crossed into Indian Territory here.', connection:'Black Indigenous Freedmen ancestors passed through Fort Smith during forced removal.' },
        { lat:34.70, lng:-94.80, name:'Indian Territory Border', date:'1830s–1907', event:'The western border of Arkansas marked the entrance to Indian Territory — the final leg of the Trail of Tears.', connection:'After the 1866 Treaties, Freedmen who crossed this border were entitled to citizenship and land allotments.' },
        { lat:34.58, lng:-96.38, name:'Coal County, Oklahoma', date:'1870s–1914', event:'Heart of the Choctaw Freedmen settlements. Black Indigenous communities thrived here.', connection:'Robert Williams (Dawes Card #2241) and many Choctaw Freedmen received land allotments here.' }
    ],

    // ========== SOURCE MARKERS ==========
    sourceMarkers: [
        { lat:38.89, lng:-77.02, name:'National Archives', desc:'Primary repository for Dawes Rolls, Freedmen Bureau records, and tribal census data.', icon:'&#127963;' },
        { lat:35.47, lng:-97.52, name:'Oklahoma Historical Society', desc:'Houses Five Civilized Tribes records, Indian Territory court documents, and Freedmen enrollment papers.', icon:'&#128218;' },
        { lat:36.15, lng:-95.99, name:'Gilcrease Museum, Tulsa', desc:'Cherokee Nation court records mentioning Freedmen in land and citizenship disputes.', icon:'&#127750;' }
    ],

    // ========== FILTER STATE ==========
    filters: {
        choctaw: true, cherokee: true, creek: true, chickasaw: true, seminole: true,
        'great-migration': true, exoduster: true, 'choctaw-real-example': true,
        ancestors: true, sources: false
    },

    // ========== INIT ==========
    init: function() {
        var el = document.getElementById('leaflet-migration-map');
        if (!el) return;
        if (typeof L === 'undefined') {
            this.loadLeaflet(function() { BAO_MigrationMap.buildMap(); });
            return;
        }
        this.buildMap();
    },

    loadLeaflet: function(cb) {
        if (!document.getElementById('leaflet-css')) {
            var css = document.createElement('link');
            css.id = 'leaflet-css'; css.rel = 'stylesheet';
            css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(css);
        }
        if (!document.getElementById('leaflet-js')) {
            var js = document.createElement('script');
            js.id = 'leaflet-js';
            js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            js.onload = function() { setTimeout(cb, 100); };
            document.head.appendChild(js);
        } else if (typeof L !== 'undefined') { cb(); }
    },

    // ========== BUILD MAP ==========
    buildMap: function() {
        var el = document.getElementById('leaflet-migration-map');
        if (!el || typeof L === 'undefined') return;

        // Ensure Leaflet CSS
        if (!document.getElementById('leaflet-css')) {
            var css = document.createElement('link');
            css.id = 'leaflet-css'; css.rel = 'stylesheet';
            css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(css);
        }

        el.style.width = '100%';
        el.style.height = '500px';

        if (this.map) { this.map.remove(); this.map = null; }
        this.stopAnimations();
        this.routeLayers = {};
        this.markerLayers = {};
        this.allLayers = [];

        // Dark cinematic map
        this.map = L.map('leaflet-migration-map', {
            center: [34.5, -92.0],
            zoom: 5,
            minZoom: 3,
            maxZoom: 12,
            zoomControl: false,
            attributionControl: false,
            zoomAnimation: true,
            markerZoomAnimation: true
        });

        // Dark tiles — CartoDB Dark Matter
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            attribution: '© CartoDB © OSM',
            subdomains: 'abcd'
        }).addTo(this.map);

        L.control.zoom({ position: 'topright' }).addTo(this.map);
        L.control.attribution({ prefix: false, position: 'bottomleft' })
            .addAttribution('Freedmen Migration Routes · Black Ancestral Origins')
            .addTo(this.map);

        // Indian Territory boundary
        this.addIndianTerritoryBoundary();

        // All routes
        this.addAllRoutes();

        // Markers
        this.addAllMarkers();

        // Waypoints
        this.addWaypoints();

        // Source markers (hidden by default)
        this.addSourceMarkers();

        // Title overlay
        this.addTitleOverlay();

        this.initialized = true;

        // Smooth fit to migration region
        var self = this;
        setTimeout(function() {
            if (self.map) {
                self.map.fitBounds([[27.5, -100.5], [42.5, -81.0]], { padding: [20, 20], animate: true, duration: 1.5 });
                self.map.invalidateSize();
            }
        }, 300);
        setTimeout(function() { if (self.map) self.map.invalidateSize(); }, 1000);
    },

    // ========== INDIAN TERRITORY ==========
    addIndianTerritoryBoundary: function() {
        var bounds = [[33.60,-94.43],[33.60,-100.00],[36.50,-100.00],[36.50,-94.62],[36.10,-94.62],[35.40,-94.43],[34.90,-94.43],[33.60,-94.43]];
        var layer = L.polygon(bounds, {
            color: '#FFB830', weight: 1.5, opacity: 0.25,
            fillColor: '#FFB830', fillOpacity: 0.03, dashArray: '8,4'
        }).addTo(this.map);
        this.allLayers.push(layer);

        var label = L.divIcon({
            className: 'it-label',
            html: '<div style="color:#FFB830;font-family:Cinzel,serif;font-size:13px;font-weight:700;text-shadow:0 0 12px rgba(255,184,48,0.6);white-space:nowrap;opacity:0.5;letter-spacing:4px;">INDIAN TERRITORY</div>',
            iconSize: [180, 20], iconAnchor: [90, 10]
        });
        var m = L.marker([35.2, -97.3], { icon: label, interactive: false }).addTo(this.map);
        this.allLayers.push(m);
    },

    // ========== ADD ALL ROUTES ==========
    addAllRoutes: function() {
        var self = this;
        this.routes.forEach(function(route) {
            var layers = [];

            // Glow background
            var glow = L.polyline(route.path, {
                color: route.color, weight: route.weight * 3.5, opacity: 0.06,
                smoothFactor: 1.5, lineCap: 'round', lineJoin: 'round'
            }).addTo(self.map);
            layers.push(glow);

            // Solid base
            var base = L.polyline(route.path, {
                color: route.color, weight: route.weight, opacity: 0.55,
                smoothFactor: 1.5, lineCap: 'round', lineJoin: 'round'
            }).addTo(self.map);
            layers.push(base);

            // Animated dash
            var dash = L.polyline(route.path, {
                color: route.color, weight: route.weight - 0.5, opacity: 0.85,
                smoothFactor: 1.5, dashArray: '12,8', lineCap: 'round', lineJoin: 'round'
            }).addTo(self.map);
            layers.push(dash);
            self.animateDashLine(dash, self.routes.indexOf(route));

            // Arrows every other segment
            for (var i = 0; i < route.path.length - 1; i++) {
                if (i % 2 !== 0) continue;
                var from = route.path[i], to = route.path[i + 1];
                var mid = [(from[0]+to[0])/2, (from[1]+to[1])/2];
                var angle = Math.atan2(to[0]-from[0], to[1]-from[1]) * (180/Math.PI);
                var ai = L.divIcon({
                    className: 'route-arrow-marker',
                    html: '<div style="color:'+route.color+';text-shadow:0 0 8px '+route.color+';font-size:14px;transform:rotate('+(90-angle)+'deg);animation:arrowPulse 2.5s ease-in-out infinite '+(i*0.3)+'s;">&#9654;</div>',
                    iconSize: [14, 14], iconAnchor: [7, 7]
                });
                var am = L.marker(mid, { icon: ai, interactive: false }).addTo(self.map);
                layers.push(am);
            }

            // Clickable hit area with glass popup
            var hit = L.polyline(route.path, {
                color: route.color, weight: route.weight * 5, opacity: 0, smoothFactor: 1.5
            }).addTo(self.map);
            layers.push(hit);

            hit.on('mouseover', function() { base.setStyle({ weight: route.weight + 2, opacity: 0.9 }); });
            hit.on('mouseout', function() { base.setStyle({ weight: route.weight, opacity: 0.55 }); });

            var popupHTML =
                '<div class="mmap-popup">' +
                    '<div class="mmap-popup-accent" style="background:'+route.color+';"></div>' +
                    '<h3 class="mmap-popup-title" style="color:'+route.color+';">'+route.name+'</h3>' +
                    '<div class="mmap-popup-date">'+route.dateRange+'</div>' +
                    '<p class="mmap-popup-text">'+route.summary+'</p>' +
                    '<div class="mmap-popup-sig"><span style="color:'+route.color+';">&#9733;</span> '+route.significance+'</div>' +
                    (route.source ? '<div class="mmap-popup-source">Source: '+route.source+'</div>' : '') +
                    '<button class="mmap-popup-btn" style="background:'+route.color+';" onclick="BAO_App.navigate(\''+route.action.page+'\')">'+route.action.label+' &#10095;</button>' +
                '</div>';
            hit.bindPopup(popupHTML, { className: 'dark-popup glass-popup', maxWidth: 320, minWidth: 240 });

            // Click: focus route + update Did You Know banner
            hit.on('click', function() {
                self.updateTipBanner(route);
                self.focusRoute(route.id);
            });

            self.routeLayers[route.id] = layers;
            layers.forEach(function(l) { self.allLayers.push(l); });
        });

        // Click on map background = unfocus
        var self2 = this;
        this.map.on('click', function(e) {
            // Only unfocus if not clicking a route (popup will handle route clicks)
            if (self2.activeRouteId && !e.originalEvent._routeClick) {
                self2.unfocusRoute();
            }
        });
    },

    // ========== MARKERS ==========
    addAllMarkers: function() {
        var self = this;
        this.markerLayers.tribal = [];
        this.markerLayers.ancestor = [];

        this.markers.forEach(function(m) {
            var isAncestor = m.type === 'ancestor';
            var dotSize = isAncestor ? 14 : m.type === 'tribal' ? 10 : 8;
            var pulseHTML = m.pulse ? '<div class="marker-pulse" style="border-color:'+m.color+';"></div>' : '';
            var icon = L.divIcon({
                className: 'custom-marker' + (isAncestor ? ' marker-large' : ''),
                html: pulseHTML +
                    '<div class="marker-dot" style="width:'+dotSize+'px;height:'+dotSize+'px;background:'+m.color+';box-shadow:0 0 10px '+m.color+',0 0 20px '+m.color+'44;"></div>' +
                    '<div class="marker-label" style="color:'+m.color+';">'+m.name+'</div>' +
                    (m.sub ? '<div class="marker-sub">'+m.sub+'</div>' : ''),
                iconSize: [120, 50], iconAnchor: [60, 25]
            });
            var marker = L.marker([m.lat, m.lng], { icon: icon }).addTo(self.map);

            if (isAncestor) {
                marker.bindPopup(
                    '<div class="mmap-popup">' +
                        '<div class="mmap-popup-accent" style="background:'+m.color+';"></div>' +
                        '<h3 class="mmap-popup-title" style="color:'+m.color+';">&#128100; '+m.name+'</h3>' +
                        '<div class="mmap-popup-date">'+(m.tribe||'')+' Freedmen</div>' +
                        '<p class="mmap-popup-text">'+m.sub+'</p>' +
                        '<div style="display:flex;gap:8px;margin-top:10px;">' +
                            '<button class="mmap-popup-btn" style="background:'+m.color+';flex:1;" onclick="BAO_App.navigate(\'ancestor-profiles\')">View Profile &#10095;</button>' +
                            '<button class="mmap-popup-btn" style="background:transparent;border:1px solid '+m.color+';color:'+m.color+';flex:1;" onclick="BAO_App.navigate(\'family-tree\')">Family Tree &#10095;</button>' +
                        '</div>' +
                    '</div>',
                    { className: 'dark-popup glass-popup', maxWidth: 300 }
                );
                self.markerLayers.ancestor.push(marker);
            } else {
                self.markerLayers.tribal.push(marker);
            }
            self.allLayers.push(marker);
        });
    },

    // ========== WAYPOINTS ==========
    addWaypoints: function() {
        var self = this;
        this.waypoints.forEach(function(wp) {
            var wpIcon = L.divIcon({
                className: 'waypoint-marker',
                html: '<div style="width:16px;height:16px;background:#FFB830;border-radius:50%;border:3px solid #0a0714;box-shadow:0 0 12px rgba(255,184,48,0.7),0 0 24px rgba(255,184,48,0.3);cursor:pointer;animation:waypointPulse 2.5s ease-in-out infinite;"></div>',
                iconSize: [16, 16], iconAnchor: [8, 8]
            });
            var marker = L.marker([wp.lat, wp.lng], { icon: wpIcon }).addTo(self.map);
            marker.bindPopup(
                '<div class="mmap-popup">' +
                    '<div class="mmap-popup-accent" style="background:#FFB830;"></div>' +
                    '<h3 class="mmap-popup-title" style="color:#FFB830;">&#128205; '+wp.name+'</h3>' +
                    '<div class="mmap-popup-date">&#128197; '+wp.date+'</div>' +
                    '<div class="mmap-popup-sig"><span style="color:#FFB830;">&#9733;</span> '+wp.event+'</div>' +
                    '<div style="background:rgba(255,184,48,0.06);border:1px solid rgba(255,184,48,0.15);border-radius:8px;padding:10px;margin-top:8px;">' +
                        '<div style="font-size:0.7rem;color:#FFB830;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">&#128279; Freedmen Connection</div>' +
                        '<p style="font-size:0.82rem;line-height:1.6;color:#c4bcd4;margin:0;">'+wp.connection+'</p>' +
                    '</div>' +
                '</div>',
                { className: 'dark-popup glass-popup waypoint-popup', maxWidth: 320, minWidth: 260 }
            );
            self.allLayers.push(marker);
        });
    },

    // ========== SOURCE MARKERS ==========
    addSourceMarkers: function() {
        var self = this;
        self.markerLayers.source = [];
        this.sourceMarkers.forEach(function(sm) {
            var icon = L.divIcon({
                className: 'source-marker-icon',
                html: '<div style="width:22px;height:22px;background:rgba(255,184,48,0.15);border:2px solid rgba(255,184,48,0.5);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer;">'+sm.icon+'</div>',
                iconSize: [22, 22], iconAnchor: [11, 11]
            });
            var marker = L.marker([sm.lat, sm.lng], { icon: icon });
            marker.bindPopup(
                '<div class="mmap-popup">' +
                    '<h3 class="mmap-popup-title" style="color:#FFB830;">'+sm.icon+' '+sm.name+'</h3>' +
                    '<p class="mmap-popup-text">'+sm.desc+'</p>' +
                '</div>',
                { className: 'dark-popup glass-popup', maxWidth: 280 }
            );
            // Hidden by default
            if (self.filters.sources) marker.addTo(self.map);
            self.markerLayers.source.push(marker);
            self.allLayers.push(marker);
        });
    },

    // ========== TITLE OVERLAY ==========
    addTitleOverlay: function() {
        var ctrl = L.control({ position: 'topleft' });
        ctrl.onAdd = function() {
            var div = L.DomUtil.create('div', 'map-title-overlay');
            div.innerHTML =
                '<div style="background:rgba(8,5,16,0.88);border:1px solid rgba(255,184,48,0.2);border-radius:12px;padding:12px 18px;backdrop-filter:blur(8px);">' +
                '<div style="font-family:Cinzel,serif;font-size:14px;font-weight:700;color:#FFB830;text-shadow:0 0 10px rgba(255,184,48,0.4);letter-spacing:1px;">Freedmen Migration Routes</div>' +
                '<div style="font-size:10px;color:#a89bc2;margin-top:2px;">Five Civilized Tribes & Their Freedmen · 1831–1970</div>' +
                '</div>';
            return div;
        };
        ctrl.addTo(this.map);
    },

    // ========== ANIMATION ==========
    animateDashLine: function(line, idx) {
        var offset = 0;
        var speed = 0.35 + (idx * 0.04);
        var self = this;
        var currentFrame = 0;
        function step() {
            offset -= speed;
            if (line._path) line._path.style.strokeDashoffset = offset + 'px';
            currentFrame = requestAnimationFrame(step);
        }
        currentFrame = requestAnimationFrame(step);
        self.animationFrames.push({ cancel: function() { cancelAnimationFrame(currentFrame); } });
    },

    // ========== FILTER TOGGLE ==========
    toggleFilter: function(id) {
        this.filters[id] = !this.filters[id];
        var active = this.filters[id];
        var self = this;

        // Route layers
        if (self.routeLayers[id]) {
            self.routeLayers[id].forEach(function(layer) {
                if (active) { if (!self.map.hasLayer(layer)) self.map.addLayer(layer); }
                else { if (self.map.hasLayer(layer)) self.map.removeLayer(layer); }
            });
        }

        // Source markers
        if (id === 'sources') {
            (self.markerLayers.source || []).forEach(function(m) {
                if (active) { if (!self.map.hasLayer(m)) self.map.addLayer(m); }
                else { if (self.map.hasLayer(m)) self.map.removeLayer(m); }
            });
        }

        // Ancestor markers
        if (id === 'ancestors') {
            (self.markerLayers.ancestor || []).forEach(function(m) {
                if (active) { if (!self.map.hasLayer(m)) self.map.addLayer(m); }
                else { if (self.map.hasLayer(m)) self.map.removeLayer(m); }
            });
        }

        // Update filter button UI
        var btn = document.getElementById('mf-' + id);
        if (btn) {
            btn.classList.toggle('mmap-filter-active', active);
            btn.classList.toggle('mmap-filter-off', !active);
        }
    },

    // ========== ANCESTOR ROUTE HIGHLIGHT ==========
    highlightAncestorRoute: function() {
        var self = this;
        // Dim all routes
        Object.keys(self.routeLayers).forEach(function(id) {
            self.routeLayers[id].forEach(function(layer) {
                if (layer.setStyle) layer.setStyle({ opacity: 0.08 });
            });
        });
        // Highlight Choctaw route (ancestor's tribe)
        if (self.routeLayers['choctaw']) {
            self.routeLayers['choctaw'].forEach(function(layer) {
                if (layer.setStyle) layer.setStyle({ opacity: 1 });
            });
        }
        // Zoom to Choctaw route
        if (self.map) {
            self.map.flyTo([34.0, -93.0], 6, { animate: true, duration: 1.5 });
        }
        // Show label
        var label = document.getElementById('mmap-ancestor-label');
        if (label) { label.style.display = 'block'; label.textContent = '★ Showing likely route: Choctaw Removal — Williams Family (estimated)'; }
    },

    resetHighlight: function() {
        var self = this;
        Object.keys(self.routeLayers).forEach(function(id) {
            if (!self.filters[id]) return;
            self.routeLayers[id].forEach(function(layer) {
                if (layer.setStyle) layer.setStyle({ opacity: layer.options._origOpacity || 0.55 });
            });
        });
        if (self.map) self.map.fitBounds([[27.5, -100.5], [42.5, -81.0]], { padding: [20, 20], animate: true });
        var label = document.getElementById('mmap-ancestor-label');
        if (label) label.style.display = 'none';
    },

    // ========== STORY MODE ==========
    startStory: function() {
        this.storyMode = { step: 0, total: this.routes.length, active: true };
        var panel = document.getElementById('mmap-story-panel');
        if (panel) panel.style.display = 'block';
        this.showStoryStep(0);
    },

    showStoryStep: function(idx) {
        if (!this.storyMode || idx < 0 || idx >= this.routes.length) return;
        this.storyMode.step = idx;
        var route = this.routes[idx];
        var self = this;

        // Dim all, highlight current
        Object.keys(self.routeLayers).forEach(function(id) {
            self.routeLayers[id].forEach(function(layer) {
                if (layer.setStyle) layer.setStyle({ opacity: id === route.id ? 0.9 : 0.08 });
            });
        });

        // Fly to route center
        var path = route.path;
        var bounds = L.latLngBounds(path);
        self.map.flyToBounds(bounds, { padding: [40, 40], animate: true, duration: 1.2 });

        // Update story panel
        var content = document.getElementById('mmap-story-content');
        if (content) {
            content.innerHTML =
                '<div style="font-size:0.7rem;color:'+route.color+';text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Step '+(idx+1)+' of '+this.routes.length+'</div>' +
                '<h4 style="color:'+route.color+';margin:0 0 6px;font-family:Cinzel,serif;font-size:0.95rem;">'+route.name+'</h4>' +
                '<p style="color:#c4bcd4;font-size:0.82rem;line-height:1.6;margin:0 0 8px;">'+route.summary+'</p>' +
                '<div style="color:#a89bc2;font-size:0.78rem;font-style:italic;">'+route.significance+'</div>';
        }

        // Update progress bar
        var progress = document.getElementById('mmap-story-progress');
        if (progress) progress.style.width = ((idx + 1) / this.routes.length * 100) + '%';

        // Update buttons
        var prevBtn = document.getElementById('mmap-story-prev');
        var nextBtn = document.getElementById('mmap-story-next');
        if (prevBtn) prevBtn.disabled = idx === 0;
        if (nextBtn) nextBtn.textContent = idx === this.routes.length - 1 ? '✓ Complete' : 'Next ▸';
    },

    nextStory: function() {
        if (!this.storyMode) return;
        if (this.storyMode.step >= this.routes.length - 1) { this.exitStory(); return; }
        this.showStoryStep(this.storyMode.step + 1);
    },

    prevStory: function() {
        if (!this.storyMode || this.storyMode.step <= 0) return;
        this.showStoryStep(this.storyMode.step - 1);
    },

    exitStory: function() {
        this.storyMode = null;
        var panel = document.getElementById('mmap-story-panel');
        if (panel) panel.style.display = 'none';
        this.resetHighlight();
    },

    // ========== UPDATE TIP BANNER ==========
    updateTipBanner: function(route) {
        var tips = {
            'choctaw': 'The Choctaw were the first of the Five Tribes to be removed, setting the precedent for all subsequent forced relocations.',
            'cherokee': 'Cherokee Freedmen\'s citizenship rights were affirmed in 2017 by the Cherokee Supreme Court after decades of legal battles.',
            'creek': 'Creek Freedmen received some of the earliest citizenship recognition after the 1866 Treaty with the United States.',
            'chickasaw': 'The Chickasaw Nation is the only one of the Five Tribes that has not yet fully recognized Freedmen citizenship rights.',
            'seminole': 'Black Seminoles served as interpreters, warriors, and leaders within the Seminole Nation — a uniquely integrated role.',
            'great-migration': 'Between 1910 and 1970, over 6 million Black Americans moved north. Many Freedmen descendants lost tribal connections during this period.',
            'exoduster': 'Nicodemus, Kansas — founded in 1877 — is one of the few surviving all-Black settlements from the Exoduster Movement.'
        };
        var tipBanner = document.querySelector('.edu-tip-banner .edu-tip-text');
        if (tipBanner && tips[route.id]) {
            tipBanner.innerHTML = '<span class="edu-tip-label">Did You Know?</span> ' + tips[route.id];
        }
    },

    // ========== FOCUSED ROUTE MODE ==========
    focusRoute: function(routeId) {
        var self = this;

        // Toggle: clicking same route again unfocuses
        if (self.activeRouteId === routeId) {
            self.unfocusRoute();
            return;
        }

        self.activeRouteId = routeId;
        var focusedRoute = self.routes.find(function(r) { return r.id === routeId; });

        // Dim all routes, highlight focused
        Object.keys(self.routeLayers).forEach(function(id) {
            self.routeLayers[id].forEach(function(layer) {
                if (layer.setStyle) {
                    if (id === routeId) {
                        layer.setStyle({ opacity: 1, weight: (layer.options.weight || 3) + 1.5 });
                    } else {
                        layer.setStyle({ opacity: 0.12 });
                    }
                }
            });
        });

        // Show focus label
        var label = document.getElementById('mmap-focus-label');
        if (label && focusedRoute) {
            var text = 'Showing Route: ' + focusedRoute.name;
            if (focusedRoute.isRealData) text += '  (Historical Record)';
            label.textContent = text;
            label.style.display = 'block';
            label.style.borderColor = focusedRoute.color;
            label.style.color = focusedRoute.color;
        }
    },

    unfocusRoute: function() {
        var self = this;
        self.activeRouteId = null;

        // Restore all routes to default opacity
        Object.keys(self.routeLayers).forEach(function(id) {
            if (!self.filters[id]) return;
            self.routeLayers[id].forEach(function(layer) {
                if (layer.setStyle) {
                    var origW = layer.options._origWeight || layer.options.weight;
                    layer.setStyle({ opacity: layer.options._origOpacity || 0.55 });
                }
            });
        });

        // Hide focus label
        var label = document.getElementById('mmap-focus-label');
        if (label) label.style.display = 'none';
    },

    // ========== STOP ==========
    stopAnimations: function() {
        this.animationFrames.forEach(function(item) {
            if (item && typeof item.cancel === 'function') item.cancel();
            else if (typeof item === 'number') cancelAnimationFrame(item);
        });
        this.animationFrames = [];
    }
};
