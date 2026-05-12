// ═══════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════
const PL = 100, PT = 45, PR = 70, PB = 55;
const CW = 380, CH = 400;
const SW = PL + CW + PR;  // 550
const SH = PT + CH + PB;  // 500

const CX = PL + CW / 2;   // center x px = 280
const CY = PT + CH / 2;   // center y px = 245

function n2p(nx, ny) {
  return { x: PL + (nx + 1) / 2 * CW, y: PT + (1 - ny) / 2 * CH };
}
function p2n(px, py) {
  return {
    nx: Math.max(-1, Math.min(1, (px - PL) / CW * 2 - 1)),
    ny: Math.max(-1, Math.min(1, 1 - (py - PT) / CH * 2))
  };
}
// Q_INFO, Q_ORDER, EXAMPLE_PROMPT, EXAMPLE_RESPONSES, EXAMPLE_SHAPES, MISCALIBRATION_OPTIONS,
// FEEDBACK_CONSOLIDATE_THRESHOLD, quadrant(), intensity(), miscalibrationOpt(),
// miscalibrationLabel(), suggestPlacement(), consolidateFeedback(), adjustmentsSection(),
// sycophancyDescriptor(), sycophancyScale(), intensityScale(), roleExamplesMarkdown(),
// roleExamplesCompact(), quadrantInstructions(), genMemoryMd(), genMemoryMdNewChat()
// are all defined in shared.js and loaded as globals before this file.

// ═══════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════
const NEW_CHAT_DOMAIN = { id:'new-chat', name:'New Chat (default)', cat:'meta', x: null, y: null, custom: false };

const PRESETS = [
  { id:'email-drafting',        name:'Email Drafting',       cat:'pro', suggestedQ:'pro-a' },
  { id:'coding',                name:'Coding',               cat:'pro', suggestedQ:'pro-a' },
  { id:'career-planning',       name:'Career Planning',      cat:'pro', suggestedQ:'per-a' },
  { id:'hiring',                name:'Hiring',               cat:'pro', suggestedQ:'pro-p' },
  { id:'experimental-design',   name:'Experimental Design',  cat:'pro', suggestedQ:'pro-p' },
  { id:'mental-health',         name:'Mental Health',        cat:'per', suggestedQ:'per-a' },
  { id:'communication',         name:'Communication Skills', cat:'per', suggestedQ:'per-a' },
  { id:'relationship-advice',   name:'Relationship Advice',  cat:'per', suggestedQ:'per-p' },
  { id:'dating-advice',         name:'Dating Advice',        cat:'per', suggestedQ:'per-p' },
  { id:'family-relationships',  name:'Family Relationships', cat:'per', suggestedQ:'per-p' },
  { id:'spirituality',          name:'Spirituality',         cat:'per', suggestedQ:'per-p' },
  { id:'personal-development',  name:'Personal Development', cat:'per', suggestedQ:'per-a' },
  { id:'financial-planning',    name:'Financial Planning',   cat:'pro', suggestedQ:'pro-p' },
  { id:'legal-matters',         name:'Legal Matters',        cat:'pro', suggestedQ:'pro-p' },
  { id:'health-wellness',       name:'Health & Wellness',    cat:'per', suggestedQ:'per-a' },
  { id:'parenting',             name:'Parenting',            cat:'per', suggestedQ:'per-p' },
  { id:'ethics',                name:'Ethics',               cat:'per', suggestedQ:'per-p' },
];

let state = {
  step: 1,
  domains: PRESETS.map(d => ({ ...d, x: null, y: null, custom: false })),
  newChat: { ...NEW_CHAT_DOMAIN },
  selectedId: null,
  hoverPos: null,
  sycophancy: 50,
  feedback: [],
  consolidatedFeedback: [],
  pendingSuggestions: [],
};

// ═══════════════════════════════════════════════════
// Markdown
// (sycophancyDescriptor, sycophancyScale, intensityScale, roleExamplesMarkdown,
//  roleExamplesCompact, quadrantInstructions — defined in shared.js)
// ═══════════════════════════════════════════════════

function genMarkdown() {
  return genMemoryMd({
    domains:              state.domains,
    newChat:              state.newChat,
    sycophancy:           state.sycophancy,
    feedback:             state.feedback,
    consolidatedFeedback: state.consolidatedFeedback,
  });
}

function genClaudeProfile() {
  const placed = state.domains.filter(d => d.x !== null);
  const nc     = state.newChat;
  const v      = state.sycophancy;
  const usedRoles = new Set();
  const lines = [];

  lines.push("I use a structured AI involvement framework. Apply these defaults to every response.");
  lines.push("");

  if (nc.x !== null) {
    const q    = quadrant(nc.x, nc.y);
    const info = Q_INFO[q];
    const it   = intensity(nc.x, nc.y);
    usedRoles.add(q);
    lines.push(`DEFAULT ROLE for unspecified topics: ${info.role} (${info.label}) at ${it}% involvement.`);
    lines.push("");
  }

  if (placed.length) {
    lines.push("DOMAIN ROLES (apply when the topic matches):");
    placed.forEach(d => {
      const q    = quadrant(d.x, d.y);
      const info = Q_INFO[q];
      const it   = intensity(d.x, d.y);
      usedRoles.add(q);
      lines.push(`- ${d.name}: ${info.role} (${info.label}), ${it}%`);
    });
    lines.push("");
  }

  lines.push("INVOLVEMENT % (the number tells you how much to do):");
  lines.push("- 0%: No involvement. Gently rebuff and remind me this domain is off-limits.");
  lines.push("- 25%: Never give the answer directly. Ask helpful guiding questions about framing and approach.");
  lines.push("- 50%: Ask questions first; after a few conversation turns begin generating the actual output. Don't go fully out until I ask.");
  lines.push("- 100%: Generate the desired output completely, as asked.");
  lines.push("Scale proportionally between these anchors.");
  lines.push("");

  lines.push(`SYCOPHANCY: ${v}/100 (${sycophancyDescriptor(v)}).`);
  lines.push("Reference: 0 = fully honest, willing to push back; 25 = mostly candid; 50 = balanced; 75 = leans agreeable; 100 = maximally agreeable. Lower = more candid; higher = more flattering.");
  lines.push("");

  if (usedRoles.size > 0) {
    lines.push("ROLE BEHAVIORS (only the ones I actually use):");
    if (usedRoles.has('pro-a')) lines.push("- Co-pilot (Professional · Planning): Take a position, make clear recommendations, be action-oriented.");
    if (usedRoles.has('pro-p')) lines.push("- Researcher (Professional · Polishing): Surface information, options, and trade-offs without pushing a conclusion.");
    if (usedRoles.has('per-a')) lines.push("- Coach (Personal · Planning): Give direct, honest personal guidance; name patterns; suggest concrete next steps.");
    if (usedRoles.has('per-p')) lines.push("- Mirror (Personal · Polishing): Don't give direct answers; respond with reflective prompts that turn the question back to me.");
    lines.push("");
  }

  lines.push(roleExamplesCompact());

  return lines.join('\n');
}

