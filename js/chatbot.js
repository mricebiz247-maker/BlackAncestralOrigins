/* ============================================
   BLACK ANCESTRAL ORIGINS — AI Chatbot
   56 Topics, Intent Routing, Page-Aware Context
   ============================================ */

// Global app state — synced on every navigation
var appState = { currentPage: 'home' };

// Primary intent detector — keywords ALWAYS take priority over page context
function detectIntent(input) {
    var q = (input || '').toLowerCase();
    // Priority keywords checked first (most specific → least specific)
    var priorityMap = [
        { intent: 'freedmen', keywords: ['freedmen','freedman','freedwoman','freedpeople','freed people','freed men','freed women','black indigenous','five civilized tribes freedm'] },
        { intent: 'citizenship', keywords: ['citizenship','tribal id','tribal card','enroll','get enrolled','tribal member'] },
        { intent: 'dna', keywords: ['dna','haplogroup','genetic','ancestrydna','23andme','familytreedna','heritage test','indigenous marker','blood quantum'] },
        { intent: 'records', keywords: ['dawes','rolls','census','allotment','bureau','enrollment','card 2241','tribal census'] },
        { intent: 'tree', keywords: ['family tree','ancestor','lineage','pedigree','add ancestor','ancestor profile'] },
        { intent: 'migration', keywords: ['migration','routes','trail of tears','territory','indian territory'] },
        { intent: 'video', keywords: ['video','course','slides','slideshow','learning center'] },
        { intent: 'resources', keywords: ['resource','library','sources','links','books','websites','archives'] },
        { intent: 'community', keywords: ['community','connect','forum','post','discussion'] },
        { intent: 'chatbot', keywords: ['help','guide','assistant','how do i','tutorial','walkthrough'] }
    ];
    var best = 'unknown';
    var bestScore = 0;
    for (var i = 0; i < priorityMap.length; i++) {
        var entry = priorityMap[i];
        var score = 0;
        for (var j = 0; j < entry.keywords.length; j++) {
            if (q.indexOf(entry.keywords[j]) > -1) score += entry.keywords[j].length + 1;
        }
        if (score > bestScore) { bestScore = score; best = entry.intent; }
    }
    return best;
}

// Backward-compatible wrapper — parseIntent now delegates to detectIntent
function parseIntent(input) {
    return detectIntent(input);
}

// Page-aware context line
function getPageContext() {
    var pageLabels = {
        'home': 'the Home dashboard',
        'dna-heritage': 'the DNA & Heritage page',
        'dawes-rolls': 'the Dawes Rolls search',
        'freedmen-records': 'the Freedmen Records page',
        'family-tree': 'the Family Tree page',
        'migration-routes': 'the Migration Routes map',
        'resources': 'the Resource Library',
        'video-learning': 'the Video Learning Center',
        'community': 'the Community page',
        'oral-histories': 'the Oral Histories page',
        'settings': 'Settings'
    };
    var p = appState.currentPage || 'home';
    return pageLabels[p] || ('the ' + (BAO_App.pageNames[p] || 'app'));
}

// Intent-specific chip generators
function getIntentChips(intent, page) {
    var chips = {
        freedmen: ['Freedmen citizenship', 'Search Dawes Rolls', '1866 Treaties', 'Cherokee Freedmen rights'],
        citizenship: ['Cherokee enrollment', 'Choctaw Freedmen', 'Creek citizenship', 'Seminole Freedmen bands'],
        family_tree: ['Build family tree', 'Add ancestor', 'Robert Williams', 'View pedigree chart'],
        ancestors: ['Robert Williams', 'Clara Williams', 'Samuel Johnson', 'View ancestor profiles'],
        dna: ['Interpret haplogroups', 'Compare testing services', 'Indigenous DNA markers', 'Go to DNA page'],
        tree: ['View Family Tree', 'Robert Williams', 'Add an ancestor', 'Clara Williams'],
        records: ['Search Dawes Rolls', 'Freedmen Bureau records', 'Card 2241', 'Tribal census'],
        video: ['Start a course', 'Go to Video Learning', 'Dawes Rolls Guide', 'Trail of Tears'],
        resources: ['Open Resource Library', 'DNA resources', 'Books on Freedmen', 'Tribal websites'],
        migration: ['View Migration Map', 'Trail of Tears', 'Indian Territory', 'Oklahoma routes'],
        community: ['Go to Community', 'Post a discovery', 'Research tips'],
        chatbot: ['Quick Start Guide', 'Tour the app', 'My progress', 'Help me get started']
    };
    return chips[intent] || ['Search Dawes Rolls', 'DNA & Heritage', 'Family Tree'];
}

// Get verified sources from resource library matching intent + page
function getRelevantSources(intent, page) {
    var res = (typeof BAO_DATA !== 'undefined' && BAO_DATA.resources) ? BAO_DATA.resources : [];
    // Map intents to resource category/keyword filters
    var filters = {
        freedmen: function(r){ return (r.description && (/freedmen|freedman|freed people|five civilized|dawes.*freedm|bureau.*freed/i).test(r.title + ' ' + r.description)) || r.category === 'Government'; },
        citizenship: function(r){ return r.description && (/citizen|enroll|treaty|1866|membership/i).test(r.title + ' ' + r.description); },
        dna: function(r){ return r.category === 'DNA' || (r.description && r.description.toLowerCase().indexOf('dna') > -1); },
        records: function(r){ return r.category === 'Government' || r.type === 'Archive' || (r.description && (/dawes|freedmen|bureau|census|allotment/i).test(r.description)); },
        family_tree: function(r){ return r.category === 'Family Tree'; },
        ancestors: function(r){ return r.category === 'Family Tree' || (r.description && (/lineage|ancestor|genealog|pedigree|family tree/i).test(r.title + ' ' + r.description)); },
        tree: function(r){ return r.category === 'Family Tree' || (r.description && (/genealog|family|ancestor|tree/i).test(r.description)); },
        video: function(r){ return r.category === 'DNA' || r.type === 'Guide'; },
        resources: function(r){ return true; },
        migration: function(r){ return r.description && (/migration|territory|trail|removal|route/i).test(r.description); },
        community: function(r){ return r.category === 'Organization' || r.type === 'Organization'; }
    };
    var filterFn = filters[intent] || filters.resources;
    var matches = res.filter(function(r){ return filterFn(r) && r.verified !== false; });

    // Prefer page-relevant resources
    if (page) {
        var pageKeywords = {
            'dna-heritage': /dna|genetic|haplogroup|ancestry/i,
            'dawes-rolls': /dawes|enrollment|commission|roll/i,
            'freedmen-records': /freedmen|bureau|labor|marriage/i,
            'migration-routes': /migration|trail|territory|removal/i,
            'resources': /./
        };
        var pk = pageKeywords[page];
        if (pk) {
            var pageMatches = matches.filter(function(r){ return pk.test(r.title + ' ' + r.description); });
            if (pageMatches.length >= 2) matches = pageMatches;
        }
    }

    // Deduplicate by URL
    var seen = {};
    var unique = [];
    for (var i = 0; i < matches.length; i++) {
        if (!seen[matches[i].url]) {
            seen[matches[i].url] = true;
            unique.push(matches[i]);
        }
    }

    // Score and sort: prioritize verified + sourceType ranking
    unique.sort(function(a, b) {
        var sa = (a.verified ? 25 : 0) + (a.priority || 0) * 10;
        var sb = (b.verified ? 25 : 0) + (b.priority || 0) * 10;
        return sb - sa;
    });

    return unique.slice(0, 3);
}

// Format sources into HTML for bot message
var BAO_DISCLAIMER_TEXT = 'Portfolio demonstration. Some data simulated for educational purposes.';
function formatSourcesHTML(sources) {
    var disclaimer = '\n\n<span style="font-size:0.68rem;color:#666;font-style:italic;">' + BAO_DISCLAIMER_TEXT + '</span>';
    if (!sources || sources.length === 0) {
        return '\n\n---\n&#128279; **Verified Sources**\nNo direct sources found. Explore the <span style="color:#FFB830;cursor:pointer;text-decoration:underline" onclick="BAO_App.navigate(\'resources\')">Resource Library</span> for verified records.' + disclaimer;
    }
    var html = '\n\n---\n&#128279; **Verified Sources**';
    for (var i = 0; i < sources.length; i++) {
        var s = sources[i];
        html += '\n• <a href="' + s.url + '" target="_blank" rel="noopener" style="color:#FFB830;text-decoration:underline;">' + s.title + '</a>' + (s.verified !== false ? ' &#10003;' : '');
    }
    return html + disclaimer;
}

