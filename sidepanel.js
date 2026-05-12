// Q_INFO, Q_ORDER, quadrant(), intensity(), MISCALIBRATION_OPTIONS,
// FEEDBACK_CONSOLIDATE_THRESHOLD, miscalibrationOpt(), suggestPlacement(),
// consolidateFeedback(), genMemoryMd(), genMemoryMdNewChat() — all defined in shared.js.

// Side-panel-specific CSS class lookup (Q_INFO in shared.js doesn't know about role-pa / dot-pa).
const Q_STYLES = {
  'pro-a': { roleClass: 'role-pa', dotClass: 'dot-pa' },
  'pro-p': { roleClass: 'role-pp', dotClass: 'dot-pp' },
  'per-a': { roleClass: 'role-xa', dotClass: 'dot-xa' },
  'per-p': { roleClass: 'role-xp', dotClass: 'dot-xp' },
};

const PAD_X = 65, PAD_Y = 30, SIZE = 200;
const VB_W = PAD_X * 2 + SIZE;
const VB_H = PAD_Y * 2 + SIZE;
const CX = PAD_X + SIZE / 2, CY = PAD_Y + SIZE / 2;

let currentData = null; // last snapshot from storage, with defaults applied

function n2p(nx, ny) {
  return { x: PAD_X + (nx + 1) / 2 * SIZE, y: PAD_Y + (1 - ny) / 2 * SIZE };
}