function genChatGPTAboutMe() {
  const placed = state.domains.filter(d => d.x !== null);
  const nc     = state.newChat;
  const lines  = [];

  lines.push("I use a structured AI involvement framework with quadrant-based roles and percentage-based involvement levels.");
  lines.push("");

  if (nc.x !== null) {
    const q    = quadrant(nc.x, nc.y);
    const info = Q_INFO[q];
    const it   = intensity(nc.x, nc.y);
    lines.push(`Default role for any topic not specifically listed: ${info.role} (${info.label}) at ${it}% involvement.`);
    lines.push("");
  }

  if (placed.length) {
    lines.push("My domain-specific role assignments:");
    placed.forEach(d => {
      const q    = quadrant(d.x, d.y);
      const info = Q_INFO[q];
      const it   = intensity(d.x, d.y);
      lines.push(`- ${d.name}: ${info.role} (${info.label}), ${it}%`);
    });
  }

  return lines.join('\n');
}

function genChatGPTHowToRespond() {
  const placed = state.domains.filter(d => d.x !== null);
  const nc     = state.newChat;
  const v      = state.sycophancy;
  const usedRoles = new Set();
  if (nc.x !== null) usedRoles.add(quadrant(nc.x, nc.y));
  placed.forEach(d => usedRoles.add(quadrant(d.x, d.y)));

  const lines = [];
  lines.push("Apply these defaults to every response.");
  lines.push("");

  lines.push("INVOLVEMENT % (the number tells you how much to do):");
  lines.push("- 0%: No involvement. Gently rebuff and remind me this domain is off-limits.");
  lines.push("- 25%: Never give the answer directly. Ask helpful guiding questions about framing and approach.");
  lines.push("- 50%: Ask questions first; after a few conversation turns begin generating the actual output.");
  lines.push("- 100%: Generate the desired output completely, as asked.");
  lines.push("Scale proportionally between these anchors.");
  lines.push("");

  lines.push(`SYCOPHANCY: ${v}/100 (${sycophancyDescriptor(v)}).`);
  lines.push("Reference: 0 = fully honest, willing to push back; 100 = maximally agreeable. Lower = more candid; higher = more flattering.");
  lines.push("");

  if (usedRoles.size > 0) {
    lines.push("ROLE BEHAVIORS (only the ones I actually use):");
    if (usedRoles.has('pro-a')) lines.push("- Co-pilot (Professional · Planning): Take a position, make clear recommendations, be action-oriented.");
    if (usedRoles.has('pro-p')) lines.push("- Researcher (Professional · Polishing): Surface information and trade-offs without pushing a conclusion.");
    if (usedRoles.has('per-a')) lines.push("- Coach (Personal · Planning): Give direct, honest personal guidance; name patterns; suggest concrete next steps.");
    if (usedRoles.has('per-p')) lines.push("- Mirror (Personal · Polishing): Don't give direct answers; respond with reflective prompts.");
    lines.push("");
  }

  lines.push(roleExamplesCompact());

  return lines.join('\n');
}

function genMarkdownNewChat() {
  return genMemoryMdNewChat({
    newChat:              state.newChat,
    sycophancy:           state.sycophancy,
    feedback:             state.feedback,
    consolidatedFeedback: state.consolidatedFeedback,
  });
}

// ═══════════════════════════════════════════════════
// SVG Plot
// ═══════════════════════════════════════════════════
function makeSVG() {
  const r = CW / 2;
  const maxR = r * Math.sqrt(2);
  const r25 = maxR * 0.25, r50 = maxR * 0.5, r75 = maxR * 0.75;
  const rt = PL + CW, rb = PT + CH;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}">
  <defs>
    <clipPath id="cc">
      <rect x="${PL}" y="${PT}" width="${CW}" height="${CH}"/>
    </clipPath>
  </defs>

  <!-- Quadrant fills -->
  <rect x="${PL}"  y="${PT}"  width="${CW/2}" height="${CH/2}" fill="#eff6ff" opacity="0.55"/>
  <rect x="${CX}"  y="${PT}"  width="${CW/2}" height="${CH/2}" fill="#f5f3ff" opacity="0.55"/>
  <rect x="${PL}"  y="${CY}"  width="${CW/2}" height="${CH/2}" fill="#f0fdf4" opacity="0.55"/>
  <rect x="${CX}"  y="${CY}"  width="${CW/2}" height="${CH/2}" fill="#fffbeb" opacity="0.55"/>

  <!-- Intensity rings (clipped) -->
  <g clip-path="url(#cc)" opacity="0.15">
    <circle cx="${CX}" cy="${CY}" r="${r75}" fill="none" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4 3"/>
    <circle cx="${CX}" cy="${CY}" r="${r50}" fill="none" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4 3"/>
    <circle cx="${CX}" cy="${CY}" r="${r25}" fill="none" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4 3"/>
  </g>

  <!-- Ring labels (diagonal) -->
  <g font-size="8.5" fill="#c0c8d8" font-family="Inter,system-ui" clip-path="url(#cc)">
    <text x="${CX + r25*0.707 + 3}" y="${CY - r25*0.707 - 3}">25%</text>
    <text x="${CX + r50*0.707 + 3}" y="${CY - r50*0.707 - 3}">50%</text>
    <text x="${CX + r75*0.707 + 3}" y="${CY - r75*0.707 - 3}">75%</text>
  </g>

  <!-- Axes -->
  <line x1="${PL}" y1="${CY}" x2="${rt}" y2="${CY}" stroke="#d1d5db" stroke-width="1.5"/>
  <line x1="${CX}" y1="${PT}" x2="${CX}" y2="${rb}" stroke="#d1d5db" stroke-width="1.5"/>

  <!-- Chart border -->
  <rect x="${PL}" y="${PT}" width="${CW}" height="${CH}" fill="none" stroke="#e2e8f0" stroke-width="1.5" rx="2"/>

  <!-- Center dot -->
  <circle cx="${CX}" cy="${CY}" r="3.5" fill="#e2e8f0"/>

  <!-- Axis labels -->
  <text x="${PL - 10}" y="${CY}" text-anchor="end"   dominant-baseline="middle"
    font-size="12" font-weight="700" fill="#3b82f6" font-family="Inter,system-ui">Professional</text>
  <text x="${rt + 10}"  y="${CY}" text-anchor="start" dominant-baseline="middle"
    font-size="12" font-weight="700" fill="#8b5cf6" font-family="Inter,system-ui">Personal</text>
  <text x="${CX}" y="${PT - 14}" text-anchor="middle"
    font-size="12" font-weight="700" fill="#334155" font-family="Inter,system-ui">Planning</text>
  <text x="${CX}" y="${PT - 26}" text-anchor="middle"
    font-size="9.5" fill="#94a3b8" font-family="Inter,system-ui">(early-stage involvement)</text>
  <text x="${CX}" y="${rb + 18}" text-anchor="middle" dominant-baseline="hanging"
    font-size="12" font-weight="700" fill="#334155" font-family="Inter,system-ui">Polishing</text>
  <text x="${CX}" y="${rb + 32}" text-anchor="middle" dominant-baseline="hanging"
    font-size="9.5" fill="#94a3b8" font-family="Inter,system-ui">(late-stage involvement)</text>

  <!-- Quadrant role labels -->
  <text x="${PL + 8}"   y="${PT + 15}" font-size="10.5" font-weight="600" fill="#3b82f6" opacity="0.65" font-family="Inter,system-ui">Co-pilot</text>
  <text x="${rt - 8}"   y="${PT + 15}" font-size="10.5" font-weight="600" fill="#7c3aed" opacity="0.65" text-anchor="end" font-family="Inter,system-ui">Coach</text>
  <text x="${PL + 8}"   y="${rb - 8}"  font-size="10.5" font-weight="600" fill="#15803d" opacity="0.65" font-family="Inter,system-ui">Researcher</text>
  <text x="${rt - 8}"   y="${rb - 8}"  font-size="10.5" font-weight="600" fill="#b45309" opacity="0.65" text-anchor="end" font-family="Inter,system-ui">Mirror</text>
