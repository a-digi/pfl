'use strict';

// ── RANKS ─────────────────────────────────────────────────────────────────
const RANKS = [
  { id: 'r0', name: 'Sämling',          emoji: '🌱', cls: 'r0', min: 0,    max: 49 },
  { id: 'r1', name: 'Züchter',          emoji: '🪴', cls: 'r1', min: 50,   max: 199 },
  { id: 'r2', name: 'Gärtner',          emoji: '🌿', cls: 'r2', min: 200,  max: 499 },
  { id: 'r3', name: 'Botaniker',        emoji: '🌳', cls: 'r3', min: 500,  max: 999 },
  { id: 'r4', name: 'Pflanzen-Experte', emoji: '🌺', cls: 'r4', min: 1000, max: Infinity }
];

// ── STATE ─────────────────────────────────────────────────────────────────
const SK = 'pflanzio_v3';
let S = null;
let pendingPhoto = null; // base64 for new post photo, not persisted

function loadState() {
  try {
    const raw = localStorage.getItem(SK);
    if (raw) { S = JSON.parse(raw); return; }
  } catch(e) {}
  S = getSeedState();
}

function save() {
  try { localStorage.setItem(SK, JSON.stringify(S)); } catch(e) {}
}

function mutate(fn) { fn(S); save(); render(); }

