# Synth2

A browser-based synthesizer built with Vue 3, TypeScript, Vite, the Web MIDI API,
and the Web Audio API.

## Requirements

- Node.js 22.12 or newer
- npm

## Development

```bash
npm ci
npm run dev
```

Create a production build with:

```bash
npm run build
```

If installation fails with a missing Rolldown native binding, remove the local
`node_modules` directory and run `npm ci` again using a supported Node version.