</svg>`;
}

// ═══════════════════════════════════════════════════
// Render
// ═══════════════════════════════════════════════════
let lastRenderedStep = null;

function render() {
  const stepChanged = lastRenderedStep !== state.step;
  lastRenderedStep = state.step;
  const app = document.getElementById('app');
  if (state.step === 1) app.innerHTML = renderStep1();
  else if (state.step === 2) { app.innerHTML = renderStep2(); bindPlot(); bindInputs(); bindSycophancy(); }
  else app.innerHTML = renderStep3();
  if (stepChanged) {
    const card = app.querySelector('.card');
    if (card) card.classList.add('is-entering');
  }
}

// ── Step 1 ───────────────────────────────────────
function renderStep1() {
  const byQ = {};
  Q_ORDER.forEach(q => { byQ[q] = []; });
  state.domains.filter(d => !d.custom && d.suggestedQ).forEach(d => byQ[d.suggestedQ].push(d));
  return `
<div class="card">
  <div class="progress-track"><div class="progress-fill" style="width:33%"></div></div>
  <div class="step-meta">
    <span class="step-badge">Setup</span>
    <span class="step-of">Step 1 of 3</span>
  </div>
  <h1 class="step-title">Set Your AI Boundaries</h1>
  <p class="step-sub">Define how—and how much—AI engages across different areas of your life. Your choices are saved to a <code style="background:#f1f5f9;padding:1px 5px;border-radius:4px;font-size:12px">memory.md</code> file you can reference in any session.</p>

  <div class="welcome-body">

    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;margin-bottom:10px">The two axes</div>
    <div class="axes-grid">
      <div class="axis-card">
        <div class="axis-card-label">Horizontal</div>
        <div class="axis-range">
          <span style="color:#3b82f6">Professional</span>
          <div class="axis-bar"></div>
          <span style="color:#8b5cf6">Personal</span>
        </div>
        <div class="axis-note">Work tasks vs. personal life domains</div>
      </div>
      <div class="axis-card">
        <div class="axis-card-label">Vertical</div>
        <div class="axis-range">
          <span style="color:#94a3b8">Polishing</span>
          <div class="axis-bar"></div>
          <span style="color:#334155">Planning</span>
        </div>
        <div class="axis-note">Polishing = late-stage involvement &nbsp;·&nbsp; Planning = early-stage involvement</div>
      </div>
    </div>

    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;margin-bottom:10px">What each quadrant means</div>
    <div class="quadrant-preview" style="margin-bottom:22px">
      <div class="qp-cell qp-pa">
        <div class="qp-role">Co-pilot</div>
        <div class="qp-desc">Professional · Planning</div>
        <div class="qp-detail">AI actively contributes to work tasks — drafting, decisions, code, and plans. You stay in charge, but AI is a direct collaborator rather than a surface-level tool.</div>
        <button class="qp-example-toggle" data-action="togglehelp" data-target="qp-ex-pa">
          <span class="toggle-caret">▸</span> Show example
        </button>
        <div class="qp-example" id="qp-ex-pa" hidden>
          <div class="qp-example-label">User asks:</div>
          <div class="qp-example-prompt">"${EXAMPLE_PROMPT}"</div>
          <div class="qp-example-label">Co-pilot replies:</div>
          <div class="qp-example-response">${EXAMPLE_RESPONSES['pro-a']}</div>
        </div>
      </div>
      <div class="qp-cell qp-xa">
        <div class="qp-role">Coach</div>
        <div class="qp-desc">Personal · Planning</div>
        <div class="qp-detail">AI gives direct, concrete personal guidance — on habits, communication, or relationships. The highest-trust quadrant; use it intentionally and on your terms.</div>
        <button class="qp-example-toggle" data-action="togglehelp" data-target="qp-ex-xa">
          <span class="toggle-caret">▸</span> Show example
        </button>
        <div class="qp-example" id="qp-ex-xa" hidden>
          <div class="qp-example-label">User asks:</div>
          <div class="qp-example-prompt">"${EXAMPLE_PROMPT}"</div>
          <div class="qp-example-label">Coach replies:</div>
          <div class="qp-example-response">${EXAMPLE_RESPONSES['per-a']}</div>
        </div>
      </div>
      <div class="qp-cell qp-pp">
        <div class="qp-role">Researcher</div>
        <div class="qp-desc">Professional · Polishing</div>
        <div class="qp-detail">AI surfaces information, options, and trade-offs for work tasks. It informs but never decides — you evaluate and choose what to act on.</div>
        <button class="qp-example-toggle" data-action="togglehelp" data-target="qp-ex-pp">
          <span class="toggle-caret">▸</span> Show example
        </button>
        <div class="qp-example" id="qp-ex-pp" hidden>
          <div class="qp-example-label">User asks:</div>
          <div class="qp-example-prompt">"${EXAMPLE_PROMPT}"</div>
          <div class="qp-example-label">Researcher replies:</div>
          <div class="qp-example-response">${EXAMPLE_RESPONSES['pro-p']}</div>
        </div>
      </div>
      <div class="qp-cell qp-xp">
        <div class="qp-role">Mirror</div>
        <div class="qp-desc">Personal · Polishing</div>
        <div class="qp-detail">AI reflects observations and patterns back to you — gently, without pushing. Well-suited for journaling, self-reflection, and light emotional support.</div>
        <button class="qp-example-toggle" data-action="togglehelp" data-target="qp-ex-xp">
          <span class="toggle-caret">▸</span> Show example
        </button>
        <div class="qp-example" id="qp-ex-xp" hidden>
          <div class="qp-example-label">User asks:</div>
          <div class="qp-example-prompt">"${EXAMPLE_PROMPT}"</div>
          <div class="qp-example-label">Mirror replies:</div>
          <div class="qp-example-response">${EXAMPLE_RESPONSES['per-p']}</div>
        </div>
      </div>
    </div>

    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;margin-bottom:10px">You'll map these domains <span style="font-weight:400;text-transform:none;letter-spacing:0;font-size:11px">(suggested domains laid out)</span></div>
    <div class="quadrant-preview" style="margin-bottom:10px">
      ${Q_ORDER.map(q => {
        const info = Q_INFO[q];
        const doms = byQ[q];
        const pillColors = { 'pro-a':'pro', 'pro-p':'pro', 'per-a':'per', 'per-p':'per' };
        return `<div class="qp-cell ${info.qpCss}">
          <div class="qp-role" style="margin-bottom:7px">${info.role}</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px">
            ${doms.map(d => `<span class="dpill ${pillColors[q]}" style="font-size:10.5px;padding:3px 9px">${d.name}</span>`).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>
    <div style="margin-bottom:22px">
      <span class="dpill add">+ you can add your own on the next step</span>
    </div>

    <div class="info-box">
      <strong>How intensity works:</strong> the further from center you place a domain, the more involved AI is.
      A domain at the center = 0% involvement. A corner = ~100%.
      The quadrant shapes <em>how</em> AI engages; the distance shapes <em>how much</em>.
    </div>

    <button class="btn btn-primary" style="width:100%;justify-content:center;padding:11px"
      data-action="goto" data-step="2">Begin Setup →</button>
  </div>
</div>`;
}

// ── Step 2 ───────────────────────────────────────
function renderStep2() {
  const placed   = state.domains.filter(d => d.x !== null);
  const unplaced = state.domains.filter(d => d.x === null);
  const nc       = state.newChat;
  const sel      = state.selectedId;
  const allDoms  = [...state.domains, nc];
  const selDom   = sel ? allDoms.find(d => d.id === sel) : null;

  const hint = selDom
    ? `Placing: <strong>${selDom.name}</strong> — click anywhere on the grid`
    : placed.length > 0 || nc.x !== null
      ? `Click a domain chip below to select it, then click the grid to place it`
      : `Select a domain chip below, then click the grid to place it`;

  const renderPlacedChip = (d, chipCss) => {
    const { x: px, y: py } = n2p(d.x, d.y);
    const it = intensity(d.x, d.y);
    const isSelected = sel === d.id;
    return `<div class="chip-placed ${chipCss}${isSelected ? ' selected-chip' : ''}"
      style="left:${px}px;top:${py}px"
      data-action="select" data-id="${d.id}">
      <span>${d.name}</span>
      <span class="chip-pct">${it}%</span>
      <span class="chip-x" data-action="unplace" data-id="${d.id}" title="Remove from map">✕</span>
    </div>`;
  };

  const placedChips = [
    ...placed.map(d => renderPlacedChip(d, Q_INFO[quadrant(d.x, d.y)].chipCss)),
    ...(nc.x !== null ? [renderPlacedChip(nc, 'cq-meta')] : [])
  ].join('');

  const trayChips = unplaced.length > 0
    ? unplaced.map(d => {
        const isSelected = sel === d.id;
        return `<div class="chip-tray ${d.cat}${isSelected ? ' selected-chip' : ''}"
          data-action="select" data-id="${d.id}">
          <span class="chip-dot"></span>${d.name}
        </div>`;
      }).join('')
    : `<span class="tray-empty">All domains are on the map ✓</span>`;

  const ncSelected = sel === 'new-chat';
  const newChatChip = nc.x === null
    ? `<div class="chip-tray meta${ncSelected ? ' selected-chip' : ''}"
        data-action="select" data-id="new-chat">
        <span class="chip-dot"></span>New Chat (default)
      </div>`
    : `<span style="font-size:11.5px;color:#92400e;font-weight:500">Placed at ${intensity(nc.x,nc.y)}% —
        <span style="cursor:pointer;text-decoration:underline" data-action="unplace" data-id="new-chat">remove</span>
      </span>`;

  return `
<div class="card" style="max-width:620px">
  <div class="progress-track"><div class="progress-fill" style="width:66%"></div></div>
  <div class="step-meta">
    <span class="step-badge">Mapping</span>
    <span class="step-of">Step 2 of 3</span>
  </div>
  <h1 class="step-title">Map Your Domains</h1>
  <p class="step-sub">Select a domain, then click the grid to place it. Position = the AI's role. Distance from center = how involved AI is.</p>

  <div class="plot-body">
    <div class="plot-hint${selDom ? ' active-hint' : ''}" id="plot-hint">${hint}</div>
    <div class="plot-wrap${selDom ? ' plot-cursor-crosshair' : ''}" id="plot-wrap">
      ${makeSVG()}
      <div class="chips-layer" id="chips-layer">
        ${placedChips}
      </div>
      <div id="hover-preview" style="display:none;pointer-events:none;position:absolute;top:0;left:0;width:100%;height:100%"></div>
    </div>
  </div>

  <div class="sycophancy-section">
    <div class="sycophancy-head">
      <span class="sycophancy-label">Sycophancy</span>
      <span class="sycophancy-value" id="syc-value">${state.sycophancy}/100</span>
    </div>
    <div class="sycophancy-sub">
      How much AI tilts toward agreement and flattery vs. honest pushback. Lower = more candid; higher = more agreeable.
    </div>
    <input type="range" min="0" max="100" step="1" value="${state.sycophancy}"
      id="syc-slider" class="sycophancy-slider"
      style="--syc-pct: ${state.sycophancy}%"
      aria-label="Sycophancy level"/>
    <div class="sycophancy-ticks">
      <span>0 · Honest</span>
      <span>50 · Balanced</span>
      <span>100 · Agreeable</span>
    </div>
  </div>

  <div class="tray-section">
    <div class="tray-label">${unplaced.length > 0 ? 'Unplaced domains' : 'All placed'}</div>
    <div class="tray" id="tray">${trayChips}</div>
  </div>

  <div class="new-chat-tray tray-section" style="margin-top:12px">
    <div class="tray-label">New Chat default</div>
    <div class="tray" style="min-height:unset;padding:8px 10px">${newChatChip}</div>
    <div class="new-chat-hint">Set a default position for any chat that doesn't specify a domain.</div>
  </div>

  <div class="add-row">
    <input type="text" id="new-domain-input" placeholder="Add a custom domain…" maxlength="40"/>
    <button class="btn btn-ghost" data-action="addcustom">Add</button>
  </div>

  <div class="step-footer">
    <button class="btn btn-ghost" data-action="goto" data-step="1">← Back</button>
    <span class="mapped-count"><strong>${placed.length}</strong> of ${state.domains.length} mapped</span>
    <button class="btn btn-primary" data-action="goto" data-step="3"
      ${placed.length === 0 && nc.x === null ? 'disabled' : ''}>Preview →</button>
  </div>
</div>`;
}

function bindPlot() {
  const wrap = document.getElementById('plot-wrap');
  if (!wrap) return;

  wrap.addEventListener('click', function(e) {
    if (!state.selectedId) return;
    if (e.target.closest('[data-action="unplace"]') || e.target.closest('[data-action="select"]')) return;
    const rect = wrap.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    if (px >= PL && px <= PL + CW && py >= PT && py <= PT + CH) {
      const { nx, ny } = p2n(px, py);
      if (state.selectedId === 'new-chat') {
        state.newChat.x = nx; state.newChat.y = ny;
      } else {
        const dom = state.domains.find(d => d.id === state.selectedId);
        if (dom) { dom.x = nx; dom.y = ny; }
      }
      state.selectedId = null;
      state.hoverPos = null;
      persistState();
      render();
    }
  });

  wrap.addEventListener('mousemove', function(e) {
    if (!state.selectedId) return;
    const rect = wrap.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const inside = px >= PL && px <= PL + CW && py >= PT && py <= PT + CH;
    const preview = document.getElementById('hover-preview');
    if (!preview) return;
    if (inside) {
      const selDom = state.selectedId === 'new-chat'
        ? state.newChat
        : state.domains.find(d => d.id === state.selectedId);
      const label  = selDom ? selDom.name : '';
      preview.style.display = 'block';
      preview.innerHTML = `
        <div class="preview-dot" style="left:${px}px;top:${py}px"></div>
        <div class="preview-label" style="left:${px}px;top:${py}px">${label}</div>`;
    } else {
      preview.style.display = 'none';
      preview.innerHTML = '';
    }
  });

  wrap.addEventListener('mouseleave', function() {
    const preview = document.getElementById('hover-preview');
    if (preview) { preview.style.display = 'none'; preview.innerHTML = ''; }
  });
}

function bindInputs() {
  const inp = document.getElementById('new-domain-input');
  if (inp) inp.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') addCustom();
  });
}