// ── HELPERS ───────────────────────────────────────────────────────────────
function timeAgo(ts) {
  const d = Date.now() - ts, m = Math.floor(d / 60000);
  if (m < 2) return 'gerade eben';
  if (m < 60) return `vor ${m} Min.`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h} Std.`;
  const dy = Math.floor(h / 24);
  return `vor ${dy} Tag${dy !== 1 ? 'en' : ''}`;
}

function getRank(pts) { return RANKS.find(r => pts >= r.min && pts <= r.max) || RANKS[0]; }

function rankTag(pts) {
  const r = getRank(pts);
  return `<span class="rtag ${r.cls}">${r.emoji} ${r.name}</span>`;
}

function uid() { return 'id_' + Math.random().toString(36).slice(2) + Date.now().toString(36); }

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function waterStatus(plant) {
  const next = plant.lastWatered + plant.wateringIntervalDays * 86400000;
  const left = (next - Date.now()) / 86400000;
  if (left > 1) return { cls: 'water-ok', text: `💧 in ${Math.ceil(left)} Tagen` };
  if (left > 0) return { cls: 'water-soon', text: '⚠️ Heute gießen!' };
  const over = Math.ceil(-left);
  return { cls: 'water-due', text: `🚨 seit ${over} Tag${over !== 1 ? 'en' : ''} überfällig` };
}

let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
}

function compressImage(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const MAX = 480;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h = h * MAX / w; w = MAX; } }
        else { if (h > MAX) { w = w * MAX / h; h = MAX; } }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', 0.55));
      };
      img.onerror = () => resolve(null);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

// ── NAV ───────────────────────────────────────────────────────────────────
function renderNav(page) {
  const unread = S.unreadMessages || 0;
  const tabs = [
    { id: 'feed',    ico: '🌿', lbl: 'FEED' },
    { id: 'lexikon', ico: '📖', lbl: 'LEXIKON' },
    { id: 'msgs',    ico: '💬', lbl: 'CHAT', badge: unread },
    { id: 'profil',  ico: '🌟', lbl: 'PROFIL' }
  ];
  return tabs.map(t => `
    <a class="ni${page === t.id ? ' on' : ''}" href="#${t.id}">
      <span class="nico">${t.ico}</span>
      <span class="nlbl">${t.lbl}</span>
      ${t.badge ? `<span class="nav-badge">${t.badge}</span>` : ''}
      <span class="npip"></span>
    </a>`).join('');
}

// ── SCREEN: FEED ──────────────────────────────────────────────────────────
function renderFeed() {
  const filter = S.feedFilter || 'all';
  const posts = S.posts.filter(p =>
    filter === 'all' || (filter === 'open' && p.status === 'open') || (filter === 'solved' && p.status === 'solved')
  ).slice().sort((a, b) => b.timestamp - a.timestamp);

  const chips = [['all','Alle'],['open','Offen'],['solved','Gelöst']].map(([id, lbl]) =>
    `<button class="chip${filter === id ? ' active' : ''}" data-action="filter" data-filter="${id}">${lbl}</button>`
  ).join('');

  const cards = posts.length ? posts.map(p => {
    const rank = getRank(p.authorPoints);
    return `
      <a class="card" href="#post/${p.id}">
        <div class="post-header">
          <div class="user-row">
            <span class="av">${p.authorEmoji}</span>
            <div>
              <div class="uname">${esc(p.authorName)}</div>
              <div class="umeta">⭐ ${p.authorPoints} <span class="rtag ${rank.cls}">${rank.emoji} ${rank.name}</span></div>
            </div>
          </div>
          <span class="${p.status === 'solved' ? 'ssolved' : 'sopen'}">${p.status === 'solved' ? '✓ Gelöst' : '❓ Offen'}</span>
        </div>
        <span class="pemi">${p.plantEmoji}</span>
        <span class="ptag">${esc(p.plantName)}</span>
        <div class="ptxt">${esc(p.problem)}</div>
        <div class="cfoot"><span>💬 ${p.tips.length} Tipp${p.tips.length !== 1 ? 's' : ''}</span><span>${timeAgo(p.timestamp)}</span></div>
      </a>`;
  }).join('') : `<div class="empty"><div class="empty-emi">🌱</div>Keine Beiträge gefunden</div>`;

  return `
    <div class="topbar">
      <div class="topbar-row">
        <div><div class="logo">🌱 Pflanzio <span>v3.0</span></div><div class="sub">Community hilft dir wachsen</div></div>
        <a class="btn-green" href="#newpost">+ Problem</a>
      </div>
      <div class="filter-chips">${chips}</div>
    </div>
    <div class="scrollarea">${cards}</div>`;
}

// ── SCREEN: POST DETAIL ───────────────────────────────────────────────────
function renderPost(id) {
  const post = S.posts.find(p => p.id === id);
  if (!post) return renderFeed();

  const kiSection = post.kiTip
    ? `<div class="ki-box"><div class="ki-label">🤖 KI-DIAGNOSE</div><div class="ki-text">${esc(post.kiTip)}</div></div>`
    : `<button class="ki-btn" data-action="ki-diagnose" data-post-id="${id}" id="ki-btn-${id}">🤖 KI-Diagnose anfragen</button>`;

  const photoSection = post.photo
    ? `<img class="photo-preview" src="${post.photo}" alt="Foto">`
    : '';

  const tips = post.tips.map(tip => {
    const rank = getRank(tip.authorPoints);
    const myVote = S.myVotes[tip.id];
    return `
      <div class="tipc${tip.helped ? ' helped' : ''}">
        <div class="user-row">
          <span class="av">${tip.authorEmoji}</span>
          <div>
            <div class="uname">${esc(tip.authorName)}</div>
            <div class="umeta">⭐ ${tip.authorPoints} <span class="rtag ${rank.cls}">${rank.emoji} ${rank.name}</span></div>
          </div>
        </div>
        <div class="ttext">${esc(tip.text)}</div>
        ${tip.helped ? '<span class="hbadge">✓ Hat geholfen</span>' : ''}
        <div class="vote-row">
          <button class="vote-btn up${myVote === 'up' ? ' voted' : ''}" data-action="vote" data-tip-id="${tip.id}" data-post-id="${id}" data-dir="up">👍 ${tip.votes}</button>
          <button class="vote-btn down${myVote === 'down' ? ' voted' : ''}" data-action="vote" data-tip-id="${tip.id}" data-post-id="${id}" data-dir="down">👎</button>
          ${post.status !== 'solved' ? `<button class="helped-btn${tip.helped ? ' active' : ''}" data-action="helped" data-tip-id="${tip.id}" data-post-id="${id}" ${tip.helped ? 'disabled' : ''}>✓ Hat geholfen</button>` : ''}
        </div>
      </div>`;
  }).join('');

  const rank = getRank(post.authorPoints);

  return `
    <div class="topbar"><div class="topbar-row"><button class="btn-back" data-back>← zurück</button><span class="topbar-title">Tipps</span></div></div>
    <div class="scrollarea">
      <div class="pc">
        <span style="font-size:38px;display:block;margin-bottom:10px">${post.plantEmoji}</span>
        <span class="ptag">${esc(post.plantName)}</span>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:8px">
          <div class="ptxt" style="font-size:15px;flex:1">${esc(post.problem)}</div>
          <span class="${post.status === 'solved' ? 'ssolved' : 'sopen'}" style="margin-left:10px;flex-shrink:0">${post.status === 'solved' ? '✓ Gelöst' : '❓ Offen'}</span>
        </div>
        ${photoSection}
        <div style="margin-top:10px;font-size:11px;font-weight:700;color:#3d6630">${post.authorEmoji} ${esc(post.authorName)} · ${timeAgo(post.timestamp)}</div>
        ${kiSection}
      </div>
      ${post.tips.length ? `<div class="divider-label">💡 ${post.tips.length} TIPP${post.tips.length !== 1 ? 'S' : ''}</div>` : ''}
      ${tips}
      <div class="tip-form">
        <div class="sh">DEINEN TIPP HINZUFÜGEN</div>
        <textarea id="new-tip-text" rows="3" placeholder="Was hilft hier wirklich..."></textarea>
        <button class="add-tip-btn" data-action="submit-tip" data-post-id="${id}">Tipp abschicken 🌱</button>
      </div>
    </div>`;
}

// ── SCREEN: NEW POST ──────────────────────────────────────────────────────
function renderNewPost() {
  const photoSection = pendingPhoto
    ? `<img class="photo-preview" src="${pendingPhoto}" alt="Vorschau"><button style="margin-top:8px;background:transparent;border:none;color:#f87171;font-size:12px;font-weight:700;cursor:pointer" data-action="clear-photo">✕ Foto entfernen</button>`
    : `<label class="photo-area" for="photo-input">📷 Foto hinzufügen (optional)</label><input type="file" id="photo-input" class="file-input" accept="image/*" data-action="photo-select">`;

  return `
    <div class="topbar"><div class="topbar-row"><button class="btn-back" data-back>← zurück</button><span class="topbar-title">Neues Problem</span></div></div>
    <div class="scrollarea">
      <div class="pc" style="display:flex;flex-direction:column;gap:14px">
        <div>
          <div class="sh">PFLANZENNAME</div>
          <input class="inp" id="np-plant" type="text" placeholder="z.B. Monstera deliciosa" list="plant-suggestions">
          <datalist id="plant-suggestions">${PLANTS_DB.map(p => `<option value="${p.name}">`).join('')}</datalist>
        </div>
        <div>
          <div class="sh">WAS IST DAS PROBLEM?</div>
          <textarea class="inp" id="np-problem" rows="4" placeholder="Beschreib was du beobachtest..."></textarea>
        </div>
        <div>${photoSection}</div>
        <div id="ki-result-new"></div>
        <button class="ki-btn" data-action="ki-diagnose-new" id="ki-new-btn">🤖 KI-Diagnose anfragen</button>
        <div style="display:flex;gap:10px">
          <button class="btn-back" style="flex:1;padding:12px;text-align:center" data-back>Abbrechen</button>
          <button class="btn-green" style="flex:2;padding:12px" data-action="submit-post">Posten 🌱</button>
        </div>
      </div>
    </div>`;
}

// ── SCREEN: LEXIKON ───────────────────────────────────────────────────────
function renderLexikon(query) {
  const q = query || '';
  const list = PLANTS_DB.filter(p =>
    !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.category.toLowerCase().includes(q.toLowerCase())
  );

  const rows = list.map(p => `
    <a class="lexrow" href="#lex/${p.id}">
      <span class="lemi">${p.emoji}</span>
      <div style="flex:1">
        <div class="lname">${p.name}</div>
        <div class="lcat">${p.category}</div>
        <div class="ltags"><span class="${p.diffCls}">${p.diffLabel}</span><span class="ctag">💬 ${p.communityTips} Tipps</span></div>
      </div>
      <span class="arr">›</span>
    </a>`).join('');

  return `
    <div class="topbar">
      <div class="logo" style="margin-bottom:10px">📖 Lexikon</div>
      <input type="search" id="lex-search" class="inp" placeholder="🔍 Pflanze suchen..." value="${esc(q)}" autocomplete="off">
    </div>
    <div class="scrollarea">
      ${rows || '<div class="empty"><div class="empty-emi">🔍</div>Keine Pflanze gefunden</div>'}
    </div>`;
}

// ── SCREEN: LEX ENTRY ─────────────────────────────────────────────────────
function renderLexEntry(id) {
  const p = PLANTS_DB.find(x => x.id === id);
  if (!p) return renderLexikon();

  const inMyPlants = S.myPlants.some(x => x.plantId === id);

  return `
    <div class="topbar"><div class="topbar-row"><button class="btn-back" data-back>← zurück</button><span class="topbar-title">Pflanzenprofil</span></div></div>
    <div class="scrollarea">
      <div style="text-align:center;padding:16px 0 8px">
        <span class="bemi">${p.emoji}</span>
        <div style="font-size:20px;font-weight:900">${p.name}</div>
        <div style="font-size:12px;font-weight:700;color:#3d6630;margin-top:4px">${p.category}</div>
        <div style="margin-top:10px" class="${p.diffCls}">${p.diffLabel}</div>
      </div>
      <div class="g2">
        <div class="ibox"><div class="ilbl">☀️ LICHT</div><div class="ival">${p.light}</div></div>
        <div class="ibox"><div class="ilbl">💧 WASSER</div><div class="ival">${p.water}</div></div>
        <div class="ibox"><div class="ilbl">💦 LUFTFEUCHTE</div><div class="ival">${p.humidity}</div></div>
        <div class="ibox"><div class="ilbl">📅 GIESSINTERVALL</div><div class="ival">Alle ${p.wateringIntervalDays} Tage</div></div>
      </div>
      <div class="pc">
        <div class="sh">ÜBER DIESE PFLANZE</div>
        <div style="font-size:13px;font-weight:600;line-height:1.6">${p.description}</div>
      </div>
      <div class="pc">
        <div class="sh">📌 TIPPS</div>
        ${p.tips.map(t => `<div class="bul"><span class="dot">•</span><span class="btxt">${esc(t)}</span></div>`).join('')}
      </div>
      <div class="cstrip"><span>💬 Community-Tipps</span><span><strong>${p.communityTips} Einträge</strong></span></div>
      ${inMyPlants
        ? `<div style="text-align:center;padding:4px;font-size:13px;font-weight:700;color:#7fd962">✓ Bereits in Meine Pflanzen</div>`
        : `<button class="btn-green" style="width:100%;padding:13px" data-action="add-to-my-plants" data-plant-id="${id}">+ Zu meinen Pflanzen hinzufügen</button>`}
    </div>`;
}

// ── SCREEN: NACHRICHTEN ───────────────────────────────────────────────────
function renderMessages() {
  const MSGS = [
    { id: 'chat1', name: 'BotanikaBerlin', emoji: '👩‍🔬', pts: 891, prev: 'Klar, schick mir ein Foto!', time: 'vor 12 Min.', unread: 2 },
    { id: 'chat2', name: 'GrünerDaumen_Karl', emoji: '🧑‍🌾', pts: 342, prev: 'Danke für den Tipp gestern!', time: 'vor 2 Std.', unread: 0 }
  ];
  const rows = MSGS.map(m => {
    const rank = getRank(m.pts);
    return `
      <a class="dmrow" href="#chat/${m.id}">
        <span style="font-size:28px">${m.emoji}</span>
        <div style="flex:1;overflow:hidden">
          <div class="dmname">${esc(m.name)} <span class="rtag ${rank.cls}">${rank.emoji}</span></div>
          <div class="dmprev">${esc(m.prev)}</div>
        </div>
        <div class="dmtime">${m.time}</div>
        ${m.unread ? `<div class="dmunread">+${m.unread}</div>` : ''}
      </a>`;
  }).join('');

  return `
    <div class="topbar"><div class="logo">💬 Nachrichten</div><div class="sub">2 ungelesen</div></div>
    <div class="scrollarea">${rows}</div>`;
}

// ── SCREEN: CHAT ──────────────────────────────────────────────────────────
function renderChat(id) {
  const CHATS = {
    chat1: {
      name: 'BotanikaBerlin', emoji: '👩‍🔬',
      msgs: [
        { from: 'them', text: 'Hey! Ich hab gesehen du hast Probleme mit deiner Calathea?', time: '14:20' },
        { from: 'me', text: 'Ja, die Ränder werden braun obwohl ich regelmäßig gieße 😕', time: '14:22' },
        { from: 'them', text: 'Klar, schick mir ein Foto!', time: '14:35' }
      ]
    },
    chat2: {
      name: 'GrünerDaumen_Karl', emoji: '🧑‍🌾',
      msgs: [
        { from: 'them', text: 'Danke für den Tipp gestern! Die Monstera sieht schon besser aus 🌿', time: '11:08' },
        { from: 'me', text: 'Super, freut mich! Einfach nicht zu viel gießen 😄', time: '11:15' }
      ]
    }
  };
  const chat = CHATS[id];
  if (!chat) return renderMessages();

  const bubbles = chat.msgs.map(m => `
    <div class="${m.from === 'me' ? 'rme' : 'rthem'}">
      <div${m.from === 'me' ? ' style="text-align:right"' : ''}>
        <div class="${m.from === 'me' ? 'bme' : 'bthem'}">${esc(m.text)}</div>
        <div class="mtime">${m.time}</div>
      </div>
    </div>`).join('');

  return `
    <div class="topbar"><div class="topbar-row"><button class="btn-back" data-back>← zurück</button><span class="topbar-title">${chat.emoji} ${esc(chat.name)}</span></div></div>
    <div class="scrollarea">${bubbles}</div>`;
}

// ── SCREEN: PROFIL ────────────────────────────────────────────────────────
function renderProfil() {
  const { points, tipsGiven, helped, plantsCount } = S.profile;
  const rank = getRank(points);
  const nextRank = RANKS.find(r => r.min > points) || rank;
  const progress = rank === nextRank ? 100 : Math.round(((points - rank.min) / (nextRank.min - rank.min)) * 100);

  const top = [
    { name: 'BotanikaBerlin', emoji: '👩‍🔬', pts: 891, rank: RANKS[4] },
    { name: 'GrünerDaumen_Karl', emoji: '🧑‍🌾', pts: 342, rank: RANKS[2] },
    { name: 'PflanzPeter', emoji: '🧔', pts: 203, rank: RANKS[2] }
  ];
  const medals = ['🥇', '🥈', '🥉'];

  return `
    <div class="topbar"><div class="logo">🌟 Mein Profil</div></div>
    <div class="scrollarea">
      <div class="pc" style="text-align:center;padding:20px">
        <div style="font-size:58px;margin-bottom:8px">${S.profile.emoji}</div>
        <div style="font-size:20px;font-weight:900">${esc(S.profile.name)}</div>
        <div style="display:inline-flex;align-items:center;gap:6px;background:rgba(127,217,98,0.1);border:1.5px solid rgba(127,217,98,0.25);border-radius:50px;padding:5px 14px;margin-top:8px;color:#7fd962;font-size:13px;font-weight:800">${rank.emoji} ${rank.name}</div>
        <div style="font-size:38px;font-weight:900;color:#f5d060;line-height:1;margin-top:12px">${points}</div>
        <div style="font-size:12px;font-weight:700;color:#3d6630">Punkte</div>
        <div class="progress-bar" style="margin-top:12px"><div class="progress-fill" style="width:${progress}%"></div></div>
        ${rank !== nextRank ? `<div style="font-size:10px;font-weight:700;color:#3d6630;margin-top:4px">Nächster Rang: ${nextRank.emoji} ${nextRank.name} (${nextRank.min} Punkte)</div>` : '<div style="font-size:10px;font-weight:700;color:#7fd962;margin-top:4px">🏆 Maximaler Rang erreicht!</div>'}
      </div>
      <div class="g3">
        <div class="stile"><div class="sval">${tipsGiven}</div><div class="slbl">Tipps</div></div>
        <div class="stile"><div class="sval">${helped}</div><div class="slbl">Geholfen</div></div>
        <div class="stile"><div class="sval">${S.myPlants.length}</div><div class="slbl">Pflanzen</div></div>
      </div>
      <a class="link-card" href="#meine-pflanzen">
        <div><div class="link-card-title">🪴 Meine Pflanzen</div><div class="link-card-sub">Gießkalender & Erinnerungen</div></div>
        <span style="color:#3d6630;font-size:20px">›</span>
      </a>
      <a class="link-card" href="#rangsystem">
        <div><div class="link-card-title">🏅 Rang-System</div><div class="link-card-sub">Alle Ränge und Anforderungen</div></div>
        <span style="color:#3d6630;font-size:20px">›</span>
      </a>
      <a class="link-card" href="#settings">
        <div><div class="link-card-title">⚙️ Einstellungen</div><div class="link-card-sub">API-Key, Benachrichtigungen</div></div>
        <span style="color:#3d6630;font-size:20px">›</span>
      </a>
      <div class="pc">
        <div class="sh">WIE PUNKTE FUNKTIONIEREN</div>
        <div class="prow"><span style="font-size:16px;width:22px">✓</span><span class="pp">+3 Pkt.</span><span class="pd">Tipp hat geholfen</span></div>
        <div class="prow"><span style="font-size:16px;width:22px">💬</span><span class="pp">+1 Pkt.</span><span class="pd">Tipp gepostet</span></div>
        <div class="prow"><span style="font-size:16px;width:22px">👍</span><span class="pp">+1 Pkt.</span><span class="pd">Upvote erhalten</span></div>
      </div>
      <div class="pc">
        <div class="sh">🏆 TOP-HELFER</div>
        ${top.map((u, i) => `
          <div class="trow">
            <span style="font-size:14px;width:22px;text-align:center;font-weight:900">${medals[i]}</span>
            <span style="font-size:22px">${u.emoji}</span>
            <span class="tname">${esc(u.name)} <span class="rtag ${u.rank.cls}">${u.rank.emoji}</span></span>
            <span class="tpts">⭐ ${u.pts}</span>
          </div>`).join('')}
      </div>
    </div>`;
}

// ── SCREEN: MEINE PFLANZEN ────────────────────────────────────────────────
function renderMeinePflanzen() {
  const plants = S.myPlants;

  const cards = plants.length ? plants.map(pl => {
    const ws = waterStatus(pl);
    return `
      <div class="plant-card">
        <span class="plant-emi">${pl.emoji}</span>
        <div style="flex:1">
          <div class="plant-name">${esc(pl.name)}</div>
          <div class="plant-meta ${ws.cls}">${ws.text}</div>
          <div style="font-size:10px;font-weight:700;color:#3d6630;margin-top:2px">Alle ${pl.wateringIntervalDays} Tage</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
          <button class="water-btn" data-action="water-plant" data-plant-id="${pl.id}">💧 Gegossen</button>
          <button class="del-btn" data-action="delete-plant" data-plant-id="${pl.id}">✕</button>
        </div>
      </div>`;
  }).join('') : `<div class="empty"><div class="empty-emi">🪴</div>Noch keine Pflanzen hinzugefügt</div>`;

  return `
    <div class="topbar">
      <div class="topbar-row">
        <button class="btn-back" data-back>← zurück</button>
        <span class="topbar-title">🪴 Meine Pflanzen</span>
      </div>
    </div>
    <div class="scrollarea">
      ${cards}
      <div class="plant-form">
        <div class="sh">NEUE PFLANZE HINZUFÜGEN</div>
        <div style="display:flex;gap:10px">
          <input class="inp" id="new-plant-emoji" style="width:70px;text-align:center;font-size:20px" placeholder="🌱" maxlength="2">
          <input class="inp" id="new-plant-name" style="flex:1" type="text" placeholder="Pflanzenname" list="plant-suggestions-my">
        </div>
        <datalist id="plant-suggestions-my">${PLANTS_DB.map(p => `<option value="${p.name}">`).join('')}</datalist>
        <div style="display:flex;gap:10px;align-items:center">
          <span style="font-size:12px;font-weight:700;color:#7aaa62;white-space:nowrap">💧 Alle</span>
          <input class="inp" id="new-plant-interval" type="number" min="1" max="60" placeholder="7" style="flex:1">
          <span style="font-size:12px;font-weight:700;color:#7aaa62;white-space:nowrap">Tage gießen</span>
        </div>
        <button class="btn-green" style="padding:12px" data-action="add-custom-plant">+ Hinzufügen</button>
      </div>
      <div class="pc" style="background:rgba(127,217,98,0.04)">
        <div class="sh">💡 TIPP</div>
        <div style="font-size:12px;font-weight:600;color:#7aaa62;line-height:1.6">Pflanzen aus dem Lexikon direkt hinzufügen: Im Lexikon eine Pflanze öffnen und "Zu meinen Pflanzen" tippen.</div>
      </div>
    </div>`;
}

// ── SCREEN: RANGSYSTEM ────────────────────────────────────────────────────
function renderRanksystem() {
  const myRank = getRank(S.profile.points);
  const cards = RANKS.map(r => {
    const isCur = r.id === myRank.id;
    const locked = r.min > S.profile.points;
    return `
      <div class="rkcard${isCur ? ' cur' : ''}">
        <span class="rkico" style="${locked ? 'filter:grayscale(1);opacity:0.4' : ''}">${r.emoji}</span>
        <div>
          <div class="rkname" style="${locked ? 'color:#7aaa62' : ''}">${r.name}</div>
          <div class="rkreq">${r.max === Infinity ? `Ab ${r.min} Punkte` : `${r.min}–${r.max} Punkte`}</div>
        </div>
        ${isCur ? '<span class="rkhere">← Du bist hier</span>' : locked ? '<span class="rklock">🔒</span>' : '<span style="margin-left:auto;color:#7fd962;font-size:14px;font-weight:800">✓</span>'}
      </div>`;
  }).join('');

  return `
    <div class="topbar"><div class="topbar-row"><button class="btn-back" data-back>← zurück</button><span class="topbar-title">Rang-System</span></div></div>
    <div class="scrollarea">
      <div class="pc" style="text-align:center;background:rgba(127,217,98,0.05);border-color:rgba(127,217,98,0.2)">
        <div style="font-size:18px;font-weight:900;color:#7fd962;margin-bottom:4px">🏅 Rang-System</div>
        <div style="font-size:12px;font-weight:700;color:#3d6630">Verdiene Punkte durch hilfreiche Tipps und steig auf!</div>
      </div>
      ${cards}
    </div>`;
}

// ── SCREEN: SETTINGS ──────────────────────────────────────────────────────
function renderSettings() {
  const { claudeApiKey, notificationsEnabled } = S.settings;
  return `
    <div class="topbar"><div class="topbar-row"><button class="btn-back" data-back>← zurück</button><span class="topbar-title">⚙️ Einstellungen</span></div></div>
    <div class="scrollarea">
      <div class="settings-section">
        <div>
          <div class="settings-label">🤖 ANTHROPIC API KEY (für KI-Diagnose)</div>
          <input class="inp" id="api-key-input" type="password" placeholder="sk-ant-..." value="${esc(claudeApiKey)}" autocomplete="off">
          <div style="font-size:11px;color:#3d6630;font-weight:600;margin-top:6px">Der Key wird nur lokal gespeichert und nie übertragen.</div>
        </div>
        <button class="save-btn" data-action="save-settings">Speichern</button>
      </div>
      <div class="settings-section">
        <div class="toggle-row">
          <div>
            <div style="font-size:14px;font-weight:800;color:#dff5cc">💧 Gieß-Erinnerungen</div>
            <div style="font-size:11px;font-weight:700;color:#3d6630;margin-top:2px">Benachrichtigungen wenn Pflanzen Wasser brauchen</div>
          </div>
          <label class="toggle">
            <input type="checkbox" id="notif-toggle" ${notificationsEnabled ? 'checked' : ''} data-action="toggle-notifications">
            <span class="slider"></span>
          </label>
        </div>
        <div id="notif-status" style="font-size:11px;font-weight:700;color:#3d6630">
          ${notificationsEnabled ? '✓ Benachrichtigungen aktiv' : 'Benachrichtigungen deaktiviert'}
        </div>
      </div>
      <div class="settings-section">
        <div style="font-size:12px;font-weight:700;color:#7aaa62;line-height:1.7">
          <div style="font-size:14px;font-weight:800;color:#dff5cc;margin-bottom:6px">📱 App installieren</div>
          Im Browser auf "Zum Startbildschirm hinzufügen" tippen, um Pflanzio als App zu installieren.
        </div>
      </div>
      <div class="settings-section">
        <button class="del-btn" style="width:100%;padding:10px;font-size:13px" data-action="reset-state">⚠️ Alle Daten zurücksetzen</button>
      </div>
    </div>`;
}

// ── ROUTER ────────────────────────────────────────────────────────────────
let currentPage = 'feed';

function render() {
  const hash = location.hash.slice(1) || 'feed';
  const [page, ...rest] = hash.split('/');
  const param = rest.join('/');
  currentPage = page;

  let html = '';
  switch (page) {
    case 'feed':           html = renderFeed(); break;
    case 'post':           html = renderPost(param); break;
    case 'newpost':        html = renderNewPost(); break;
    case 'lexikon':        html = renderLexikon(); break;
    case 'lex':            html = renderLexEntry(param); break;
    case 'msgs':           html = renderMessages(); break;
    case 'chat':           html = renderChat(param); break;
    case 'profil':         html = renderProfil(); break;
    case 'meine-pflanzen': html = renderMeinePflanzen(); break;
    case 'rangsystem':     html = renderRanksystem(); break;
    case 'settings':       html = renderSettings(); break;
    default:               html = renderFeed();
  }

  const screen = document.getElementById('screen');
  screen.innerHTML = html;
  screen.scrollTop = 0;

  const navPages = ['feed', 'lexikon', 'msgs', 'profil'];
  const navPage = navPages.includes(page) ? page : page === 'chat' ? 'msgs' : page === 'lex' ? 'lexikon' : 'feed';
  document.getElementById('nav').innerHTML = renderNav(navPage);
}

function navigate(route) {
  location.hash = route;
}

function goBack() {
  if (history.length > 1) {
    history.back();
  } else {
    navigate('feed');
  }
}

// ── EVENT HANDLERS ────────────────────────────────────────────────────────
document.addEventListener('click', async e => {
  // Hash link navigation (handled by browser, but catch btn-back)
  if (e.target.closest('[data-back]')) {
    e.preventDefault();
    goBack();
    return;
  }

  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;

  if (action === 'filter') {
    mutate(s => s.feedFilter = btn.dataset.filter);
    return;
  }

  if (action === 'vote') {
    const { tipId, postId, dir } = btn.dataset;
    mutate(s => {
      const post = s.posts.find(p => p.id === postId);
      if (!post) return;
      const tip = post.tips.find(t => t.id === tipId);
      if (!tip) return;
      const prev = s.myVotes[tipId];
      if (prev === dir) {
        // un-vote
        delete s.myVotes[tipId];
        tip.votes += dir === 'up' ? -1 : 1;
      } else {
        if (prev === 'up') tip.votes--;
        if (prev === 'down') tip.votes++;
        s.myVotes[tipId] = dir;
        tip.votes += dir === 'up' ? 1 : -1;
      }
    });
    return;
  }

  if (action === 'helped') {
    const { tipId, postId } = btn.dataset;
    mutate(s => {
      const post = s.posts.find(p => p.id === postId);
      if (!post) return;
      const tip = post.tips.find(t => t.id === tipId);
      if (!tip || tip.helped) return;
      tip.helped = true;
      post.status = 'solved';
      s.profile.points += 3;
      s.profile.helped += 1;
    });
    showToast('✓ Als hilfreich markiert! +3 Punkte');
    return;
  }

  if (action === 'submit-tip') {
    const postId = btn.dataset.postId;
    const ta = document.getElementById('new-tip-text');
    const text = ta?.value.trim();
    if (!text) { showToast('Bitte einen Tipp eingeben'); return; }
    mutate(s => {
      const post = s.posts.find(p => p.id === postId);
      if (!post) return;
      post.tips.push({
        id: uid(),
        text,
        authorName: s.profile.name,
        authorEmoji: s.profile.emoji,
        authorPoints: s.profile.points,
        votes: 0,
        helped: false,
        timestamp: Date.now()
      });
      s.profile.tipsGiven += 1;
      s.profile.points += 1;
    });
    showToast('Tipp gepostet! +1 Punkt 🌱');
    return;
  }

  if (action === 'submit-post') {
    const plant = document.getElementById('np-plant')?.value.trim();
    const problem = document.getElementById('np-problem')?.value.trim();
    if (!plant || !problem) { showToast('Bitte Pflanze und Problem eingeben'); return; }
    const plantData = PLANTS_DB.find(p => p.name.toLowerCase() === plant.toLowerCase());
    const newPost = {
      id: uid(),
      plantName: plant,
      plantEmoji: plantData?.emoji || '🌱',
      problem,
      status: 'open',
      authorName: S.profile.name,
      authorEmoji: S.profile.emoji,
      authorPoints: S.profile.points,
      timestamp: Date.now(),
      photo: pendingPhoto || null,
      kiTip: null,
      tips: []
    };
    const newId = newPost.id;
    pendingPhoto = null;
    mutate(s => s.posts.unshift(newPost));
    showToast('Problem gepostet! 🌿');
    navigate('post/' + newId);
    return;
  }

  if (action === 'clear-photo') {
    pendingPhoto = null;
    render();
    return;
  }

  if (action === 'add-to-my-plants') {
    const plantId = btn.dataset.plantId;
    const p = PLANTS_DB.find(x => x.id === plantId);
    if (!p) return;
    if (S.myPlants.some(x => x.plantId === plantId)) { showToast('Bereits hinzugefügt'); return; }
    mutate(s => {
      s.myPlants.push({ id: uid(), plantId, name: p.name, emoji: p.emoji, wateringIntervalDays: p.wateringIntervalDays, lastWatered: Date.now() });
      s.profile.plantsCount = s.myPlants.length;
    });
    showToast(`${p.emoji} ${p.name} hinzugefügt!`);
    navigate('meine-pflanzen');
    return;
  }

  if (action === 'add-custom-plant') {
    const emoji = document.getElementById('new-plant-emoji')?.value.trim() || '🌱';
    const name = document.getElementById('new-plant-name')?.value.trim();
    const interval = parseInt(document.getElementById('new-plant-interval')?.value) || 7;
    if (!name) { showToast('Bitte Namen eingeben'); return; }
    const matched = PLANTS_DB.find(p => p.name.toLowerCase() === name.toLowerCase());
    mutate(s => {
      s.myPlants.push({ id: uid(), plantId: matched?.id || null, name, emoji: matched?.emoji || emoji, wateringIntervalDays: Math.max(1, interval), lastWatered: Date.now() });
      s.profile.plantsCount = s.myPlants.length;
    });
    showToast(`${emoji} ${name} hinzugefügt!`);
    return;
  }

  if (action === 'water-plant') {
    const plantId = btn.dataset.plantId;
    mutate(s => {
      const pl = s.myPlants.find(p => p.id === plantId);
      if (pl) pl.lastWatered = Date.now();
    });
    showToast('💧 Gegossen! Nächste Erinnerung gesetzt.');
    return;
  }

  if (action === 'delete-plant') {
    const plantId = btn.dataset.plantId;
    mutate(s => {
      s.myPlants = s.myPlants.filter(p => p.id !== plantId);
      s.profile.plantsCount = s.myPlants.length;
    });
    showToast('Pflanze entfernt');
    return;
  }

  if (action === 'save-settings') {
    const key = document.getElementById('api-key-input')?.value.trim() || '';
    mutate(s => s.settings.claudeApiKey = key);
    showToast('Einstellungen gespeichert ✓');
    return;
  }

  if (action === 'toggle-notifications') {
    const checked = document.getElementById('notif-toggle')?.checked;
    if (checked) {
      await requestNotifications();
    } else {
      mutate(s => s.settings.notificationsEnabled = false);
      showToast('Benachrichtigungen deaktiviert');
    }
    return;
  }

  if (action === 'reset-state') {
    if (!confirm('Alle Daten löschen?')) return;
    localStorage.removeItem(SK);
    S = getSeedState();
    save();
    navigate('feed');
    showToast('Daten zurückgesetzt');
    return;
  }

  if (action === 'ki-diagnose') {
    const postId = btn.dataset.postId;
    await runKIDiagnoseOnPost(postId, btn);
    return;
  }

  if (action === 'ki-diagnose-new') {
    await runKIDiagnoseNew(btn);
    return;
  }
});

// Photo file input
document.addEventListener('change', async e => {
  if (e.target.dataset.action === 'photo-select' && e.target.files[0]) {
    const file = e.target.files[0];
    if (file.size > 10 * 1024 * 1024) { showToast('Foto zu groß (max. 10MB)'); return; }
    pendingPhoto = await compressImage(file);
    render();
  }
});

// Lexikon search (live filter)
document.addEventListener('input', e => {
  if (e.target.id === 'lex-search') {
    const screen = document.getElementById('screen');
    const q = e.target.value;
    const list = PLANTS_DB.filter(p =>
      !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.category.toLowerCase().includes(q.toLowerCase())
    );
    const rows = list.map(p => `
      <a class="lexrow" href="#lex/${p.id}">
        <span class="lemi">${p.emoji}</span>
        <div style="flex:1">
          <div class="lname">${p.name}</div>
          <div class="lcat">${p.category}</div>
          <div class="ltags"><span class="${p.diffCls}">${p.diffLabel}</span><span class="ctag">💬 ${p.communityTips} Tipps</span></div>
        </div>
        <span class="arr">›</span>
      </a>`).join('');
    const scrollarea = screen.querySelector('.scrollarea');
    if (scrollarea) scrollarea.innerHTML = rows || '<div class="empty"><div class="empty-emi">🔍</div>Keine Pflanze gefunden</div>';
  }
});

// ── CLAUDE API ────────────────────────────────────────────────────────────
async function callClaude(messages, maxTokens = 300) {
  const key = S.settings.claudeApiKey;
  if (!key) {
    showToast('API-Key in Einstellungen eintragen ⚙️');
    return null;
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system: 'Du bist ein erfahrener Pflanzenexperte. Gib kurze, praktische Tipps auf Deutsch. Maximal 3-4 Sätze. Keine Markdown-Formatierung.',
      messages
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    showToast('KI-Fehler: ' + (err.error?.message || res.status));
    return null;
  }
  const data = await res.json();
  return data.content?.[0]?.text || null;
}

async function runKIDiagnoseOnPost(postId, btn) {
  const post = S.posts.find(p => p.id === postId);
  if (!post) return;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Analysiere...';

  const content = [{ type: 'text', text: `Pflanze: ${post.plantName}\nProblem: ${post.problem}` }];
  if (post.photo) {
    content.unshift({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: post.photo.split(',')[1] } });
  }

  const result = await callClaude([{ role: 'user', content }]);
  if (result) {
    mutate(s => { const p = s.posts.find(x => x.id === postId); if (p) p.kiTip = result; });
  } else {
    btn.disabled = false;
    btn.innerHTML = '🤖 KI-Diagnose anfragen';
  }
}

async function runKIDiagnoseNew(btn) {
  const plant = document.getElementById('np-plant')?.value.trim();
  const problem = document.getElementById('np-problem')?.value.trim();
  if (!plant || !problem) { showToast('Pflanze und Problem zuerst eingeben'); return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Analysiere...';

  const content = [{ type: 'text', text: `Pflanze: ${plant}\nProblem: ${problem}` }];
  if (pendingPhoto) {
    content.unshift({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: pendingPhoto.split(',')[1] } });
  }

  const result = await callClaude([{ role: 'user', content }]);
  btn.disabled = false;
  btn.innerHTML = '🤖 KI-Diagnose anfragen';

  const box = document.getElementById('ki-result-new');
  if (box && result) {
    box.innerHTML = `<div class="ki-box"><div class="ki-label">🤖 KI-DIAGNOSE</div><div class="ki-text">${esc(result)}</div></div>`;
  }
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────
async function requestNotifications() {
  if (!('Notification' in window)) {
    showToast('Dein Browser unterstützt keine Benachrichtigungen');
    mutate(s => s.settings.notificationsEnabled = false);
    return;
  }
  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    mutate(s => s.settings.notificationsEnabled = true);
    showToast('✓ Benachrichtigungen aktiviert!');
    checkWateringAlerts();
  } else {
    mutate(s => s.settings.notificationsEnabled = false);
    showToast('Benachrichtigungen abgelehnt');
  }
}

function checkWateringAlerts() {
  if (!S.settings.notificationsEnabled) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const now = Date.now();
  S.myPlants.forEach(pl => {
    const next = pl.lastWatered + pl.wateringIntervalDays * 86400000;
    if (now >= next) {
      new Notification('Pflanzio 💧 Zeit zum Gießen!', {
        body: `${pl.emoji} ${pl.name} braucht Wasser!`,
        icon: './icon-192.png',
        tag: 'water-' + pl.id
      });
    }
  });
}

// ── PWA ───────────────────────────────────────────────────────────────────
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

// ── INIT ──────────────────────────────────────────────────────────────────
window.addEventListener('hashchange', render);
window.addEventListener('load', () => {
  loadState();
  registerSW();
  checkWateringAlerts();
  render();
});
