# Agentic Playground

An interactive world of code, context and shaders by [yasio.dev](https://yasio.dev).

Explore the agentic development workflow in a fullscreen Three.js playground. Move the pointer to shift the perspective and push the ASCII particles. Click to send a signal through the scene. Open code modules, build a plan, fix a failing test and finish with AI × IT.

[Play the demo](https://YasiOnFire.github.io/agentic-playground/)

## Interaction

- Move the mouse to tilt the scene and react with the glyphs.
- Click the scene to send a pulse through the particles and grid.
- Click a floating module, or choose **Modules**, to inspect its code and purpose.
- Choose **Context**, **Build**, **Verify** or **Reveal** to explore a chapter.
- **Run checks**, **Patch + retest** and **Ship it** take you through the workflow.
- Keys **1-4** choose chapters. **Escape** closes the module inspector. **Enter** runs the next action when the page has focus.

Touch controls work on phones. Reduced motion preferences disable autoplay, parallax and pulses while keeping the workflow interactive.

The tests and agent activity inside the experience are a local simulation. Everything runs in the browser. There is no backend, account, GPT integration, API key or runtime secret.

## Run locally

Use Node.js 24 or newer.

```sh
npm ci
npm run dev
```

Open `http://localhost:4180`.

```sh
npm test
npm run build
npm run preview
```

## Source

- `src/config.ts`: text, purple palette, effects and seeded geometry.
- `src/timeline.ts`: the original five-scene, 20-second choreography.
- `src/scene.ts`: Three.js geometry, picking, camera and interaction uniforms.
- `src/shaders.ts`: custom GLSL for ASCII, flow lines, pointer displacement and pulses.
- `src/main.ts`: chapter navigation, module inspection and the test/fix flow.
- `src/interactive.css`: fullscreen desktop and phone layouts.

Vite uses a relative base so assets work from a GitHub Pages project path. The workflow in `.github/workflows/pages.yml` tests, builds and deploys on every push to `main` through GitHub's built-in Pages authentication.

Typography: IBM Plex Mono and Consolas ligaturized v2. Built with TypeScript, Three.js and Vite.

Vibe Coded with \</> by Yasio.dev