function bindSycophancy() {
  const slider = document.getElementById('syc-slider');
  const valEl  = document.getElementById('syc-value');
  if (!slider) return;
  slider.addEventListener('input', function() {
    const v = parseInt(slider.value, 10);
    state.sycophancy = v;
    slider.style.setProperty('--syc-pct', v + '%');
    if (valEl) valEl.textContent = v + '/100';
  });
  slider.addEventListener('change', function() {
    persistState();
  });
}

// ── Step 3 ───────────────────────────────────────
function renderActivateSection() {
  return `
    <div class="md-section-label" style="margin-top:26px">Where to put this</div>

    <div class="activate-subhead">Account-wide settings <span class="activate-subhead-note">— auto-applied to every new chat, no per-conversation setup</span></div>
    <div class="activate-cards">

      <div class="activate-card">
        <div class="activate-card-title">Claude · Personal preferences</div>
        <div class="activate-card-desc">Single field, ~3,000-character limit. Most flexible of the lot.</div>
        <div class="activate-card-actions">
          <button class="btn btn-primary" data-action="copyprofile">Copy condensed text</button>
        </div>
        <button class="activate-toggle" data-action="togglehelp" data-target="help-claude">
          <span class="toggle-caret">▸</span> How to use
        </button>
        <div class="activate-help" id="help-claude" hidden>
          <ol>
            <li>Open <a href="https://claude.ai/settings/profile" target="_blank" rel="noopener">claude.ai → Settings → Profile</a>.</li>
            <li>Find "What personal preferences should Claude consider in responses?"</li>
            <li>Paste the copied text and save.</li>
          </ol>
          <div class="activate-help-note">Condensed text includes the involvement-% anchors, sycophancy reference scale, and only the role behaviors you actually use.</div>
        </div>
      </div>

      <div class="activate-card">
        <div class="activate-card-title">ChatGPT · Custom Instructions</div>
        <div class="activate-card-desc">Two fields, 1,500 chars each. The text is split naturally — copy each half separately.</div>
        <div class="activate-card-actions">
          <button class="btn btn-primary" data-action="copychatgpt" data-which="know">Copy "About me"</button>
          <button class="btn btn-primary" data-action="copychatgpt" data-which="respond">Copy "How to respond"</button>
        </div>
        <button class="activate-toggle" data-action="togglehelp" data-target="help-chatgpt">
          <span class="toggle-caret">▸</span> How to use
        </button>
        <div class="activate-help" id="help-chatgpt" hidden>
          <ol>
            <li>Open <a href="https://chatgpt.com/" target="_blank" rel="noopener">chatgpt.com</a> → Settings → Personalization → Custom Instructions.</li>
            <li>Toggle <strong>Enable customization</strong> on.</li>
            <li>Click <strong>Copy "About me"</strong> → paste into <em>"What would you like ChatGPT to know about you?"</em></li>
            <li>Click <strong>Copy "How to respond"</strong> → paste into <em>"How would you like ChatGPT to respond?"</em></li>
            <li>Save.</li>
          </ol>
          <div class="activate-help-note">Each ChatGPT field caps at 1,500 chars. The two-button split keeps each side comfortably under that.</div>
        </div>
      </div>

      <div class="activate-card">
        <div class="activate-card-title">Gemini · Personal context</div>
        <div class="activate-card-desc">"Your instructions for Gemini" — applied to every chat. No published character limit.</div>
        <div class="activate-card-actions">
          <button class="btn btn-primary" data-action="copyprofile">Copy condensed text</button>
        </div>
        <button class="activate-toggle" data-action="togglehelp" data-target="help-gemini">
          <span class="toggle-caret">▸</span> How to use
        </button>
        <div class="activate-help" id="help-gemini" hidden>
          <ol>
            <li>Open <a href="https://gemini.google.com" target="_blank" rel="noopener">gemini.google.com</a>.</li>
            <li>Click <strong>Settings &amp; help</strong> (bottom of the side rail) → <strong>Personal context</strong>.</li>
            <li>Under <em>Your instructions for Gemini</em>, click <strong>Add +</strong>.</li>
            <li>Paste the copied text and click Submit.</li>
          </ol>
        </div>
      </div>

      <div class="activate-card">
        <div class="activate-card-title">Perplexity · AI Profile</div>
        <div class="activate-card-desc">Custom Instructions field, 1,500-char limit. May need light trimming for big domain lists.</div>
        <div class="activate-card-actions">
          <button class="btn btn-primary" data-action="copyprofile">Copy condensed text</button>
        </div>
        <button class="activate-toggle" data-action="togglehelp" data-target="help-perplexity">
          <span class="toggle-caret">▸</span> How to use
        </button>
        <div class="activate-help" id="help-perplexity" hidden>
          <ol>
            <li>Open <a href="https://www.perplexity.ai/" target="_blank" rel="noopener">perplexity.ai</a>, click your profile icon (bottom-left) → <strong>Settings</strong>.</li>
            <li>Go to <strong>Personalization</strong> → <strong>Custom Instructions</strong>.</li>
            <li>Paste the copied text and save.</li>
          </ol>
          <div class="activate-help-note">If you bump the 1,500-char limit, easiest trim is dropping the role-behavior block — Perplexity will infer behavior from the role names.</div>
        </div>
      </div>

      <div class="activate-card">
        <div class="activate-card-title">DeepSeek <span class="activate-card-tag">no native profile</span></div>
        <div class="activate-card-desc">DeepSeek's web app doesn't yet support persistent custom instructions. Two workarounds below.</div>
        <div class="activate-card-actions">
          <button class="btn btn-primary" data-action="copyprofile">Copy condensed text</button>
        </div>
        <button class="activate-toggle" data-action="togglehelp" data-target="help-deepseek">
          <span class="toggle-caret">▸</span> How to use
        </button>
        <div class="activate-help" id="help-deepseek" hidden>
          <ol>
            <li><strong>Web app:</strong> Open <a href="https://chat.deepseek.com/" target="_blank" rel="noopener">chat.deepseek.com</a>, start a new chat, paste the copied text as your first message before asking your real question. Repeat for every new chat.</li>
            <li><strong>API:</strong> Include the copied text as a <code>system</code> role message in every <code>/chat/completions</code> request.</li>
          </ol>
          <div class="activate-help-note">Persistent custom-instructions is on DeepSeek's open feature-request list (issue #1145). This card will get a one-click action when they ship it.</div>
        </div>
      </div>

    </div>

    <div class="activate-subhead">Per-project / per-workspace <span class="activate-subhead-note">— file-based, scoped to a project or repo</span></div>
    <div class="activate-cards">

      <div class="activate-card">
        <div class="activate-card-title">Claude · Projects</div>
        <div class="activate-card-desc">Every chat inside the project references this file as knowledge.</div>
        <div class="activate-card-actions">
          <button class="btn btn-outline" data-action="downloadmd">Download memory.md</button>
        </div>
        <button class="activate-toggle" data-action="togglehelp" data-target="help-project">
          <span class="toggle-caret">▸</span> How to use
        </button>
        <div class="activate-help" id="help-project" hidden>
          <ol>
            <li>In claude.ai, open or create a Project.</li>
            <li>Under <strong>Project knowledge</strong>, upload <code>memory.md</code>.</li>
            <li>Every conversation in that project will reference these boundaries automatically.</li>
          </ol>
        </div>
      </div>

      <div class="activate-card">
        <div class="activate-card-title">Claude Code · CLAUDE.md</div>
        <div class="activate-card-desc">Per-workspace. Goes at the root of a repo or project folder.</div>
        <div class="activate-card-actions">
          <button class="btn btn-outline" data-action="downloadclaudemd">Download CLAUDE.md</button>
        </div>
        <button class="activate-toggle" data-action="togglehelp" data-target="help-claudemd">
          <span class="toggle-caret">▸</span> How to use
        </button>
        <div class="activate-help" id="help-claudemd" hidden>
          <ol>
            <li>Save the downloaded file as <code>CLAUDE.md</code> in your project root.</li>
            <li>Claude Code (and other editors like Cursor) will read it automatically for sessions in that workspace.</li>
          </ol>
        </div>
      </div>

    </div>`;
}