const BAO_Chatbot = {

    isOpen: false,
    messages: [],
    typingSpeed: 40,
    adminTapCount: 0,
    adminTapTimer: null,
    adminPassword: 'Edward1978@$',
    userName: null,
    awaitingName: false,

    // ============== RESEARCH PROGRESS TRACKER ==============
    researchSteps: [
        { id: 'learn_freedmen', label: 'Learn About Freedmen Heritage', description: 'Understand who the Freedmen were and their connection to the Five Civilized Tribes', icon: '&#128214;', triggers: ['what is freedmen', 'freedmen meaning', 'who are freedmen', 'freedmen definition', 'freedmen history', 'tell me about freedmen', 'what are freedmen'] },
        { id: 'search_dawes', label: 'Search the Dawes Rolls', description: 'Search enrollment records to find your ancestors on the Dawes Rolls', icon: '&#128220;', triggers: ['search dawes', 'dawes rolls', 'dawes-rolls', 'go to dawes', 'open dawes'] },
        { id: 'find_ancestor', label: 'Identify a Family Ancestor', description: 'Find and learn about at least one ancestor in your family tree', icon: '&#128100;', triggers: ['robert williams', 'samuel johnson', 'mary johnson', 'clara williams', 'james williams', 'dorothy williams', 'my ancestors', 'family tree', 'ancestor profiles', 'card 2241'] },
        { id: 'explore_records', label: 'Explore Freedmen Bureau Records', description: 'Review Freedmen Bureau documents including labor contracts and marriage records', icon: '&#128240;', triggers: ['freedmen records', 'freedmen-records', 'bureau records', 'go to freedmen', 'search freedmen'] },
        { id: 'tribal_census', label: 'Review Tribal Census Records', description: 'Examine tribal census records from the Five Civilized Tribes', icon: '&#128214;', triggers: ['tribal census', 'slave schedules', 'slave-schedules', 'census records'] },
        { id: 'learn_dna', label: 'Study DNA & Heritage Testing', description: 'Learn how DNA testing can support your Freedmen genealogy research', icon: '&#129516;', triggers: ['dna heritage', 'dna-heritage', 'dna test', 'go to dna', 'haplogroup', '23andme', 'ancestrydna', 'familytreedna'] },
        { id: 'migration_routes', label: 'Explore Migration Routes', description: 'Study the historical migration paths of Freedmen ancestors', icon: '&#128506;', triggers: ['migration routes', 'migration-routes', 'trail of tears', 'go to migration', 'show map', 'migration', 'routes', 'freedmen migration', 'migration map', 'route map'] },
        { id: 'timeline', label: 'Review Historical Timeline', description: 'Study key historical events affecting Black Indigenous Freedmen', icon: '&#9200;', triggers: ['historical timeline', 'historical-timeline', 'go to timeline', 'show timeline', 'history timeline'] },
        { id: 'save_document', label: 'Save a Document to the Vault', description: 'Upload or save a research document to your Document Vault', icon: '&#128451;', triggers: ['document vault', 'document-vault', 'upload document', 'save document', 'go to document'] },
        { id: 'learn_citizenship', label: 'Learn About Tribal Citizenship', description: 'Understand the tribal citizenship process for Freedmen descendants', icon: '&#129703;', triggers: ['tribal id', 'citizenship', 'enroll', 'tribal card', 'get enrolled', 'cherokee citizen', 'choctaw citizen', 'creek citizen', 'chickasaw citizen', 'seminole citizen'] },
        { id: 'land_allotments', label: 'Research Land Allotments', description: 'Explore land allotment records from Indian Territory', icon: '&#127757;', triggers: ['land allotment', 'land-allotments', 'go to land', 'territory parcels'] },
        { id: 'name_origins', label: 'Research Surname Origins', description: 'Discover the history and origins behind your family surnames', icon: '&#128221;', triggers: ['name origin', 'name-origins', 'surname', 'go to name'] },
        { id: 'oral_history', label: 'Record an Oral History', description: 'Preserve family stories by recording an oral history', icon: '&#127908;', triggers: ['oral histor', 'oral-histories', 'record story', 'go to oral'] },
        { id: 'community', label: 'Connect with the Community', description: 'Engage with other Freedmen descendants in the community forum', icon: '&#128101;', triggers: ['community', 'connect with others', 'go to community'] },
        { id: 'resources', label: 'Explore the Resource Library', description: 'Review curated research resources for Black Indigenous Freedmen genealogy', icon: '&#128279;', triggers: ['resource library', 'resources', 'go to resources', 'research resources'] },
    ],
    completedSteps: [],

    // ============== FAMILY DATA ==============
    family: {
        robert: { name: 'Robert Williams', tribe: 'Choctaw', status: 'Freedman', card: '2241', rollType: 'Choctaw Freedman', enrollDate: 'c. 1902', postOffice: 'Atoka, I.T.', district: 'Atoka County', birth: 'c. 1858', death: 'c. 1930', occupation: 'Farmer', notes: 'Enrolled as Choctaw Freedman on Dawes Roll Card #2241. Received land allotment in Choctaw Nation. Head of household.' },
        samuel: { name: 'Samuel Johnson', relation: 'Likely paternal connection', tribe: 'Choctaw Freedman', birth: 'c. 1835', death: 'c. 1905', occupation: 'Laborer/Farmer', notes: 'Formerly enslaved in Choctaw Nation. Listed on earlier tribal census rolls. May appear on 1885 Choctaw Census as freedman in Atoka County. Cross-reference with Freedmen Bureau labor contracts.' },
        mary: { name: 'Mary Johnson', relation: 'Wife of Samuel Johnson', tribe: 'Choctaw Freedman', birth: 'c. 1840', death: 'c. 1912', occupation: 'Domestic work/Farming', notes: 'Choctaw Freedwoman. Possibly enrolled on Dawes Rolls under married name. Check Choctaw Freedman cards for Johnson surname. May have children listed on same enrollment card.' },
        clara: { name: 'Clara Williams', relation: 'Wife of Robert Williams', tribe: 'Choctaw Freedman', birth: 'c. 1862', death: 'c. 1935', occupation: 'Homemaker/Farmer', notes: 'Likely enrolled on same Dawes Card #2241 as spouse of Robert Williams. Choctaw Freedwoman. Check for maiden name on earlier census records to trace her parents.' },
        james: { name: 'James Williams', relation: 'Son of Robert & Clara Williams', tribe: 'Choctaw Freedman', birth: 'c. 1885', death: 'c. 1955', occupation: 'Farmer/Laborer', notes: 'Likely listed as minor child on Dawes Card #2241. Would have received land allotment as minor Freedman. Check Choctaw land allotment records for his individual parcel.' },
        dorothy: { name: 'Dorothy Williams', relation: 'Daughter of Robert & Clara Williams', tribe: 'Choctaw Freedman', birth: 'c. 1890', death: 'c. 1970', occupation: 'Teacher/Community leader', notes: 'Likely enrolled as minor on Dawes Card #2241. Born in Indian Territory before Oklahoma statehood. May appear in Oklahoma school records and church registers after 1907.' },
    },

    // ============== 35 TOPICS ==============
    topics: [
        // DAWES ROLLS (1-5)
        { id: 1, keywords: ['dawes roll', 'dawes rolls', 'what are dawes', 'dawes commission', 'enrollment roll'], title: 'Dawes Rolls Overview',
          response: 'The Dawes Rolls (1898-1914) are the official enrollment records of the Five Civilized Tribes created by the Dawes Commission. They documented over 100,000 individuals including Freedmen — formerly enslaved people of Native nations. Freedmen were placed on separate "Freedman" rolls distinct from "by blood" rolls. These records include names, ages, sex, blood quantum designation, tribal affiliation, and post office addresses. They are the single most important starting point for Freedmen genealogy research.',
          chips: ['Search Dawes Rolls', 'Freedmen on Dawes Rolls', 'Robert Williams Card 2241'] },

        { id: 2, keywords: ['how to search', 'find ancestor', 'search dawes', 'look up', 'find on rolls'], title: 'How to Search Dawes Rolls',
          response: 'To search the Dawes Rolls: 1) Start with the surname — try multiple spellings as names were often recorded phonetically. 2) Filter by tribe (Cherokee, Creek, Choctaw, Chickasaw, or Seminole). 3) Note the card number — family members were often grouped on the same card. 4) Cross-reference with the enrollment jacket files at the National Archives in Fort Worth, TX for additional details. 5) Check the "Applications" section for rejected applicants who may still be your ancestors. You can search our built-in database on the Dawes Rolls page.',
          chips: ['Go to Dawes Rolls', 'Card numbers explained', 'Robert Williams lookup'] },

        { id: 3, keywords: ['card number', 'enrollment card', 'dawes card', 'card 2241', 'what is card number'], title: 'Dawes Card Numbers',
          response: 'Each Dawes enrollment card contains a family group. Card #2241 in the Choctaw Freedman rolls, for example, lists Robert Williams and his family members. The card number is your key to finding the full enrollment jacket at the National Archives, which contains testimony, supporting documents, and sometimes family history details not on the card itself. Cards are organized by tribe and roll type (Freedman, By Blood, Minor, New Born). Freedman cards use the prefix "F" in some cataloging systems.',
          chips: ['Robert Williams Card 2241', 'National Archives records', 'What is an enrollment jacket'] },

        { id: 4, keywords: ['enrollment jacket', 'jacket file', 'application file'], title: 'Enrollment Jacket Files',
          response: 'Enrollment jackets are the detailed application files behind each Dawes card. They contain: sworn testimony from applicants, witness statements, references to earlier tribal rolls, family relationships, and sometimes physical descriptions. For Freedmen, jackets may include testimony about enslavement, the name of the former slaveholder, and relationships between family members. The jackets for Card #2241 would contain Robert Williams\' testimony about his life in the Choctaw Nation. These files are held at the National Archives in Fort Worth, TX (Record Group 75).',
          chips: ['How to access National Archives', 'Robert Williams testimony', 'Choctaw Freedmen records'] },

        { id: 5, keywords: ['rejected', 'denied', 'doubtful', 'not approved'], title: 'Rejected Dawes Applications',
          response: 'Not everyone who applied was accepted. Many legitimate Freedmen were denied enrollment due to: missing documentation, arriving late to enrollment sessions, disputes over tribal affiliation, or bureaucratic errors. The "Rejected" and "Doubtful" rolls contain thousands of names. If you can\'t find an ancestor on the approved rolls, check the rejected applications — they still contain valuable genealogical information including names, ages, family connections, and testimony.',
          chips: ['Search all rolls', 'Appeal process', 'Alternative records'] },

        // TRIBAL CITIZENSHIP (6-10)
        { id: 6, keywords: ['cherokee citizen', 'cherokee freedm', 'cherokee nation', 'cherokee membership', 'cherokee rights'], title: 'Cherokee Freedmen Citizenship',
          response: 'Cherokee Freedmen citizenship has been one of the most contested issues. The 1866 Treaty guaranteed Freedmen "all the rights of native Cherokees." In 2007, Cherokee Nation voted to remove Freedmen. After years of legal battles, the 2017 federal court ruling in Cherokee Nation v. Nash confirmed that Freedmen descendants have the right to Cherokee citizenship based on the 1866 treaty — no blood quantum required. Today, Cherokee Freedmen descendants can enroll by proving descent from someone on the Dawes Freedman rolls.',
          chips: ['How to enroll Cherokee', '1866 Treaty details', 'Nash decision'] },

        { id: 7, keywords: ['creek citizen', 'creek freedm', 'muscogee', 'creek nation', 'creek membership'], title: 'Creek (Muscogee) Freedmen Citizenship',
          response: 'The Muscogee (Creek) Nation has had a complex relationship with Freedmen descendants. Creek Freedmen were enrolled on the Dawes Rolls (~6,800 individuals). The Creek Treaty of 1866 also promised full citizenship rights. Creek Freedmen have faced periods of exclusion and inclusion. Currently, Creek Freedmen descendants can apply for citizenship through the Muscogee Nation, though the process requires documented descent from a Dawes enrollee. The Creek Nation enrolled the largest number of Freedmen of any tribe.',
          chips: ['Creek Freedmen records', 'Creek Treaty of 1866', 'How to apply Creek'] },

        { id: 8, keywords: ['choctaw citizen', 'choctaw freedm', 'choctaw nation', 'choctaw membership', 'choctaw rights'], title: 'Choctaw Freedmen Citizenship',
          response: 'Choctaw Freedmen face significant challenges. While the 1866 Choctaw Treaty required adoption of Freedmen, the Choctaw Nation has not consistently honored this. Approximately 5,000 Choctaw Freedmen were enrolled on the Dawes Rolls, including Robert Williams on Card #2241. Unlike Cherokee Freedmen who won their case in 2017, Choctaw Freedmen descendants are still fighting for full citizenship rights. The Choctaw Nation currently requires proof of Choctaw blood for membership, which excludes most Freedmen descendants.',
          chips: ['Choctaw Freedmen fight', 'Robert Williams Choctaw', 'Choctaw Treaty 1866'] },

        { id: 9, keywords: ['chickasaw citizen', 'chickasaw freedm', 'chickasaw nation', 'chickasaw membership'], title: 'Chickasaw Freedmen Citizenship',
          response: 'Chickasaw Freedmen have perhaps the most difficult path to citizenship. The Chickasaw Nation was the most resistant to adopting Freedmen after the Civil War. The 1866 Treaty gave Chickasaw Freedmen a two-year window for adoption, but the Chickasaw Nation never formally adopted them. Approximately 4,600 Chickasaw Freedmen were enrolled on the Dawes Rolls but received smaller land allotments (80 acres vs. 320 acres for Chickasaw by blood). Today, the Chickasaw Nation requires blood quantum for membership, effectively excluding all Freedmen descendants.',
          chips: ['Chickasaw land allotments', 'Chickasaw Treaty issues', 'Blood quantum explained'] },

        { id: 10, keywords: ['seminole citizen', 'seminole freedm', 'seminole nation', 'black seminole', 'seminole membership'], title: 'Seminole Freedmen Citizenship',
          response: 'Seminole Freedmen (Black Seminoles) have a unique history. Black Seminoles were often allies rather than enslaved people, fighting alongside Seminoles in the Seminole Wars. About 900 Seminole Freedmen were enrolled on the Dawes Rolls. The Seminole Nation recognized two Freedmen bands (Caesar Bruner Band and Dosar Barkus Band). In 2000, the Seminole Nation voted to exclude Freedmen, but federal intervention and legal challenges have kept the issue unresolved. Seminole Freedmen have stronger historical claims to membership than in some other tribes.',
          chips: ['Black Seminole history', 'Seminole Wars', 'Seminole Freedmen bands'] },

        // FAMILY ANCESTORS (11-16)
        { id: 11, keywords: ['robert williams', 'card 2241', 'robert', 'my ancestor robert'], title: 'Robert Williams — Choctaw Freedman',
          response: `Robert Williams is documented as a Choctaw Freedman on Dawes Roll Card #2241. Here is what we know:\n\n• Name: Robert Williams\n• Tribe: Choctaw Nation (Freedman)\n• Dawes Card: #2241\n• Born: c. 1858 (estimated)\n• Post Office: Atoka, Indian Territory\n• District: Atoka County, Choctaw Nation\n• Occupation: Farmer\n• Status: Approved enrollee\n\nRobert was likely born into slavery in the Choctaw Nation before the Civil War. After emancipation through the 1866 Treaty, he lived as a free man in the Choctaw Nation. His enrollment card would list his wife Clara and children James and Dorothy as family members. To learn more, request his enrollment jacket from the National Archives.`,
          chips: ['Clara Williams', 'James Williams', 'Dorothy Williams', 'Get enrollment jacket'] },

        { id: 12, keywords: ['samuel johnson', 'samuel', 'ancestor samuel'], title: 'Samuel Johnson — Family Connection',
          response: `Samuel Johnson is a key ancestral figure in your family history:\n\n• Name: Samuel Johnson\n• Connection: Likely paternal line connection to the Williams family\n• Tribe: Choctaw Freedman\n• Born: c. 1835\n• Died: c. 1905\n• Occupation: Laborer and Farmer\n\nSamuel was likely born enslaved in the Choctaw Nation or brought there during the Trail of Tears removal from Mississippi. He may appear on the 1885 Choctaw Census and Freedmen Bureau labor contracts from the 1860s-1870s. To trace his connection to Robert Williams, cross-reference the Choctaw census rolls and Freedmen Bureau records for the Atoka area. Look for the Johnson surname on earlier tribal records.`,
          chips: ['Mary Johnson', 'Choctaw census records', 'Freedmen Bureau records'] },

        { id: 13, keywords: ['mary johnson', 'mary', 'ancestor mary', 'samuel wife'], title: 'Mary Johnson — Choctaw Freedwoman',
          response: `Mary Johnson was a Choctaw Freedwoman and wife of Samuel Johnson:\n\n• Name: Mary Johnson\n• Relation: Wife of Samuel Johnson\n• Tribe: Choctaw Freedman\n• Born: c. 1840\n• Died: c. 1912\n• Occupation: Domestic work and farming\n\nMary was likely enslaved in the Choctaw Nation alongside Samuel. After emancipation, they established a family in the Atoka County area. She may be enrolled on the Dawes Rolls under her married name (Johnson) or possibly under a maiden name. Check for her on Choctaw Freedman cards — she may appear as head of household if Samuel predeceased the enrollment period. Her children would provide the link to the Williams family line.`,
          chips: ['Samuel Johnson', 'Clara Williams', 'Search Choctaw Freedmen'] },

        { id: 14, keywords: ['clara williams', 'clara', 'robert wife', 'ancestor clara'], title: 'Clara Williams — Wife of Robert',
          response: `Clara Williams was the wife of Robert Williams and a Choctaw Freedwoman:\n\n• Name: Clara Williams\n• Relation: Wife of Robert Williams\n• Tribe: Choctaw Freedman\n• Born: c. 1862\n• Died: c. 1935\n• Occupation: Homemaker and farmer\n\nClara is likely listed on Dawes Card #2241 as Robert's spouse. As a Choctaw Freedwoman, she would have been entitled to her own land allotment. To trace Clara's maiden name and parents, look for: 1) Her testimony in the enrollment jacket for Card #2241, 2) Marriage records in the Choctaw Nation, 3) Earlier census records under her maiden name, 4) Freedmen Bureau marriage registrations from the 1860s-1870s.`,
          chips: ['Robert Williams', 'James Williams', 'Dorothy Williams', 'Marriage records'] },

        { id: 15, keywords: ['james williams', 'james', 'son of robert', 'ancestor james'], title: 'James Williams — Son',
          response: `James Williams was the son of Robert and Clara Williams:\n\n• Name: James Williams\n• Relation: Son of Robert & Clara Williams\n• Tribe: Choctaw Freedman\n• Born: c. 1885\n• Died: c. 1955\n• Occupation: Farmer and laborer\n\nJames was likely listed as a minor child on Dawes Card #2241. As a minor Freedman enrollee, he would have received his own land allotment in the Choctaw Nation. He was born in Indian Territory before Oklahoma statehood (1907) and lived through the Jim Crow era. To trace James further: check Oklahoma county records, WWI draft registration cards (1917-1918), marriage records, and census records from 1910-1940.`,
          chips: ['Dorothy Williams', 'Land allotment records', 'Oklahoma census records'] },

        { id: 16, keywords: ['dorothy williams', 'dorothy', 'daughter of robert', 'ancestor dorothy'], title: 'Dorothy Williams — Daughter',
          response: `Dorothy Williams was the daughter of Robert and Clara Williams:\n\n• Name: Dorothy Williams\n• Relation: Daughter of Robert & Clara Williams\n• Tribe: Choctaw Freedman\n• Born: c. 1890\n• Died: c. 1970\n• Occupation: Teacher and community leader\n\nDorothy was likely enrolled as a minor on Dawes Card #2241. Born just before Oklahoma statehood, she lived through profound changes — from Indian Territory to Jim Crow Oklahoma. As a teacher, she may appear in Oklahoma school records and teaching certificates. To research Dorothy: check 1910-1940 census records, Oklahoma school records, marriage records (may have married and changed surname), church records, and local newspaper archives.`,
          chips: ['Robert Williams', 'Clara Williams', 'Oklahoma records search'] },

        // DNA & HERITAGE (17-20)
        { id: 17, keywords: ['dna test', 'dna testing', 'genetic', 'ancestry dna', '23andme', 'heritage dna'], title: 'DNA Testing for Freedmen',
          response: 'DNA testing is a powerful supplement to paper records for Freedmen descendants. Three main types: 1) Autosomal DNA (AncestryDNA, 23andMe) — shows ethnicity estimates and finds genetic relatives across all lines. Good for finding cousins who share ancestors. 2) Y-DNA (FamilyTreeDNA) — traces direct paternal line. Can reveal Indigenous ethnic origins on father\'s father\'s line. 3) mtDNA — traces direct maternal line. Can identify specific ancestral ethnic group. For Freedmen, DNA can reveal Indigenous DNA markers AND ancestral heritage that may not appear in paper records.',
          chips: ['Indigenous DNA markers', 'DNA and tribal citizenship', 'Indigenous DNA results'] },

        { id: 18, keywords: ['indigenous ancestry', 'indigenous origin', 'native lineage', 'tribal dna', 'indigenous heritage'], title: 'Tracing Indigenous Heritage',
          response: 'Tracing Indigenous heritage through DNA is an important tool for Freedmen descendants of the Five Civilized Tribes. Y-DNA and mtDNA testing can reveal direct paternal and maternal lineages that connect to Indigenous peoples. Many Freedmen families lived within tribal nations for generations, and intermarriage between Black and Native communities was common. DNA results may show Indigenous American markers reflecting this shared history. Autosomal DNA tests can also identify genetic relatives who are enrolled tribal members, potentially confirming family oral traditions. For Freedmen descendants, combining DNA evidence with Dawes Roll documentation and tribal census records provides the strongest path to understanding your full Indigenous heritage within the Five Civilized Tribes.',
          chips: ['DNA testing overview', 'Indigenous heritage connections', 'Freedmen history'] },

        { id: 19, keywords: ['indigenous dna', 'native dna', 'indian dna', 'native american dna', 'tribal dna'], title: 'Indigenous DNA & Freedmen',
          response: 'Important: DNA testing CANNOT prove or disprove tribal citizenship for Freedmen. The 1866 treaties granted citizenship based on social and legal status, not genetics. However, some Freedmen descendants do show Indigenous American DNA (typically 5-20%) reflecting generations of intermarriage between Black and Native communities in Indian Territory. If your DNA shows Indigenous American ancestry, it supports (but doesn\'t prove) family oral traditions of mixed heritage. Tribes that require blood quantum use Dawes Roll documentation, not DNA, for enrollment. Cherokee Freedmen citizenship requires no blood quantum at all — only documented descent from a Dawes enrollee.',
          chips: ['Blood quantum explained', 'Cherokee citizenship', 'DNA limitations'] },

        { id: 20, keywords: ['blood quantum', 'blood degree', 'indian blood'], title: 'Blood Quantum Explained',
          response: 'Blood quantum is a measurement of Native American ancestry used by some tribes for membership. It was introduced by the U.S. government through the Dawes Rolls. For Freedmen, this is crucial: Freedmen were listed with "0/0" blood quantum on the Dawes Rolls regardless of any actual Native ancestry they may have had. This classification was based on their status as formerly enslaved persons, not their genetics. Today, tribes that require blood quantum for membership (like Choctaw and Chickasaw) effectively exclude Freedmen descendants. Cherokee Nation\'s 2017 ruling bypassed this by affirming treaty-based citizenship. The blood quantum system is widely criticized as a colonial tool designed to eventually eliminate tribal membership.',
          chips: ['Cherokee no blood quantum', 'Choctaw citizenship', 'Treaty rights'] },

        // FREEDMEN BUREAU (21-23)
        { id: 21, keywords: ['freedmen bureau', 'freedman bureau', 'bureau of refugees', 'bureau records'], title: 'Freedmen Bureau Records',
          response: 'The Bureau of Refugees, Freedmen, and Abandoned Lands (1865-1872) created extensive records for formerly enslaved people, including those in Indian Territory. Key record types: 1) Labor Contracts — agreements between freedpeople and employers, often listing family members. 2) Marriage Records — registrations of marriages that occurred during slavery. 3) Ration Lists — names of people receiving government assistance. 4) Hospital Records — medical treatment records. 5) School Records — early education records. 6) Complaints/Court Cases — disputes and legal matters. For Choctaw Freedmen like the Williams family, check the Freedmen Bureau records for the Choctaw Agency at Fort Smith, Arkansas.',
          chips: ['Where to find Bureau records', 'Labor contracts', 'Marriage records'] },

        { id: 22, keywords: ['labor contract', 'work contract', 'freedmen contract'], title: 'Freedmen Labor Contracts',
          response: 'After emancipation, the Freedmen Bureau required labor contracts between formerly enslaved people and their employers (often former enslavers). These contracts are genealogical gold — they list: the freedperson\'s name, sometimes their age, the employer\'s name (often the former slaveholder), terms of work, wages, and sometimes family members included in the contract. For Choctaw Freedmen, these contracts were filed with the Choctaw Agency. Samuel Johnson may appear on labor contracts from the late 1860s in the Atoka area. Check FamilySearch.org for digitized Freedmen Bureau records.',
          chips: ['Samuel Johnson records', 'FamilySearch resources', 'Choctaw Agency records'] },

        { id: 23, keywords: ['freedmen marriage', 'slave marriage', 'marriage record', 'marriage register'], title: 'Freedmen Marriage Records',
          response: 'During slavery, marriages were not legally recognized. After emancipation, the Freedmen Bureau registered existing marriages and new ones. These records typically list: both spouses\' names, their ages, the plantation or slaveholder they came from, how long they had been together, and names of their children. For the Johnson and Williams families, marriage records could establish the link between Samuel & Mary Johnson and Robert & Clara Williams. Check: 1) Freedmen Bureau marriage registers for Choctaw Nation, 2) County marriage records after 1907 Oklahoma statehood, 3) Church marriage records from Black churches in the Atoka area.',
          chips: ['Church records', 'Oklahoma county records', 'Family connections'] },

        // BLACK INDIGENOUS HISTORY (24-30)
        { id: 24, keywords: ['black indigenous', 'black native', 'black indian', 'afro indigenous', 'afro native'], title: 'Black Indigenous History',
          response: 'Black Indigenous people have a rich and complex history within the Five Civilized Tribes spanning centuries. The history includes: enslaved people held by Native nations, Black Seminole warriors, Freedmen who became tribal citizens, and mixed-heritage families that bridge both cultures. This history has been systematically erased from mainstream narratives. Black Indigenous identity is not about choosing one identity over another — it\'s about honoring the full complexity of ancestry that includes both Freedmen and Indigenous roots.',
          chips: ['Black Seminoles', 'Trail of Tears', 'Enslavement in Indian Territory'] },

        { id: 25, keywords: ['trail of tears', 'indian removal', 'removal act', 'forced removal'], title: 'Trail of Tears & Enslaved People',
          response: 'The Trail of Tears (1830s-1850s) was the forced removal of the Five Civilized Tribes from the southeastern U.S. to Indian Territory (Oklahoma). What is often overlooked: enslaved Black Indigenous people were forced to make this journey too. They carried goods, cared for children, drove livestock, and endured the same deadly conditions. An estimated 4,000 Cherokee alone died on the march. The number of enslaved Black Indigenous people who perished is unknown — their deaths were rarely documented. After arriving in Indian Territory, enslaved people built the homes, cleared the land, and established the farms that allowed the tribes to rebuild. Robert Williams\' parents or grandparents may have walked the Trail of Tears with their Choctaw enslavers.',
          chips: ['Choctaw removal', 'Enslavement in territory', 'Life after removal'] },

        { id: 26, keywords: ['slavery indian territory', 'native slavery', 'tribal slavery', 'enslaved native'], title: 'Enslavement in Indian Territory',
          response: 'By 1860, the Five Civilized Tribes held approximately 8,000 enslaved people within the tribal nations in Indian Territory. Enslavement among Native nations mirrored the plantation system of the American South — particularly among Cherokee, Choctaw, and Chickasaw elite families. Key facts: Cherokee Nation held the most enslaved people (~2,500). Choctaw and Chickasaw combined held ~5,000. Creek Nation held ~1,500. Seminole Nation had ~500, but with more autonomy. Tribal legislatures enacted codes governing enslavement. The Choctaw code of 1838 was among the harshest. During the Civil War, some tribes allied with the Confederacy specifically to preserve the institution of enslavement. After the war, the 1866 Treaties required all five tribes to free their enslaved people and grant Freedmen full tribal citizenship.',
          chips: ['1866 Treaties', 'Civil War in territory', 'Emancipation'] },

        { id: 27, keywords: ['1866 treaty', 'reconstruction treaty', 'treaty rights', 'treaty of 1866'], title: 'The 1866 Treaties',
          response: 'The 1866 Reconstruction Treaties are the legal foundation for Freedmen rights. After the Civil War, each of the Five Civilized Tribes signed separate treaties with the U.S. government. Key provisions: All enslaved people freed immediately. Freedmen granted citizenship in their respective tribes. Freedmen entitled to land and other rights equal to native-born citizens. The treaties vary by tribe — Cherokee and Creek treaties are considered strongest for Freedmen rights. Choctaw and Chickasaw treaties gave a 2-year adoption window that was poorly implemented. These treaties have never been repealed and remain legally binding today. The 2017 Cherokee Freedmen ruling was based entirely on the 1866 Treaty.',
          chips: ['Cherokee treaty', 'Choctaw treaty', 'Current legal status'] },

        { id: 28, keywords: ['all black town', 'black town', 'boley', 'black community', 'freedmen town'], title: 'All-Black Towns of Oklahoma',
          response: 'Oklahoma had more all-Black towns than any other state — over 50 were established between 1865 and 1920. Many were founded by Freedmen descendants who used their land allotments to create self-governing communities. Notable towns: Boley (founded 1903, largest all-Black town), Langston (home of Langston University), Taft, Rentiesville, Red Bird, Lima, and Clearview. These towns had their own schools, churches, businesses, newspapers, and local government. Many declined after the Tulsa Race Massacre of 1921 and the Great Depression. Today about 13 all-Black towns survive. They represent one of the most remarkable chapters of Freedmen self-determination.',
          chips: ['Boley history', 'Tulsa Race Massacre', 'Freedmen land allotments'] },

        { id: 29, keywords: ['tulsa', 'greenwood', 'black wall street', 'tulsa massacre', 'race massacre'], title: 'Tulsa Race Massacre & Freedmen',
          response: 'The 1921 Tulsa Race Massacre destroyed the Greenwood District ("Black Wall Street") — one of the wealthiest Black communities in America. The connection to Freedmen: many Greenwood residents were descendants of Freedmen who had built wealth from Indian Territory land allotments. When oil was discovered on allotment lands, some Freedmen families became wealthy. This prosperity, combined with the self-determination learned from all-Black towns, fueled Greenwood\'s success. The massacre killed an estimated 100-300 people, destroyed 1,256 homes, and left 10,000 Black residents homeless. It was a direct attack on Black prosperity that had roots in Freedmen heritage.',
          chips: ['Freedmen land wealth', 'Oklahoma history', 'Black Wall Street'] },

        { id: 30, keywords: ['black seminole', 'seminole war', 'maroon', 'seminole warrior'], title: 'Black Seminoles',
          response: 'Black Seminoles are among the most remarkable groups in American history. They were enslaved Black Indigenous people and free Blacks who escaped to Florida and allied with the Seminole Nation beginning in the 1600s. Unlike in other tribes, Black Seminoles lived in their own communities, bore arms, and served as interpreters and military leaders. They fought fiercely in the Seminole Wars (1817-1858) — the most expensive Indian wars the U.S. ever fought. Key figures: John Horse (Juan Caballo), Abraham, and John Caesar. After removal to Indian Territory, Black Seminoles maintained their distinct identity. Some crossed into Mexico to escape re-enslavement, forming communities that exist to this day. About 900 Seminole Freedmen were enrolled on the Dawes Rolls.',
          chips: ['Seminole Wars', 'John Horse', 'Seminole citizenship'] },

        // RESEARCH METHODS (31-35)
        { id: 31, keywords: ['how to start', 'begin research', 'getting started', 'where to start', 'new to research', 'beginner'], title: 'Getting Started with Research',
          response: 'Welcome! Here\'s your step-by-step guide to starting Freedmen genealogy research:\n\n1. GATHER WHAT YOU KNOW — Write down every name, date, place, and story from your family.\n2. TALK TO ELDERS — Record conversations with older relatives. Ask about Oklahoma connections, tribal affiliations, and family surnames.\n3. SEARCH DAWES ROLLS — Start with our built-in search. Look for your surname in the Freedmen rolls.\n4. CHECK THE ENROLLMENT CARDS — Note the card number and request the jacket file from the National Archives.\n5. CROSS-REFERENCE — Check Tribal Census Records, Freedmen Bureau records, tribal census rolls, and county records.\n6. BUILD YOUR TREE — Use our Family Tree builder to organize your findings.\n\nEvery small discovery matters. Start today!',
          chips: ['Search Dawes Rolls', 'Talk to elders tips', 'National Archives guide'] },

        { id: 32, keywords: ['national archives', 'nara', 'fort worth', 'federal records'], title: 'National Archives Resources',
          response: 'The National Archives (NARA) in Fort Worth, TX holds the most important Freedmen records. Key collections: 1) Dawes Enrollment Cards & Jackets (Record Group 75) — the core records. 2) Freedmen Bureau Records (Record Group 105) — labor contracts, marriages, rations. 3) Indian Territory court records. 4) Land allotment files. 5) Correspondence of the Dawes Commission. You can visit in person (7th & Pennsylvania Ave NW, DC or 1400 John Burgess Dr, Fort Worth) or request records by mail/email. Many records are also being digitized on FamilySearch.org and Fold3.com. Start by requesting the enrollment jacket for your ancestor\'s card number.',
          chips: ['Request enrollment jacket', 'FamilySearch.org', 'Online records'] },

        { id: 33, keywords: ['census record', 'census', 'federal census', '1880 census', '1900 census'], title: 'Census Records for Freedmen',
          response: 'Census records are essential for tracking Freedmen families across decades. Key censuses: 1) 1880 Cherokee Census — first tribal census listing Freedmen by name. 2) 1885 Choctaw Census — lists Freedmen in Choctaw Nation. 3) 1890 Wallace Roll — Cherokee citizens including Freedmen. 4) 1896 Kern-Clifton Roll — Cherokee Freedmen. 5) 1900 Federal Census — Indian Territory enumerated separately. 6) 1910-1940 Federal Census — Oklahoma state census records. For the Williams family, the 1900 and 1910 censuses should show Robert, Clara, James, and Dorothy in the Atoka area. These records provide ages, birthplaces, occupations, and household members.',
          chips: ['Search census records', 'Williams family census', '1900 Indian Territory'] },

        { id: 34, keywords: ['land allotment', 'land record', 'allotment', 'property', 'land patent'], title: 'Land Allotment Research',
          response: 'Land allotments are crucial records for Freedmen research. After the Dawes Act, tribal lands were divided into individual parcels. Freedmen allotment records include: Legal land descriptions (section, township, range), acreage (Freedmen typically received 40-160 acres depending on tribe), date of patent, and restrictions on selling. Robert Williams on Card #2241 would have received a land allotment in the Choctaw Nation. To find allotment records: 1) Check the Bureau of Land Management General Land Office records (glorecords.blm.gov). 2) Search Oklahoma county land records. 3) Request allotment files from the National Archives. WARNING: Many Freedmen lost their land through "grafting" — fraudulent schemes by speculators and corrupt court-appointed guardians.',
          chips: ['Search land records', 'Grafting fraud', 'BLM land records'] },

        { id: 35, keywords: ['oral history', 'family story', 'elder', 'interview', 'record stories', 'oral tradition'], title: 'Preserving Oral Histories',
          response: 'Oral histories are irreplaceable — they contain knowledge that exists nowhere in written records. Tips for recording: 1) USE A RECORDER — Even a phone works. Get permission first. 2) ASK OPEN QUESTIONS — "Tell me about growing up..." works better than yes/no questions. 3) KEY TOPICS — Ask about: family surnames and where they came from, life in Oklahoma, tribal connections, stories about grandparents and great-grandparents, family traditions, and any documents or photos they have. 4) FOLLOW UP — Names and places mentioned deserve their own questions. 5) PRESERVE — Transcribe recordings, make copies, and share with family. 6) ACT NOW — Every year we lose elders who carry irreplaceable knowledge. Record your family\'s stories while you can.',
          chips: ['Record oral history', 'Interview questions', 'Go to Oral Histories page'] },

        // APP NAVIGATOR (36-44)
        { id: 36, keywords: ['how to use', 'app guide', 'show me around', 'app features', 'what can this app do', 'help me navigate', 'tour'], title: 'App Overview & Tour',
          response: 'Welcome to Black Ancestral Origins! This app has 18 pages organized into 5 sections:\n\n• EXPLORE — Home, Getting Started guide, Family Tree builder, Ancestor Profiles\n• RECORDS — Dawes Rolls search, Freedmen Records, Tribal Census Records, Land Allotments\n• HERITAGE — DNA & Heritage, Migration Routes map, Historical Timeline, Name Origins\n• PRESERVE — Document Vault, Photo Gallery, Oral Histories recorder\n• CONNECT — Community forum, Resource Library, Settings\n\nUse the sidebar (desktop) or bottom navigation (mobile) to move between sections. The search icon in the top bar searches across ALL records. The chatbot (that\'s me!) can answer questions and navigate you to any page. What would you like to explore?',
          chips: ['Home page features', 'How to search records', 'How to use Family Tree', 'How to use chatbot'] },

        { id: 37, keywords: ['home page', 'home feature', 'what is on home', 'dashboard', 'main page'], title: 'Home Page Guide',
          response: 'The Home page is your research dashboard. It includes:\n\n• HERO SECTION — Quick access buttons to search Dawes Rolls or read the Getting Started guide\n• QUICK ACTIONS — 4 shortcut cards to Family Tree, Dawes Rolls, Freedmen Records, and Timeline\n• RESEARCH PROGRESS — Track how many ancestors and documents you\'ve saved, with a completion bar\n• RECENT ACTIVITY — Shows notifications about record matches and community replies\n• FEATURED EVENT — Highlights an important historical event (rotates)\n\nEverything on the Home page is clickable and takes you deeper into the app.',
          chips: ['Go to Home', 'Getting Started guide', 'Search Dawes Rolls'] },

        { id: 38, keywords: ['family tree how', 'use family tree', 'build tree', 'add person tree', 'tree builder'], title: 'How to Use Family Tree',
          response: 'The Family Tree page lets you visualize your ancestral connections:\n\n• VIEW — The tree shows a sample Washington family by default. Click any person to see their details.\n• ADD PERSON — Click "+ Add Person" to add a new family member. They\'ll be added as a child of the root ancestor.\n• CONNECT RECORDS — When you find someone on the Dawes Rolls, add them as an ancestor then connect them to your tree.\n• RESET — Click "Reset to Sample" to restore the default tree if needed.\n\nTIP: Start with what you know (yourself, parents, grandparents) and work backwards. Each person you add becomes a node you can click for details.',
          chips: ['Go to Family Tree', 'Add an ancestor', 'Search Dawes Rolls'] },

        { id: 39, keywords: ['how search work', 'search feature', 'how to search record', 'search bar', 'global search', 'find record'], title: 'How Search Works',
          response: 'There are two ways to search in the app:\n\n1. GLOBAL SEARCH (magnifying glass icon in top bar) — Searches across ALL records: Dawes Rolls, Freedmen Records, Tribal Census Records, Land Allotments, Timeline events, Name Origins, Resources, and your saved ancestors. Type at least 2 characters to see results. Click any result to jump to that page.\n\n2. PAGE SEARCH — Each records page (Dawes Rolls, Freedmen Records, etc.) has its own search bar with filters. You can filter by tribe, year, status, and more. The search is instant — results update as you type.\n\nTIP: Try searching by surname first, then narrow by tribe or location.',
          chips: ['Search Dawes Rolls', 'Search Freedmen Records', 'Search Tribal Census Records'] },

        { id: 40, keywords: ['ancestor profile', 'add ancestor', 'save ancestor', 'my ancestor', 'ancestor page'], title: 'How to Use Ancestor Profiles',
          response: 'The Ancestor Profiles page is your personal ancestor database:\n\n• ADD MANUALLY — Click "+ Add Ancestor" to enter name, birth/death years, tribe, roll number, location, and notes.\n• QUICK ADD — At the bottom of the page, click any Dawes Roll record to instantly add it as an ancestor profile.\n• ADD FROM RECORDS — When viewing a Dawes Roll detail (click "View"), use the "+ Save as Ancestor" button.\n• VIEW DETAILS — Click any saved ancestor to see their full profile in a modal.\n• DELETE — Remove ancestors you no longer need.\n\nEach ancestor you save increases your Research Progress on the Home page.',
          chips: ['Go to Ancestor Profiles', 'Search Dawes Rolls', 'Family Tree'] },

        { id: 41, keywords: ['document vault how', 'upload document', 'save document', 'vault feature', 'store document'], title: 'How to Use Document Vault',
          response: 'The Document Vault stores and organizes your genealogical documents:\n\n• UPLOAD — Click the upload zone or "+ Upload" to add a document record. Enter the name, category (Census Record, Enrollment Card, Land Patent, etc.), and notes.\n• ORGANIZE — Documents are displayed in a grid with icons showing their type.\n• VIEW — Click any document to see its details.\n• SUGGESTED DOCUMENTS — The page shows a checklist of important document types to collect.\n\nNOTE: This version stores document metadata (names and notes) in your browser\'s local storage. For actual file storage, you\'d need to save physical/digital copies separately.',
          chips: ['Go to Document Vault', 'Go to Photo Gallery', 'Suggested documents'] },

        { id: 42, keywords: ['community how', 'post community', 'share discovery', 'forum', 'community feature'], title: 'How to Use Community',
          response: 'The Community page connects you with fellow Freedmen researchers:\n\n• POST — Type in the text area at the top and click "Share with Community" to post.\n• BROWSE — Scroll through posts from other researchers. Filter by topic using the tabs: All Posts, Discoveries, Research Tips, Rights & Advocacy.\n• INTERACT — Like posts with the heart button, view comment counts, or share posts.\n• DISCOVER — Read posts about research breakthroughs, tips for finding records, and advocacy for Freedmen rights.\n\nTIP: Share your discoveries! Someone might recognize a surname or location that connects to their own research.',
          chips: ['Go to Community', 'Research tips', 'Go to Resources'] },

        { id: 43, keywords: ['settings how', 'change name', 'change profile', 'export data', 'clear data', 'preferences'], title: 'How to Use Settings',
          response: 'The Settings page lets you customize your experience:\n\n• PROFILE — Set your name, email, tribal affiliations, and research goals. Your name appears in the sidebar and as your community post identity.\n• PREFERENCES — Toggle notifications and auto-save on/off.\n• EXPORT DATA — Download all your saved data (ancestors, documents, family tree, photos) as a JSON file for backup.\n• CLEAR DATA — Remove all saved data from your browser. WARNING: This cannot be undone!\n\nTIP: Set your tribal affiliations in Settings so the app can tailor suggestions to your specific research needs.',
          chips: ['Go to Settings', 'Export my data', 'Go to Home'] },

        { id: 44, keywords: ['how use chatbot', 'chatbot help', 'what can you do', 'bot feature', 'ask you', 'chat help'], title: 'How to Use the Chatbot',
          response: 'I\'m Roots AI Guide — your Black Indigenous Freedmen heritage specialist! Here\'s what I can do:\n\n• GENEALOGY EXPERT — Ask about Dawes Rolls, tribal citizenship, Freedmen Bureau records, DNA testing, and Black Indigenous history (35 research topics).\n• FAMILY HISTORIAN — Ask about your Williams and Johnson family ancestors (Robert, Clara, James, Dorothy, Samuel, Mary).\n• APP NAVIGATOR — Ask "how to use [feature]" for any page or feature in the app.\n• TECH SUPPORT — Report problems or ask for troubleshooting help.\n• PAGE NAVIGATION — Say "go to [page name]" and I\'ll take you there.\n\nUse the quick reply chips below for common questions, or type anything!',
          chips: ['Genealogy help', 'Navigate the app', 'Technical support', 'Family ancestors'] },

        // TECHNICAL SUPPORT (45-50)
        { id: 45, keywords: ['technical support', 'tech support', 'help me fix', 'something wrong', 'not working', 'problem', 'issue', 'bug', 'broken', 'error'], title: 'Technical Support',
          response: 'I\'m here to help troubleshoot! Common issues and solutions:\n\n• PAGE NOT LOADING — Try refreshing your browser (Ctrl+R or Cmd+R). If a specific page is blank, navigate to Home first then try again.\n• SEARCH NOT WORKING — Make sure you\'re typing at least 2 characters. Try different spelling variations of names.\n• DATA DISAPPEARED — Your data is stored in your browser\'s local storage. Clearing browser data/cookies will erase it. Use Settings > Export Data regularly to back up.\n• STYLING LOOKS WRONG — Try a hard refresh (Ctrl+Shift+R). Some older browsers may not support all features.\n• CHATBOT NOT RESPONDING — Type your question differently or use the quick reply chips.\n\nWhat specific issue are you experiencing?',
          chips: ['Data disappeared', 'Search not finding results', 'How to export data', 'Page looks wrong'] },

        { id: 46, keywords: ['data disappear', 'lost data', 'data gone', 'ancestor gone', 'tree gone', 'reset data', 'where is my data'], title: 'Lost Data Troubleshooting',
          response: 'If your saved data has disappeared, here are the likely causes and solutions:\n\n1. BROWSER CLEARED — If you cleared your browser history/cookies/site data, local storage is wiped. Unfortunately this cannot be recovered.\n2. DIFFERENT BROWSER — Data is stored per-browser. If you usually use Chrome but opened the app in Firefox, your data won\'t appear.\n3. PRIVATE/INCOGNITO MODE — Data saved in private browsing is deleted when the window closes.\n4. STORAGE FULL — Rarely, if local storage is full, new saves may fail silently.\n\nPREVENTION: Go to Settings and click "Export Data" regularly. This downloads a JSON backup file that preserves all your ancestors, documents, family tree, and photos. Store it somewhere safe!',
          chips: ['How to export data', 'Go to Settings', 'How to add ancestors'] },

        { id: 47, keywords: ['search not finding', 'no results', 'can\'t find', 'search empty', 'search problem', 'nothing found'], title: 'Search Not Finding Results',
          response: 'If search isn\'t finding what you expect:\n\n1. SPELLING VARIATIONS — Names were often recorded phonetically. Try: Williams/Willams/Wiliams, Johnson/Jonson/Johnston.\n2. MINIMUM CHARACTERS — You need at least 2 characters for global search to work.\n3. WRONG SECTION — Global search (top bar) searches everything. Page-level search only searches that page\'s records.\n4. CHECK FILTERS — On the Dawes Rolls page, make sure tribe and status dropdowns are set to "All" if you\'re doing a broad search.\n5. TRY PARTIAL NAMES — Search "Wash" instead of "Washington" to catch variations.\n6. DIFFERENT RECORDS — If someone isn\'t on the Dawes Rolls, try Freedmen Records or Tribal Census Records.\n\nRemember: Not everyone was enrolled. Check rejected applications too.',
          chips: ['Search Dawes Rolls', 'Search tips', 'Rejected applications'] },

        { id: 48, keywords: ['page looks wrong', 'styling broken', 'layout broken', 'display problem', 'looks weird', 'not displaying'], title: 'Display & Styling Issues',
          response: 'If the app looks wrong or styling is broken:\n\n1. HARD REFRESH — Press Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac) to force reload all assets.\n2. CLEAR CACHE — Go to browser settings and clear cached images/files for this site.\n3. ZOOM LEVEL — Check your browser zoom is at 100% (Ctrl+0 to reset).\n4. BROWSER SUPPORT — The app works best in Chrome, Edge, Firefox, or Safari. Older browsers (IE11) are not supported.\n5. MOBILE VIEW — On phones, the sidebar is hidden. Use the bottom navigation bar (6 tabs) to navigate.\n6. FONT LOADING — If text looks plain, the Google Fonts may not have loaded. Check your internet connection.\n\nIf the issue persists, try opening the app in a different browser.',
          chips: ['App overview', 'Mobile navigation', 'Go to Home'] },

        { id: 49, keywords: ['mobile', 'phone', 'bottom nav', 'mobile navigation', 'small screen', 'responsive', 'tablet'], title: 'Mobile & Responsive Guide',
          response: 'The app is fully responsive and works on all devices:\n\n• MOBILE (phones) — The sidebar is hidden. Use the BOTTOM NAVIGATION BAR with 6 tabs: Home, Records, Tree, Heritage, Community, Settings. The hamburger menu (three lines) in the top-left also opens the full sidebar.\n• TABLET — Similar to mobile layout but with more space. Bottom nav is visible.\n• DESKTOP — Full sidebar is always visible on the left. No bottom nav needed.\n\nBOTTOM NAV TAB MAPPING:\n- Home = Home + Getting Started\n- Records = Dawes Rolls, Freedmen Records, Tribal Census Records, Land Allotments\n- Tree = Family Tree + Ancestor Profiles\n- Heritage = DNA, Migration, Timeline, Name Origins\n- Community = Community, Resources, Document Vault, Photo Gallery, Oral Histories\n- Settings = Settings page',
          chips: ['App overview', 'How to search records', 'Go to Home'] },

        { id: 50, keywords: ['export', 'backup', 'download data', 'save backup', 'json export', 'import'], title: 'Exporting & Backing Up Data',
          response: 'To export and back up all your research data:\n\n1. Go to the SETTINGS page (click Settings in sidebar or bottom nav)\n2. Scroll to "Data Management" section\n3. Click "Export" — this downloads a JSON file containing:\n   - Your profile information\n   - All saved ancestors\n   - All document records\n   - All photo records\n   - Your complete family tree\n   - Export timestamp\n\nThe file is named "bao-data-export.json". Save it to your computer, cloud storage, or email it to yourself.\n\nTIP: Export your data regularly, especially after adding new ancestors or documents. Browser data can be lost if you clear your cache or switch devices.',
          chips: ['Go to Settings', 'How to add ancestors', 'Go to Home'] },

        // ============== TRIBAL ID / CITIZENSHIP GUIDES ==============

        { id: 51, keywords: ['tribal id', 'tribal card', 'tribal citizenship', 'tribal enrollment', 'how to get tribal id', 'citizenship card', 'CDIB', 'get enrolled', 'tribal membership'], title: 'Tribal ID & Citizenship Overview',
          response: 'HOW TO OBTAIN TRIBAL CITIZENSHIP — OVERVIEW\n\nAs a descendant of Freedmen enrolled on the Dawes Rolls, you may be eligible for tribal citizenship in one of the Five Civilized Tribes. Here is what you need to know:\n\nGENERAL REQUIREMENTS:\n1. Prove direct lineage to an ancestor on the Dawes Rolls (1898-1914)\n2. Obtain a CDIB (Certificate of Degree of Indian Blood) from the BIA — Note: Freedmen descendants may NOT need a CDIB depending on the tribe\n3. Submit an application to the specific tribe with supporting documents\n\nKEY DOCUMENTS NEEDED:\n• Certified birth certificates for every generation back to Dawes enrollee\n• Certified marriage/death/divorce certificates to establish name changes\n• Dawes Roll card number of your ancestor\n• Government-issued photo ID\n• Social Security card or number\n\nEach tribe has different processes. Ask me about a specific tribe for detailed steps!\n\nIMPORTANT: Freedmen citizenship rights have been upheld by federal courts. The 2017 Cherokee Nation ruling confirmed Freedmen descendants have full citizenship rights.',
          chips: ['Cherokee tribal ID', 'Choctaw tribal ID', 'Creek tribal ID', 'Chickasaw tribal ID', 'Seminole tribal ID'] },

        { id: 52, keywords: ['cherokee tribal id', 'cherokee citizenship', 'cherokee enrollment', 'cherokee freedmen card', 'cherokee nation card', 'cherokee registration'], title: 'Cherokee Nation Tribal ID',
          response: 'CHEROKEE NATION — TRIBAL CITIZENSHIP FOR FREEDMEN DESCENDANTS\n\nThe Cherokee Nation confirmed Freedmen descendants have FULL citizenship rights (2017 ruling). You do NOT need a CDIB.\n\nSTEP-BY-STEP PROCESS:\n\n1. GATHER LINEAGE DOCUMENTS:\n   • Your certified birth certificate (long form with parents names)\n   • Certified birth certificates for EACH generation back to your Dawes Roll ancestor\n   • Certified marriage certificates (to connect name changes)\n   • Certified death certificates (for deceased ancestors in the lineage)\n   • All certificates MUST be state-issued certified copies (not hospital copies)\n\n2. IDENTIFY YOUR DAWES ROLL ANCESTOR:\n   • Find their Dawes Roll number (search at okhistory.org or Access Genealogy)\n   • The ancestor must be on the Cherokee Freedmen roll\n\n3. SUBMIT APPLICATION:\n   • Download the application from cherokee.org/services/tribal-registration\n   • Complete all fields — include your Dawes Roll ancestor information\n   • Include copies of ALL lineage documents\n   • Include a copy of your government-issued photo ID\n   • Include your Social Security number\n\n4. MAIL TO:\n   Cherokee Nation Registration Department\n   P.O. Box 948\n   Tahlequah, OK 74465\n\n5. PROCESSING:\n   • Takes approximately 6-12 months\n   • You will receive a citizenship card with your tribal registration number\n   • Once enrolled you can access Cherokee Nation health services, education, housing, and other programs\n\nCONTACT:\n   Phone: (918) 453-5000\n   Registration: (918) 453-5098\n   Website: cherokee.org',
          chips: ['Choctaw tribal ID', 'Creek tribal ID', 'Tribal ID overview', 'Dawes Rolls info'] },

        { id: 53, keywords: ['choctaw tribal id', 'choctaw citizenship', 'choctaw enrollment', 'choctaw freedmen', 'choctaw nation card', 'choctaw registration'], title: 'Choctaw Nation Tribal ID',
          response: 'CHOCTAW NATION — TRIBAL CITIZENSHIP FOR FREEDMEN DESCENDANTS\n\nThe Choctaw Nation requires proof of lineage to a Choctaw Freedman on the Dawes Rolls. Freedmen descendants may apply but the process differs from blood-quantum members.\n\nSTEP-BY-STEP PROCESS:\n\n1. GATHER LINEAGE DOCUMENTS:\n   • Certified birth certificate (long form) for yourself\n   • Certified birth certificates for each generation back to Dawes enrollee\n   • Certified marriage/death/divorce certificates to trace name changes\n   • ALL must be state-issued certified copies\n\n2. IDENTIFY YOUR DAWES ROLL ANCESTOR:\n   • Find their Dawes Freedmen Roll card number\n   • Example: Robert Williams — Choctaw Freedman Card #2241\n   • Search at okhistory.org or National Archives\n\n3. OBTAIN CDIB (if applicable):\n   • Apply to the Bureau of Indian Affairs (BIA)\n   • BIA Southern Plains Region: (405) 247-6673\n   • Note: Freedmen may not qualify for CDIB if no Indian blood quantum is documented, but can still apply for tribal membership\n\n4. SUBMIT APPLICATION:\n   • Download from choctawnation.com or call for a packet\n   • Complete the Membership Application\n   • Attach all certified documents\n   • Include government-issued photo ID copy\n   • Include Social Security number\n\n5. MAIL TO:\n   Choctaw Nation of Oklahoma\n   Tribal Membership Department\n   P.O. Box 1210\n   Durant, OK 74702\n\n6. PROCESSING:\n   • Takes approximately 6-18 months\n   • A genealogist will verify your lineage\n   • You may be contacted for additional documents\n\nCONTACT:\n   Phone: (580) 924-8280 or (800) 522-6170\n   Membership: (580) 924-8280 ext. 4044\n   Website: choctawnation.com\n\nNOTE: The Williams family (Robert Williams, Card #2241) was enrolled as Choctaw Freedmen in Atoka, Indian Territory.',
          chips: ['Cherokee tribal ID', 'Creek tribal ID', 'Robert Williams Card 2241', 'Tribal ID overview'] },

        { id: 54, keywords: ['creek tribal id', 'creek citizenship', 'muscogee tribal id', 'muscogee citizenship', 'creek enrollment', 'creek freedmen', 'muscogee nation card', 'muscogee enrollment'], title: 'Muscogee (Creek) Nation Tribal ID',
          response: 'MUSCOGEE (CREEK) NATION — TRIBAL CITIZENSHIP FOR FREEDMEN DESCENDANTS\n\nThe Muscogee Creek Nation recognizes Freedmen descendants. Citizenship is based on lineage to the Dawes Rolls.\n\nSTEP-BY-STEP PROCESS:\n\n1. GATHER LINEAGE DOCUMENTS:\n   • Certified long-form birth certificate for yourself\n   • Certified birth certificates for each generation connecting you to Dawes enrollee\n   • Certified marriage, death, and divorce certificates for name changes\n   • ALL must be certified copies from the issuing state vital records office\n\n2. IDENTIFY YOUR DAWES ROLL ANCESTOR:\n   • Find their Creek Freedmen Roll card number\n   • Search at okhistory.org, fold3.com, or National Archives\n   • Verify enrollment on the Creek Freedmen section of the Dawes Rolls\n\n3. APPLY FOR CDIB (if applicable):\n   • Bureau of Indian Affairs — Muscogee Area Office\n   • If Freedmen lineage only (no Indian blood documented), CDIB may not be issued\n   • The Nation may still grant citizenship based on Dawes Roll lineage\n\n4. SUBMIT APPLICATION:\n   • Download Citizenship Application from mcn-nsn.gov\n   • Complete all sections including Dawes Roll ancestor info\n   • Attach ALL certified lineage documents\n   • Include copy of government-issued photo ID\n   • Include Social Security number\n\n5. MAIL TO:\n   Muscogee (Creek) Nation\n   Citizenship Office\n   P.O. Box 580\n   Okmulgee, OK 74447\n\n6. PROCESSING:\n   • Approximately 6-12 months\n   • Citizenship Board reviews and votes on applications\n   • You receive a citizenship card upon approval\n\nCONTACT:\n   Phone: (918) 732-7600\n   Citizenship Office: (918) 732-7852\n   Website: mcn-nsn.gov',
          chips: ['Cherokee tribal ID', 'Choctaw tribal ID', 'Seminole tribal ID', 'Tribal ID overview'] },

        { id: 55, keywords: ['chickasaw tribal id', 'chickasaw citizenship', 'chickasaw enrollment', 'chickasaw freedmen', 'chickasaw nation card'], title: 'Chickasaw Nation Tribal ID',
          response: 'CHICKASAW NATION — TRIBAL CITIZENSHIP INFORMATION\n\nIMPORTANT NOTE: The Chickasaw Nation currently requires documented Indian blood quantum for citizenship. Chickasaw Freedmen descendants face unique challenges:\n\nCURRENT STATUS:\n• The Chickasaw Nation requires a CDIB showing Chickasaw blood for enrollment\n• Freedmen who were enrolled on the Dawes Rolls as "Chickasaw Freedmen" were listed separately from "Chickasaw by Blood"\n• Legal advocacy is ongoing for Chickasaw Freedmen rights\n\nIF YOU HAVE DOCUMENTED CHICKASAW BLOOD:\n\n1. GATHER DOCUMENTS:\n   • Certified birth certificates for each generation to Dawes enrollee\n   • Certified marriage/death/divorce records\n   • All must be state-issued certified copies\n\n2. OBTAIN CDIB FROM BIA:\n   • Apply to Bureau of Indian Affairs\n   • BIA will verify blood quantum from Dawes Roll records\n   • Phone: (405) 247-6673\n\n3. SUBMIT TO CHICKASAW NATION:\n   • Download application from chickasaw.net\n   • Include CDIB, lineage documents, photo ID, and Social Security number\n\n4. MAIL TO:\n   Chickasaw Nation\n   Tribal Enrollment Office\n   P.O. Box 1548\n   Ada, OK 74821\n\nCONTACT:\n   Phone: (580) 436-2603\n   Website: chickasaw.net\n\nADVOCACY RESOURCES:\n• Freedmen advocacy groups are working toward equal citizenship\n• Document your lineage thoroughly — keep certified copies of everything\n• Connect with other Chickasaw Freedmen descendants through community organizations',
          chips: ['Seminole tribal ID', 'Cherokee tribal ID', 'Tribal ID overview', 'Dawes Rolls info'] },

        { id: 56, keywords: ['seminole tribal id', 'seminole citizenship', 'seminole enrollment', 'seminole freedmen', 'seminole nation card', 'black seminole'], title: 'Seminole Nation Tribal ID',
          response: 'SEMINOLE NATION — TRIBAL CITIZENSHIP FOR FREEDMEN DESCENDANTS\n\nThe Seminole Nation has two Freedmen Bands: Dosar Barkus Band and Caesar Bruner Band. Freedmen have historically been recognized members.\n\nIMPORTANT CONTEXT:\n• Seminole Freedmen have a unique history — many were allies and warriors alongside Seminoles in Florida\n• Black Seminoles fought in the Seminole Wars against removal\n• Freedmen were enrolled on the Dawes Rolls as "Seminole Freedmen"\n\nSTEP-BY-STEP PROCESS:\n\n1. GATHER LINEAGE DOCUMENTS:\n   • Certified long-form birth certificate\n   • Certified birth certificates for each generation to Dawes enrollee\n   • Certified marriage/death/divorce certificates\n   • ALL must be certified copies from state vital records\n\n2. IDENTIFY YOUR DAWES ROLL ANCESTOR:\n   • Find their Seminole Freedmen Roll card number\n   • Determine which band: Dosar Barkus or Caesar Bruner\n   • Search at okhistory.org or National Archives\n\n3. SUBMIT APPLICATION:\n   • Contact the Seminole Nation Enrollment Office for application\n   • Complete all sections with Dawes Roll ancestor information\n   • Attach all certified lineage documents\n   • Include government photo ID and Social Security number\n\n4. MAIL TO:\n   Seminole Nation of Oklahoma\n   Enrollment Department\n   P.O. Box 1498\n   Wewoka, OK 74884\n\n5. PROCESSING:\n   • Processing times vary — follow up after 3 months\n   • Tribal council reviews applications\n\nCONTACT:\n   Phone: (405) 257-7200\n   Website: sno-nsn.gov\n\nNOTE: Legal disputes regarding Seminole Freedmen citizenship rights have been ongoing. Stay connected with Freedmen advocacy organizations for updates.',
          chips: ['Cherokee tribal ID', 'Choctaw tribal ID', 'Tribal ID overview', 'Black Seminole history'] },
    ],

    // ============== CONVERSATION CONTEXT ENGINE ==============
    context: {
        lastTopic: null,
        lastCategory: null,
        conversationDepth: 0,
        currentRole: null,
        mentionedAncestors: [],
        mentionedTribes: [],
        askedAbout: [],
        userLevel: 'beginner', // beginner, intermediate, advanced
        sessionTopics: [],
    },

    // Deep follow-up responses for multi-turn conversations
    deepFollowUps: {
        'dawes-rolls': [
            { trigger: ['more', 'tell me more', 'explain more', 'go deeper', 'continue', 'what else', 'details'],
              response: 'Let me go deeper on the Dawes Rolls...\n\nThe Dawes Commission operated in three phases:\n\n📋 PHASE 1 — Application (1898-1907):\nTribal members and Freedmen submitted applications. Each applicant had to prove their identity and tribal connection through witnesses, earlier census rolls, and documentation.\n\n📋 PHASE 2 — Enrollment Cards:\nApproved applicants were assigned enrollment cards with unique numbers. Cards recorded: full name, age, sex, blood quantum (for \"by blood\" members), post office address, district, and relationship to head of household.\n\n📋 PHASE 3 — Land Allotment:\nEach enrollee received an individual land allotment — typically 160 acres for heads of household, 40 acres for minors. Freedmen allotments were often smaller or on less desirable land.\n\nKEY INSIGHT: The Dawes Rolls separated people into categories:\n• "By Blood" — proven Native ancestry\n• "Freedmen" — formerly enslaved persons\n• "Minor" — children\n• "New Born" — babies born during enrollment\n• "Doubtful" — contested applications\n\nThis classification system still affects citizenship claims today. Want me to explain how to read a specific Dawes card, or search the rolls?',
              chips: ['How to read Dawes cards', 'Search Dawes Rolls', 'Freedmen vs By Blood', 'Robert Williams Card 2241'] },
            { trigger: ['how to read', 'read a card', 'understand the card', 'what do the fields mean', 'card fields'],
              response: 'HOW TO READ A DAWES ENROLLMENT CARD:\n\nEach card contains critical genealogy information. Here is what every field means:\n\n📄 CARD NUMBER — Unique identifier (e.g., Card #2241). This is your key reference number for all tribal citizenship applications.\n\n👤 NAME — Full legal name as recorded. Women may be listed under maiden or married names. Check both.\n\n📅 AGE/BIRTH — Age at time of enrollment, sometimes with estimated birth year. "c." means "circa" (approximately).\n\n👥 RELATIONSHIP — Shows family connections: "Head", "Wife", "Son", "Daughter". Multiple family members often share one card.\n\n🏛️ TRIBE — Which of the Five Tribes: Cherokee, Choctaw, Creek (Muscogee), Chickasaw, or Seminole.\n\n📋 ROLL TYPE — Critical distinction:\n   • "Freedman" = formerly enslaved person\n   • "By Blood" = proven Native ancestry\n   • "Minor Freedman" = child of Freedman\n\n📍 POST OFFICE — Location in Indian Territory. Helps identify where your ancestor lived.\n\n🗺️ DISTRICT — Administrative district within the tribal nation.\n\nWant me to look at Robert Williams Card #2241 specifically, or help you search for your own ancestor?',
              chips: ['Robert Williams Card 2241', 'Search Dawes Rolls', 'Freedmen land allotments', 'Go to Dawes Rolls'] },
        ],
        'tribal-citizenship': [
            { trigger: ['more', 'what documents', 'how long', 'cost', 'fees', 'requirements', 'next steps'],
              response: 'DETAILED CITIZENSHIP REQUIREMENTS — COMMON ACROSS ALL TRIBES:\n\n💰 COSTS:\n• Most tribes do NOT charge application fees\n• You WILL pay for certified documents: $15-25 per birth/death/marriage certificate\n• CDIB application through BIA is free\n• Budget approximately $100-300 total for all certified documents\n\n⏱️ TIMELINE:\n• Gathering documents: 1-6 months (depends on how many generations)\n• BIA CDIB processing: 6-12 months\n• Tribal application: 6-18 months\n• TOTAL: Plan for 1-3 years from start to citizenship card\n\n📝 COMMON MISTAKES TO AVOID:\n1. Using uncertified copies — tribes ONLY accept certified state-issued documents\n2. Missing a generation — you need EVERY link in the chain\n3. Not accounting for name changes — marriages, remarriages, name variations\n4. Wrong Dawes Roll ancestor — verify the exact card number\n5. Submitting incomplete applications — one missing document can delay 6+ months\n\n🔑 PRO TIPS:\n• Order multiple certified copies of each document\n• Create a binder organizing documents by generation\n• Keep a timeline chart showing each ancestor and their connection\n• Contact the tribal enrollment office BEFORE submitting to ask questions\n\nWhich tribe are you applying to? I can give specific guidance.',
              chips: ['Cherokee tribal ID', 'Choctaw tribal ID', 'Creek tribal ID', 'Chickasaw tribal ID'] },
        ],
        'family-history': [
            { trigger: ['more', 'tell me more', 'what else', 'other family', 'connections', 'related', 'research tips'],
              response: 'DEEPER RESEARCH FOR THE WILLIAMS/JOHNSON FAMILY:\n\nHere are advanced research strategies to expand what we know:\n\n🔍 PRIMARY SOURCES TO CHECK:\n1. 1885 Choctaw Census — Look for Robert Williams or Samuel Johnson in Atoka County\n2. Freedmen Bureau Labor Contracts (1865-1872) — May show who formerly enslaved your ancestors\n3. Choctaw Nation Court Records — Land disputes, estate proceedings\n4. Church Records in Atoka County — Baptisms, marriages, burials\n5. Oklahoma School Records post-1907 — Dorothy Williams may appear as a student or teacher\n\n🏛️ ARCHIVES TO VISIT:\n• Oklahoma Historical Society — Oklahoma City, has original Dawes cards\n• National Archives at Fort Worth — Freedmen Bureau records for Indian Territory\n• Choctaw Nation Archives — Durant, OK\n• Atoka County Courthouse — Local records\n\n🌐 ONLINE DATABASES:\n• Fold3.com — Dawes Rolls images, military records\n• FamilySearch.org — Free, massive database\n• Ancestry.com — Oklahoma and Indian Territory collections\n• AccessGenealogy.com — Free Dawes Roll search\n• okhistory.org — Oklahoma Historical Society digital collections\n\nWould you like me to walk you through searching any of these, or tell you more about a specific ancestor?',
              chips: ['Robert Williams details', 'Samuel Johnson details', 'Search Dawes Rolls', 'Go to Resources'] },
        ],
    },

    // Educational conversation starters for natural dialogue
    conversationPatterns: [
        { patterns: ['hello', 'hi', 'hey', 'howdy', 'good morning', 'good afternoon', 'good evening', 'whats up', 'sup'],
          response: 'Welcome! I\'m Roots AI Guide 🪶 — your dedicated specialist in Black Indigenous Freedmen genealogy of the Five Civilized Tribes.\n\nI can help you with:\n\n🏛️ GENEALOGY — Dawes Rolls, tribal records, ancestor research\n🪪 CITIZENSHIP — Step-by-step tribal enrollment for all 5 tribes\n👨‍👩‍👧‍👦 YOUR FAMILY — Williams & Johnson ancestor details\n📱 APP GUIDE — How to use every feature\n🧬 DNA — Heritage testing and interpretation\n\nWhat interests you most today?',
          chips: ['Tell me about Freedmen history', 'Help me get tribal ID', 'Show me my family tree', 'How do I use this app?'] },

        { patterns: ['who are you', 'what are you', 'what can you do', 'your capabilities', 'help me', 'what is this'],
          response: 'I\'m Roots AI Guide — the most comprehensive offline guide for Black Indigenous Freedmen genealogy research.\n\nMy expertise covers:\n\n📚 56 KNOWLEDGE TOPICS spanning:\n  • Dawes Rolls & enrollment records\n  • Tribal citizenship for ALL 5 tribes (Cherokee, Choctaw, Creek, Chickasaw, Seminole)\n  • Your Williams & Johnson family ancestors\n  • DNA testing & heritage analysis\n  • Freedmen Bureau records & Tribal Census Records\n  • Historical events from removal to present\n\n🛠️ I CAN ALSO:\n  • Navigate you to any page in the app\n  • Search Dawes Roll records for you\n  • Walk you through features step-by-step\n  • Point out exactly where to click\n  • Help troubleshoot any issue\n\nI learn from our conversation — the more you ask, the deeper I can go. What would you like to explore?',
          chips: ['Freedmen history', 'Search ancestors', 'Tribal citizenship', 'Tour the app'] },

        { patterns: ['thank', 'thanks', 'appreciate', 'helpful', 'great answer', 'awesome', 'perfect', 'wonderful'],
          response: 'You\'re welcome! Preserving and understanding our Black Indigenous Freedmen heritage is deeply important work. Every ancestor you discover, every document you find, strengthens the connection between past and future.\n\nIs there anything else you\'d like to explore? I have extensive knowledge on all Five Tribes and can go as deep as you want on any topic.',
          chips: ['Tell me something I don\'t know', 'Explore another topic', 'Go to Home'] },

        { patterns: ['why does this matter', 'why is this important', 'why should i care', 'significance'],
          response: 'That\'s a profound question. Here\'s why Black Indigenous Freedmen heritage matters:\n\n🏛️ HISTORICAL JUSTICE:\nFreedmen were promised citizenship and rights by the treaties of 1866 after the Civil War. The Five Tribes signed treaties with the U.S. government guaranteeing their formerly enslaved people full tribal citizenship. Knowing this history empowers you to claim what was promised.\n\n👨‍👩‍👧‍👦 FAMILY IDENTITY:\nFor centuries, slavery deliberately erased family connections. Every ancestor you discover reverses that erasure. Robert Williams, Card #2241, was a real person with a real life — not just a number.\n\n🪪 PRACTICAL BENEFITS:\nTribal citizenship gives access to healthcare, education scholarships, housing assistance, and cultural programs. Cherokee Freedmen won full citizenship rights in 2017.\n\n🧬 GENETIC HERITAGE:\nDNA research shows that many Freedmen descendants carry Indigenous American ancestry — a heritage that was systematically denied.\n\n📖 CULTURAL PRESERVATION:\nOral histories, migration stories, and family traditions contain irreplaceable knowledge. This app helps preserve them for future generations.\n\nWhat aspect would you like to explore further?',
          chips: ['Freedmen treaty rights', 'Cherokee citizenship victory', 'DNA & heritage', 'Start my research'] },

        { patterns: ['tell me something', 'interesting fact', 'did you know', 'fun fact', 'surprise me', 'teach me', 'educate me'],
          response: 'Here\'s something many people don\'t know:\n\n🪶 THE FIVE TRIBES OWNED THE MOST ENSLAVED PEOPLE OF ANY NATIVE NATIONS\n\nBy 1860, the Five Civilized Tribes held approximately 8,000 enslaved Black people in Indian Territory. The Choctaw and Cherokee held the most.\n\nAfter the Civil War, the Treaties of 1866 required each tribe to:\n• Free all enslaved people\n• Grant them full tribal citizenship\n• Provide land allotments\n\nBut here\'s what\'s remarkable — many Black people in Indian Territory had been living as part of these communities for GENERATIONS. They spoke Choctaw, Cherokee, or Creek languages. They participated in tribal governance. The Seminole Freedmen even fought alongside Seminoles in three wars against the U.S. government.\n\nThe Dawes Rolls (1898-1914) then codified a separation that hadn\'t existed in daily life — putting "Freedmen" on separate rolls from "By Blood" members, even when families had intermarried for decades.\n\nThis is YOUR heritage. Want to learn more?',
          chips: ['Freedmen treaty rights', 'Black Seminole warriors', 'Intermarriage history', 'Go to Timeline'] },

        { patterns: ['what is freedmen', 'freedmen meaning', 'define freedmen', 'who are freedmen', 'freedmen definition', 'what are freedmen'],
          response: 'FREEDMEN — A COMPLETE UNDERSTANDING:\n\nThe term "Freedmen" specifically refers to formerly enslaved Black people who were held in bondage by members of the Five Civilized Tribes (Cherokee, Choctaw, Creek/Muscogee, Chickasaw, and Seminole).\n\n📜 KEY HISTORICAL CONTEXT:\n\n1. BEFORE THE CIVIL WAR:\nThe Five Tribes adopted the practice of enslavement from Euro-Americans. Enslaved people worked on tribal farms, plantations, and households in Indian Territory (present-day Oklahoma).\n\n2. DURING THE CIVIL WAR (1861-1865):\nThe Five Tribes initially sided with the Confederacy. Some Freedmen escaped and joined Union forces. After the war, everything changed.\n\n3. TREATIES OF 1866:\nThe U.S. government required each tribe to sign reconstruction treaties that:\n  • Freed all enslaved people\n  • Granted them tribal citizenship\n  • Entitled them to land allotments\n\n4. DAWES ROLLS (1898-1914):\nFreedmen were enrolled on SEPARATE rolls from "By Blood" members. This distinction created a legal framework that tribes later used to dispute Freedmen citizenship.\n\n5. TODAY:\nFreedmen descendants continue to fight for full recognition. Cherokee Freedmen won a landmark victory in 2017 securing citizenship rights.\n\nYOU are a Freedmen descendant. This heritage connects Freedmen and Indigenous identity in a uniquely American story.\n\nWhat aspect would you like to explore further?',
          chips: ['Treaty of 1866 details', 'Cherokee Freedmen victory', 'Dawes Rolls explained', 'My family ancestors'] },
    ],

    // Task execution templates
    taskActions: {
        'search dawes': { page: 'dawes-rolls', action: 'search', highlight: '.search-input, .record-card', description: 'I\'ve opened the Dawes Rolls page. Use the search bar at the top to search by name, roll number, or tribe.' },
        'search freedmen': { page: 'freedmen-records', action: 'search', highlight: '.search-input', description: 'I\'ve opened the Freedmen Records page. You can search through Freedmen Bureau documents, labor contracts, and marriage records.' },
        'search slave': { page: 'slave-schedules', action: 'search', highlight: '.search-input', description: 'I\'ve opened the Tribal Census Records page. Search for your ancestors in the 1860 and 1870 pre-emancipation census records.' },
        'show family tree': { page: 'family-tree', highlight: '.tree-canvas', description: 'Here\'s your Ancestral Family Tree. Each person has a 🪶 feather headband representing Black Indigenous heritage. Click any ancestor to see their details.' },
        'add ancestor': { page: 'ancestor-profiles', action: 'add', highlight: '.btn-primary', description: 'I\'ve opened Ancestor Profiles. Click the "+ Add Ancestor" button to create a new ancestor record. You\'ll need their name, birth/death dates, tribe, and any Dawes Roll number.' },
        'view timeline': { page: 'historical-timeline', highlight: '.timeline-event', description: 'Here\'s the Historical Timeline showing key events from the Five Tribes\' history. Filter by category using the buttons at the top.' },
        'view migration': { page: 'migration-routes', highlight: '#leaflet-migration-map', description: 'This is the interactive Freedmen Migration Routes map powered by Leaflet.js. You can zoom, pan, and click route lines to see historical details. Each route shows the forced removal paths and later migrations.' },
        'check dna': { page: 'dna-heritage', highlight: '.dna-chart', description: 'Here\'s the DNA & Heritage section. It shows heritage composition, recommended testing services, and how to interpret results for Freedmen descendants.' },
        'view documents': { page: 'document-vault', highlight: '.document-card, .btn-primary', description: 'The Document Vault stores your research documents. Click "+ Add Document" to upload birth certificates, Dawes cards, or other records.' },
        'view photos': { page: 'photo-gallery', highlight: '.photo-card, .btn-primary', description: 'The Photo Gallery preserves family photographs. Click "+ Add Photo" to add images of ancestors, historical documents, or family gatherings.' },
        'record oral history': { page: 'oral-histories', highlight: '.btn-primary', description: 'Oral Histories capture spoken family stories. Click the record button to save stories from elders about your family\'s Freedmen heritage.' },
        'view resources': { page: 'resources', highlight: '.resource-card', description: 'The Resource Library contains links to archives, databases, and organizations for Freedmen genealogy research.' },
        'view community': { page: 'community', highlight: '.community-card', description: 'The Community section connects you with other Freedmen descendants. Share discoveries, ask questions, and collaborate on research.' },
        'name origins': { page: 'name-origins', highlight: '.name-card', description: 'Name Origins traces the history of common Freedmen surnames. Many names come from former enslavers, while others have Indigenous or historical origins.' },
        'land allotments': { page: 'land-allotments', highlight: '.allotment-card', description: 'Land Allotments shows the parcels given to Freedmen during the Dawes era. Each enrolled Freedman received an individual land allotment in Indian Territory.' },
        'open settings': { page: 'settings', highlight: '.settings-section', description: 'Settings lets you manage your profile, export/import data, and customize the app. Your data is stored locally in your browser.' },
        'getting started': { page: 'getting-started', highlight: '.step-card', description: 'The Getting Started Guide walks you through the app step-by-step, from creating your profile to finding Dawes Roll records.' },
    },

    // ============== QUICK REPLY CHIPS ==============
    defaultChips: ['Tell me about Freedmen', 'Search my ancestors', 'Help me get tribal ID', 'Tour the app', 'Williams family history', 'Teach me something'],

    roleChips: {
        genealogy: ['Search Dawes Rolls', 'Robert Williams Card 2241', 'Cherokee citizenship', 'DNA testing', 'Freedmen Bureau', 'What are Freedmen?', 'Treaty of 1866'],
        navigator: ['Tour all 18 pages', 'How to search records', 'How to use Family Tree', 'How to add ancestors', 'Mobile navigation', 'Export my data'],
        support: ['Data disappeared', 'Search not finding results', 'Page looks wrong', 'Export my data', 'Mobile help', 'Clear chat history'],
        citizenship: ['Cherokee tribal ID', 'Choctaw tribal ID', 'Creek tribal ID', 'Chickasaw tribal ID', 'Seminole tribal ID', 'Tribal ID overview'],
    },

    // ============== INIT ==============
    init() {
        this.createUI();
        this.bindEvents();
        this.createPointerArrow();
    },

    createUI() {
        // FAB wrapper with help text
        const wrapper = document.createElement('div');
        wrapper.className = 'chat-fab-wrapper';
        wrapper.id = 'chat-fab-wrapper';

        const fab = document.createElement('div');
        fab.id = 'chat-fab';
        fab.className = 'chat-fab';
        fab.innerHTML = '<img src="https://i.imgur.com/T13NIA3.png" alt="Guide" class="chat-fab-img">';
        wrapper.appendChild(fab);

        const helpText = document.createElement('div');
        helpText.className = 'chat-fab-help';
        helpText.id = 'chat-fab-help';
        helpText.textContent = "Have questions? I'm here to help!";
        wrapper.appendChild(helpText);

        document.body.appendChild(wrapper);

        // Chat panel
        const panel = document.createElement('div');
        panel.id = 'chat-panel';
        panel.className = 'chat-panel hidden';
        panel.innerHTML = `
            <div class="chat-header">
                <div class="chat-header-info">
                    <div class="chat-avatar"><img src="https://i.imgur.com/T13NIA3.png" alt="Guide" class="chat-avatar-img"></div>
                    <div>
                        <div class="chat-header-title">AI Research Assistant</div>
                        <div class="chat-header-status"><span class="chat-status-dot"></span> Online — 56 topics</div>
                    </div>
                </div>
                <button class="chat-close" id="chat-close">&times;</button>
            </div>
            <div class="chat-messages" id="chat-messages"></div>
            <div class="chat-chips" id="chat-chips"></div>
            <div class="chat-input-area">
                <input type="text" id="chat-input" placeholder="Ask about Dawes Rolls, ancestors, citizenship..." autocomplete="off">
                <button class="chat-send" id="chat-send">&#10148;</button>
            </div>
            <div class="chat-toolbar" id="chat-toolbar" style="display:none">
                <button class="chat-save-btn" id="chat-save-btn" onclick="BAO_Chatbot.saveConversation()">&#128190; Save Chat</button>
                <button class="chat-history-btn" id="chat-history-btn" onclick="BAO_Chatbot.toggleSavedChats()">&#128214; Saved Chats <span class="chat-saved-count" id="chat-saved-count">0</span></button>
            </div>
            <div class="chat-saved-panel hidden" id="chat-saved-panel"></div>
            <div class="chat-progress-bar" id="chat-progress-bar" style="display:none">
                <div class="chat-progress-header">
                    <span class="chat-progress-label">&#127793; Research Journey</span>
                    <span class="chat-progress-count" id="chat-progress-count">0 / 15</span>
                </div>
                <div class="chat-progress-track">
                    <div class="chat-progress-fill" id="chat-progress-fill" style="width:0%"></div>
                </div>
                <div class="chat-progress-percent" id="chat-progress-percent">0% Complete</div>
            </div>
        `;
        document.body.appendChild(panel);
    },

    bindEvents() {
        document.getElementById('chat-fab')?.addEventListener('click', (e) => {
            this.handleFabTap();
        });
        document.getElementById('chat-close')?.addEventListener('click', () => this.toggle());
        document.getElementById('chat-progress-bar')?.addEventListener('click', () => {
            this.addBotMessage(this.getProgressSummary());
            this.showChips(this.getProgressChips());
            this.scrollToBottom();
        });
        document.getElementById('chat-send')?.addEventListener('click', () => this.sendMessage());
        document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Load stored name
        this.userName = localStorage.getItem('bao_user_name') || null;

        // Update saved chats count
        this.updateSavedCount();

        // Load research progress
        try {
            var saved = localStorage.getItem('bao_research_progress');
            if (saved) this.completedSteps = JSON.parse(saved);
        } catch(e) { this.completedSteps = []; }
        this.updateProgressBar();

        // Show welcome after short delay
        setTimeout(() => {
            if (this.messages.length === 0) {
                if (this.userName) {
                    // Returning user — greet by name
                    this.addBotMessage('Welcome back, ' + this.userName + '! 🪶\n\nIt\'s good to see you again, family. I\'m Roots AI Guide — your dedicated companion on this journey of reclaiming our Black Indigenous Freedmen heritage.\n\nWhat would you like to explore today, ' + this.userName + '?');
                    this.showChips([...this.defaultChips.slice(0, 4), 'My Progress', 'Quick Start Guide']);
                } else {
                    // First time — ask for name
                    this.awaitingName = true;
                    this.addBotMessage('Welcome to Black Ancestral Origins! 🪶\n\nI\'m Roots AI Guide — your dedicated companion on this sacred journey of discovering your Black Indigenous Freedmen heritage.\n\nBefore we begin, I\'d love to know — what is your name?');
                    var nameInput = document.getElementById('chat-input');
                    if (nameInput) nameInput.placeholder = 'Type your name...';
                }
            }
        }, 500);
    },

    toggle() {
        this.isOpen = !this.isOpen;
        const panel = document.getElementById('chat-panel');
        const wrapper = document.getElementById('chat-fab-wrapper');
        if (this.isOpen) {
            panel.classList.remove('hidden');
            if (wrapper) wrapper.classList.add('chat-open');
            document.getElementById('chat-input')?.focus();
        } else {
            panel.classList.add('hidden');
            if (wrapper) wrapper.classList.remove('chat-open');
        }
    },

    sendMessage() {
        const input = document.getElementById('chat-input');
        const text = input?.value?.trim();
        if (!text) return;
        input.value = '';
        this.addUserMessage(text);
        this.hideChips();

        // Intercept name response (but skip if message is clearly a research query, not a name)
        if (this.awaitingName && !/(research|checklist|search|dawes|freedmen|tell me|help|how|what|show|go to)/i.test(text)) {
            this.awaitingName = false;
            // Extract first name — take first word, capitalize properly
            var rawName = text.replace(/^(my name is|i'm|im|i am|they call me|call me|it's|its)\s+/i, '').trim();
            rawName = rawName.split(/\s+/)[0]; // first word only
            rawName = rawName.replace(/[^a-zA-Z'-]/g, ''); // clean
            if (rawName.length > 0) {
                rawName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
            } else {
                rawName = text.trim().split(/\s+/)[0];
                rawName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
            }
            this.userName = rawName;
            localStorage.setItem('bao_user_name', rawName);
            // Restore placeholder
            var chatInput = document.getElementById('chat-input');
            if (chatInput) chatInput.placeholder = 'Ask about Dawes Rolls, ancestors, citizenship...';
            this.showTyping();
            var self = this;
            setTimeout(() => {
                this.hideTyping();
                this.addBotMessage('It is truly a blessing to meet you, ' + rawName + '! 🪶\n\nYour name carries the strength of your ancestors — the Freedmen who survived, endured, and built legacies within the Five Civilized Tribes. I\'m honored to walk this journey with you, ' + rawName + '.');
                // Show quick start guide on first visit
                if (!localStorage.getItem('bao_quickstart_shown')) {
                    setTimeout(function() { self.showQuickStartGuide(); }, 1800);
                } else {
                    this.addBotMessage('I\'m Roots AI Guide — I know 56 topics across Freedmen genealogy, tribal citizenship, DNA heritage, and the Williams/Johnson family history. I can navigate the app for you, search records, and guide you through every feature step by step.\n\nSo ' + rawName + ', what would you like to explore first?');
                    this.showChips(this.defaultChips);
                }
            }, 1200);
            return;
        }

        this.showTyping();
        const delay = Math.min(800 + text.length * 15, 2500);
        setTimeout(() => {
            this.hideTyping();
            this.processQuery(text);
        }, delay);
    },

    processQuery(query) {
        const q = query.toLowerCase().trim();
        const ctx = this.context;
        ctx.conversationDepth++;

        // === INTENT HARD OVERRIDE — runs BEFORE all page/topic handlers ===
        // Keywords always take priority. Only bypass for meta-queries (progress, guide, name, checklist, greetings, nav commands)
        var _metaPattern = /^(quick start|show guide|my progress|reset progress|start over|research |show |my name|i'm |im |call me|forget my name|hello|hi |hey |thank|bye|go to |open |navigate)/;
        if (!_metaPattern.test(q)) {
            var _hardIntent = detectIntent(q);
            if (_hardIntent !== 'unknown') {
                console.log('Intent Override Active:', _hardIntent);
                var _pageCtx = getPageContext();
                var _greet = this.userName ? (this.userName + ', you') : 'You';
                var _intentMsg = this._buildIntentResponse(_hardIntent, q, _pageCtx, _greet);
                this.addBotMessage(_intentMsg);
                this._pendingStepNotice = this.checkResearchProgress(q);
                this.showStepCompletionNotice();
                this.showChips(getIntentChips(_hardIntent, appState.currentPage));
                return;
            }
        }

        // 0a. Quick start guide replay
        if (/^(quick start|show guide|app guide|walkthrough|show me around|getting started guide|how does this app work|tutorial|show tutorial|replay guide|replay tutorial)/.test(q)) {
            this.addBotMessage('Let me walk you through everything again! 🪶');
            var self = this;
            setTimeout(function() { self.showQuickStartGuide(); }, 1000);
            return;
        }

        // 0b. Research progress query
        if (/^(my progress|research progress|show progress|how far|what have i done|what steps|journey progress|show my journey|what.s left|what.s remaining|remaining steps|completed steps)/.test(q)) {
            this.addBotMessage(this.getProgressSummary());
            this.showChips(this.getProgressChips());
            return;
        }
        if (/^(reset progress|clear progress|start over|reset my progress|reset research|restart journey)/.test(q)) {
            this.resetProgress();
            this.addBotMessage('🔄 Your research progress has been reset. Your journey starts fresh!' + (this.userName ? ' Let\'s go, ' + this.userName + '!' : '') + '\n\nExplore any topic to begin tracking your progress again.');
            this.showChips(this.defaultChips);
            return;
        }

        // 0b2. Tribal research checklist — generate new
        var tribalChecklistTribe = this.detectTribalChecklistQuery(q);
        if (tribalChecklistTribe) {
            var existing = this.getTribalChecklist(tribalChecklistTribe);
            var checklist = existing || this.generateTribalChecklist(tribalChecklistTribe);
            if (checklist) {
                var greet = this.userName ? this.userName + ', here' : 'Here';
                var isNew = !existing;
                var intro = isNew
                    ? ('&#128203; ' + greet + '\'s your personalized **' + checklist.tribeName + ' Freedmen Research Checklist**!\n\nI\'ve created a 10-step document tracker specifically for ' + checklist.tribeName + ' Freedmen research. Tap any item to mark it complete &#10004;\n\n')
                    : ('&#128203; ' + greet + '\'s your **' + checklist.tribeName + ' Research Checklist** — let\'s keep going!\n\n');
                this.addBotMessage(intro + this.renderChecklistHTML(checklist));
                this.showChips(['My checklists', 'Show ' + checklist.tribe + ' checklist', 'Search Dawes Rolls', 'Go to Resources']);
                return;
            }
        }

        // 0b3. Tribal research checklist — show existing
        var showChecklistTribe = this.detectShowChecklistQuery(q);
        if (showChecklistTribe) {
            if (showChecklistTribe === '__summary__') {
                this.addBotMessage(this.showChecklistSummary());
                var allCl = this.getAllTribalChecklists();
                var clChips = allCl.map(function(c) { return 'Show ' + c.tribe + ' checklist'; });
                clChips.push('Search Dawes Rolls');
                this.showChips(clChips.length > 1 ? clChips : ['Research Cherokee', 'Research Choctaw', 'Research Creek', 'Research Chickasaw', 'Research Seminole']);
                return;
            }
            var showCl = this.getTribalChecklist(showChecklistTribe);
            if (showCl) {
                var showGreet = this.userName ? this.userName + ', here' : 'Here';
                this.addBotMessage('&#128203; ' + showGreet + '\'s your **' + showCl.tribeName + ' Research Checklist**:\n\n' + this.renderChecklistHTML(showCl));
                this.showChips(['My checklists', 'Search Dawes Rolls', 'Go to Resources']);
                return;
            } else {
                this.addBotMessage('You don\'t have a checklist for that tribe yet. Want me to create one?\n\nJust say "Research ' + showChecklistTribe.charAt(0).toUpperCase() + showChecklistTribe.slice(1) + '" and I\'ll generate it!');
                this.showChips(['Research ' + showChecklistTribe.charAt(0).toUpperCase() + showChecklistTribe.slice(1), 'My checklists']);
                return;
            }
        }

        // 0b4. Check research progress triggers (runs silently, acknowledgment added after response)
        this._pendingStepNotice = this.checkResearchProgress(q);

        // 0c. Handle name change mid-conversation
        var nameChangeMatch = q.match(/^(?:my name is|i'm|im|i am|call me|they call me)\s+([a-zA-Z'-]+)/);
        if (nameChangeMatch) {
            var newName = nameChangeMatch[1].charAt(0).toUpperCase() + nameChangeMatch[1].slice(1).toLowerCase();
            this.userName = newName;
            localStorage.setItem('bao_user_name', newName);
            this.addBotMessage('Beautiful name, ' + newName + '! 🪶 I\'ll remember you from now on. Welcome to Black Ancestral Origins — your heritage journey starts here, ' + newName + '.\n\nWhat would you like to explore?');
            this.showChips(this.defaultChips);
            return;
        }
        var forgetNameMatch = q.match(/^(?:forget my name|reset my name|change my name|new name)/);
        if (forgetNameMatch) {
            this.userName = null;
            this.awaitingName = true;
            localStorage.removeItem('bao_user_name');
            var nameInput = document.getElementById('chat-input');
            if (nameInput) nameInput.placeholder = 'Type your name...';
            this.addBotMessage('No problem! I\'ve cleared your name. What would you like me to call you?');
            return;
        }

        // 1. Check conversational patterns (greetings, meta-questions)
        for (const cp of this.conversationPatterns) {
            if (cp.patterns.some(p => q.includes(p) || q === p)) {
                var cpResponse = cp.response;
                // Personalize greeting patterns with user name
                if (this.userName && cp.patterns.includes('hello')) {
                    cpResponse = cpResponse.replace('Welcome!', 'Welcome, ' + this.userName + '!');
                }
                if (this.userName && cp.patterns.includes('thank')) {
                    cpResponse = cpResponse.replace('You\'re welcome!', 'You\'re welcome, ' + this.userName + '!');
                }
                this.addBotMessage(cpResponse);
                this.showStepCompletionNotice();
                this.showChips(cp.chips || this.defaultChips);
                return;
            }
        }

        // 2. GUIDED TOUR — detect "how do I use X" type questions and point to features
        const guide = this.detectFeatureGuide(q);
        if (guide.matched) {
            const fp = guide.pointer;
            // Navigate to page if specified
            if (fp.page) {
                BAO_App.navigate(fp.page);
            }
            this.addBotMessage(guide.response);
            this.showStepCompletionNotice();
            // Point to the element after page renders using showGuideArrow
            const guideSelector = fp.selector;
            const guideLabel = fp.label || '';
            setTimeout(function(){ showGuideArrow(guideSelector, guideLabel); }, fp.onPage ? 600 : 400);
            this.showChips(guide.chips || this.defaultChips);
            return;
        }

        // 3. Deep follow-up detection — if user wants more on last topic
        if (ctx.lastCategory && this.deepFollowUps[ctx.lastCategory]) {
            for (const followUp of this.deepFollowUps[ctx.lastCategory]) {
                if (followUp.trigger.some(t => q.includes(t))) {
                    this.addBotMessage(followUp.response);
                    this.showChips(followUp.chips || this.defaultChips);
                    return;
                }
            }
        }

        // 4. Role selection
        if (/^(genealogy|genealogy help|genealogy expert|research help)$/.test(q)) {
            ctx.currentRole = 'genealogy';
            this.addBotMessage('🏛️ Genealogy Expert mode activated!\n\nI have deep knowledge of:\n• Dawes Rolls & how to read enrollment cards\n• Tribal citizenship for all 5 tribes\n• Your Williams & Johnson family ancestors\n• DNA testing interpretation for Freedmen descendants\n• Freedmen Bureau records & Tribal Census Records\n• Black Indigenous history from pre-removal to present\n\nAsk me anything — I can go as deep as you need on any topic. The more you ask, the more detailed I get.');
            this.showChips(this.roleChips.genealogy);
            return;
        }
        if (/^(navigate|tour|app guide|app navigator|navigate the app|tour the app|tour all|how do i use)/.test(q)) {
            ctx.currentRole = 'navigator';
            this.addBotMessage('📱 App Navigator mode!\n\nThis app has 18 pages across 5 sections. I\'ll walk you through each one:\n\n📂 EXPLORE (4 pages):\n  • Home — Dashboard with quick actions\n  • Getting Started — Beginner\'s guide\n  • Family Tree — Visual ancestral connections\n  • Ancestor Profiles — Detailed ancestor records\n\n📂 RECORDS (4 pages):\n  • Dawes Rolls — Search enrollment records\n  • Freedmen Records — Bureau documents\n  • Tribal Census Records — Census records\n  • Land Allotments — Territory parcels\n\n📂 HERITAGE (4 pages):\n  • DNA & Heritage — Genetic analysis\n  • Migration Routes — Interactive Leaflet.js map\n  • Historical Timeline — Key events\n  • Name Origins — Surname histories\n\n📂 PRESERVE (3 pages):\n  • Document Vault — Store research files\n  • Photo Gallery — Family photos\n  • Oral Histories — Recorded stories\n\n📂 CONNECT (3 pages):\n  • Community — Connect with descendants\n  • Resource Library — External links\n  • Settings — Profile & data management\n\nSay any page name and I\'ll take you there and explain how to use it!');
            this.showChips(this.roleChips.navigator);
            return;
        }
        if (/^(tech|support|technical|troubleshoot|help me fix|something broken|not working)/.test(q)) {
            ctx.currentRole = 'support';
            this.addBotMessage('🔧 Tech Support mode!\n\nI can help troubleshoot:\n• Data issues (missing records, disappeared entries)\n• Search not returning results\n• Display/styling problems\n• Mobile navigation\n• Data export & backup\n• Browser compatibility\n\nDescribe your issue and I\'ll walk you through the fix.');
            this.showChips(this.roleChips.support);
            return;
        }
        if (/^(tribal id|citizenship|enroll|how to get tribal|tribal card|get enrolled)/.test(q) || q.includes('help me get tribal')) {
            ctx.currentRole = 'citizenship';
            this.addBotMessage('🪪 Tribal Citizenship Guide!\n\nI have complete step-by-step instructions for obtaining citizenship in all Five Civilized Tribes:\n\n1. 🏛️ Cherokee Nation — Freedmen have FULL citizenship rights (2017 ruling)\n2. 🏛️ Choctaw Nation — Requires Dawes Roll lineage proof\n3. 🏛️ Muscogee (Creek) Nation — Citizenship Board review\n4. 🏛️ Chickasaw Nation — Blood quantum currently required\n5. 🏛️ Seminole Nation — Two Freedmen bands recognized\n\nEach guide includes: required documents, mailing addresses, phone numbers, processing times, and pro tips.\n\nWhich tribe would you like to start with?');
            this.showChips(this.roleChips.citizenship);
            return;
        }

        // 5. Family member queries
        if (q.includes('family') || q.includes('williams') || q.includes('johnson') || q.includes('my ancestors') || q.includes('my family')) {
            if (q.includes('robert') || q.includes('2241') || q.includes('card')) {
                const topic = this.topics.find(t => t.id === 11);
                if (topic) { this.respondWithTopic(topic, 'family-history'); return; }
            }
            if (!q.includes('robert') && !q.includes('samuel') && !q.includes('mary') && !q.includes('clara') && !q.includes('james') && !q.includes('dorothy')) {
                ctx.lastCategory = 'family-history';
                this.addBotMessage('👨‍👩‍👧‍👦 Your Williams & Johnson Family:\n\nI have detailed profiles for 6 documented ancestors:\n\n🧓🏿 Robert Williams — Choctaw Freedman, Dawes Card #2241\n  Born c. 1858 | Farmer | Atoka, Indian Territory\n  Head of household, received land allotment\n\n👩🏾 Clara Williams — Wife of Robert\n  Born c. 1862 | Homemaker/Farmer\n  Likely on same Dawes Card #2241\n\n👨🏿 James Williams — Son of Robert & Clara\n  Born c. 1885 | Farmer/Laborer\n  Minor child on Card #2241\n\n👩🏾 Dorothy Williams — Daughter of Robert & Clara\n  Born c. 1890 | Teacher/Community leader\n  Born in Indian Territory before statehood\n\n🧓🏿 Samuel Johnson — Paternal line connection\n  Born c. 1835 | Formerly enslaved in Choctaw Nation\n\n👩🏾 Mary Johnson — Wife of Samuel\n  Born c. 1840 | Choctaw Freedwoman\n\nWho would you like to learn more about?');
                this.showChips(['Robert Williams Card 2241', 'Clara Williams', 'James Williams', 'Dorothy Williams', 'Samuel Johnson', 'Mary Johnson']);
                return;
            }
        }

        // 6. Task execution — detect action intent
        for (const [key, task] of Object.entries(this.taskActions)) {
            if (q.includes(key) || (key.split(' ').every(w => q.includes(w)))) {
                BAO_App.navigate(task.page);
                this.addBotMessage('✅ ' + task.description);
                this.showStepCompletionNotice();
                if (task.highlight) {
                    setTimeout(function(){ showGuideArrow(task.highlight, task.page.replace(/-/g,' ')); }, 800);
                }
                ctx.lastCategory = key.includes('dawes') ? 'dawes-rolls' : key.includes('tribal') ? 'tribal-citizenship' : null;
                this.showChips(['Tell me more', 'Go to Home', 'Search my ancestors', 'Help me get tribal ID']);
                return;
            }
        }

        // 7. Extended navigation with intelligent responses
        const navMap = {
            'go to dawes': 'dawes-rolls', 'dawes rolls page': 'dawes-rolls', 'open dawes': 'dawes-rolls',
            'go to family tree': 'family-tree', 'show tree': 'family-tree', 'open tree': 'family-tree', 'show me my family': 'family-tree',
            'go to timeline': 'historical-timeline', 'show timeline': 'historical-timeline', 'history timeline': 'historical-timeline',
            'go to oral histories': 'oral-histories', 'record story': 'oral-histories', 'oral history': 'oral-histories',
            'go to community': 'community', 'connect with others': 'community',
            'go to settings': 'settings', 'open settings': 'settings', 'export data': 'settings', 'backup data': 'settings', 'export my data': 'settings',
            'go to resources': 'resources', 'resource library': 'resources', 'research resources': 'resources',
            'go to dna': 'dna-heritage', 'dna test': 'dna-heritage', 'dna heritage': 'dna-heritage', 'heritage test': 'dna-heritage',
            'go to home': 'home', 'go home': 'home', 'main page': 'home',
            'go to ancestor': 'ancestor-profiles', 'ancestor profiles': 'ancestor-profiles', 'add ancestor': 'ancestor-profiles',
            'go to document': 'document-vault', 'document vault': 'document-vault', 'upload document': 'document-vault',
            'go to photo': 'photo-gallery', 'photo gallery': 'photo-gallery', 'upload photo': 'photo-gallery',
            'go to name': 'name-origins', 'name origins': 'name-origins', 'surname history': 'name-origins',
            'go to land': 'land-allotments', 'land allotments': 'land-allotments', 'allotment records': 'land-allotments',
            'go to migration': 'migration-routes', 'migration map': 'migration-routes', 'migration routes': 'migration-routes', 'show map': 'migration-routes', 'migration': 'migration-routes', 'freedmen migration': 'migration-routes',
            'go to getting started': 'getting-started', 'getting started': 'getting-started', 'beginner guide': 'getting-started', 'how to start': 'getting-started',
            'go to freedmen': 'freedmen-records', 'freedmen records page': 'freedmen-records',
            'go to slave': 'slave-schedules', 'slave schedules page': 'slave-schedules',
        };
        for (const [key, page] of Object.entries(navMap)) {
            if (q.includes(key)) {
                BAO_App.navigate(page);
                const pageName = BAO_App.pageNames[page] || page;
                const task = Object.values(this.taskActions).find(t => t.page === page);
                const desc = task ? task.description : 'Explore this section and let me know if you need any guidance.';
                this.addBotMessage('📍 Navigated to ' + pageName + '!\n\n' + desc);
                this.showStepCompletionNotice();
                if (task && task.highlight) {
                    setTimeout(function(){ showGuideArrow(task.highlight, task.page.replace(/-/g,' ')); }, 800);
                }
                this.showChips(['Tell me more', 'Tour the app', 'Go to Home', 'Search my ancestors']);
                return;
            }
        }

        // 8. Check family members by name
        if (q.includes('robert') && (q.includes('williams') || q.includes('card') || q.includes('2241'))) {
            this.respondWithTopic(this.topics.find(t => t.id === 11), 'family-history');
            return;
        }
        for (const [key, data] of Object.entries(this.family)) {
            const names = data.name.toLowerCase().split(' ');
            if (names.some(n => n.length > 3 && q.includes(n))) {
                const topic = this.topics.find(t => t.keywords.some(k => q.includes(k)));
                if (topic) { this.respondWithTopic(topic, 'family-history'); return; }
                // Direct family response
                this.addBotMessage('👤 ' + data.name + '\n\n' +
                    '• Relation: ' + (data.relation || 'Primary ancestor') + '\n' +
                    '• Tribe: ' + (data.tribe || 'Unknown') + '\n' +
                    '• Born: ' + (data.birth || 'Unknown') + '\n' +
                    '• Died: ' + (data.death || 'Unknown') + '\n' +
                    '• Occupation: ' + (data.occupation || 'Unknown') + '\n\n' +
                    '📝 Notes: ' + data.notes + '\n\nWould you like to explore their records further or learn about another family member?');
                this.showStepCompletionNotice();
                ctx.lastCategory = 'family-history';
                ctx.mentionedAncestors.push(key);
                this.showChips(['Tell me more', 'Other family members', 'Search Dawes Rolls', 'Go to Family Tree']);
                return;
            }
        }

        // 9. Topic matching with improved scoring
        let bestMatch = null;
        let bestScore = 0;
        const qWords = q.split(/\s+/);
        for (const topic of this.topics) {
            let score = 0;
            for (const kw of topic.keywords) {
                if (q.includes(kw)) {
                    score += kw.split(' ').length * 3 + kw.length;
                }
            }
            // Boost score if matches current role context
            if (ctx.currentRole === 'genealogy' && topic.id <= 20) score *= 1.3;
            if (ctx.currentRole === 'navigator' && topic.id >= 36) score *= 1.3;
            if (ctx.currentRole === 'support' && topic.id >= 45) score *= 1.3;
            if (ctx.currentRole === 'citizenship' && topic.id >= 51) score *= 1.5;

            if (score > bestScore) {
                bestScore = score;
                bestMatch = topic;
            }
        }

        if (bestMatch && bestScore > 3) {
            // Determine category for follow-ups
            let cat = null;
            if (bestMatch.id <= 10) cat = 'dawes-rolls';
            else if (bestMatch.id >= 51) cat = 'tribal-citizenship';
            else if (bestMatch.id >= 11 && bestMatch.id <= 16) cat = 'family-history';
            this.respondWithTopic(bestMatch, cat);
            return;
        }

        // 10. Fuzzy matching — try partial word matches
        let fuzzyMatch = null;
        let fuzzyScore = 0;
        for (const topic of this.topics) {
            let score = 0;
            for (const kw of topic.keywords) {
                const kwWords = kw.split(' ');
                for (const kw2 of kwWords) {
                    if (kw2.length > 3 && qWords.some(qw => qw.includes(kw2) || kw2.includes(qw))) {
                        score += 2;
                    }
                }
            }
            if (score > fuzzyScore) { fuzzyScore = score; fuzzyMatch = topic; }
        }
        if (fuzzyMatch && fuzzyScore > 3) {
            this.respondWithTopic(fuzzyMatch);
            return;
        }

        // 11. Intent-routed fallback with page awareness
        var intent = parseIntent(q);
        var pageCtx = getPageContext();
        var fallbackGreet = this.userName ? (this.userName + ', you') : 'You';

        if (intent !== 'unknown') {
            // Route to page-aware intent response
            var intentMsg = this._buildIntentResponse(intent, q, pageCtx, fallbackGreet);
            this.addBotMessage(intentMsg);
            this.showStepCompletionNotice();
            this.showChips(getIntentChips(intent, appState.currentPage));
        } else {
            // Strict fallback with 3 page-contextual options
            var pageOptions = this._getPageOptions();
            this.addBotMessage(fallbackGreet + '\'re currently on ' + pageCtx + '.\n\nI can help with these topics:\n\n' + pageOptions + '\n\nOr ask me about Dawes Rolls, DNA testing, tribal citizenship, or any of our 56 topics.');
            this.showStepCompletionNotice();
            this.showChips(this._getPageChips());
        }
    },

    getContextualSuggestions(q) {
        if (q.includes('how') || q.includes('help') || q.includes('guide')) {
            return '📖 It sounds like you need guidance. I can:\n  • Walk you through any app feature\n  • Explain how to research Freedmen ancestry\n  • Guide you through tribal citizenship applications\n  • Show you how to search records';
        }
        if (q.includes('find') || q.includes('search') || q.includes('look') || q.includes('where')) {
            return '🔍 Looking for something? I can:\n  • Search the Dawes Rolls for your ancestor\n  • Find Freedmen Bureau records\n  • Look up tribal citizenship requirements\n  • Navigate to any page in the app';
        }
        if (q.includes('history') || q.includes('learn') || q.includes('tell') || q.includes('explain') || q.includes('what')) {
            return '📚 Want to learn? I have deep knowledge of:\n  • Black Indigenous Freedmen history\n  • The Five Civilized Tribes & removal\n  • Treaty rights & citizenship battles\n  • DNA heritage for Freedmen descendants\n  • Your Williams/Johnson family story';
        }
        return '🪶 I specialize in:\n  • Genealogy research & Dawes Rolls\n  • Tribal citizenship (all 5 tribes)\n  • Your family ancestors\n  • App features & navigation\n  • Freedmen history & heritage';
    },

    getSmartChips(q) {
        if (q.includes('search') || q.includes('find') || q.includes('look')) return ['Search Dawes Rolls', 'Search Freedmen records', 'Find my ancestors', 'Tour the app'];
        if (q.includes('how') || q.includes('help')) return ['Getting started guide', 'How to search records', 'How to get tribal ID', 'Tour all 18 pages'];
        if (q.includes('history') || q.includes('tell') || q.includes('learn')) return ['What are Freedmen?', 'Treaty of 1866', 'Teach me something', 'Williams family history'];
        return this.defaultChips;
    },

    // ============== INTENT-BASED RESPONSE BUILDERS ==============
    _buildIntentResponse(intent, q, pageCtx, greet) {
        var ctx = 'You\'re on ' + pageCtx + '. ';
        var res = BAO_DATA.resources || [];
        // Determine sub-intent for more precise source matching
        var sourceIntent = intent;
        if (intent === 'tree') {
            var ql = (q || '').toLowerCase();
            if (ql.indexOf('family tree') > -1 || ql.indexOf('build') > -1 || ql.indexOf('pedigree') > -1) sourceIntent = 'family_tree';
            else if (ql.indexOf('ancestor') > -1 || ql.indexOf('lineage') > -1) sourceIntent = 'ancestors';
        }
        var sources = getRelevantSources(sourceIntent, appState.currentPage);
        var srcHTML = formatSourcesHTML(sources);
        switch (intent) {
            case 'freedmen':
                return ctx + '**Freedmen Research — Step-by-Step Guide**\n\n' +
                    'The Freedmen were formerly enslaved Black people held by the Five Civilized Tribes.\n\n' +
                    '**1. Learn the History** — Understand the 1866 Reconstruction Treaties that granted Freedmen citizenship rights in all Five Tribes after the Civil War.\n\n' +
                    '**2. Search the Dawes Rolls** — Between 1898-1914, the Dawes Commission enrolled over 23,000 Freedmen on separate rolls. Find your ancestor by surname and tribe.\n\n' +
                    '**3. Review Freedmen Bureau Records** — Check labor contracts, marriage registers, and ration lists from the Bureau of Refugees, Freedmen, and Abandoned Lands (1865-1872).\n\n' +
                    '**4. Understand Citizenship Status** — Cherokee Freedmen won full rights in the 2017 Nash ruling. Choctaw, Chickasaw, Creek, and Seminole Freedmen descendants continue to fight for recognition.\n\n' +
                    '**5. Build Your Documentation** — Collect Dawes cards, enrollment jackets, census records, and land allotment documents to establish your lineage.\n\n' +
                    '&#128161; *Start with Step 1 to begin your research. DNA alone cannot prove Freedmen heritage — paper records are essential.*' + srcHTML;
            case 'citizenship':
                return ctx + '**Tribal Citizenship — Step-by-Step Guide**\n\n' +
                    '**1. Identify Your Tribe** — Determine which of the Five Civilized Tribes your Freedmen ancestor belonged to (Cherokee, Choctaw, Creek, Chickasaw, or Seminole).\n\n' +
                    '**2. Find Your Dawes Roll Ancestor** — Search enrollment records for your direct ancestor. You must prove lineal descent from someone on the Dawes Freedman rolls.\n\n' +
                    '**3. Gather Required Documents** — Birth certificates, marriage records, and death certificates establishing the chain of descent from your Dawes enrollee to you.\n\n' +
                    '**4. Contact the Tribal Enrollment Office** — Cherokee: cherokee.org (full Freedmen rights). Creek: mcn-nsn.gov. Choctaw: choctawnation.com. Chickasaw: chickasaw.net. Seminole: sno-nsn.gov.\n\n' +
                    '**5. Submit Your Application** — Complete the tribal enrollment application with all supporting documentation. Processing times vary (3-12 months).\n\n' +
                    '&#128161; *Start with Step 1. Cherokee Nation is currently the only tribe granting full citizenship to Freedmen descendants without blood quantum.*' + srcHTML;
            case 'dna':
                var dnaRes = res.filter(function(r){ return r.category === 'DNA'; });
                return ctx + '**DNA Testing — Step-by-Step Guide**\n\n' +
                    '**1. Choose Your Test Type** — Autosomal DNA (AncestryDNA, 23andMe) shows ethnicity and finds relatives. Y-DNA and mtDNA (FamilyTreeDNA) trace direct paternal/maternal lines.\n\n' +
                    '**2. Order From FamilyTreeDNA First** — The only company offering all 3 test types. Best for identifying Indigenous haplogroups (A, B, C, D for maternal; Q, C for paternal).\n\n' +
                    '**3. Take AncestryDNA Second** — Largest database (22M+ people). Look for "Indigenous Americas" in your ethnicity estimate and "Oklahoma Settlers" genetic community.\n\n' +
                    '**4. Interpret Your Results** — Many Freedmen descendants show 5-20% Indigenous American DNA reflecting generations of intermarriage in Indian Territory.\n\n' +
                    '**5. Combine DNA + Paper Records** — DNA supports but cannot prove tribal citizenship. Cross-reference genetic matches with Dawes Roll documentation for strongest evidence.\n\n' +
                    '&#128161; *Start with Step 1. We have ' + dnaRes.length + ' verified DNA resources in the Resource Library.*' + srcHTML;
            case 'tree':
                var _userAnc = (typeof BAO_Utils !== 'undefined') ? BAO_Utils.ancestors.getAll() : [];
                var _sampleNames = Object.keys(this.family || {});
                var _sampleCount = _sampleNames.length;
                var _totalAnc = _userAnc.length + _sampleCount;
                var _treeMsg = '';
                if (_totalAnc > 0) {
                    _treeMsg = ctx + '**Family Tree — Your Ancestors**\n\n';
                    if (_sampleCount > 0) {
                        var _topAnc = [];
                        for (var _k in this.family) { _topAnc.push('**' + this.family[_k].name + '** — ' + (this.family[_k].tribe || '') + (this.family[_k].relation ? ', ' + this.family[_k].relation : '')); }
                        _treeMsg += 'You have **' + _totalAnc + ' documented ancestor' + (_totalAnc > 1 ? 's' : '') + '**' + (_userAnc.length > 0 ? ' (' + _sampleCount + ' sample + ' + _userAnc.length + ' added by you)' : '') + ':\n\n';
                        _treeMsg += _topAnc.slice(0, 4).map(function(a){ return '• ' + a; }).join('\n') + '\n';
                        if (_topAnc.length > 4) _treeMsg += '• ...and ' + (_topAnc.length - 4) + ' more\n';
                    }
                    if (_userAnc.length > 0) {
                        _treeMsg += '\n**Your Added Ancestors:**\n';
                        _treeMsg += _userAnc.slice(0, 3).map(function(a){ return '• **' + (a.name || 'Unnamed') + '** — ' + (a.tribe || 'Unknown tribe') + (a.birth ? ', born ' + a.birth : ''); }).join('\n') + '\n';
                        if (_userAnc.length > 3) _treeMsg += '• ...and ' + (_userAnc.length - 3) + ' more\n';
                    }
                    _treeMsg += '\nAsk about any ancestor by name, or add new ones on the Family Tree page.';
                } else {
                    _treeMsg = ctx + '**Family Tree**\n\nYour family tree will display documented ancestors as you add records. Start by searching the Dawes Rolls for your family surname, then add ancestors to build your tree.\n\n• Visit the **Family Tree** page to begin\n• Use **Ancestor Profiles** to add detailed records\n• Search **Dawes Rolls** to find enrolled ancestors';
                }
                return _treeMsg + srcHTML;
            case 'records':
                var dawes = (BAO_DATA.dawesRolls || []).length;
                return ctx + '**Records Research — Step-by-Step Guide**\n\n' +
                    '**1. Search the Dawes Rolls** — Our database has ' + dawes + ' entries searchable by name, tribe, and enrollment status. Start with your family surname.\n\n' +
                    '**2. Check Freedmen Bureau Records** — Review labor contracts, marriage registers, and ration lists from the Bureau of Refugees, Freedmen, and Abandoned Lands (1865-1872).\n\n' +
                    '**3. Review Tribal Census Records** — Examine pre-Dawes census rolls from all Five Civilized Tribes. These list family members, ages, and tribal districts.\n\n' +
                    '**4. Research Land Allotments** — Find allotment records showing land parcels assigned to Freedmen in Indian Territory. Cross-reference with Dawes card numbers.\n\n' +
                    '**5. Request Enrollment Jackets** — Contact the National Archives in Fort Worth, TX (Record Group 75) for the full application file behind each Dawes card.\n\n' +
                    '&#128161; *Start with Step 1 — the Dawes Rolls are the foundation of all Freedmen genealogy research.*' + srcHTML;
            case 'video':
                var courses = (BAO_DATA.videoSlideshows || []).length;
                return ctx + 'The Video Learning Center has:\n\n' +
                    '• **' + courses + ' educational courses** with 48 total slides\n' +
                    '• Topics: Dawes Rolls, Five Tribes history, tribal citizenship, DNA testing, 1866 Treaties, Trail of Tears\n' +
                    '• Voice narration on every slide\n\n' +
                    'Ready to start a course?' + srcHTML;
            case 'resources':
                return ctx + 'The Resource Library has **' + res.length + '+ verified resources**:\n\n' +
                    '• Government archives (National Archives, BIA)\n' +
                    '• Tribal websites (all 5 nations)\n' +
                    '• Books on Black Indigenous history\n' +
                    '• DNA testing services\n' +
                    '• Organizations and advocacy groups\n\n' +
                    'Resources are ranked by authority with verified badges.' + srcHTML;
            case 'migration':
                return ctx + 'The Migration Routes map shows:\n\n' +
                    '• **7 animated gold routes** from the Southeast to Indian Territory\n' +
                    '• **Waypoint markers** with historical popups\n' +
                    '• The Trail of Tears paths for all Five Tribes\n' +
                    '• Freedmen migration patterns to Oklahoma\n\n' +
                    'Tap any waypoint on the map for historical details.' + srcHTML;
            case 'community':
                return ctx + 'The Community page includes:\n\n' +
                    '• **Discussion posts** with tribe tags and replies\n' +
                    '• **Discoveries** shared by other researchers\n' +
                    '• **Research tips** from experienced genealogists\n' +
                    '• **Rights & advocacy** updates for Freedmen descendants\n\n' +
                    'Connect with other descendants researching their heritage.' + srcHTML;
            case 'chatbot':
                return ctx + 'I\'m Roots AI Guide — here\'s what I can do:\n\n' +
                    '• **56 research topics** across Freedmen genealogy\n' +
                    '• **Navigate any page** — just say "go to" + page name\n' +
                    '• **Track your progress** through 15 research milestones\n' +
                    '• **Generate tribal checklists** for each nation\n\n' +
                    'Say "Quick Start Guide" for a full walkthrough.' + srcHTML;
            default:
                return ctx + 'I can help with DNA, records, family tree, migration routes, and more. What interests you?' + srcHTML;
        }
    },

    _getPageOptions() {
        var p = appState.currentPage || 'home';
        var opts = {
            'home': '1. &#128220; Search the Dawes Rolls for your ancestors\n2. &#129516; Explore DNA & Heritage testing\n3. &#128101; Connect with the Community',
            'dna-heritage': '1. &#129516; Compare DNA testing companies\n2. &#128270; Interpret Indigenous haplogroups\n3. &#128218; View DNA resources from our library',
            'dawes-rolls': '1. &#128269; Search for a specific surname\n2. &#128196; Understand card numbers & enrollment\n3. &#128101; Find Robert Williams Card #2241',
            'freedmen-records': '1. &#128240; Browse Freedmen Bureau documents\n2. &#128141; Search marriage records\n3. &#128221; Find labor contracts',
            'family-tree': '1. &#128100; View ancestor profiles\n2. &#128101; Explore the Williams/Johnson family\n3. &#10133; Add a new ancestor',
            'migration-routes': '1. &#128506; View animated migration routes\n2. &#128205; Explore waypoint markers\n3. &#128214; Trail of Tears history',
            'resources': '1. &#128218; Browse all verified resources\n2. &#129516; DNA testing services\n3. &#128214; Books on Black Indigenous history',
            'video-learning': '1. &#127916; Start a learning course\n2. &#128220; Dawes Rolls Complete Guide\n3. &#128214; 1866 Treaties Explained',
            'community': '1. &#128172; Read community posts\n2. &#128161; Research tips\n3. &#9878; Rights & advocacy updates'
        };
        return opts[p] || opts['home'];
    },

    _getPageChips() {
        var p = appState.currentPage || 'home';
        var chips = {
            'home': ['Search Dawes Rolls', 'DNA & Heritage', 'Quick Start Guide'],
            'dna-heritage': ['Compare DNA tests', 'Haplogroups explained', 'Go to Resources'],
            'dawes-rolls': ['Search by surname', 'Card 2241', 'What are Dawes Rolls?'],
            'freedmen-records': ['Bureau records', 'Marriage records', 'Labor contracts'],
            'family-tree': ['Robert Williams', 'Clara Williams', 'Add ancestor'],
            'migration-routes': ['Trail of Tears', 'Migration history', 'Indian Territory'],
            'resources': ['DNA resources', 'Books', 'Tribal websites'],
            'video-learning': ['Start a course', 'Dawes Rolls guide', '1866 Treaties'],
            'community': ['Community posts', 'Research tips', 'Rights info']
        };
        return chips[p] || chips['home'];
    },

    respondWithTopic(topic, category) {
        this.addBotMessage(topic.response);
        if (category) this.context.lastCategory = category;
        this.context.lastTopic = topic.id;
        this.context.sessionTopics.push(topic.id);

        // Show step completion acknowledgment if any steps were just completed
        this.showStepCompletionNotice();

        // Add follow-up prompt for depth
        if (this.context.conversationDepth > 1 && category && this.deepFollowUps[category]) {
            setTimeout(() => {
                this.addBotMessage('💡 Want to go deeper? Say "tell me more" and I\'ll share advanced details, research strategies, and pro tips on this topic.');
            }, 1500);
        }

        if (topic.chips) {
            this.showChips([...topic.chips, 'Tell me more']);
        } else {
            this.showChips(this.defaultChips);
        }
    },

    addUserMessage(text) {
        const container = document.getElementById('chat-messages');
        const msg = document.createElement('div');
        msg.className = 'chat-msg user-msg';
        msg.innerHTML = `<div class="msg-bubble user-bubble">${this.escapeHTML(text)}</div>`;
        container.appendChild(msg);
        this.scrollToBottom();
    },

    addBotMessage(text) {
        const container = document.getElementById('chat-messages');
        const msg = document.createElement('div');
        msg.className = 'chat-msg bot-msg';
        // Personalize with user name if known and not already containing their name
        var personalizedText = text;
        if (this.userName && !this.awaitingName && text.indexOf(this.userName) === -1) {
            // Add personal touch — prepend name to response periodically
            var msgCount = container.querySelectorAll('.bot-msg').length;
            if (msgCount > 0 && msgCount % 2 === 0) {
                personalizedText = this.userName + ', ' + text.charAt(0).toLowerCase() + text.slice(1);
            } else if (msgCount > 0 && msgCount % 3 === 0) {
                personalizedText = text + '\n\nLet me know if you need anything else, ' + this.userName + '! 🪶';
            }
        }
        const formatted = personalizedText.replace(/\n/g, '<br>').replace(/•/g, '<span style="color:var(--accent)">•</span>');
        var ttsId = 'tts-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
        msg.innerHTML = `
            <div class="bot-avatar"><img src="https://i.imgur.com/T13NIA3.png" alt="Guide" class="bot-avatar-img"></div>
            <div class="msg-bubble bot-bubble">
                ${formatted}
                <button class="tts-btn" id="${ttsId}" onclick="BAO_Chatbot.speakMessage(this)" aria-label="Read aloud" title="Read aloud">&#128264;</button>
            </div>
        `;
        // Store plain text for TTS on the button element
        msg.querySelector('.tts-btn').setAttribute('data-tts', personalizedText);
        container.appendChild(msg);
        this.scrollToBottom();
    },

    // ============== TEXT TO SPEECH ==============
    _ttsUtterance: null,
    _ttsSpeakingBtn: null,

    speakMessage(btn) {
        var synth = window.speechSynthesis;
        if (!synth) return;

        // If already speaking this message, stop it
        if (this._ttsSpeakingBtn === btn && synth.speaking) {
            synth.cancel();
            this._stopSpeakingState(btn);
            return;
        }

        // Stop any currently speaking message
        if (synth.speaking) {
            synth.cancel();
            if (this._ttsSpeakingBtn) {
                this._stopSpeakingState(this._ttsSpeakingBtn);
            }
        }

        var text = btn.getAttribute('data-tts') || '';
        // Clean text for speech — remove emojis, markdown, HTML entities, special chars
        text = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1FA00}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '');
        text = text.replace(/\*\*/g, '');
        text = text.replace(/&#\d+;/g, '');
        text = text.replace(/[•▸★✅✓✔☆●◆]/g, '');
        text = text.replace(/\n+/g, '. ');
        text = text.replace(/\s{2,}/g, ' ').trim();
        if (!text) return;

        var utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.92;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Select a warm clear voice
        var voices = synth.getVoices();
        var preferred = ['Samantha', 'Microsoft Zira', 'Google US English', 'Karen', 'Victoria', 'Moira', 'Tessa', 'Fiona'];
        var selectedVoice = null;
        for (var i = 0; i < preferred.length; i++) {
            for (var j = 0; j < voices.length; j++) {
                if (voices[j].name.indexOf(preferred[i]) !== -1) {
                    selectedVoice = voices[j];
                    break;
                }
            }
            if (selectedVoice) break;
        }
        // Fallback: pick first English female voice, or first English voice
        if (!selectedVoice) {
            for (var k = 0; k < voices.length; k++) {
                if (voices[k].lang.startsWith('en') && voices[k].name.toLowerCase().match(/female|woman|zira|samantha|karen|victoria/)) {
                    selectedVoice = voices[k];
                    break;
                }
            }
        }
        if (!selectedVoice) {
            for (var k = 0; k < voices.length; k++) {
                if (voices[k].lang.startsWith('en')) {
                    selectedVoice = voices[k];
                    break;
                }
            }
        }
        if (selectedVoice) utterance.voice = selectedVoice;

        this._ttsUtterance = utterance;
        this._ttsSpeakingBtn = btn;

        // Set speaking state
        btn.classList.add('tts-speaking');
        btn.innerHTML = '&#128266;';

        var self = this;
        utterance.onend = function() { self._stopSpeakingState(btn); };
        utterance.onerror = function() { self._stopSpeakingState(btn); };

        synth.speak(utterance);
    },

    _stopSpeakingState(btn) {
        if (btn) {
            btn.classList.remove('tts-speaking');
            btn.innerHTML = '&#128264;';
        }
        this._ttsSpeakingBtn = null;
        this._ttsUtterance = null;
    },

    showTyping() {
        const container = document.getElementById('chat-messages');
        const typing = document.createElement('div');
        typing.className = 'chat-msg bot-msg';
        typing.id = 'typing-indicator';
        typing.innerHTML = `
            <div class="bot-avatar"><img src="https://i.imgur.com/T13NIA3.png" alt="Guide" class="bot-avatar-img"></div>
            <div class="msg-bubble bot-bubble typing-bubble">
                <div class="typing-dots">
                    <span class="dot"></span><span class="dot"></span><span class="dot"></span>
                </div>
            </div>
        `;
        container.appendChild(typing);
        this.scrollToBottom();
    },

    hideTyping() {
        document.getElementById('typing-indicator')?.remove();
    },

    showChips(chips) {
        const container = document.getElementById('chat-chips');
        // Cap to max 2 chips for cleaner mobile UI
        var limited = chips.slice(0, 2);
        container.innerHTML = limited.map(c =>
            `<button class="chat-chip" onclick="BAO_Chatbot.chipClick('${this.escapeHTML(c)}')">${c}</button>`
        ).join('');
        container.style.display = 'flex';
    },

    hideChips() {
        const container = document.getElementById('chat-chips');
        if (container) container.style.display = 'none';
    },

    chipClick(text) {
        document.getElementById('chat-input').value = text;
        this.sendMessage();
    },

    scrollToBottom() {
        const container = document.getElementById('chat-messages');
        if (container) container.scrollTop = container.scrollHeight;
    },

    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    // ============== GOLD POINTER ARROW ==============
    createPointerArrow() {
        if (document.getElementById('bao-pointer-arrow')) return;
        const arrow = document.createElement('div');
        arrow.id = 'bao-pointer-arrow';
        arrow.className = 'bao-pointer-arrow';
        arrow.innerHTML = '<div class="pointer-arrow-inner">&#9660;</div><div class="pointer-arrow-label"></div>';
        arrow.style.display = 'none';
        document.body.appendChild(arrow);

        // Target highlight ring
        const ring = document.createElement('div');
        ring.id = 'bao-target-highlight';
        ring.className = 'bao-target-highlight';
        ring.style.display = 'none';
        document.body.appendChild(ring);
    },

    // Comprehensive feature-to-selector map for ALL app features
    featurePointers: {
        // Sidebar Navigation Items
        'home':             { selector: '.nav-item[data-page="home"], .bottom-nav-item[data-page="home"]', label: 'Home Page', page: 'home' },
        'getting started':  { selector: '.nav-item[data-page="getting-started"]', label: 'Getting Started', page: 'getting-started' },
        'family tree':      { selector: '.nav-item[data-page="family-tree"], .bottom-nav-item[data-page="family-tree"]', label: 'Family Tree', page: 'family-tree' },
        'ancestor profiles':{ selector: '.nav-item[data-page="ancestor-profiles"]', label: 'Ancestor Profiles', page: 'ancestor-profiles' },
        'dawes rolls':      { selector: '.nav-item[data-page="dawes-rolls"], .bottom-nav-item[data-page="dawes-rolls"]', label: 'Dawes Rolls', page: 'dawes-rolls' },
        'freedmen records': { selector: '.nav-item[data-page="freedmen-records"]', label: 'Freedmen Records', page: 'freedmen-records' },
        'slave schedules':  { selector: '.nav-item[data-page="slave-schedules"]', label: 'Tribal Census Records', page: 'slave-schedules' },
        'land allotments':  { selector: '.nav-item[data-page="land-allotments"]', label: 'Land Allotments', page: 'land-allotments' },
        'dna heritage':     { selector: '.nav-item[data-page="dna-heritage"]', label: 'DNA & Heritage', page: 'dna-heritage' },
        'migration routes': { selector: '.nav-item[data-page="migration-routes"]', label: 'Migration Routes', page: 'migration-routes' },
        'historical timeline': { selector: '.nav-item[data-page="historical-timeline"], .bottom-nav-item[data-page="historical-timeline"]', label: 'Timeline', page: 'historical-timeline' },
        'name origins':     { selector: '.nav-item[data-page="name-origins"]', label: 'Name Origins', page: 'name-origins' },
        'document vault':   { selector: '.nav-item[data-page="document-vault"]', label: 'Document Vault', page: 'document-vault' },
        'photo gallery':    { selector: '.nav-item[data-page="photo-gallery"]', label: 'Photo Gallery', page: 'photo-gallery' },
        'oral histories':   { selector: '.nav-item[data-page="oral-histories"]', label: 'Oral Histories', page: 'oral-histories' },
        'community':        { selector: '.nav-item[data-page="community"], .bottom-nav-item[data-page="community"]', label: 'Community', page: 'community' },
        'resources':        { selector: '.nav-item[data-page="resources"]', label: 'Resource Library', page: 'resources' },
        'settings':         { selector: '.nav-item[data-page="settings"]', label: 'Settings', page: 'settings' },

        // On-page features (after navigating)
        'search bar':       { selector: '#dawes-search-input, .search-input, input[type="text"]', label: 'Search Bar', page: 'dawes-rolls', onPage: true },
        'search':           { selector: '#dawes-search-input, .search-input', label: 'Search', page: 'dawes-rolls', onPage: true },
        'tribe filter':     { selector: '#dawes-tribe-filter, select', label: 'Tribe Filter', page: 'dawes-rolls', onPage: true },
        'add ancestor':     { selector: '.btn-primary, button[onclick*="addAncestor"]', label: 'Add Ancestor', page: 'ancestor-profiles', onPage: true },
        'upload document':  { selector: '.btn-primary, button[onclick*="upload"], #doc-upload-btn', label: 'Upload Document', page: 'document-vault', onPage: true },
        'upload photo':     { selector: '.btn-primary, button[onclick*="photo"]', label: 'Upload Photo', page: 'photo-gallery', onPage: true },
        'record story':     { selector: '.btn-primary', label: 'Record Story', page: 'oral-histories', onPage: true },
        'export data':      { selector: 'button[onclick*="exportData"], .btn-secondary', label: 'Export Data', page: 'settings', onPage: true },
        'clear data':       { selector: 'button[onclick*="clearAllData"], .btn-danger', label: 'Clear Data', page: 'settings', onPage: true },
        'profile':          { selector: '#settings-name, .settings-section', label: 'Your Profile', page: 'settings', onPage: true },
        'dna chart':        { selector: '.dna-chart, .heritage-chart', label: 'DNA Chart', page: 'dna-heritage', onPage: true },
        'map':              { selector: '#leaflet-migration-map', label: 'Migration Map', page: 'migration-routes', onPage: true },
        'notifications':    { selector: '.notification-bell, #notification-btn', label: 'Notifications' },
        'sidebar':          { selector: '#sidebar-toggle, .hamburger', label: 'Menu' },
        'chatbot':          { selector: '#chat-fab', label: 'Chatbot' },

        // Aliases - common ways users might ask
        'tree':             { selector: '.nav-item[data-page="family-tree"]', label: 'Family Tree', page: 'family-tree' },
        'records':          { selector: '.nav-item[data-page="dawes-rolls"]', label: 'Dawes Rolls', page: 'dawes-rolls' },
        'documents':        { selector: '.nav-item[data-page="document-vault"]', label: 'Document Vault', page: 'document-vault' },
        'photos':           { selector: '.nav-item[data-page="photo-gallery"]', label: 'Photo Gallery', page: 'photo-gallery' },
        'stories':          { selector: '.nav-item[data-page="oral-histories"]', label: 'Oral Histories', page: 'oral-histories' },
        'dna':              { selector: '.nav-item[data-page="dna-heritage"]', label: 'DNA & Heritage', page: 'dna-heritage' },
        'timeline':         { selector: '.nav-item[data-page="historical-timeline"]', label: 'Timeline', page: 'historical-timeline' },
        'names':            { selector: '.nav-item[data-page="name-origins"]', label: 'Name Origins', page: 'name-origins' },
        'land':             { selector: '.nav-item[data-page="land-allotments"]', label: 'Land Allotments', page: 'land-allotments' },
        'migration':        { selector: '.nav-item[data-page="migration-routes"]', label: 'Migration Map', page: 'migration-routes' },
        'scan document':    { selector: '#doc-scan-btn, .btn-primary', label: 'Scan Document', page: 'document-vault', onPage: true },
        'camera':           { selector: '#doc-scan-btn, .btn-primary', label: 'Camera Scanner', page: 'document-vault', onPage: true },
    },

    /**
     * Wrapper that calls the global showGuideArrow function.
     * Resolves featurePointers keys to CSS selectors automatically.
     */
    pointToElement(selectorOrKey, label) {
        // Resolve: if it's a featurePointers key, get the real selector
        let selector = selectorOrKey;
        let pointerLabel = label || '';
        const fp = this.featurePointers[selectorOrKey];
        if (fp) {
            selector = fp.selector;
            pointerLabel = label || fp.label || '';
        }
        showGuideArrow(selector, pointerLabel);
    },

    /**
     * Detect if a user query is asking "how to use" a feature.
     * If so, navigate to the page, point to the feature, and return a guided response.
     * Returns { matched: true, response, chips, pointer } or { matched: false }.
     */
    detectFeatureGuide(query) {
        const q = query.toLowerCase();

        // Patterns that indicate user wants to know how to use something
        const guidePatterns = [
            /how (?:do i|to|can i) (?:use|find|open|access|get to|navigate to|see|view|upload|scan|add|record|export|search) (?:the |a |an )?(.+)/,
            /where (?:is|are|can i find) (?:the )?(.+)/,
            /show me (?:the |how to use |how to )?(.+)/,
            /point (?:me )?to (?:the )?(.+)/,
            /what (?:is|does) (?:the )?(.+?)(?:\s+do|\s+page|\s+feature|\s+section)?$/,
            /explain (?:the )?(.+?)(?:\s+page|\s+feature|\s+section)?$/,
            /help (?:me )?(?:with|using|find) (?:the |a )?(.+)/,
            /take me to (?:the )?(.+)/,
            /open (?:the )?(.+)/,
            /how (?:do i|to|can i) (.+)/,
        ];

        let featureName = null;
        for (const pat of guidePatterns) {
            const match = q.match(pat);
            if (match && match[1]) {
                featureName = match[1].trim().replace(/[?.!]+$/, '');
                break;
            }
        }
        if (!featureName) return { matched: false };

        // Find best matching feature pointer
        let bestKey = null;
        let bestScore = 0;
        for (const key of Object.keys(this.featurePointers)) {
            let score = 0;
            // Exact match
            if (featureName === key) { score = 100; }
            // Feature name contains key
            else if (featureName.includes(key)) { score = key.length * 2; }
            // Key contains feature name
            else if (key.includes(featureName)) { score = featureName.length * 1.5; }
            // Word overlap
            else {
                const fWords = featureName.split(/\s+/);
                const kWords = key.split(/\s+/);
                for (const fw of fWords) {
                    for (const kw of kWords) {
                        if (fw.length > 2 && kw.length > 2 && (fw.includes(kw) || kw.includes(fw))) {
                            score += 3;
                        }
                    }
                }
            }
            if (score > bestScore) { bestScore = score; bestKey = key; }
        }

        if (!bestKey || bestScore < 3) return { matched: false };

        const fp = this.featurePointers[bestKey];

        // Build guided response with step-by-step instructions
        const guides = this.getFeatureGuide(bestKey);

        return {
            matched: true,
            key: bestKey,
            pointer: fp,
            response: guides.response,
            chips: guides.chips
        };
    },

    getFeatureGuide(featureKey) {
        const guides = {
            'home': {
                response: '🏠 **Home Page**\n\nYour dashboard and starting point. Here you\'ll find:\n\n• Quick action buttons to jump to key features\n• Overview stats of your research progress\n• Recent activity feed\n• Featured ancestor spotlight\n\n👆 I\'m pointing to it now — click to go there!',
                chips: ['Tour all pages', 'Getting started guide', 'Search Dawes Rolls']
            },
            'family tree': {
                response: '🌳 **Family Tree**\n\nYour visual ancestral tree with connecting lines between all ancestors.\n\n**How to use it:**\n1. Click any ancestor node to view their details\n2. Each person shows a 🪶 headband icon representing Black Indigenous heritage\n3. Dark and light skin tones indicate different family branches\n4. Lines connect parents to children and spouses\n5. Click "+ Add" to add new family members\n6. Drag nodes to rearrange the layout\n\n👆 I\'m pointing to the Family Tree tab now!',
                chips: ['Add ancestor', 'Robert Williams Card 2241', 'View ancestor profiles']
            },
            'tree': {
                response: '🌳 **Family Tree**\n\nYour visual ancestral tree showing your Williams and Johnson family connections.\n\n**How to use it:**\n1. Click any ancestor\'s name to see their full profile\n2. 🪶 feather headband icons represent Black Indigenous heritage\n3. Lines connect family members — parents, children, spouses\n4. Use the toolbar to zoom in/out and add new members\n\n👆 Look for the gold arrow pointing to it!',
                chips: ['Add ancestor', 'Show family tree', 'Robert Williams Card 2241']
            },
            'dawes rolls': {
                response: '📜 **Dawes Rolls Search**\n\nThe most important tool for Freedmen genealogy research.\n\n**Step-by-step:**\n1. Type a surname in the **Search Bar** (I\'ll point to it)\n2. Use **Tribe Filter** to narrow by Cherokee, Choctaw, Creek, Chickasaw, or Seminole\n3. Filter by **Status** (Freedman, By Blood, Minor, New Born)\n4. Click any result row to see full details\n5. Note the **Card Number** — it\'s your key to finding enrollment jackets\n\n**Pro tip:** Try multiple name spellings — names were often recorded phonetically.\n\n👆 Arrow pointing to the Dawes Rolls section!',
                chips: ['Search Dawes Rolls', 'Card numbers explained', 'Robert Williams Card 2241']
            },
            'records': {
                response: '📜 **Dawes Rolls Search**\n\nSearch enrollment records for the Five Civilized Tribes.\n\n1. Enter ancestor name in search bar\n2. Filter by tribe and status\n3. Click results for full details\n\n👆 I\'m pointing to it now!',
                chips: ['Search Dawes Rolls', 'How to read enrollment cards', 'Freedmen records']
            },
            'freedmen records': {
                response: '📋 **Freedmen Records**\n\nBureau of Refugees, Freedmen, and Abandoned Lands records for Indian Territory.\n\n**What you\'ll find:**\n• Labor contracts between Freedmen and former slaveholders\n• Marriage records from the post-Civil War era\n• Ration distribution lists\n• School enrollment records\n• Hospital and medical records\n\n**How to search:**\n1. Use the search bar to find by name\n2. Filter by document type\n3. Click records to see full transcriptions\n\n👆 Arrow pointing to Freedmen Records!',
                chips: ['Search Freedmen records', 'Freedmen Bureau explained', 'Dawes Rolls']
            },
            'slave schedules': {
                response: '📑 **Tribal Census Records**\n\nPre-emancipation census records from 1860 and 1870.\n\n**Important context:** Enslaved people were listed by age, sex, and color — NOT by name — under their enslaver\'s listing. In Indian Territory, some tribal census rolls DID record names of enslaved people.\n\n**How to search:**\n1. Search by enslaver name (often the tribal member who enslaved your ancestor)\n2. Cross-reference ages and locations with Dawes Roll data\n3. Look for matching family groups\n\n👆 Pointing to the Tribal Census Records tab!',
                chips: ['Search tribal census records', 'Cross-reference records', 'Freedmen Bureau']
            },
            'land allotments': {
                response: '🗺️ **Land Allotments**\n\nEvery enrolled Freedman received an individual land allotment in Indian Territory.\n\n**What you\'ll find:**\n• Allotment numbers and locations\n• Acreage details (Freedmen typically received 40-160 acres)\n• Land descriptions by Section, Township, Range\n• Maps of allotment locations\n\n**Research tip:** Freedmen allotments were often smaller than "by blood" allotments. Many were lost through "grafting" schemes by white speculators.\n\n👆 Arrow pointing to Land Allotments!',
                chips: ['View land records', 'Choctaw Freedmen land', 'Grafting schemes explained']
            },
            'dna heritage': {
                response: '🧬 **DNA & Heritage**\n\nUnderstand your genetic ancestry as a Freedmen descendant.\n\n**What this page shows:**\n1. **Heritage Composition** chart — Indigenous American, Freedmen heritage, and other ancestral percentages\n2. **Recommended DNA Tests** — best services for tracing Indigenous ancestry\n3. **How to Interpret Results** — what Indigenous markers mean for Freedmen\n4. **Haplogroups** — deep ancestral lineage information\n\n**Important:** DNA alone cannot prove tribal citizenship. You need Dawes Roll documentation for enrollment.\n\n👆 I\'m pointing to DNA & Heritage now!',
                chips: ['DNA testing for Freedmen', 'Indigenous haplogroups', 'Tribal citizenship']
            },
            'dna': {
                response: '🧬 **DNA & Heritage** — Explore your genetic ancestry. See heritage composition, recommended tests, and how to interpret results for Freedmen descendants.\n\n👆 Pointing to it now!',
                chips: ['DNA testing explained', 'Indigenous ancestry markers', 'Heritage composition']
            },
            'migration routes': {
                response: '🗺️ **Freedmen Migration Routes**\n\nInteractive Leaflet.js map showing historical migration paths.\n\n**How to use the map:**\n1. **Zoom** in/out with + / - buttons (top right)\n2. **Pan** by clicking and dragging\n3. **Click route lines** to see historical descriptions\n4. **Glowing arrows** show direction of movement\n5. **Gold markers** show key locations including Atoka (Williams family)\n\n**7 routes shown:**\n• Choctaw, Cherokee, Creek, Chickasaw, Seminole removals\n• Great Migration North\n• Exoduster Movement to Kansas\n\n👆 Arrow pointing to the Migration Routes page!',
                chips: ['View migration map', 'Choctaw removal', 'Trail of Tears', 'Great Migration']
            },
            'migration': {
                response: '🗺️ **Migration Routes** — Interactive map with animated routes showing Freedmen migrations. Zoom, pan, and click routes for details.\n\n👆 Pointing to it!',
                chips: ['View migration map', 'Trail of Tears', 'Great Migration']
            },
            'historical timeline': {
                response: '📅 **Historical Timeline**\n\nKey events in Five Tribes and Freedmen history.\n\n**How to use:**\n1. **Filter** by category buttons at top (Removal, Civil War, Treaties, Dawes era, etc.)\n2. **Scroll** through chronological events\n3. **Click** event cards for expanded details\n4. Events span from pre-removal through modern era\n\n👆 Pointing to the Timeline!',
                chips: ['Treaty of 1866', 'Trail of Tears', 'Dawes Commission', 'Modern rights']
            },
            'timeline': {
                response: '📅 **Timeline** — Browse key historical events. Use filters to narrow by era.\n\n👆 I\'m pointing to it now!',
                chips: ['Treaty of 1866', 'Cherokee removal', 'Dawes era events']
            },
            'name origins': {
                response: '📛 **Name Origins**\n\nTrace the history of Freedmen surnames.\n\n**What you\'ll learn:**\n• Which names came from slaveholders\n• Names with Indigenous or historical origins\n• Common Freedmen surname patterns\n• How names changed through enrollment\n\n**Tip:** Many Freedmen surnames match their former slaveholder\'s tribal nation name — this can help identify which tribe your family was connected to.\n\n👆 Pointing to Name Origins!',
                chips: ['Williams name origin', 'Johnson name origin', 'Common Freedmen names']
            },
            'document vault': {
                response: '📁 **Document Vault**\n\nStore, organize, and view your genealogy research documents.\n\n**How to use:**\n1. **Upload** — Click "+ Add Document" to upload photos, PDFs, or images\n2. **Scan** — Use camera scanner on your phone/tablet\n3. **Preview** — Click any document for full-screen view\n4. **Organize** — Name and tag your documents\n5. **Download** — Save copies to your device\n6. **Delete** — Remove documents you no longer need\n\nAll documents are saved in your browser (localStorage) between sessions.\n\n👆 Arrow pointing to Document Vault!',
                chips: ['Upload document', 'Scan with camera', 'View my documents']
            },
            'documents': {
                response: '📁 **Document Vault** — Upload, scan, view, and organize your genealogy documents. Saved locally between sessions.\n\n👆 Pointing to it now!',
                chips: ['Upload document', 'Scan document', 'View documents']
            },
            'photo gallery': {
                response: '📸 **Photo Gallery**\n\nPreserve family photographs and historical images.\n\n**How to use:**\n1. Click **"+ Add Photo"** to upload images\n2. Add captions and dates to each photo\n3. Click photos for full-screen viewing\n4. Photos saved locally between sessions\n\n👆 Pointing to Photo Gallery!',
                chips: ['Upload photo', 'View photos', 'Document vault']
            },
            'oral histories': {
                response: '🎙️ **Oral Histories**\n\nCapture spoken family stories from elders.\n\n**How to use:**\n1. Click **"Record New Story"** to start\n2. Add narrator name, date, and description\n3. Type or record the story text\n4. Tag stories by tribe, topic, or era\n5. Stories saved locally for future reference\n\n**Why this matters:** Many Freedmen family histories were passed orally — recording them preserves irreplaceable heritage.\n\n👆 Arrow pointing to Oral Histories!',
                chips: ['Record a story', 'View saved stories', 'Williams family stories']
            },
            'community': {
                response: '👥 **Community**\n\nConnect with other Freedmen descendants and researchers.\n\n**Features:**\n• View community posts and discussions\n• Share your research discoveries\n• Ask questions to experienced researchers\n• Find descendants from the same tribal nation\n\n👆 Pointing to the Community page!',
                chips: ['View community', 'Share a discovery', 'Find researchers']
            },
            'resources': {
                response: '📚 **Resource Library**\n\n36 curated resources specifically for Black Indigenous Freedmen research.\n\n**Categories:**\n• Government Archives & Dawes Rolls\n• Five Civilized Tribes Official Websites\n• Books on Freedmen History\n• Organizations & Museums\n• DNA Testing Services\n• 1866 Treaties & Historical Documents\n\n**Filter** by category using the tab buttons at top.\n\n👆 Pointing to Resource Library!',
                chips: ['View resources', 'Dawes Rolls archives', 'Tribal websites', 'DNA testing']
            },
            'settings': {
                response: '⚙️ **Settings**\n\nManage your profile and data.\n\n**What you can do:**\n1. **Profile** — Set your name, email, tribal affiliations\n2. **Preferences** — Toggle notifications and auto-save\n3. **Export Data** — Download all research as JSON backup\n4. **Clear Data** — Remove all saved data (careful!)\n\n👆 Pointing to Settings!',
                chips: ['Export my data', 'Update profile', 'Clear data']
            },
            'getting started': {
                response: '🚀 **Getting Started Guide**\n\nPerfect for beginners. Walks you through the app step-by-step.\n\n**What you\'ll learn:**\n1. Setting up your profile\n2. Understanding Dawes Rolls\n3. Searching for ancestors\n4. Building your family tree\n5. Using DNA results\n6. Connecting with other descendants\n\n👆 Arrow pointing to Getting Started!',
                chips: ['Go to getting started', 'Search Dawes Rolls', 'What are Freedmen?']
            },
            'search bar': {
                response: '🔍 **Search Bar**\n\nThe search bar lets you search the Dawes Rolls by name.\n\n1. Type a surname (try multiple spellings)\n2. Press Enter or click Search\n3. Results show name, tribe, roll number, and status\n4. Click any result for full details\n\n👆 I\'m pointing to the search bar right now!',
                chips: ['Search Dawes Rolls', 'Filter by tribe', 'Robert Williams lookup']
            },
            'search': {
                response: '🔍 **Search** — Enter ancestor names to search the Dawes Rolls database. Try multiple spellings!\n\n👆 Pointing to the search field!',
                chips: ['Search Dawes Rolls', 'Filter by tribe', 'Card numbers explained']
            },
            'upload document': {
                response: '📤 **Upload Document**\n\n1. Click the **"+ Add Document"** button\n2. Choose a file (photos, PDFs, images)\n3. Name your document\n4. Preview before saving\n5. Document saved to your vault\n\n👆 Pointing to the upload button!',
                chips: ['Scan with camera', 'View my documents', 'Document vault']
            },
            'scan document': {
                response: '📷 **Camera Scanner**\n\nScan physical documents using your phone/tablet camera.\n\n1. Tap the **Scan** button\n2. Allow camera access when prompted\n3. Hold document steady in frame\n4. Preview the scan\n5. Name and save to vault\n\n👆 Pointing to the scan button!',
                chips: ['Upload document', 'View documents', 'Document vault']
            },
            'camera': {
                response: '📷 **Camera Scanner** — Scan physical documents using your device camera. Works on phones and tablets.\n\n👆 Pointing to it!',
                chips: ['Scan document', 'Upload document', 'Document vault']
            },
            'add ancestor': {
                response: '➕ **Add Ancestor**\n\n1. Click the **"+ Add Ancestor"** button\n2. Enter name, birth/death dates\n3. Select tribal affiliation\n4. Add Dawes Roll number if known\n5. Add notes and connections\n6. Save — ancestor appears in your tree\n\n👆 Pointing to the Add Ancestor button!',
                chips: ['View family tree', 'Robert Williams', 'Dawes Rolls search']
            },
            'notifications': {
                response: '🔔 **Notifications** — Click the bell icon in the header to see alerts about record matches, community replies, and research tips.\n\n👆 Pointing to the notification bell!',
                chips: ['View notifications', 'Go to settings', 'Tour the app']
            },
            'sidebar': {
                response: '☰ **Menu (Sidebar)** — Click the hamburger menu icon to open the full navigation sidebar with all 18 pages.\n\n👆 Pointing to the menu button!',
                chips: ['Tour all 18 pages', 'Go to home', 'Getting started']
            },
            'chatbot': {
                response: '🧑‍🦱 **Roots AI Guide** — That\'s me! I\'m right here. I can help with genealogy research, navigate the app, search records, and answer questions about Freedmen history.\n\nJust type or tap a quick reply chip below!',
                chips: ['What can you do?', 'Search Dawes Rolls', 'Tour the app']
            },
            'export data': {
                response: '💾 **Export Data**\n\nDownload all your research as a JSON file.\n\n1. Go to Settings\n2. Scroll to "Data Management"\n3. Click **Export** button\n4. File downloads to your device\n\nKeep backups regularly to protect your research!\n\n👆 Pointing to the Export button!',
                chips: ['Go to settings', 'Clear data', 'Import data']
            },
            'profile': {
                response: '👤 **Your Profile**\n\n1. Go to Settings\n2. Enter your name, email, tribal affiliations\n3. Set research goals\n4. Click Save Profile\n\n👆 Pointing to the profile section!',
                chips: ['Go to settings', 'Export data', 'Tour the app']
            },
            'map': {
                response: '🗺️ **Interactive Map**\n\nLeaflet.js powered migration map.\n• Zoom: + / - buttons\n• Pan: click and drag\n• Click routes for historical info\n• Gold arrows show migration direction\n\n👆 Pointing to the map!',
                chips: ['Migration routes', 'Choctaw removal', 'Trail of Tears']
            },
        };

        return guides[featureKey] || {
            response: '👆 I\'m pointing to **' + (this.featurePointers[featureKey]?.label || featureKey) + '** now! Look for the gold glowing arrow on screen. Click it to explore this feature.',
            chips: ['Tell me more', 'Tour all pages', 'Go to Home']
        };
    },

    // ============== ADMIN PANEL (Hidden — 5 taps) ==============
    handleFabTap() {
        this.adminTapCount++;
        clearTimeout(this.adminTapTimer);

        if (this.adminTapCount >= 5) {
            this.adminTapCount = 0;
            this.showAdminLogin();
            return;
        }

        this.adminTapTimer = setTimeout(() => {
            // Normal toggle if less than 5 taps within 2 seconds
            if (this.adminTapCount < 5) {
                this.adminTapCount = 0;
                this.toggle();
            }
        }, 400);
    },

    showAdminLogin() {
        const overlay = document.createElement('div');
        overlay.className = 'chat-admin-overlay';
        overlay.id = 'admin-overlay';
        overlay.innerHTML = `
            <div class="chat-admin-panel">
                <h3>&#128274; Admin Access</h3>
                <p class="admin-subtitle">Enter admin password to continue</p>
                <div class="admin-error" id="admin-error">Incorrect password. Try again.</div>
                <input type="password" id="admin-password" placeholder="Enter password..." autocomplete="off">
                <div class="admin-btn-row">
                    <button class="admin-btn admin-btn-cancel" onclick="BAO_Chatbot.closeAdmin()">Cancel</button>
                    <button class="admin-btn admin-btn-login" onclick="BAO_Chatbot.verifyAdmin()">Login</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        setTimeout(() => document.getElementById('admin-password')?.focus(), 100);
        document.getElementById('admin-password')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.verifyAdmin();
        });
    },

    verifyAdmin() {
        const input = document.getElementById('admin-password');
        const errorEl = document.getElementById('admin-error');
        if (input?.value === this.adminPassword) {
            this.showAdminDashboard();
        } else {
            if (errorEl) { errorEl.style.display = 'block'; }
            if (input) { input.value = ''; input.focus(); }
        }
    },

    showAdminDashboard() {
        const overlay = document.getElementById('admin-overlay');
        if (!overlay) return;
        const msgCount = document.querySelectorAll('#chat-messages .chat-msg').length;
        overlay.innerHTML = `
            <div class="chat-admin-panel">
                <h3>&#9881;&#65039; Admin Dashboard</h3>
                <p class="admin-subtitle">Manage Roots AI Guide chat data</p>
                <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;padding:14px;margin-bottom:16px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <span style="color:var(--text-muted);font-size:0.82rem;">Chat messages</span>
                        <span style="color:var(--accent);font-weight:700;font-size:1.1rem;">${msgCount}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="color:var(--text-muted);font-size:0.82rem;">Topics available</span>
                        <span style="color:var(--accent);font-weight:700;font-size:1.1rem;">${this.topics.length}</span>
                    </div>
                </div>
                <button class="admin-btn admin-btn-danger" style="width:100%;margin-bottom:10px;" onclick="BAO_Chatbot.confirmDeleteHistory()">&#128465; Delete All Chat History</button>
                <button class="admin-btn admin-btn-cancel" style="width:100%;" onclick="BAO_Chatbot.closeAdmin()">Close</button>
            </div>
        `;
    },

    confirmDeleteHistory() {
        const overlay = document.getElementById('admin-overlay');
        if (!overlay) return;
        overlay.innerHTML = `
            <div class="chat-admin-panel">
                <h3 style="color:#ff6b6b;">&#9888;&#65039; Confirm Deletion</h3>
                <p class="admin-subtitle">This will permanently delete all chat messages. This action cannot be undone.</p>
                <div class="admin-btn-row">
                    <button class="admin-btn admin-btn-cancel" onclick="BAO_Chatbot.showAdminDashboard()">Cancel</button>
                    <button class="admin-btn admin-btn-danger" onclick="BAO_Chatbot.deleteAllHistory()">Delete All</button>
                </div>
            </div>
        `;
    },

    deleteAllHistory() {
        const container = document.getElementById('chat-messages');
        if (container) container.innerHTML = '';
        this.messages = [];
        this.hideChips();
        const overlay = document.getElementById('admin-overlay');
        if (overlay) {
            overlay.innerHTML = `
                <div class="chat-admin-panel">
                    <div class="admin-success">&#9989; All chat history has been deleted successfully.</div>
                    <button class="admin-btn admin-btn-cancel" style="width:100%;margin-top:14px;" onclick="BAO_Chatbot.closeAdmin()">Close</button>
                </div>
            `;
        }
    },

    closeAdmin() {
        document.getElementById('admin-overlay')?.remove();
    },

    // ============== SAVE CONVERSATION ==============
    saveConversation() {
        var container = document.getElementById('chat-messages');
        if (!container || container.children.length === 0) {
            this.showSaveToast('No messages to save.');
            return;
        }
        var msgs = container.querySelectorAll('.chat-msg');
        var conversation = [];
        msgs.forEach(function(m) {
            if (m.id === 'typing-indicator') return;
            var isUser = m.classList.contains('user-msg');
            var bubble = m.querySelector(isUser ? '.user-bubble' : '.bot-bubble');
            if (!bubble) return;
            // Get text content, skip TTS button text
            var clone = bubble.cloneNode(true);
            var ttsBtn = clone.querySelector('.tts-btn');
            if (ttsBtn) ttsBtn.remove();
            conversation.push({
                role: isUser ? 'user' : 'bot',
                text: clone.innerText.trim()
            });
        });
        if (conversation.length === 0) {
            this.showSaveToast('No messages to save.');
            return;
        }

        var now = new Date();
        var dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        var timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        var firstUserMsg = conversation.find(function(m) { return m.role === 'user'; });
        var preview = firstUserMsg ? firstUserMsg.text.substring(0, 60) : conversation[0].text.substring(0, 60);

        var saved = this.getSavedChats();
        saved.unshift({
            id: 'chat_' + Date.now(),
            date: dateStr,
            time: timeStr,
            preview: preview,
            messageCount: conversation.length,
            userName: this.userName || 'Guest',
            messages: conversation
        });
        // Keep max 20 saved chats
        if (saved.length > 20) saved = saved.slice(0, 20);
        localStorage.setItem('bao_saved_chats', JSON.stringify(saved));
        this.updateSavedCount();
        this.showSaveToast('Conversation saved!');
        // Pulse the save button
        var btn = document.getElementById('chat-save-btn');
        if (btn) {
            btn.classList.add('chat-save-pulse');
            setTimeout(function() { btn.classList.remove('chat-save-pulse'); }, 1200);
        }
    },

    getSavedChats() {
        try {
            var data = localStorage.getItem('bao_saved_chats');
            return data ? JSON.parse(data) : [];
        } catch(e) { return []; }
    },

    updateSavedCount() {
        var count = this.getSavedChats().length;
        var el = document.getElementById('chat-saved-count');
        if (el) {
            el.textContent = count;
            el.style.display = count > 0 ? 'inline-flex' : 'none';
        }
    },

    showSaveToast(msg) {
        var existing = document.getElementById('chat-save-toast');
        if (existing) existing.remove();
        var toast = document.createElement('div');
        toast.id = 'chat-save-toast';
        toast.className = 'chat-save-toast';
        toast.textContent = msg;
        var panel = document.getElementById('chat-panel');
        if (panel) panel.appendChild(toast);
        setTimeout(function() {
            toast.classList.add('chat-save-toast-hide');
            setTimeout(function() { toast.remove(); }, 400);
        }, 2000);
    },

    toggleSavedChats() {
        var panel = document.getElementById('chat-saved-panel');
        if (!panel) return;
        var isHidden = panel.classList.contains('hidden');
        if (isHidden) {
            this.renderSavedChats();
            panel.classList.remove('hidden');
        } else {
            panel.classList.add('hidden');
        }
    },

    renderSavedChats() {
        var panel = document.getElementById('chat-saved-panel');
        if (!panel) return;
        var saved = this.getSavedChats();
        if (saved.length === 0) {
            panel.innerHTML = '<div class="saved-empty"><span class="saved-empty-icon">&#128214;</span><p>No saved conversations yet.</p><p class="saved-empty-hint">Click "Save Chat" to preserve your research conversations.</p></div>';
            return;
        }
        var html = '<div class="saved-header"><h4>&#128214; Saved Conversations</h4><button class="saved-close-btn" onclick="BAO_Chatbot.toggleSavedChats()">&times;</button></div>';
        html += '<div class="saved-list">';
        for (var i = 0; i < saved.length; i++) {
            var chat = saved[i];
            html += '<div class="saved-item" id="' + chat.id + '">';
            html += '<div class="saved-item-main" onclick="BAO_Chatbot.loadSavedChat(\'' + chat.id + '\')">';
            html += '<div class="saved-item-top"><span class="saved-item-date">' + chat.date + ' at ' + chat.time + '</span><span class="saved-item-count">' + chat.messageCount + ' msgs</span></div>';
            html += '<div class="saved-item-preview">' + this.escapeHTML(chat.preview) + (chat.preview.length >= 60 ? '...' : '') + '</div>';
            html += '</div>';
            html += '<button class="saved-delete-btn" onclick="BAO_Chatbot.deleteSavedChat(\'' + chat.id + '\')" title="Delete">&#128465;</button>';
            html += '</div>';
        }
        html += '</div>';
        panel.innerHTML = html;
    },

    loadSavedChat(chatId) {
        var saved = this.getSavedChats();
        var chat = saved.find(function(c) { return c.id === chatId; });
        if (!chat) return;
        var container = document.getElementById('chat-messages');
        if (!container) return;
        // Clear current messages
        container.innerHTML = '';
        // Render saved messages
        for (var i = 0; i < chat.messages.length; i++) {
            var m = chat.messages[i];
            if (m.role === 'user') {
                this.addUserMessage(m.text);
            } else {
                this.addBotMessage(m.text);
            }
        }
        // Close saved panel
        var panel = document.getElementById('chat-saved-panel');
        if (panel) panel.classList.add('hidden');
        this.showSaveToast('Loaded: ' + chat.date + ' ' + chat.time);
    },

    deleteSavedChat(chatId) {
        var saved = this.getSavedChats();
        saved = saved.filter(function(c) { return c.id !== chatId; });
        localStorage.setItem('bao_saved_chats', JSON.stringify(saved));
        this.updateSavedCount();
        // Remove from DOM with animation
        var el = document.getElementById(chatId);
        if (el) {
            el.style.transition = 'all 0.3s ease';
            el.style.opacity = '0';
            el.style.transform = 'translateX(40px)';
            el.style.maxHeight = el.offsetHeight + 'px';
            setTimeout(function() {
                el.style.maxHeight = '0';
                el.style.padding = '0';
                el.style.margin = '0';
                el.style.borderWidth = '0';
                setTimeout(function() { el.remove(); }, 300);
            }, 300);
        }
        // If no more saved, re-render empty state
        if (saved.length === 0) {
            setTimeout(function() { BAO_Chatbot.renderSavedChats(); }, 650);
        }
    },

    // ============== QUICK START GUIDE ==============
    showQuickStartGuide() {
        var name = this.userName || 'friend';
        var self = this;
        localStorage.setItem('bao_quickstart_shown', '1');

        var steps = [
            {
                delay: 0,
                msg: '🌿 ' + name + ', let me walk you through your ancestral heritage app. This is a sacred space built specifically for Black Indigenous Freedmen descendants of the Five Civilized Tribes — Cherokee, Choctaw, Creek, Chickasaw, and Seminole.\n\nHere\'s everything you need to know to begin your journey:'
            },
            {
                delay: 2200,
                msg: '📱 **Step 1: Navigate With the Bottom Menu**\n\nAt the bottom of your screen, you\'ll see 5 tabs:\n\n🏠 HOME — Your dashboard with research progress and recent activity\n📜 RECORDS — Search Dawes Rolls and Freedmen Bureau documents\n🌳 TREE — View your family tree with ancestors from all Five Tribes\n🧬 DNA — Heritage testing guides and Indigenous haplogroup analysis\n⚙ MORE — Settings, resource library, and community\n\nTap any tab to jump straight to that section. The sidebar menu (☰) gives you access to all 18 pages.',
                pointer: { selector: '.bottom-nav', label: 'Bottom Menu' }
            },
            {
                delay: 5500,
                msg: '🌳 **Step 2: Explore Your Family Tree**\n\nThe Family Tree page shows your ancestors as a living, growing tree rooted in the Five Civilized Tribes. Each ancestor wears a feather headband honoring their Indigenous Freedmen heritage.\n\n• Tap any ancestor to see their full story — birth, occupation, tribal connection, and Dawes Roll enrollment\n• The tree includes Robert Williams (Choctaw, Card #2241), his wife Clara, and children who married into Cherokee, Chickasaw, Seminole, and Creek nations\n• Add your own ancestors to build your personal family tree\n\nSay **"show me my family tree"** anytime and I\'ll take you there!',
                pointer: { selector: '.nav-item[data-page="family-tree"], .bottom-nav-item[data-page="family-tree"]', label: 'Family Tree' }
            },
            {
                delay: 9000,
                msg: '📜 **Step 3: Search the Dawes Rolls**\n\nThe Dawes Rolls (1898-1914) are THE most important records for Freedmen genealogy. Our search page lets you:\n\n• Search by name, roll number, tribe, or card number\n• View detailed enrollment cards with family connections\n• Find your ancestors among the Cherokee, Choctaw, Creek, Chickasaw, and Seminole Freedmen rolls\n• Cross-reference with enrollment jacket files\n\nTry searching for "Williams" or "Card 2241" to see how it works. Say **"search Dawes Rolls"** and I\'ll take you there!',
                pointer: { selector: '.nav-item[data-page="dawes-rolls"], .bottom-nav-item[data-page="dawes-rolls"]', label: 'Dawes Rolls' }
            },
            {
                delay: 12500,
                msg: '🧬 **Step 4: DNA & Heritage Page**\n\nThis is the most educational page in the entire app. It covers:\n\n• Step-by-step guide to DNA testing with FamilyTreeDNA, AncestryDNA, and 23andMe\n• How to interpret Indigenous American markers and haplogroups (A, B, C, D, X for maternal; Q, C for paternal)\n• Paper trail research guide — Dawes Rolls, Freedmen Bureau records, census records, land allotments\n• How to combine DNA results with paper trails for the strongest proof\n• Uploading your raw DNA data to GEDmatch, MyHeritage, and more\n\nSay **"go to DNA heritage"** to explore it!',
                pointer: { selector: '.nav-item[data-page="dna-heritage"]', label: 'DNA & Heritage' }
            },
            {
                delay: 16000,
                msg: '🔗 **Step 5: Resource Library**\n\nOur curated resource library contains 36+ resources specifically for Black Indigenous Freedmen research:\n\n• Official tribal websites for all Five Civilized Tribes\n• National Archives and Dawes Rolls databases\n• Books on Freedmen history and genealogy\n• DNA testing services recommended for Indigenous ancestry\n• Organizations supporting Freedmen descendants\n• Historical treaty documents and legal resources\n\nSay **"go to resources"** to browse the full library!',
                pointer: { selector: '.nav-item[data-page="resources"]', label: 'Resource Library' }
            },
            {
                delay: 19500,
                msg: '📷 **Step 6: Document Scanner & Vault**\n\nPreserve your family\'s legacy by saving important documents:\n\n• Upload photos of old documents, letters, birth certificates, and family photos\n• Use your camera to scan physical documents directly\n• All files are saved securely in your personal Document Vault\n• Organize by category — Dawes cards, census records, land allotments, photos\n• Everything stays on YOUR device — your data never leaves your phone or computer\n\nSay **"go to document vault"** to start preserving your records!',
                pointer: { selector: '.nav-item[data-page="document-vault"]', label: 'Document Vault' }
            },
            {
                delay: 23000,
                msg: '🪪 **Step 7: Track Tribal Citizenship**\n\nOne of the most powerful features of this app — step-by-step tribal citizenship guides for all Five Tribes:\n\n• 🏛️ Cherokee Nation — Freedmen have FULL citizenship rights since 2017\n• 🏛️ Choctaw Nation — Dawes Roll lineage proof required\n• 🏛️ Muscogee (Creek) Nation — Citizenship Board review process\n• 🏛️ Chickasaw Nation — Current blood quantum requirements\n• 🏛️ Seminole Nation — Two recognized Freedmen bands\n\nEach guide includes required documents, addresses, phone numbers, and pro tips. Say **"help me get tribal ID"** to start!\n\n' + name + ', the 1866 treaties PROMISED your ancestors full citizenship. This app helps you claim what was always yours.',
                pointer: { selector: '#chat-fab', label: 'Ask me anything!' }
            },
            {
                delay: 27000,
                msg: '🪶 **You\'re Ready, ' + name + '!**\n\nYour research journey has begun. Here\'s what to remember:\n\n• I\'m always here — tap the chat icon anytime to ask me anything\n• Say **"my progress"** to check your research journey (15 steps to complete!)\n• Say **"tour the app"** if you ever need a refresher on any feature\n• The gold progress bar above shows how far you\'ve come\n• Every question you ask teaches you something new about your heritage\n\nYour ancestors — Robert Williams, Clara Williams, Samuel and Mary Johnson, and all the Freedmen of the Five Civilized Tribes — their stories live on through YOU.\n\nWhat would you like to explore first, ' + name + '? 🌿',
                chips: true
            }
        ];

        function showStep(index) {
            if (index >= steps.length) return;
            var step = steps[index];
            setTimeout(function() {
                self.showTyping();
                setTimeout(function() {
                    self.hideTyping();
                    self.addBotMessage(step.msg);
                    if (step.pointer) {
                        setTimeout(function() {
                            showGuideArrow(step.pointer.selector, step.pointer.label);
                        }, 400);
                    }
                    if (step.chips) {
                        self.showChips(self.defaultChips);
                    }
                    showStep(index + 1);
                }, 800);
            }, index === 0 ? step.delay : step.delay - (steps[index - 1]?.delay || 0));
        }

        showStep(0);
    },

    // ============== STEP COMPLETION NOTICE ==============
    showStepCompletionNotice() {
        var steps = this._pendingStepNotice;
        if (!steps || steps.length === 0) return;
        this._pendingStepNotice = [];
        var total = this.researchSteps.length;
        var done = this.completedSteps.length;
        var pct = Math.round((done / total) * 100);
        var self = this;
        setTimeout(function() {
            var msg = '';
            for (var i = 0; i < steps.length; i++) {
                msg += '✅ Research step completed: ' + steps[i].icon + ' **' + steps[i].label + '**\n';
            }
            msg += '\n📊 Journey Progress: ' + done + '/' + total + ' (' + pct + '%)';
            if (pct === 100) {
                msg += '\n\n🪶🎉 Congratulations' + (self.userName ? ', ' + self.userName : '') + '! You have completed ALL research steps! Your ancestors\' legacy lives on through your dedication!';
            }
            msg += '\n\nSay "my progress" anytime to see your full research journey.';
            self.addBotMessage(msg);
        }, 2000);
    },

    // ============== RESEARCH PROGRESS TRACKER METHODS ==============
    completeStep(stepId) {
        if (this.completedSteps.includes(stepId)) return false;
        this.completedSteps.push(stepId);
        localStorage.setItem('bao_research_progress', JSON.stringify(this.completedSteps));
        this.updateProgressBar();
        return true;
    },

    updateProgressBar() {
        var total = this.researchSteps.length;
        var done = this.completedSteps.length;
        var pct = Math.round((done / total) * 100);
        var bar = document.getElementById('chat-progress-bar');
        var fill = document.getElementById('chat-progress-fill');
        var count = document.getElementById('chat-progress-count');
        var percent = document.getElementById('chat-progress-percent');
        // Hide progress bar if 0% — show only after user starts researching
        if (bar) bar.style.display = (done === 0) ? 'none' : '';
        if (fill) fill.style.width = pct + '%';
        if (count) count.textContent = done + ' / ' + total;
        if (percent) {
            if (pct === 0) percent.textContent = 'Begin your journey!';
            else if (pct < 35) percent.textContent = pct + '% — Great start!';
            else if (pct < 70) percent.textContent = pct + '% — Making progress!';
            else if (pct < 100) percent.textContent = pct + '% — Almost there!';
            else percent.textContent = '100% — Journey Complete! 🪶';
        }
    },

    checkResearchProgress(query) {
        var q = query.toLowerCase();
        var newlyCompleted = [];
        for (var i = 0; i < this.researchSteps.length; i++) {
            var step = this.researchSteps[i];
            if (this.completedSteps.includes(step.id)) continue;
            for (var j = 0; j < step.triggers.length; j++) {
                if (q.includes(step.triggers[j])) {
                    this.completeStep(step.id);
                    newlyCompleted.push(step);
                    break;
                }
            }
        }
        return newlyCompleted;
    },

    getProgressSummary() {
        var total = this.researchSteps.length;
        var done = this.completedSteps.length;
        var pct = Math.round((done / total) * 100);
        var completedList = '';
        var remainingList = '';
        for (var i = 0; i < this.researchSteps.length; i++) {
            var step = this.researchSteps[i];
            if (this.completedSteps.includes(step.id)) {
                completedList += '\n  ' + step.icon + ' ' + step.label + ' ✅';
            } else {
                remainingList += '\n  ' + step.icon + ' ' + step.label;
            }
        }
        var msg = '🌿 Research Journey Progress: ' + done + ' / ' + total + ' steps (' + pct + '%)\n';
        if (done > 0) {
            msg += '\n✅ COMPLETED:' + completedList;
        }
        if (done < total) {
            msg += '\n\n📋 REMAINING:' + remainingList;
        }
        if (pct === 100) {
            msg += '\n\n🪶 Congratulations' + (this.userName ? ', ' + this.userName : '') + '! You have completed your entire research journey! You\'ve explored every major aspect of Black Indigenous Freedmen genealogy. Your ancestors would be proud of your dedication to preserving their legacy.';
        } else if (pct >= 70) {
            msg += '\n\n🌟 You\'re almost there' + (this.userName ? ', ' + this.userName : '') + '! Just a few more steps to complete your research journey.';
        } else if (pct >= 35) {
            msg += '\n\n💪 Great progress' + (this.userName ? ', ' + this.userName : '') + '! Keep exploring to uncover more of your heritage.';
        } else {
            msg += '\n\n🌱 You\'re just getting started' + (this.userName ? ', ' + this.userName : '') + '! Each step brings you closer to your ancestors. Try asking about any of the remaining topics above.';
        }
        return msg;
    },

    getProgressChips() {
        var remaining = [];
        for (var i = 0; i < this.researchSteps.length; i++) {
            if (!this.completedSteps.includes(this.researchSteps[i].id)) {
                remaining.push(this.researchSteps[i].label);
                if (remaining.length >= 4) break;
            }
        }
        if (remaining.length === 0) return ['Tell me about Freedmen', 'Williams family history', 'Go to Home'];
        return remaining;
    },

    resetProgress() {
        this.completedSteps = [];
        localStorage.removeItem('bao_research_progress');
        this.updateProgressBar();
    },

    // ============== PERSONALIZED TRIBAL RESEARCH CHECKLIST ==============

    tribalChecklistTemplates: {
        'cherokee': {
            tribe: 'Cherokee Nation',
            icon: '&#127795;',
            items: [
                { id: 'ck_dawes', label: 'Find Dawes Roll Number (Cherokee Freedmen Roll)', description: 'Search for your ancestor on the Cherokee Freedmen Dawes Roll (1898-1914). The roll number is the key to unlocking all other records.' },
                { id: 'ck_dawes_card', label: 'Obtain Dawes Enrollment Card', description: 'Request the original enrollment card from the National Archives in Fort Worth, TX. The card shows family members, ages, and post office.' },
                { id: 'ck_birth', label: 'Locate Birth Certificate or Record', description: 'Search Oklahoma vital records, church registers, and Indian Territory birth records. Many Cherokee Freedmen births were recorded at Fort Gibson or Tahlequah.' },
                { id: 'ck_death', label: 'Locate Death Certificate', description: 'Search Oklahoma Department of Health death records, cemetery records, and funeral home records in Cherokee Nation territory.' },
                { id: 'ck_marriage', label: 'Find Marriage Certificate', description: 'Search Cherokee Nation marriage records, Indian Territory court records, and Freedmen Bureau marriage registers. Cherokee Freedmen marriages were often recorded at tribal courthouses.' },
                { id: 'ck_census', label: 'Search Cherokee Census Records', description: 'Review the 1880 Cherokee Census, 1890 Cherokee Census, and 1896 Cherokee Tribal Census. Freedmen were listed separately. Also check the 1900 and 1910 US Federal Census for Indian Territory.' },
                { id: 'ck_land', label: 'Find Land Allotment Record', description: 'Cherokee Freedmen received individual land allotments. Search the Cherokee allotment plats and land patent records at the Oklahoma Historical Society.' },
                { id: 'ck_freedmen_bureau', label: 'Search Freedmen Bureau Records', description: 'Review Bureau of Refugees, Freedmen, and Abandoned Lands records for Indian Territory (1865-1872). Look for labor contracts, ration lists, and family registers at Fort Gibson.' },
                { id: 'ck_treaty', label: 'Document Treaty of 1866 Connection', description: 'Article 9 of the Cherokee Treaty of 1866 granted Freedmen full citizenship rights. Confirm your ancestor was recognized under this treaty provision.' },
                { id: 'ck_application', label: 'Gather Cherokee Citizenship Application', description: 'If applying for Cherokee Nation citizenship, gather: Dawes Roll proof, birth certificates showing lineage, and completed CDIB application. Cherokee Freedmen have full citizenship rights since 2017.' }
            ]
        },
        'choctaw': {
            tribe: 'Choctaw Nation',
            icon: '&#128215;',
            items: [
                { id: 'ct_dawes', label: 'Find Dawes Roll Number (Choctaw Freedmen Roll)', description: 'Search for your ancestor on the Choctaw Freedmen Dawes Roll. Robert Williams family is on Card #2241.' },
                { id: 'ct_dawes_card', label: 'Obtain Dawes Enrollment Card', description: 'Request the original Choctaw Freedmen enrollment card from the National Archives. Cards show family groupings, ages, and districts.' },
                { id: 'ct_birth', label: 'Locate Birth Certificate or Record', description: 'Search Oklahoma vital records and Choctaw Nation territory records. Check church registers in Atoka, Durant, Hugo, and McAlester areas.' },
                { id: 'ct_death', label: 'Locate Death Certificate', description: 'Search Oklahoma death records, Choctaw Nation cemetery records, and funeral home archives in southeastern Oklahoma.' },
                { id: 'ct_marriage', label: 'Find Marriage Certificate', description: 'Search Choctaw Nation marriage records and Indian Territory court records. Freedmen marriages were recorded at Choctaw district courts.' },
                { id: 'ct_census', label: 'Search Choctaw Census Records', description: 'Review the 1885 Choctaw Census, 1893 Choctaw Census, and tribal rolls. Cross-reference with 1900/1910 US Census for Indian Territory.' },
                { id: 'ct_land', label: 'Find Land Allotment Record', description: 'Choctaw Freedmen received 40-acre allotments. Search Choctaw allotment records and land patents at the Oklahoma Historical Society and BLM General Land Office.' },
                { id: 'ct_freedmen_bureau', label: 'Search Freedmen Bureau Records', description: 'Review Freedmen Bureau records for Choctaw Nation including labor contracts, ration lists, and school records. Fort Towson and Skullyville were key agency locations.' },
                { id: 'ct_treaty', label: 'Document Treaty of 1866 Connection', description: 'The Choctaw-Chickasaw Treaty of 1866 (Article 3) required adoption of Freedmen. Document how your ancestor qualifies under this provision.' },
                { id: 'ct_application', label: 'Gather Choctaw Enrollment Documents', description: 'Choctaw Nation enrollment requires proof of Dawes Roll lineage. Gather: Dawes card copy, birth certificates for each generation, and completed membership application.' }
            ]
        },
        'creek': {
            tribe: 'Muscogee (Creek) Nation',
            icon: '&#127758;',
            items: [
                { id: 'cr_dawes', label: 'Find Dawes Roll Number (Creek Freedmen Roll)', description: 'Search for your ancestor on the Creek Freedmen Dawes Roll. The Creek Nation enrolled Freedmen with both individual and family numbers.' },
                { id: 'cr_dawes_card', label: 'Obtain Dawes Enrollment Card', description: 'Request the original Creek Freedmen enrollment card from the National Archives. Cards show town affiliations and family connections.' },
                { id: 'cr_birth', label: 'Locate Birth Certificate or Record', description: 'Search Oklahoma vital records and Creek Nation territory records. Check churches and schools in Okmulgee, Muskogee, and Tulsa areas.' },
                { id: 'cr_death', label: 'Locate Death Certificate', description: 'Search Oklahoma death records and Creek Nation cemetery records. Many Creek Freedmen are buried in historic cemeteries near Okmulgee and Muskogee.' },
                { id: 'cr_marriage', label: 'Find Marriage Certificate', description: 'Search Creek Nation marriage records and Indian Territory court records in Okmulgee and Muskogee counties. Creek Nation had its own court system.' },
                { id: 'cr_census', label: 'Search Creek Census Records', description: 'Review the 1890 Creek Census, 1895 Creek Census, and tribal rolls. Creek Freedmen were organized by towns. Check 1900/1910 US Census.' },
                { id: 'cr_land', label: 'Find Land Allotment Record', description: 'Creek Freedmen received 160-acre allotments (same as Creek citizens). Search allotment records at the Oklahoma Historical Society.' },
                { id: 'cr_freedmen_bureau', label: 'Search Freedmen Bureau Records', description: 'Review Freedmen Bureau records for Creek Nation. The agency at Fort Gibson handled many Creek Freedmen cases including labor contracts.' },
                { id: 'cr_treaty', label: 'Document Treaty of 1866 Connection', description: 'The Creek Treaty of 1866 granted Freedmen "all the rights and privileges of native citizens." Document your ancestor\'s connection.' },
                { id: 'cr_application', label: 'Gather Creek Citizenship Documents', description: 'Creek Nation citizenship requires Citizenship Board review. Gather: Dawes Roll proof, complete lineage documentation, and completed application from the Okmulgee office.' }
            ]
        },
        'chickasaw': {
            tribe: 'Chickasaw Nation',
            icon: '&#127775;',
            items: [
                { id: 'ch_dawes', label: 'Find Dawes Roll Number (Chickasaw Freedmen Roll)', description: 'Search for your ancestor on the Chickasaw Freedmen Dawes Roll. Chickasaw Freedmen were enrolled separately from Chickasaw by blood.' },
                { id: 'ch_dawes_card', label: 'Obtain Dawes Enrollment Card', description: 'Request the original Chickasaw Freedmen enrollment card. Cards show family members, ages, and Chickasaw Nation district.' },
                { id: 'ch_birth', label: 'Locate Birth Certificate or Record', description: 'Search Oklahoma vital records and Chickasaw Nation records. Check Ada, Tishomingo, and Ardmore area churches and county records.' },
                { id: 'ch_death', label: 'Locate Death Certificate', description: 'Search Oklahoma death records and Chickasaw Nation cemetery records in south-central Oklahoma counties.' },
                { id: 'ch_marriage', label: 'Find Marriage Certificate', description: 'Search Chickasaw Nation marriage records and Indian Territory court records. The Chickasaw capital at Tishomingo held many court records.' },
                { id: 'ch_census', label: 'Search Chickasaw Census Records', description: 'Review Chickasaw census and annuity rolls. Cross-reference with 1900/1910 US Census. Note: Chickasaw Freedmen had unique enrollment challenges.' },
                { id: 'ch_land', label: 'Find Land Allotment Record', description: 'Chickasaw Freedmen allotment records are at the Oklahoma Historical Society. Note: Chickasaw Freedmen faced significant allotment delays compared to other tribes.' },
                { id: 'ch_freedmen_bureau', label: 'Search Freedmen Bureau Records', description: 'Review Freedmen Bureau records for Chickasaw Nation. Fort Washita and Tishomingo were key locations for Chickasaw Freedmen records.' },
                { id: 'ch_treaty', label: 'Document Treaty of 1866 Connection', description: 'The Choctaw-Chickasaw Treaty of 1866 addressed Freedmen adoption. Document your ancestor\'s status under this treaty.' },
                { id: 'ch_application', label: 'Research Chickasaw Enrollment Status', description: 'Chickasaw Nation currently requires blood quantum for citizenship. Research current enrollment policies and gather all Dawes Roll documentation for future advocacy efforts.' }
            ]
        },
        'seminole': {
            tribe: 'Seminole Nation',
            icon: '&#127796;',
            items: [
                { id: 'sm_dawes', label: 'Find Dawes Roll Number (Seminole Freedmen Roll)', description: 'Search for your ancestor on the Seminole Freedmen Dawes Roll. Seminole Freedmen were organized into two bands: Dosar Barkus and Caesar Bruner.' },
                { id: 'sm_dawes_card', label: 'Obtain Dawes Enrollment Card', description: 'Request the original Seminole Freedmen enrollment card. Cards identify which Freedmen band your ancestor belonged to.' },
                { id: 'sm_birth', label: 'Locate Birth Certificate or Record', description: 'Search Oklahoma vital records and Seminole Nation records. Check Wewoka, Seminole, and surrounding area churches and county offices.' },
                { id: 'sm_death', label: 'Locate Death Certificate', description: 'Search Oklahoma death records and Seminole Nation cemetery records. Many Seminole Freedmen are buried in Seminole County cemeteries.' },
                { id: 'sm_marriage', label: 'Find Marriage Certificate', description: 'Search Seminole Nation marriage records and Indian Territory court records. The Seminole capital at Wewoka maintained tribal court records.' },
                { id: 'sm_census', label: 'Search Seminole Census Records', description: 'Review Seminole tribal rolls and census records. Seminole Freedmen were counted within their respective bands. Check 1900/1910 US Census.' },
                { id: 'sm_land', label: 'Find Land Allotment Record', description: 'Seminole Freedmen received land allotments in Seminole Nation territory. Search allotment records at the Oklahoma Historical Society.' },
                { id: 'sm_freedmen_bureau', label: 'Search Freedmen Bureau Records', description: 'Review Freedmen Bureau records for Seminole Nation. The Wewoka agency handled Seminole Freedmen records including the unique band system.' },
                { id: 'sm_treaty', label: 'Document Treaty of 1866 Connection', description: 'The Seminole Treaty of 1866 recognized Freedmen as full citizens and established the Dosar Barkus and Caesar Bruner bands. Document your band affiliation.' },
                { id: 'sm_application', label: 'Gather Seminole Citizenship Documents', description: 'Seminole Nation recognizes Freedmen bands. Gather: Dawes Roll proof, band identification (Dosar Barkus or Caesar Bruner), birth certificates, and completed enrollment application.' }
            ]
        }
    },

    generateTribalChecklist(tribeName) {
        var key = tribeName.toLowerCase().trim();
        // Normalize common variations
        if (key.includes('cherokee')) key = 'cherokee';
        else if (key.includes('choctaw')) key = 'choctaw';
        else if (key.includes('creek') || key.includes('muscogee')) key = 'creek';
        else if (key.includes('chickasaw')) key = 'chickasaw';
        else if (key.includes('seminole')) key = 'seminole';
        else return null;

        var template = this.tribalChecklistTemplates[key];
        if (!template) return null;

        var checklist = {
            tribe: key,
            tribeName: template.tribe,
            icon: template.icon,
            createdAt: new Date().toISOString(),
            items: template.items.map(function(item) {
                return { id: item.id, label: item.label, description: item.description, completed: false, completedAt: null };
            })
        };

        // Save to localStorage
        this.saveTribalChecklist(checklist);
        return checklist;
    },

    saveTribalChecklist(checklist) {
        var allChecklists = this.getAllTribalChecklists();
        // Replace existing for same tribe, or add new
        var idx = -1;
        for (var i = 0; i < allChecklists.length; i++) {
            if (allChecklists[i].tribe === checklist.tribe) { idx = i; break; }
        }
        if (idx >= 0) allChecklists[idx] = checklist;
        else allChecklists.push(checklist);
        localStorage.setItem('bao_tribal_checklists', JSON.stringify(allChecklists));
    },

    getAllTribalChecklists() {
        try { return JSON.parse(localStorage.getItem('bao_tribal_checklists')) || []; }
        catch(e) { return []; }
    },

    getTribalChecklist(tribeName) {
        var key = tribeName.toLowerCase().trim();
        if (key.includes('cherokee')) key = 'cherokee';
        else if (key.includes('choctaw')) key = 'choctaw';
        else if (key.includes('creek') || key.includes('muscogee')) key = 'creek';
        else if (key.includes('chickasaw')) key = 'chickasaw';
        else if (key.includes('seminole')) key = 'seminole';
        var all = this.getAllTribalChecklists();
        for (var i = 0; i < all.length; i++) {
            if (all[i].tribe === key) return all[i];
        }
        return null;
    },

    toggleChecklistItem(tribe, itemId) {
        var checklist = this.getTribalChecklist(tribe);
        if (!checklist) return;
        for (var i = 0; i < checklist.items.length; i++) {
            if (checklist.items[i].id === itemId) {
                checklist.items[i].completed = !checklist.items[i].completed;
                checklist.items[i].completedAt = checklist.items[i].completed ? new Date().toISOString() : null;
                break;
            }
        }
        this.saveTribalChecklist(checklist);
        // Update the display
        this.updateChecklistDisplay(tribe);
    },

    updateChecklistDisplay(tribe) {
        var checklist = this.getTribalChecklist(tribe);
        if (!checklist) return;
        var completed = checklist.items.filter(function(it) { return it.completed; }).length;
        var total = checklist.items.length;
        var pct = Math.round((completed / total) * 100);

        // Update progress text
        var progEl = document.getElementById('cl-progress-' + tribe);
        if (progEl) progEl.textContent = completed + ' / ' + total + ' (' + pct + '%)';

        // Update progress bar
        var fillEl = document.getElementById('cl-fill-' + tribe);
        if (fillEl) fillEl.style.width = pct + '%';

        // Update individual items
        for (var i = 0; i < checklist.items.length; i++) {
            var item = checklist.items[i];
            var itemEl = document.getElementById('cl-item-' + item.id);
            if (itemEl) {
                if (item.completed) {
                    itemEl.classList.add('cl-completed');
                } else {
                    itemEl.classList.remove('cl-completed');
                }
            }
            var checkEl = document.getElementById('cl-check-' + item.id);
            if (checkEl) {
                checkEl.innerHTML = item.completed ? '&#10004;' : '';
            }
        }

        // Celebration if all done
        if (completed === total && total > 0) {
            var toast = document.getElementById('cl-toast-' + tribe);
            if (toast && !toast.classList.contains('cl-toast-shown')) {
                toast.classList.add('cl-toast-shown');
                toast.style.display = 'block';
                setTimeout(function() { toast.style.display = 'none'; }, 3500);
            }
        }
    },

    renderChecklistHTML(checklist) {
        var completed = checklist.items.filter(function(it) { return it.completed; }).length;
        var total = checklist.items.length;
        var pct = Math.round((completed / total) * 100);
        var tribe = checklist.tribe;

        var html = '<div class="cl-container">';
        html += '<div class="cl-header">';
        html += '<div class="cl-tribe-icon">' + checklist.icon + '</div>';
        html += '<div class="cl-header-info">';
        html += '<div class="cl-tribe-name">' + checklist.tribeName + ' Research Checklist</div>';
        html += '<div class="cl-progress-text" id="cl-progress-' + tribe + '">' + completed + ' / ' + total + ' (' + pct + '%)</div>';
        html += '</div></div>';

        // Progress bar
        html += '<div class="cl-progress-track"><div class="cl-progress-fill" id="cl-fill-' + tribe + '" style="width:' + pct + '%"></div></div>';

        // Items
        html += '<div class="cl-items">';
        for (var i = 0; i < checklist.items.length; i++) {
            var item = checklist.items[i];
            var compClass = item.completed ? ' cl-completed' : '';
            html += '<div class="cl-item' + compClass + '" id="cl-item-' + item.id + '" onclick="BAO_Chatbot.toggleChecklistItem(\'' + tribe + '\',\'' + item.id + '\')">';
            html += '<div class="cl-checkbox" id="cl-check-' + item.id + '">' + (item.completed ? '&#10004;' : '') + '</div>';
            html += '<div class="cl-item-content">';
            html += '<div class="cl-item-label">' + item.label + '</div>';
            html += '<div class="cl-item-desc">' + item.description + '</div>';
            html += '</div></div>';
        }
        html += '</div>';

        // Completion toast
        html += '<div class="cl-toast" id="cl-toast-' + tribe + '" style="display:none">&#127881; All documents found! Your ' + checklist.tribeName + ' research is complete!</div>';

        html += '</div>';
        return html;
    },

    showChecklistSummary() {
        var all = this.getAllTribalChecklists();
        if (all.length === 0) {
            return (this.userName ? this.userName + ', you' : 'You') + ' don\'t have any research checklists yet.\n\nTell me which tribe you\'re researching and I\'ll generate a personalized document checklist for you!\n\nJust say something like:\n• "I\'m researching Cherokee Freedmen"\n• "Generate a Choctaw checklist"\n• "My tribe is Creek"';
        }
        var msg = '&#128203; **Your Research Checklists**\n\n';
        for (var i = 0; i < all.length; i++) {
            var cl = all[i];
            var completed = cl.items.filter(function(it) { return it.completed; }).length;
            var total = cl.items.length;
            var pct = Math.round((completed / total) * 100);
            var bar = '';
            for (var b = 0; b < 10; b++) {
                bar += b < Math.round(pct / 10) ? '&#9608;' : '&#9617;';
            }
            msg += cl.icon + ' **' + cl.tribeName + '**: ' + completed + '/' + total + ' (' + pct + '%)\n' + bar + '\n\n';
        }
        msg += 'Say "show [tribe] checklist" to view details, or tell me another tribe to create a new checklist.';
        return msg;
    },

    detectTribalChecklistQuery(q) {
        // Detect: "I'm researching Cherokee", "generate choctaw checklist", "my tribe is creek", "checklist for seminole", etc.
        var tribeMatch = q.match(/(?:research(?:ing)?|checklist|my tribe is|tribe is|looking into|tracing|studying|generate|create|make|build|start)\s+(?:a\s+)?(?:the\s+)?(?:for\s+)?(cherokee|choctaw|creek|muscogee|chickasaw|seminole)/i);
        if (tribeMatch) return tribeMatch[1].toLowerCase();

        // Also match: "cherokee checklist", "choctaw research checklist", "[tribe] freedmen checklist"
        var reverseMatch = q.match(/(cherokee|choctaw|creek|muscogee|chickasaw|seminole)\s+(?:freedmen\s+)?(?:checklist|research list|document list|documents needed)/i);
        if (reverseMatch) return reverseMatch[1].toLowerCase();

        return null;
    },

    detectShowChecklistQuery(q) {
        // "show cherokee checklist", "view my choctaw checklist", "open creek checklist"
        var showMatch = q.match(/(?:show|view|open|display|see|pull up|my)\s+(?:my\s+)?(cherokee|choctaw|creek|muscogee|chickasaw|seminole)\s+(?:freedmen\s+)?checklist/i);
        if (showMatch) return showMatch[1].toLowerCase();

        // "checklist" alone shows summary
        if (/^(?:my checklists?|show checklists?|view checklists?|research checklists?|all checklists?)$/.test(q)) return '__summary__';

        return null;
    }
};

// Initialize chatbot after app loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => BAO_Chatbot.init(), 2500);
});
