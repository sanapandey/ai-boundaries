# AI Boundaries

A single-file interactive tool for defining how much AI involvement you want across different areas of your work and life — then exporting a `memory.md` file you can drop into any workspace to prime AI sessions with your preferences.

## What it does

The app walks you through three steps:

1. **Pick your domains** — choose from a preset list of professional and personal areas (coding, writing, finance, health, etc.) or add your own.
2. **Place them on a map** — drag each domain onto a 2-axis plot:
   - **X-axis**: Professional ↔ Personal
   - **Y-axis**: Planning (early-stage involvement) ↔ Polishing (late-stage involvement)
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

## Chrome Extension

The repo also ships as a Chrome extension that shows your quadrant map in a side panel while you use any AI chat tool.

### Installing the extension

**Option 1: Download (no cloning needed)**

1. Go to [Releases](../../releases) and download the latest `ai-boundaries.zip`
2. Unzip it anywhere (e.g., `~/Downloads/ai-boundaries`)
3. Follow the loading steps below using the unzipped folder

**Option 2: Load from source (requires cloning)**

1. Clone this repo: `git clone <url> && cd ai-boundaries`
2. Follow the loading steps below using the repo folder

### Loading the extension

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer Mode** using the toggle in the top-right corner
3. Click **Load unpacked**
4. Select the `ai-boundaries` folder
5. The extension will appear in your toolbar — click it to open the side panel

### Setting up your map

The side panel reads from the same storage that the onboarding page writes to. For the two to share data, open the onboarding page **through the extension** rather than directly as a file:

1. On the `chrome://extensions` page, find AI Boundaries and click **Details**
2. Click **Extension options** — this opens `onboarding.html` as an extension page
3. Complete the three setup steps and place your domains on the map
4. Your selections are saved automatically to `chrome.storage.sync`
5. The side panel updates live as you make changes

### Using the side panel

Once your map is set up, open any AI chat (ChatGPT, Claude, Gemini, etc.) and click the AI Boundaries icon in the toolbar. The side panel will show:

- A mini quadrant graph with a dot for each placed domain
- A list of all active domains with their assigned role and intensity %
- Your New Chat default (if set), highlighted separately

To update your map at any time, click **Edit setup** in the side panel header.

## Contributing

Pull requests welcome. The app is organized as:

- **`onboarding.html`** — markup and CSS for the three-step setup UI
- **`onboarding.js`** — JavaScript logic for state, render, and actions
- **`sidepanel.html`** / **`sidepanel.js`** — Chrome extension side panel UI and graph rendering
- **`storage.js`** — abstraction for persisting to `localStorage` or `chrome.storage.sync`
- **`manifest.json`** — Chrome extension configuration