function escH(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ─────────────────────────────────────────────────────────
// Graph + domain list
// ─────────────────────────────────────────────────────────
function drawGraph(data) {
  const container = document.getElementById('graph-container');
  const maxR = (SIZE / 2) * Math.sqrt(2);
  const r25 = maxR * 0.25, r50 = maxR * 0.5, r75 = maxR * 0.75;
  const dotColors = { 'pro-a': '#3b82f6', 'pro-p': '#22c55e', 'per-a': '#8b5cf6', 'per-p': '#f59e0b' };

  let dots = '';
  if (data && data.domains) {
    data.domains.filter(d => d.x !== null).forEach(d => {
      const { x, y } = n2p(d.x, d.y);
      const col = dotColors[quadrant(d.x, d.y)] || '#94a3b8';
      dots += `<circle cx="${x}" cy="${y}" r="5" fill="${col}" opacity="0.85"/>`;
    });
  }
  if (data && data.newChat && data.newChat.x !== null) {
    const { x, y } = n2p(data.newChat.x, data.newChat.y);
    dots += `<circle cx="${x}" cy="${y}" r="7" fill="#f59e0b" opacity="0.9" stroke="#fff" stroke-width="2"/>`;
  }

  container.innerHTML = `<svg viewBox="0 0 ${VB_W} ${VB_H}" width="100%" height="${VB_H}" xmlns="http://www.w3.org/2000/svg">
    <defs><clipPath id="clip"><rect x="${PAD_X}" y="${PAD_Y}" width="${SIZE}" height="${SIZE}"/></clipPath></defs>
    <rect x="${PAD_X}" y="${PAD_Y}" width="${SIZE/2}" height="${SIZE/2}" fill="#eff6ff" opacity="0.7"/>
    <rect x="${CX}"    y="${PAD_Y}" width="${SIZE/2}" height="${SIZE/2}" fill="#f5f3ff" opacity="0.7"/>
    <rect x="${PAD_X}" y="${CY}"    width="${SIZE/2}" height="${SIZE/2}" fill="#f0fdf4" opacity="0.7"/>
    <rect x="${CX}"    y="${CY}"    width="${SIZE/2}" height="${SIZE/2}" fill="#fffbeb" opacity="0.7"/>
    <g clip-path="url(#clip)" opacity="0.12">
      <circle cx="${CX}" cy="${CY}" r="${r75}" fill="none" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3 3"/>
      <circle cx="${CX}" cy="${CY}" r="${r50}" fill="none" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3 3"/>
      <circle cx="${CX}" cy="${CY}" r="${r25}" fill="none" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3 3"/>
    </g>
    <line x1="${PAD_X}" y1="${CY}" x2="${PAD_X+SIZE}" y2="${CY}" stroke="#d1d5db" stroke-width="1"/>
    <line x1="${CX}" y1="${PAD_Y}" x2="${CX}" y2="${PAD_Y+SIZE}" stroke="#d1d5db" stroke-width="1"/>
    <rect x="${PAD_X}" y="${PAD_Y}" width="${SIZE}" height="${SIZE}" fill="none" stroke="#e2e8f0" stroke-width="1" rx="2"/>
    <circle cx="${CX}" cy="${CY}" r="2.5" fill="#e2e8f0"/>
    <text x="${PAD_X-4}" y="${CY}" text-anchor="end" dominant-baseline="middle" font-size="9" font-weight="700" fill="#3b82f6">Professional</text>
    <text x="${PAD_X+SIZE+4}" y="${CY}" text-anchor="start" dominant-baseline="middle" font-size="9" font-weight="700" fill="#8b5cf6">Personal</text>
    <text x="${CX}" y="${PAD_Y-6}" text-anchor="middle" font-size="9" font-weight="700" fill="#334155">Planning</text>
    <text x="${CX}" y="${PAD_Y+SIZE+14}" text-anchor="middle" font-size="9" font-weight="700" fill="#334155">Polishing</text>
    <text x="${PAD_X+4}" y="${PAD_Y+11}" font-size="8" font-weight="600" fill="#3b82f6" opacity="0.7">Co-pilot</text>
    <text x="${PAD_X+SIZE-4}" y="${PAD_Y+11}" font-size="8" font-weight="600" fill="#7c3aed" opacity="0.7" text-anchor="end">Coach</text>
    <text x="${PAD_X+4}" y="${PAD_Y+SIZE-5}" font-size="8" font-weight="600" fill="#15803d" opacity="0.7">Researcher</text>
    <text x="${PAD_X+SIZE-4}" y="${PAD_Y+SIZE-5}" font-size="8" font-weight="600" fill="#b45309" opacity="0.7" text-anchor="end">Mirror</text>
    <g clip-path="url(#clip)">${dots}</g>
  </svg>`;
}

function renderList(data) {
  const list = document.getElementById('domain-list');
  const placed = (data && data.domains) ? data.domains.filter(d => d.x !== null) : [];
  const hasNewChat = !!(data && data.newChat && data.newChat.x !== null);

  if (!placed.length && !hasNewChat) {
    list.innerHTML = '<div class="empty-state"><strong>No domains mapped yet</strong>Click "Edit setup" to map your AI boundaries.</div>';
    return;
  }

  let html = '<div class="domain-list-header">Active domains</div>';

  if (hasNewChat) {
    const q   = quadrant(data.newChat.x, data.newChat.y);
    const qi  = Q_INFO[q];
    const sty = Q_STYLES[q];
    const pct = intensity(data.newChat.x, data.newChat.y);
    html += '<div class="new-chat-row">'
      + '<span style="font-size:9px">&#9733;</span>'
      + '<span class="domain-name" style="font-size:11px;color:#92400e">New Chat default</span>'
      + '<span class="domain-role ' + sty.roleClass + '">' + qi.role + '</span>'
      + '<span class="domain-pct">' + pct + '%</span>'
      + '</div>';
  }

  placed.forEach(d => {
    const q   = quadrant(d.x, d.y);
    const qi  = Q_INFO[q];
    const sty = Q_STYLES[q];
    const pct = intensity(d.x, d.y);
    html += '<div class="domain-row">'
      + '<span class="domain-dot ' + sty.dotClass + '"></span>'
      + '<span class="domain-name">' + escH(d.name) + '</span>'
      + '<span class="domain-role ' + sty.roleClass + '">' + qi.role + '</span>'
      + '<span class="domain-pct">' + pct + '%</span>'
      + '</div>';
  });

  list.innerHTML = html;
}

// ─────────────────────────────────────────────────────────
// Flag form
// ─────────────────────────────────────────────────────────
function refreshFlagDomainOptions(data) {
  const sel = document.getElementById('flag-domain');
  if (!sel) return;
  const placed = (data && data.domains) ? data.domains.filter(d => d.x !== null) : [];
  const hasNewChat = !!(data && data.newChat && data.newChat.x !== null);
  let opts = '<option value="">— Pick the domain this response was about —</option>';
  if (hasNewChat) opts += '<option value="new-chat">New Chat default</option>';
  placed.forEach(d => {
    opts += `<option value="${escH(d.id)}">${escH(d.name)}</option>`;
  });
  if (!placed.length && !hasNewChat) {
    opts += '<option value="" disabled>(Map a domain first to enable flagging)</option>';
  }
  sel.innerHTML = opts;
}

function renderMiscRadios() {
  const group = document.getElementById('flag-misc-group');
  if (!group) return;
  group.innerHTML = MISCALIBRATION_OPTIONS.map(opt => `
    <label class="flag-radio">
      <input type="radio" name="flag-misc" value="${escH(opt.id)}">
      <span>${escH(opt.label)}</span>
    </label>
  `).join('');
}

function resetFlagForm() {
  const r = document.querySelector('input[name="flag-misc"]:checked');
  if (r) r.checked = false;
  ['flag-response', 'flag-notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const dom = document.getElementById('flag-domain');
  if (dom) dom.value = '';
  hideFormMessage();
}

function showFormError(msg) {
  const el = document.getElementById('flag-error');
  const ok = document.getElementById('flag-ok');
  if (ok) ok.hidden = true;
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
}
function showFormOk(msg) {
  const el = document.getElementById('flag-ok');
  const err = document.getElementById('flag-error');
  if (err) err.hidden = true;
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
}
function hideFormMessage() {
  const el = document.getElementById('flag-error');
  const ok = document.getElementById('flag-ok');
  if (el) el.hidden = true;
  if (ok) ok.hidden = true;
}

function submitFlag() {
  hideFormMessage();
  const domainId       = document.getElementById('flag-domain').value;
  const miscalibration = (document.querySelector('input[name="flag-misc"]:checked') || {}).value;
  const responseText   = document.getElementById('flag-response').value.trim();
  const notes          = document.getElementById('flag-notes').value.trim();

  if (!domainId)       return showFormError('Pick the domain this response was about.');
  if (!miscalibration) return showFormError('Pick what felt off about the response.');
  if (!responseText)   return showFormError('Paste the AI response you want to flag.');

  let domainName = 'Unknown', currentX = null, currentY = null;
  if (domainId === 'new-chat') {
    domainName = 'New Chat default';
    if (currentData.newChat) { currentX = currentData.newChat.x; currentY = currentData.newChat.y; }
  } else {
    const dom = (currentData.domains || []).find(d => d.id === domainId);
    if (dom) { domainName = dom.name; currentX = dom.x; currentY = dom.y; }
  }

  const feedbackItem = {
    id:        'fb-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    createdAt: new Date().toISOString(),
    domainId, domainName, miscalibration, notes, responseText,
  };

  const nextFeedback  = [...(currentData.feedback || []), feedbackItem];
  let   nextConsol    = [...(currentData.consolidatedFeedback || [])];
  let   savedFeedback = nextFeedback;
  let   didConsolidate = false;

  if (nextFeedback.length >= FEEDBACK_CONSOLIDATE_THRESHOLD) {
    const newConsolidated = consolidateFeedback(nextFeedback);
    nextConsol = [...nextConsol, ...newConsolidated];
    savedFeedback = []; // reset count — allow user to flag fresh items
    didConsolidate = true;
  }

  // Dedupe pending suggestions by domainId — most recent flag wins.
  let pending = (currentData.pendingSuggestions || []).filter(p => p.domainId !== domainId);
  const newPos = suggestPlacement(currentX, currentY, miscalibration);
  if (newPos) {
    pending.push({
      id:           'ps-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      feedbackId:   feedbackItem.id,
      domainId, domainName, miscalibration,
      fromX: currentX, fromY: currentY,
      toX:   newPos.x, toY: newPos.y,
    });
  }

  saveData({
    ...currentData,
    feedback:             savedFeedback,
    consolidatedFeedback: nextConsol,
    pendingSuggestions:   pending,
  });

  resetFlagForm();
  if (didConsolidate) {
    showFormOk(`Flag saved. 10 flags reached — patterns consolidated. Pending count reset.`);
  } else {
    showFormOk(`Flag saved. memory.md updated below.`);
  }
  // Auto-open the preview so the user immediately sees the updated memory.md.
  openSection('preview-toggle', 'preview-body');
}

function removePendingFeedback(id) {
  const next = (currentData.feedback || []).filter(f => f.id !== id);
  saveData({ ...currentData, feedback: next });
}

function removeConsolidated(id) {
  const next = (currentData.consolidatedFeedback || []).filter(c => c.id !== id);
  saveData({ ...currentData, consolidatedFeedback: next });
}

// ─────────────────────────────────────────────────────────
// Feedback list rendering
// ─────────────────────────────────────────────────────────
function renderPendingList(data) {
  const section = document.getElementById('pending-section');
  const body    = document.getElementById('pending-body');
  const count   = document.getElementById('pending-count');
  const items   = (data && data.feedback) || [];
  if (!items.length) { section.hidden = true; return; }
  section.hidden = false;
  count.textContent = items.length;
  body.innerHTML = items.map(fb => {
    const snippet = (fb.responseText || '').slice(0, 160).replace(/\s+/g, ' ').trim();
    const more    = (fb.responseText || '').length > 160 ? '…' : '';
    return `<div class="fb-item">
      <button class="fb-item-remove" data-action="remove-feedback" data-id="${escH(fb.id)}" title="Remove">×</button>
      <div class="fb-item-domain">${escH(fb.domainName || 'Unspecified')}</div>
      <div class="fb-item-misc">${escH(miscalibrationLabel(fb.miscalibration))}</div>
      ${snippet ? `<div class="fb-item-snippet">"${escH(snippet)}${more}"</div>` : ''}
      ${fb.notes ? `<div class="fb-item-notes">${escH(fb.notes)}</div>` : ''}
    </div>`;
  }).join('');
}

function renderConsolidatedList(data) {
  const section = document.getElementById('consol-section');
  const body    = document.getElementById('consol-body');
  const count   = document.getElementById('consol-count');
  const items   = (data && data.consolidatedFeedback) || [];
  if (!items.length) { section.hidden = true; return; }
  section.hidden = false;
  count.textContent = items.length;
  body.innerHTML = items.map(cf => `
    <div class="fb-item fb-item-consolidated">
      <button class="fb-item-remove" data-action="remove-consolidated" data-id="${escH(cf.id)}" title="Remove">×</button>
      <div class="fb-item-insight">${escH(cf.insight || '')}</div>
      <div class="fb-item-meta">${escH(cf.count || 0)} flags · ${escH(cf.domainName || 'Unspecified')}</div>
    </div>
  `).join('');
}

// ─────────────────────────────────────────────────────────
// memory.md preview
// ─────────────────────────────────────────────────────────
function buildPreviewMd(data) {
  const hasMappedDomains = (data.domains || []).some(d => d.x !== null);
  const useNewChatMode   = !hasMappedDomains && data.newChat && data.newChat.x !== null;
  return useNewChatMode ? genMemoryMdNewChat(data) : genMemoryMd(data);
}

function renderPreview(data) {
  const ta = document.getElementById('preview-text');
  if (!ta) return;
  ta.value = buildPreviewMd(data);
}

function copyPreview() {
  const ta = document.getElementById('preview-text');
  if (!ta) return;
  navigator.clipboard.writeText(ta.value).then(() => {
    const btn = document.getElementById('preview-copy');
    if (!btn) return;
    const orig = btn.textContent;
    btn.textContent = 'Copied ✓';
    setTimeout(() => { btn.textContent = orig; }, 1500);
  });
}

function downloadPreview() {
  const ta = document.getElementById('preview-text');
  if (!ta) return;
  const blob = new Blob([ta.value], { type: 'text/markdown' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: 'memory.md' });
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────
// Collapsible toggle plumbing
// ─────────────────────────────────────────────────────────
function bindToggle(toggleId, bodyId) {
  const btn  = document.getElementById(toggleId);
  const body = document.getElementById(bodyId);
  if (!btn || !body) return;
  btn.addEventListener('click', () => {
    const isOpen = !body.hidden;
    body.hidden = isOpen;
    btn.classList.toggle('is-open', !isOpen);
  });
}
function openSection(toggleId, bodyId) {
  const btn  = document.getElementById(toggleId);
  const body = document.getElementById(bodyId);
  if (!btn || !body) return;
  body.hidden = false;
  btn.classList.add('is-open');
}

// ─────────────────────────────────────────────────────────
// Storage round-trip
// ─────────────────────────────────────────────────────────
function saveData(next) {
  BoundariesStorage.save({
    domains:              next.domains || [],
    newChat:              next.newChat,
    sycophancy:           next.sycophancy,
    feedback:             next.feedback,
    consolidatedFeedback: next.consolidatedFeedback,
    pendingSuggestions:   next.pendingSuggestions,
  });
  // onChange (extension context) will fire and refresh UI; refresh manually here
  // for environments where onChange doesn't dispatch (or fires async).
  refresh(next);
}

function normalize(data) {
  return {
    domains:              (data && data.domains) || [],
    newChat:              (data && data.newChat) || null,
    sycophancy:           (data && typeof data.sycophancy === 'number') ? data.sycophancy : 50,
    feedback:             (data && Array.isArray(data.feedback)) ? data.feedback : [],
    consolidatedFeedback: (data && Array.isArray(data.consolidatedFeedback)) ? data.consolidatedFeedback : [],
    pendingSuggestions:   (data && Array.isArray(data.pendingSuggestions)) ? data.pendingSuggestions : [],
  };
}

function refresh(data) {
  currentData = normalize(data);
  drawGraph(currentData);
  renderList(currentData);
  refreshFlagDomainOptions(currentData);
  renderPendingList(currentData);
  renderConsolidatedList(currentData);
  renderPreview(currentData);
}

function openSetup() {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  }
}

// ─────────────────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  try {
    document.getElementById('setup-btn').addEventListener('click', openSetup);
    renderMiscRadios();
    bindToggle('flag-toggle', 'flag-body');
    bindToggle('pending-toggle', 'pending-body');
    bindToggle('consol-toggle', 'consol-body');
    bindToggle('preview-toggle', 'preview-body');

    document.getElementById('flag-submit').addEventListener('click', submitFlag);
    document.getElementById('flag-reset').addEventListener('click', () => { resetFlagForm(); });
    document.getElementById('preview-copy').addEventListener('click', copyPreview);
    document.getElementById('preview-download').addEventListener('click', downloadPreview);

    document.addEventListener('click', e => {
      const t = e.target.closest('[data-action]');
      if (!t) return;
      const a  = t.dataset.action;
      const id = t.dataset.id;
      if      (a === 'remove-feedback')     removePendingFeedback(id);
      else if (a === 'remove-consolidated') removeConsolidated(id);
    });

    BoundariesStorage.load(refresh);
    BoundariesStorage.onChange(refresh);
  } catch (e) {
    const c = document.getElementById('graph-container');
    if (c) c.innerHTML = '<p style="color:red;font-size:11px;padding:8px">Error: ' + escH(e.message) + '</p>';
  }
});