function renderSuggestionsBanner() {
  const list = (state.pendingSuggestions || []).filter(s => s && s.domainId);
  if (!list.length) return '';
  const items = list.map(s => {
    const target = s.domainId === 'new-chat'
      ? state.newChat
      : state.domains.find(d => d.id === s.domainId);
    const targetExists = !!target && (s.domainId === 'new-chat' || target);
    const fromPct = (s.fromX !== null && s.fromY !== null) ? intensity(s.fromX, s.fromY) : null;
    const toPct   = intensity(s.toX, s.toY);
    const opt     = miscalibrationOpt(s.miscalibration);
    const direction = opt ? opt.shortLabel : 'feedback';
    const targetLabel = Q_INFO[quadrant(s.toX, s.toY)].label;
    return `<div class="suggest-item">
      <div class="suggest-text">
        <div class="suggest-line"><strong>${escH(s.domainName || 'Unspecified')}</strong> — flagged as ${escH(direction)}</div>
        <div class="suggest-detail">
          ${fromPct !== null ? `${fromPct}% → ${toPct}% involvement · ` : `${toPct}% involvement · `}suggested new quadrant: <em>${escH(targetLabel)}</em>
        </div>
      </div>
      <div class="suggest-actions">
        ${targetExists ? `<button class="btn btn-primary btn-tiny" data-action="applysuggestion" data-id="${s.id}">Apply</button>` : ''}
        <button class="btn btn-ghost btn-tiny" data-action="dismisssuggestion" data-id="${s.id}">Dismiss</button>
      </div>
    </div>`;
  }).join('');
  return `<div class="suggest-banner">
    <div class="suggest-header">
      <span class="suggest-icon">💡</span>
      <span class="suggest-title">Suggested placement changes (${list.length})</span>
      <span class="suggest-sub">Based on responses you flagged in the side panel.</span>
    </div>
    <div class="suggest-list">${items}</div>
  </div>`;
}

