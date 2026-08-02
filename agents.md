# Project Overview

This project is a web-based synthesizer built with Vue 3, TypeScript, and Vite.
It starts simple and is intended to be incrementally improved over time.

The synth is controlled primarily through MIDI messages from external devices.
The application uses the Web MIDI API to receive note and control input, and the
Web Audio API to generate sound in the browser.

## Development Direction

- Keep the initial implementation small and understandable.
- Improve the synthesizer incrementally as new capabilities are added.
- Preserve reliable MIDI input handling for external controllers.
- Keep audio behavior responsive and suitable for live interaction.
