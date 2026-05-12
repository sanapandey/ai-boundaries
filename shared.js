// shared.js — constants and pure helpers used by both onboarding.js and sidepanel.js.
// Loaded as a global script; do not require/import.

// ─────────────────────────────────────────────────────────
// Quadrants
// ─────────────────────────────────────────────────────────
const Q_INFO = {
  'pro-a': { label: 'Professional · Planning',  role: 'Co-pilot',   desc: 'Concrete recommendations on work tasks',         css: 'qc-pa', chipCss: 'cq-pa', qpCss: 'qp-pa', svgFill: '#eff6ff', svgStroke:'#bfdbfe' },
  'pro-p': { label: 'Professional · Polishing', role: 'Researcher', desc: 'Surfaces information, you decide',               css: 'qc-pp', chipCss: 'cq-pp', qpCss: 'qp-pp', svgFill: '#f0fdf4', svgStroke:'#bbf7d0' },
  'per-a': { label: 'Personal · Planning',      role: 'Coach',      desc: 'Concrete personal guidance — use intentionally', css: 'qc-xa', chipCss: 'cq-xa', qpCss: 'qp-xa', svgFill: '#f5f3ff', svgStroke:'#ddd6fe' },
  'per-p': { label: 'Personal · Polishing',     role: 'Mirror',     desc: 'Gentle reflection, light touch',                 css: 'qc-xp', chipCss: 'cq-xp', qpCss: 'qp-xp', svgFill: '#fffbeb', svgStroke:'#fde68a' },
};
const Q_ORDER = ['pro-a', 'pro-p', 'per-a', 'per-p'];

function quadrant(nx, ny) {
  return (nx <= 0 ? 'pro' : 'per') + '-' + (ny >= 0 ? 'a' : 'p');
}
function intensity(nx, ny) {
  return Math.round(Math.sqrt(nx * nx + ny * ny) / Math.sqrt(2) * 100);
}

// ─────────────────────────────────────────────────────────
// Calibration example (one shared prompt, four responses)
// ─────────────────────────────────────────────────────────
const EXAMPLE_PROMPT = "I'm thinking about leaving my job. What should I do?";
const EXAMPLE_RESPONSES = {
  'pro-a': "Here's a 14-day plan: draft your resignation letter and save it, polish your resume tonight, and book 3 informational chats with people in target roles by Friday. Set a firm decision deadline two weeks out — open-ended deliberation will just stretch the discomfort.",
  'pro-p': "A few axes to weigh before deciding: financial runway, whether the issue is the role / team / company, and what the current market looks like for your function. Each one points toward a different next move — I can pull a deeper view on any of them.",
  'per-a': "It sounds like the energy you used to have for this work is gone. Schedule a 30-minute chat with someone you trust who left a job recently and ask what they wish they'd done differently. Sit with the answer for a week before deciding.",
  'per-p': "Before answering 'should I leave,' what would help more — getting clearer on what you'd be leaving toward, or on what's making it hard to stay? Take a walk this evening and let that settle, then come back to the question.",
};
const EXAMPLE_SHAPES = {
  'pro-a': "14-day action plan with concrete tasks and a firm decision deadline.",
  'pro-p': "surfaces the key axes (financial runway, role/team/company fit, market) without picking one.",
  'per-a': "names the pattern (\"your energy is gone\"), suggests one clarifying step, defers the decision a week.",
  'per-p': "turns the question back (\"what would help more — clarity on leaving toward what, or what's hard to stay?\").",
};

// ─────────────────────────────────────────────────────────
// Sycophancy / intensity scales (markdown)
// ─────────────────────────────────────────────────────────
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

function roleExamplesMarkdown() {
  let md = `## Example Responses\n\n`;
  md += `For calibration, here's the same user prompt answered four different ways — one per role. The further from center a domain sits, the more pronounced this style should be.\n\n`;
  md += `> _User asks:_ "${EXAMPLE_PROMPT}"\n\n`;
  Q_ORDER.forEach(q => {
    const info = Q_INFO[q];
    md += `### ${info.role}  *(${info.label})*\n\n`;
    md += `${EXAMPLE_RESPONSES[q]}\n\n`;
  });
  return md;
}

