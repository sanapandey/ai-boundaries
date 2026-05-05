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
function intensity(nx, ny) {
  return Math.round(Math.sqrt(nx * nx + ny * ny) / Math.sqrt(2) * 100);
}
function quadrant(nx, ny) {
  return (nx <= 0 ? 'pro' : 'per') + '-' + (ny >= 0 ? 'a' : 'p');
}

const Q_INFO = {
  'pro-a': { label: 'Professional · Planning',  role: 'Co-pilot',   desc: 'Concrete recommendations on work tasks',       css: 'qc-pa', chipCss: 'cq-pa', qpCss: 'qp-pa', svgFill: '#eff6ff', svgStroke:'#bfdbfe' },
  'pro-p': { label: 'Professional · Polishing', role: 'Researcher', desc: 'Surfaces information, you decide',             css: 'qc-pp', chipCss: 'cq-pp', qpCss: 'qp-pp', svgFill: '#f0fdf4', svgStroke:'#bbf7d0' },
  'per-a': { label: 'Personal · Planning',      role: 'Coach',      desc: 'Concrete personal guidance — use intentionally',css: 'qc-xa', chipCss: 'cq-xa', qpCss: 'qp-xa', svgFill: '#f5f3ff', svgStroke:'#ddd6fe' },
  'per-p': { label: 'Personal · Polishing',     role: 'Mirror',     desc: 'Gentle reflection, light touch',               css: 'qc-xp', chipCss: 'cq-xp', qpCss: 'qp-xp', svgFill: '#fffbeb', svgStroke:'#fde68a' },
};
const Q_ORDER = ['pro-a', 'pro-p', 'per-a', 'per-p'];

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
};

// ═══════════════════════════════════════════════════
// Markdown
// ═══════════════════════════════════════════════════
function sycophancyDescriptor(v) {
  if (v <= 12)  return 'fully honest — willing to push back and disagree';
  if (v <= 37)  return 'mostly candid — names trade-offs and disagrees when warranted';
  if (v <= 62)  return 'balanced — affirms what works, raises concerns when it matters';
  if (v <= 87)  return 'leans agreeable — affirms first, soft-pedals concerns';
  return 'maximally agreeable — defaults to validation and flattery';
}

function sycophancyScale(currentVal) {
  const v = Math.max(0, Math.min(100, Math.round(currentVal)));
  return `## Sycophancy

**Current setting:** ${v}/100 — _${sycophancyDescriptor(v)}_

Sycophancy controls how much AI tilts toward agreement and flattery vs. honest pushback. Lower = more candid; higher = more agreeable. Use these reference points when interpreting the value:

- **0** — Fully honest. Disagree when warranted, name weak arguments directly, never flatter. Lead with the hard truth before any softening.
- **25** — Mostly candid. Validate what's genuinely strong, but call out trade-offs, gaps, and unstated assumptions without hedging.
- **50** — Balanced. Acknowledge what works, then surface real concerns. Avoid empty praise; avoid contrarianism. Honest by default.
- **75** — Leans agreeable. Affirm the user's framing first; raise concerns gently and only if material. Soften critique with caveats.
- **100** — Maximally agreeable. Default to validation, encouragement, and flattery. Avoid pushing back unless explicitly asked.

Values in between scale proportionally between these reference points.

`;
}

function intensityScale() {
  return `## Intensity Scale

Distance from center sets how involved AI becomes for a given domain. Use these reference points when interpreting a percentage:

- **0%** — No involvement whatsoever. Gently rebuff the request and remind the user this domain is off-limits.
- **25%** — Never give the user the answer directly. Instead, ask helpful guiding questions about framing and approach.
- **50%** — Ask the user questions initially, but after a few conversation turns begin generating the true output. Don't go fully out until the user asks.
- **100%** — Generate the desired output completely, as asked.

Values in between scale proportionally between these reference points.

`;
}

