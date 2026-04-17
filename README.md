# AI Boundaries

A single-file interactive tool for defining how much AI involvement you want across different areas of your work and life — then exporting a `memory.md` file you can drop into any workspace to prime AI sessions with your preferences.

## What it does

The app walks you through three steps:

1. **Pick your domains** — choose from a preset list of professional and personal areas (coding, writing, finance, health, etc.) or add your own.
2. **Place them on a map** — drag each domain onto a 2-axis plot:
   - **X-axis**: Professional ↔ Personal
   - **Y-axis**: Active (you lead) ↔ Passive (AI leads)
   - The further from center, the stronger the preference.
3. **Export `memory.md`** — generates a structured Markdown file summarising your AI boundary settings. Place it in the root of any project and reference it in your AI system prompt so the assistant knows where you want more or less involvement.

## Usage

No build step, no dependencies, no server needed.

```bash
# Clone the repo
git clone <your-repo-url>
cd ai-boundaries

# Open in any browser
open onboarding.html
```

After completing the three steps, click **Download memory.md** and place the file in your workspace root, e.g.:

```
my-project/
├── memory.md        ← paste here
├── src/
└── ...
```

Then reference it in your AI tool's system prompt:

```
See memory.md in the project root for my AI boundary preferences.
```

## Contributing

Pull requests welcome. The entire app lives in `onboarding.html` — styles, markup, and logic are all self-contained to keep sharing frictionless.
