const Q_INFO = {
  'pro-a': { role:'Co-pilot',   roleClass:'role-pa', dotClass:'dot-pa' },
  'pro-p': { role:'Researcher', roleClass:'role-pp', dotClass:'dot-pp' },
  'per-a': { role:'Coach',      roleClass:'role-xa', dotClass:'dot-xa' },
  'per-p': { role:'Mirror',     roleClass:'role-xp', dotClass:'dot-xp' },
};

const PAD = 30, SIZE = 200;
const CX = PAD + SIZE / 2, CY = PAD + SIZE / 2;

function n2p(nx, ny) {
  return {
    x: PAD + (nx + 1) / 2 * SIZE,
    y: PAD + (1 - ny) / 2 * SIZE,
  };
}

function quadrant(nx, ny) {
  return (nx <= 0 ? 'pro' : 'per') + '-' + (ny >= 0 ? 'a' : 'p');
}

function intensity(nx, ny) {
  return Math.round(Math.sqrt(nx * nx + ny * ny) / Math.sqrt(2) * 100);
}

function drawGraph(data) {
  const container = document.getElementById('graph-container');

  const maxR = (SIZE / 2) * Math.sqrt(2);
  const r25 = maxR * 0.25, r50 = maxR * 0.5, r75 = maxR * 0.75;
  const dotColors = { 'pro-a':'#3b82f6','pro-p':'#22c55e','per-a':'#8b5cf6','per-p':'#f59e0b' };

  let dots = '';
  if (data && data.domains) {
    data.domains.filter(d => d.x !== null).forEach(d => {
      const { x, y } = n2p(d.x, d.y);
      const col = dotColors[quadrant(d.x, d.y)] || '#94a3b8';
      dots += `<circle cx="${x}" cy="${y}" r="5" fill="${col}" opacity="0.85"/>`;
    });
  }
  if (data && data.newChat) {
    const { x, y } = n2p(data.newChat.x, data.newChat.y);
    dots += `<circle cx="${x}" cy="${y}" r="7" fill="#f59e0b" opacity="0.9" stroke="#fff" stroke-width="2"/>`;
  }

  container.innerHTML = `<svg viewBox="0 0 260 260" width="100%" height="260" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id="clip">
        <rect x="${PAD}" y="${PAD}" width="${SIZE}" height="${SIZE}"/>
      </clipPath>
    </defs>
    <rect x="${PAD}" y="${PAD}" width="${SIZE/2}" height="${SIZE/2}" fill="#eff6ff" opacity="0.7"/>
    <rect x="${CX}"  y="${PAD}" width="${SIZE/2}" height="${SIZE/2}" fill="#f5f3ff" opacity="0.7"/>
    <rect x="${PAD}" y="${CY}"  width="${SIZE/2}" height="${SIZE/2}" fill="#f0fdf4" opacity="0.7"/>
    <rect x="${CX}"  y="${CY}"  width="${SIZE/2}" height="${SIZE/2}" fill="#fffbeb" opacity="0.7"/>
    <g clip-path="url(#clip)" opacity="0.12">
      <circle cx="${CX}" cy="${CY}" r="${r75}" fill="none" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3 3"/>
      <circle cx="${CX}" cy="${CY}" r="${r50}" fill="none" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3 3"/>
      <circle cx="${CX}" cy="${CY}" r="${r25}" fill="none" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3 3"/>
    </g>
    <line x1="${PAD}" y1="${CY}" x2="${PAD+SIZE}" y2="${CY}" stroke="#d1d5db" stroke-width="1"/>
    <line x1="${CX}" y1="${PAD}" x2="${CX}" y2="${PAD+SIZE}" stroke="#d1d5db" stroke-width="1"/>
    <rect x="${PAD}" y="${PAD}" width="${SIZE}" height="${SIZE}" fill="none" stroke="#e2e8f0" stroke-width="1" rx="2"/>
    <circle cx="${CX}" cy="${CY}" r="2.5" fill="#e2e8f0"/>
    <text x="${PAD-4}" y="${CY}" text-anchor="end" dominant-baseline="middle" font-size="8" font-weight="700" fill="#3b82f6">Pro</text>
    <text x="${PAD+SIZE+4}" y="${CY}" text-anchor="start" dominant-baseline="middle" font-size="8" font-weight="700" fill="#8b5cf6">Per</text>
    <text x="${CX}" y="${PAD-6}" text-anchor="middle" font-size="8" font-weight="700" fill="#334155">Active</text>
    <text x="${CX}" y="${PAD+SIZE+14}" text-anchor="middle" font-size="8" font-weight="700" fill="#334155">Passive</text>
    <text x="${PAD+4}" y="${PAD+11}" font-size="7" font-weight="600" fill="#3b82f6" opacity="0.7">Co-pilot</text>
    <text x="${PAD+SIZE-4}" y="${PAD+11}" font-size="7" font-weight="600" fill="#7c3aed" opacity="0.7" text-anchor="end">Coach</text>
    <text x="${PAD+4}" y="${PAD+SIZE-5}" font-size="7" font-weight="600" fill="#15803d" opacity="0.7">Researcher</text>
    <text x="${PAD+SIZE-4}" y="${PAD+SIZE-5}" font-size="7" font-weight="600" fill="#b45309" opacity="0.7" text-anchor="end">Mirror</text>
    <g clip-path="url(#clip)">${dots}</g>
  </svg>`;
}

function renderList(data) {
  const list = document.getElementById('domain-list');
  const placed = data && data.domains ? data.domains.filter(d => d.x !== null) : [];

  if (!placed.length && !(data && data.newChat)) {
    list.innerHTML = '<div class="empty-state"><strong>No domains mapped yet</strong>Click "Edit setup" to map your AI boundaries.</div>';
    return;
  }

  let html = '<div class="domain-list-header">Active domains</div>';

  if (data.newChat) {
    const q  = quadrant(data.newChat.x, data.newChat.y);
    const qi = Q_INFO[q];
    const pct = intensity(data.newChat.x, data.newChat.y);
    html += '<div class="new-chat-row">'
      + '<span style="font-size:9px">&#9733;</span>'
      + '<span class="domain-name" style="font-size:11px;color:#92400e">New Chat default</span>'
      + '<span class="domain-role ' + qi.roleClass + '">' + qi.role + '</span>'
      + '<span class="domain-pct">' + pct + '%</span>'
      + '</div>';
  }

  placed.forEach(function(d) {
    const q  = quadrant(d.x, d.y);
    const qi = Q_INFO[q];
    const pct = intensity(d.x, d.y);
    html += '<div class="domain-row">'
      + '<span class="domain-dot ' + qi.dotClass + '"></span>'
      + '<span class="domain-name">' + d.name + '</span>'
      + '<span class="domain-role ' + qi.roleClass + '">' + qi.role + '</span>'
      + '<span class="domain-pct">' + pct + '%</span>'
      + '</div>';
  });

  list.innerHTML = html;
}

function refresh(data) {
  drawGraph(data);
  renderList(data);
}

function openSetup() {
  chrome.runtime.openOptionsPage();
}

document.addEventListener('DOMContentLoaded', function() {
  try {
    document.getElementById('setup-btn').addEventListener('click', openSetup);
    BoundariesStorage.load(refresh);
    BoundariesStorage.onChange(refresh);
  } catch(e) {
    document.getElementById('graph-container').innerHTML =
      '<p style="color:red;font-size:11px;padding:8px">Error: ' + e.message + '</p>';
  }
});