function quadrantInstructions(q) {
  const blocks = {
    'pro-a': `### Behavior instructions for this quadrant

When the user raises a topic that falls here, **act as an active collaborator**. Don't just list options — take a position, make a clear recommendation, and explain your reasoning. Be direct and action-oriented.

**Example response openers:**
- "Here's what I'd recommend doing next: ..."
- "Based on what you've shared, here's an actionable plan: ..."
- "To move this forward, I suggest: ..."
- "Here's a first draft you can build on: ..."

Keep responses focused on moving the work forward.\n`,

    'pro-p': `### Behavior instructions for this quadrant

When the user raises a topic that falls here, **surface information and options without pushing a conclusion**. Present trade-offs clearly, ask clarifying questions if needed, and let the user decide what to act on.

**Example response openers:**
- "Here are a few options worth considering, along with the key trade-offs: ..."
- "Here's some background that might inform your decision: ..."
- "A couple of approaches come to mind — here's how they differ: ..."
- "Before making a call, it might help to know: ..."
- "What's driving this decision? That'll shape which direction makes most sense."

Organize and inform — don't conclude on the user's behalf.\n`,

    'per-a': `### Behavior instructions for this quadrant

When the user raises a topic that falls here, **offer direct, honest personal guidance**. It's appropriate to name patterns, make suggestions, and gently challenge assumptions — while staying supportive and warm.

**Example response openers:**
- "Based on what you've shared, here's what I'd suggest: ..."
- "I notice a pattern here — have you considered that ..."
- "Here's a next step that might help: ..."
- "It sounds like you're weighing X against Y — one way to think about it: ..."
- "That's worth taking seriously. Here's how I'd approach it: ..."

Be honest and concrete — the user wants more than validation.\n`,

    'per-p': `### Behavior instructions for this quadrant

When the user raises a topic that falls here, **do not give a direct answer or recommendation**. Instead, respond with one or two reflective prompts chosen to fit the specific query. Use your judgment to select the most appropriate prompt(s) from the examples below — or compose a similar one in the same spirit.

**Example reflective prompts:**
- "I encourage you to take a walk outside and take some time to reflect on this."
- "Take a deep breath. What does your intuition say about this?"
- "Please reflect on the current trade-offs that you are weighing."
- "I encourage you to talk to a trusted family member or friend about this."
- "What is a current roadblock that you are facing? What problem are you facing at this very moment?"

The goal is to turn the question back toward the user's own insight rather than providing an external answer. Keep your response warm, brief, and non-prescriptive.\n`,
  };
  return blocks[q] || '';
}

function genMarkdown() {
  const date = new Date().toISOString().split('T')[0];
  const placed   = state.domains.filter(d => d.x !== null);
  const unplaced = state.domains.filter(d => d.x === null);

  const byQ = {};
  Q_ORDER.forEach(q => { byQ[q] = []; });
  placed.forEach(d => {
    const q = quadrant(d.x, d.y);
    if (byQ[q]) byQ[q].push(d);
  });
  Q_ORDER.forEach(q => byQ[q].sort((a,b) => intensity(b.x,b.y) - intensity(a.x,a.y)));

  const roleDescs = {
    'pro-a': 'AI gives concrete, actionable recommendations on work tasks.',
    'pro-p': 'AI surfaces information and options — final decisions are yours.',
    'per-a': 'AI offers concrete personal guidance — engage intentionally.',
    'per-p': 'AI reflects insights gently — final interpretation is yours.',
  };

  let md = `# AI Involvement Boundaries\n\n`;
  md += `> _Last updated: ${date}_\n\n`;
  md += `This file defines how you want AI to engage across different life domains.\n`;
  md += `Place it in your workspace root and reference it to set session context.\n\n`;
  md += `---\n\n`;
  md += `## Axis Reference\n\n`;
  md += `| Axis | ← Low | High → |\n`;
  md += `|------|-------|--------|\n`;
  md += `| Horizontal | Professional | Personal |\n`;
  md += `| Vertical | Polishing (late-stage involvement) | Planning (early-stage involvement) |\n\n`;
  md += `**Intensity** = distance from center (0% = no AI involvement, 100% = fully engaged)\n\n`;
  md += `---\n\n`;
  md += intensityScale();
  md += `---\n\n`;
  md += sycophancyScale(state.sycophancy);
  md += `---\n\n`;

  const hasPlaced = placed.length > 0;
  Q_ORDER.forEach(q => {
    const info = Q_INFO[q];
    const doms = byQ[q];
    if (!doms.length) return;
    md += `## ${info.label}  *(${info.role})*\n\n`;
    md += `> ${roleDescs[q]}\n\n`;
    doms.forEach(d => {
      md += `- **${d.name}** — ${intensity(d.x, d.y)}% involvement\n`;
    });
    md += `\n${quadrantInstructions(q)}`;
    md += `\n---\n\n`;
  });

  if (!hasPlaced) { md += `## No domains mapped yet.\n\n---\n\n`; }

  const nc = state.newChat;
  if (nc.x !== null) {
    const ncQ = Q_INFO[quadrant(nc.x, nc.y)];
    md += `## New Chat Default\n\n`;
    md += `> Used when no specific domain is set for a session.\n\n`;
    md += `- **Role:** ${ncQ.role} (${ncQ.label})\n`;
    md += `- **Intensity:** ${intensity(nc.x, nc.y)}% involvement\n`;
    md += `\n---\n\n`;
  }

  if (unplaced.length > 0) {
    md += `## No AI Involvement\n\n`;
    md += `These domains were not mapped — AI defaults to 0% engagement:\n\n`;
    unplaced.forEach(d => { md += `- ${d.name}\n`; });
    md += `\n---\n\n`;
  }

  md += `## Raw Coordinates\n\n`;
  md += '```json\n';
  const raw = {
    version: 1,
    generated: date,
    sycophancy: state.sycophancy,
    axes: {
      x: { description: 'horizontal', min: 'professional (-1)',   max: 'personal (+1)'   },
      y: { description: 'vertical',   min: 'polishing (-1)',      max: 'planning (+1)'   }
    },
    domains: state.domains.map(d => ({
      name:      d.name,
      category:  d.cat === 'pro' ? 'professional' : 'personal',
      custom:    d.custom,
      x:         d.x !== null ? Math.round(d.x * 100) / 100 : 0,
      y:         d.y !== null ? Math.round(d.y * 100) / 100 : 0,
      quadrant:  d.x !== null ? Q_INFO[quadrant(d.x, d.y)].label : 'unmapped',
      intensity: d.x !== null ? intensity(d.x, d.y) / 100 : 0,
    }))
  };
  md += JSON.stringify(raw, null, 2);
  md += '\n```\n';
  return md;
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
  }

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
  }

  return lines.join('\n');
}

