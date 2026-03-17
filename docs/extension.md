Extension packaging
===================

This project contains a Chrome/Chromium extension UI built with Next.js. The repository includes a `public/manifest.json` that defines the extension manifest.

What the helper does
- `scripts/build-extension.js` runs a production Next.js build and then attempts `next export` to produce a static site under `out/extension`.
- If `next export` is not supported (App Router or dynamic server logic), the script falls back to copying `public/` and `.next/static` assets into `out/extension`. This produces a best-effort unpacked extension folder you can load in Chrome.

Build and load the extension
1. Install dependencies (recommended Node 18+):

```bash
npm install
```

2. Run the extension build script:

```bash
npm run build:extension
```

3. Load the unpacked extension in Chrome/Edge:
  - Open chrome://extensions (or edge://extensions)
  - Enable Developer mode
  - Click "Load unpacked" and select `out/extension`

Notes & caveats
- The app uses Firebase and GenKit/Google AI integrations; those features require network access and credentials (or mocking) to work fully.
- If `next export` fails due to App Router usage, the fallback will include static assets but server-only routes won't be available in a fully static environment.
- If you want a more robust extension packaging (bundling server logic or converting pages to fully static pages), I can add an exporter or adjust pages to be exportable.

Wrapper index.html and dev/host embedding
- The build script will create a simple `index.html` at the extension root if one is not produced by `next export`.
- By default the wrapper iframe points to `http://localhost:9002` so you can run the dev server (`npm run dev`) and see the live UI inside the side panel.
- To change the iframe target for the built extension, set the environment variable `EXTENSION_HOST_URL` before running `npm run build:extension`. For example:

```bash
EXTENSION_HOST_URL=https://my-hosted-app.example.com npm run build:extension
```

This generates `out/extension/index.html` which embeds the provided host URL. If you prefer the extension to be fully self-contained, we can work on converting pages to static HTML so `next export` produces a native `index.html` and the wrapper is not necessary.