function renderStep3() {
  const nc = state.newChat;

  if (nc.x !== null) {
    const q    = quadrant(nc.x, nc.y);
    const info = Q_INFO[q];
    const pct  = intensity(nc.x, nc.y);
    const md   = genMarkdownNewChat();
    return `
<div class="card">
  <div class="progress-track"><div class="progress-fill" style="width:100%"></div></div>
  <div class="step-meta">
    <span class="step-badge">Done</span>
    <span class="step-of">Step 3 of 3</span>
  </div>
  <h1 class="step-title">Your Session Default</h1>
  <p class="step-sub">This <code style="background:#f1f5f9;padding:1px 5px;border-radius:4px;font-size:12px">memory.md</code> will instruct AI to apply one role to <strong>all topics</strong> in any chat that loads it.</p>

  <div class="preview-body">
    <div class="q-cards" style="grid-template-columns:1fr;max-width:360px;margin:0 auto 26px">
      <div class="q-card ${info.css}" style="text-align:center;padding:22px">
        <div class="q-card-title" style="font-size:13px">${info.label}</div>
        <div style="font-size:28px;font-weight:800;margin:10px 0 4px">${info.role}</div>
        <div class="q-card-role" style="font-size:12px">${info.desc}</div>
        <div style="margin-top:14px;font-size:13px;font-weight:700;opacity:0.8">${pct}% involvement</div>
      </div>
    </div>

    ${renderSuggestionsBanner()}

    <div class="md-section-label">memory.md preview <span style="font-weight:400;color:#64748b;font-size:10px;text-transform:none;letter-spacing:0">(editable)</span></div>
    <textarea class="md-textarea" id="md-textarea" spellcheck="false">${escH(md)}</textarea>

    ${renderActivateSection()}
  </div>

  <div class="step-footer">
    <button class="btn btn-ghost" data-action="goto" data-step="2">← Edit</button>
    <button class="btn btn-outline" id="copy-btn" data-action="copymd">Copy memory.md</button>
  </div>
</div>`;
  }

  // ── Domain-map mode ──────────────────────────────
  const placed = state.domains.filter(d => d.x !== null);
  const byQ = {};
  Q_ORDER.forEach(q => { byQ[q] = []; });
  placed.forEach(d => { const q = quadrant(d.x, d.y); if (byQ[q]) byQ[q].push(d); });
  Q_ORDER.forEach(q => byQ[q].sort((a,b) => intensity(b.x,b.y) - intensity(a.x,a.y)));

  const qCards = Q_ORDER.map(q => {
    const info = Q_INFO[q];
    const doms = byQ[q];
    return `<div class="q-card ${info.css}">
      <div class="q-card-title">${info.label}</div>
      <div class="q-card-role">${info.role} · ${info.desc}</div>
      <div class="q-card-items">
        ${doms.length > 0
          ? doms.map(d => `<div class="q-card-item">
              <span>${d.name}</span>
              <span class="q-card-pct">${intensity(d.x,d.y)}%</span>
            </div>`).join('')
          : `<span class="q-card-empty">No domains here</span>`}
      </div>
    </div>`;
  }).join('');

  const md = genMarkdown();

  return `
<div class="card">
  <div class="progress-track"><div class="progress-fill" style="width:100%"></div></div>
  <div class="step-meta">
    <span class="step-badge">Done</span>
    <span class="step-of">Step 3 of 3</span>
  </div>
  <h1 class="step-title">Your AI Boundary Map</h1>
  <p class="step-sub">Review your settings below, then download <code style="background:#f1f5f9;padding:1px 5px;border-radius:4px;font-size:12px">memory.md</code> and place it in your workspace root to set context for AI sessions.</p>

  <div class="preview-body">
    <div class="q-cards">${qCards}</div>

    ${renderSuggestionsBanner()}

    <div class="md-section-label">memory.md preview <span style="font-weight:400;color:#64748b;font-size:10px;text-transform:none;letter-spacing:0">(editable)</span></div>
    <textarea class="md-textarea" id="md-textarea" spellcheck="false">${escH(md)}</textarea>

    ${renderActivateSection()}
  </div>

  <div class="step-footer">
    <button class="btn btn-ghost" data-action="goto" data-step="2">← Edit</button>
    <button class="btn btn-outline" id="copy-btn" data-action="copymd">Copy memory.md</button>
  </div>
</div>`;
}