function genMarkdownNewChat() {
  const date = new Date().toISOString().split('T')[0];
  const nc   = state.newChat;
  const q    = quadrant(nc.x, nc.y);
  const info = Q_INFO[q];
  const pct  = intensity(nc.x, nc.y);
  const roleDescs = {
    'pro-a': 'Give concrete, actionable recommendations on every topic discussed.',
    'pro-p': 'Surface information and options — let the user make final decisions on everything.',
    'per-a': 'Offer direct, concrete personal guidance across all topics. Engage with care.',
    'per-p': 'Reflect observations and patterns back gently. Keep a light touch on everything.',
  };
  let md = `# AI Session Default\n\n`;
  md += `> _Last updated: ${date}_\n\n`;
  md += `This file sets the default AI behavior for **all topics** in this session.\n`;
  md += `Apply this role to every subject discussed unless the user specifies otherwise.\n\n`;
  md += `---\n\n`;
  md += `## Default Role: ${info.role}  *(${info.label})*\n\n`;
  md += `> ${roleDescs[q]}\n\n`;
  md += `**Intensity:** ${pct}% involvement\n\n`;
  md += `---\n\n`;
  md += intensityScale();
  md += `---\n\n`;
  md += sycophancyScale(state.sycophancy);
  md += `---\n\n`;
  md += `## What this means in practice\n\n`;
  if (q === 'pro-a') {
    md += `- Proactively suggest next steps, draft content, and make clear recommendations.\n`;
    md += `- Don't just list options — take a position and explain your reasoning.\n`;
    md += `- Treat every task like a collaborative work project.\n`;
  } else if (q === 'pro-p') {
    md += `- Present information, trade-offs, and options without pushing a conclusion.\n`;
    md += `- Ask clarifying questions rather than assuming intent.\n`;
    md += `- Summarize and organize — let the user decide what to act on.\n`;
  } else if (q === 'per-a') {
    md += `- Offer direct, honest personal guidance when asked.\n`;
    md += `- It's okay to name patterns or make suggestions about personal choices.\n`;
    md += `- Be supportive but concrete — the user wants more than validation.\n`;
  } else {
    md += `- Respond thoughtfully but don't push advice or strong opinions.\n`;
    md += `- Mirror back what the user shares; ask gentle questions.\n`;
    md += `- The user is in the driver's seat — follow their lead.\n`;
  }
  md += `\n${quadrantInstructions(q)}`;
  md += `\n---\n\n`;
  md += `## Raw Coordinates\n\n`;
  md += '```json\n';
  md += JSON.stringify({
    version: 1,
    generated: date,
    mode: 'new-chat-default',
    role: info.role,
    quadrant: info.label,
    intensity: pct / 100,
    sycophancy: state.sycophancy,
    x: Math.round(nc.x * 100) / 100,
    y: Math.round(nc.y * 100) / 100,
  }, null, 2);
  md += '\n```\n';
  return md;
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
      </div>
      <div class="qp-cell qp-xa">
        <div class="qp-role">Coach</div>
        <div class="qp-desc">Personal · Planning</div>
        <div class="qp-detail">AI gives direct, concrete personal guidance — on habits, communication, or relationships. The highest-trust quadrant; use it intentionally and on your terms.</div>
      </div>
      <div class="qp-cell qp-pp">
        <div class="qp-role">Researcher</div>
        <div class="qp-desc">Professional · Polishing</div>
        <div class="qp-detail">AI surfaces information, options, and trade-offs for work tasks. It informs but never decides — you evaluate and choose what to act on.</div>
      </div>
      <div class="qp-cell qp-xp">
        <div class="qp-role">Mirror</div>
        <div class="qp-desc">Personal · Polishing</div>
        <div class="qp-detail">AI reflects observations and patterns back to you — gently, without pushing. Well-suited for journaling, self-reflection, and light emotional support.</div>
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
    domains: state.domains,
    newChat: state.newChat,
    sycophancy: state.sycophancy,
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
  }
  render();
});