function roleExamplesCompact() {
  const lines = [];
  lines.push("EXAMPLE RESPONSE SHAPES (calibration — same user prompt, four role styles):");
  lines.push(`Prompt: "${EXAMPLE_PROMPT}"`);
  Q_ORDER.forEach(q => {
    const info = Q_INFO[q];
    lines.push(`- ${info.role}: ${EXAMPLE_SHAPES[q]}`);
  });
  return lines.join('\n');
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

// ─────────────────────────────────────────────────────────
// Feedback / miscalibration
// ─────────────────────────────────────────────────────────
const MISCALIBRATION_OPTIONS = [
  { id: 'too-directive',     label: 'Felt too directive — wanted more reflection',         shortLabel: 'too directive',       nudge: { x: 0,    y: -0.25 } },
  { id: 'too-hands-off',     label: 'Felt too hands-off — wanted concrete action',          shortLabel: 'too hands-off',       nudge: { x: 0,    y:  0.25 } },
  { id: 'more-personal',     label: 'Wrong frame — should treat as more personal',          shortLabel: 'wrong frame (personal)',     nudge: { x: 0.25, y:  0    } },
  { id: 'more-professional', label: 'Wrong frame — should treat as more professional',      shortLabel: 'wrong frame (professional)', nudge: { x:-0.25, y:  0    } },
  { id: 'other',             label: 'Other (describe in notes)',                            shortLabel: 'other',               nudge: null },
];
const FEEDBACK_CONSOLIDATE_THRESHOLD = 10;

function miscalibrationOpt(id) {
  return MISCALIBRATION_OPTIONS.find(o => o.id === id) || null;
}
function miscalibrationLabel(id) {
  const o = miscalibrationOpt(id);
  return o ? o.shortLabel : id;
}

// Given a domain's current placement and a miscalibration, suggest a new (x, y).
// Returns null if the miscalibration has no direction (e.g., 'other').
function suggestPlacement(currentX, currentY, miscalibration) {
  const opt = miscalibrationOpt(miscalibration);
  if (!opt || !opt.nudge) return null;
  if (currentX === null || currentY === null) return null;
  return {
    x: Math.max(-1, Math.min(1, currentX + opt.nudge.x)),
    y: Math.max(-1, Math.min(1, currentY + opt.nudge.y)),
  };
}

// Collapse a flat list of feedback items into per-pattern insights (groups of 2+).
function consolidateFeedback(feedbackItems) {
  const groups = {};
  feedbackItems.forEach(fb => {
    const key = `${fb.domainId || 'unknown'}|${fb.miscalibration}`;
    if (!groups[key]) {
      groups[key] = {
        domainId:       fb.domainId || null,
        domainName:     fb.domainName || 'Unspecified domain',
        miscalibration: fb.miscalibration,
        count:          0,
      };
    }
    groups[key].count += 1;
  });
  const out = [];
  Object.values(groups).forEach(g => {
    if (g.count < 2) return; // singletons aren't a pattern
    out.push({
      id:            'cf-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      createdAt:     new Date().toISOString(),
      domainId:      g.domainId,
      domainName:    g.domainName,
      miscalibration: g.miscalibration,
      count:         g.count,
      insight:       `For **${g.domainName}**, ${g.count} responses were flagged as "${miscalibrationLabel(g.miscalibration)}". Strongly lean in the opposite direction for this domain.`,
    });
  });
  return out;
}

function adjustmentsSection(feedback, consolidatedFeedback) {
  const fbList   = Array.isArray(feedback) ? feedback : [];
  const cfList   = Array.isArray(consolidatedFeedback) ? consolidatedFeedback : [];
  if (!fbList.length && !cfList.length) return '';
  let md = `## Adjustments based on feedback\n\n`;
  md += `These notes capture corrections the user flagged after seeing AI responses in practice. Treat them as high-priority overrides to the role behaviors above.\n\n`;
  if (cfList.length) {
    md += `### Consolidated patterns\n\n`;
    cfList.forEach(cf => { md += `- ${cf.insight}\n`; });
    md += `\n`;
  }
  if (fbList.length) {
    md += `### Recent flagged responses\n\n`;
    fbList.forEach(fb => {
      const miscLabel = miscalibrationLabel(fb.miscalibration);
      md += `- **${fb.domainName || 'Unspecified domain'}** — flagged as "${miscLabel}"\n`;
      if (fb.notes) md += `  - Note: ${fb.notes}\n`;
      const snippet = (fb.responseText || '').slice(0, 140).replace(/\s+/g, ' ').trim();
      if (snippet) md += `  - Response excerpt: "${snippet}${(fb.responseText || '').length > 140 ? '…' : ''}"\n`;
    });
    md += `\n`;
  }
  return md;
}

// ─────────────────────────────────────────────────────────
// Full memory.md generator (takes data explicitly so both
// onboarding state and side-panel-loaded storage can call it).
// data = { domains, newChat, sycophancy, feedback, consolidatedFeedback }
// ─────────────────────────────────────────────────────────
function genMemoryMd(data) {
  const date = new Date().toISOString().split('T')[0];
  const domains    = data.domains || [];
  const newChat    = data.newChat || { x: null, y: null };
  const sycophancy = typeof data.sycophancy === 'number' ? data.sycophancy : 50;
  const feedback   = data.feedback || [];
  const consolFb   = data.consolidatedFeedback || [];

  const placed   = domains.filter(d => d.x !== null);
  const unplaced = domains.filter(d => d.x === null);

  const byQ = {};
  Q_ORDER.forEach(q => { byQ[q] = []; });
  placed.forEach(d => {
    const q = quadrant(d.x, d.y);
    if (byQ[q]) byQ[q].push(d);
  });
  Q_ORDER.forEach(q => byQ[q].sort((a, b) => intensity(b.x, b.y) - intensity(a.x, a.y)));

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
  md += sycophancyScale(sycophancy);
  md += `---\n\n`;
  md += roleExamplesMarkdown();
  md += `---\n\n`;

  const adj = adjustmentsSection(feedback, consolFb);
  if (adj) { md += adj; md += `---\n\n`; }

  const hasPlaced = placed.length > 0;
  Q_ORDER.forEach(q => {
    const info = Q_INFO[q];
    const doms = byQ[q];
    if (!doms.length) return;
    md += `## ${info.label}  *(${info.role})*\n\n`;
    md += `> ${roleDescs[q]}\n\n`;
    doms.forEach(d => { md += `- **${d.name}** — ${intensity(d.x, d.y)}% involvement\n`; });
    md += `\n${quadrantInstructions(q)}`;
    md += `\n---\n\n`;
  });
  if (!hasPlaced) { md += `## No domains mapped yet.\n\n---\n\n`; }

  if (newChat.x !== null) {
    const ncQ = Q_INFO[quadrant(newChat.x, newChat.y)];
    md += `## New Chat Default\n\n`;
    md += `> Used when no specific domain is set for a session.\n\n`;
    md += `- **Role:** ${ncQ.role} (${ncQ.label})\n`;
    md += `- **Intensity:** ${intensity(newChat.x, newChat.y)}% involvement\n`;
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
    sycophancy: sycophancy,
    axes: {
      x: { description: 'horizontal', min: 'professional (-1)',  max: 'personal (+1)'   },
      y: { description: 'vertical',   min: 'polishing (-1)',     max: 'planning (+1)'   }
    },
    domains: domains.map(d => ({
      name:      d.name,
      category:  d.cat === 'pro' ? 'professional' : 'personal',
      custom:    !!d.custom,
      x:         d.x !== null ? Math.round(d.x * 100) / 100 : 0,
      y:         d.y !== null ? Math.round(d.y * 100) / 100 : 0,
      quadrant:  d.x !== null ? Q_INFO[quadrant(d.x, d.y)].label : 'unmapped',
      intensity: d.x !== null ? intensity(d.x, d.y) / 100 : 0,
    })),
    pendingFeedback:      feedback.length,
    consolidatedPatterns: consolFb.length,
  };
  md += JSON.stringify(raw, null, 2);
  md += '\n```\n';
  return md;
}

function genMemoryMdNewChat(data) {
  const date       = new Date().toISOString().split('T')[0];
  const nc         = data.newChat || { x: null, y: null };
  const sycophancy = typeof data.sycophancy === 'number' ? data.sycophancy : 50;
  const feedback   = data.feedback || [];
  const consolFb   = data.consolidatedFeedback || [];
  if (nc.x === null) return '';
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
  md += sycophancyScale(sycophancy);
  md += `---\n\n`;
  md += roleExamplesMarkdown();
  md += `---\n\n`;
  const adj = adjustmentsSection(feedback, consolFb);
  if (adj) { md += adj; md += `---\n\n`; }
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
    sycophancy: sycophancy,
    x: Math.round(nc.x * 100) / 100,
    y: Math.round(nc.y * 100) / 100,
    pendingFeedback:      feedback.length,
    consolidatedPatterns: consolFb.length,
  }, null, 2);
  md += '\n```\n';
  return md;
}