// ═══════════════════════════════════════════════════
// Actions
// ═══════════════════════════════════════════════════
function goTo(n) {
  state.step = n;
  state.selectedId = null;
  state.hoverPos = null;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function selectDomain(id, e) {
  if (e) e.stopPropagation();
  state.selectedId = state.selectedId === id ? null : id;
  render();
}

function applySuggestion(suggestionId) {
  const idx = (state.pendingSuggestions || []).findIndex(s => s.id === suggestionId);
  if (idx === -1) return;
  const s = state.pendingSuggestions[idx];
  if (s.domainId === 'new-chat') {
    state.newChat.x = s.toX;
    state.newChat.y = s.toY;
  } else {
    const dom = state.domains.find(d => d.id === s.domainId);
    if (!dom) {
      state.pendingSuggestions.splice(idx, 1);
      persistState();
      render();
      return;
    }
    dom.x = s.toX;
    dom.y = s.toY;
  }
  state.pendingSuggestions.splice(idx, 1);
  persistState();
  render();
}

function dismissSuggestion(suggestionId) {
  const idx = (state.pendingSuggestions || []).findIndex(s => s.id === suggestionId);
  if (idx === -1) return;
  state.pendingSuggestions.splice(idx, 1);
  persistState();
  render();
}

function unplace(id, e) {
  if (e) e.stopPropagation();
  if (id === 'new-chat') {
    state.newChat.x = null; state.newChat.y = null;
  } else {
    const dom = state.domains.find(d => d.id === id);
    if (dom) { dom.x = null; dom.y = null; }
  }
  if (state.selectedId === id) state.selectedId = null;
  persistState();
  render();
}

function addCustom() {
  const inp = document.getElementById('new-domain-input');
  if (!inp) return;
  const name = inp.value.trim();
  if (!name) return;
  if (state.domains.some(d => d.name.toLowerCase() === name.toLowerCase())) {
    inp.classList.add('error');
    setTimeout(() => inp.classList.remove('error'), 900);
    return;
  }
  state.domains.push({ id: 'c-' + Date.now(), name, cat: 'pro', x: null, y: null, custom: true });
  inp.value = '';
  render();
}

function persistState() {
  BoundariesStorage.save({
    domains:              state.domains,
    newChat:              state.newChat,
    sycophancy:           state.sycophancy,
    feedback:             state.feedback,
    consolidatedFeedback: state.consolidatedFeedback,
    pendingSuggestions:   state.pendingSuggestions,
  });
}

function getMdContent() {
  const ta = document.getElementById('md-textarea');
  return ta ? ta.value : genMarkdown();
}

function copyMd() {
  navigator.clipboard.writeText(getMdContent()).then(() => {
    const btn = document.getElementById('copy-btn');
    if (btn) { btn.textContent = 'Copied ✓'; setTimeout(() => btn.textContent = 'Copy', 1800); }
  });
}

function downloadMd() {
  downloadAs(getMdContent(), 'memory.md');
}

function downloadClaudeMd() {
  downloadAs(getMdContent(), 'CLAUDE.md');
}

function downloadAs(content, filename) {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

function flashCopied(triggerEl, text) {
  navigator.clipboard.writeText(text).then(() => {
    if (!triggerEl) return;
    const orig = triggerEl.textContent;
    triggerEl.textContent = 'Copied ✓';
    setTimeout(() => { triggerEl.textContent = orig; }, 1800);
  });
}

function copyProfile(triggerEl) {
  flashCopied(triggerEl, genClaudeProfile());
}

function copyChatGPT(triggerEl) {
  if (!triggerEl) return;
  const which = triggerEl.dataset.which;
  const text  = which === 'know' ? genChatGPTAboutMe() : genChatGPTHowToRespond();
  flashCopied(triggerEl, text);
}

function toggleHelp(triggerEl) {
  if (!triggerEl) return;
  const id = triggerEl.dataset.target;
  const panel = document.getElementById(id);
  if (!panel) return;
  panel.hidden = !panel.hidden;
  triggerEl.classList.toggle('expanded', !panel.hidden);
}

// ═══════════════════════════════════════════════════
// Syntax highlighting
// ═══════════════════════════════════════════════════
function escH(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function syntaxHL(s) {
  return s
    .replace(/(^# .+$)/gm,   '<span class="c-head">$1</span>')
    .replace(/(^## .+$)/gm,  '<span class="c-sub">$1</span>')
    .replace(/(^> .+$)/gm,   '<span class="c-em">$1</span>')
    .replace(/(^- \*\*.+?\*\*)/gm, '<span class="c-green">$1</span>')
    .replace(/(\|.+\|)/g,    '<span class="c-muted">$1</span>')
    .replace(/"([^"]+)":/g,  '<span class="c-key">"$1"</span>:')
    .replace(/(---)/g,       '<span class="c-muted">$1</span>');
}

// ═══════════════════════════════════════════════════
// Event delegation (replaces all inline onclick/onkeydown)
// ═══════════════════════════════════════════════════
document.addEventListener('click', function(e) {
  const target = e.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  if (action === 'goto') {
    const step = parseInt(target.dataset.step, 10);
    if (!target.disabled) goTo(step);
  } else if (action === 'select') {
    selectDomain(target.dataset.id, e);
  } else if (action === 'unplace') {
    unplace(target.dataset.id, e);
  } else if (action === 'addcustom') {
    addCustom();
  } else if (action === 'copymd') {
    copyMd();
  } else if (action === 'downloadmd') {
    downloadMd();
  } else if (action === 'downloadclaudemd') {
    downloadClaudeMd();
  } else if (action === 'copyprofile') {
    copyProfile(target);
  } else if (action === 'copychatgpt') {
    copyChatGPT(target);
  } else if (action === 'togglehelp') {
    toggleHelp(target);
  } else if (action === 'applysuggestion') {
    applySuggestion(target.dataset.id);
  } else if (action === 'dismisssuggestion') {
    dismissSuggestion(target.dataset.id);
  }
});

// ═══════════════════════════════════════════════════
// Init
// ═══════════════════════════════════════════════════
BoundariesStorage.load(function(saved) {
  if (saved && saved.domains) {
    saved.domains.forEach(s => {
      const d = state.domains.find(d => d.id === s.id);
      if (d) { d.x = s.x; d.y = s.y; }
      else if (s.custom) {
        state.domains.push({ id: s.id, name: s.name, cat: s.cat, custom: true,
          suggestedQ: s.suggestedQ || null, x: s.x, y: s.y });
      }
    });
    if (saved.newChat) {
      state.newChat.x = saved.newChat.x;
      state.newChat.y = saved.newChat.y;
    }
    if (typeof saved.sycophancy === 'number') {
      state.sycophancy = Math.max(0, Math.min(100, Math.round(saved.sycophancy)));
    }
    if (Array.isArray(saved.feedback))             state.feedback             = saved.feedback;
    if (Array.isArray(saved.consolidatedFeedback)) state.consolidatedFeedback = saved.consolidatedFeedback;
    if (Array.isArray(saved.pendingSuggestions))   state.pendingSuggestions   = saved.pendingSuggestions;
  }
  // Catch storage changes from the side panel (e.g., new flags submitted while
  // the onboarding tab is open) so the Adjustments section and suggestions banner stay live.
  BoundariesStorage.onChange(function(updated) {
    if (!updated) return;
    state.feedback             = Array.isArray(updated.feedback) ? updated.feedback : state.feedback;
    state.consolidatedFeedback = Array.isArray(updated.consolidatedFeedback) ? updated.consolidatedFeedback : state.consolidatedFeedback;
    state.pendingSuggestions   = Array.isArray(updated.pendingSuggestions) ? updated.pendingSuggestions : state.pendingSuggestions;
    if (typeof updated.sycophancy === 'number') {
      state.sycophancy = Math.max(0, Math.min(100, Math.round(updated.sycophancy)));
    }
    render();
  });
  render();
});
