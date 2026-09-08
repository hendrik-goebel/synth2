# Synth2

A browser-based synthesizer built with Vue 3, TypeScript, Vite, the Web MIDI API,
and the Web Audio API.

## Audio module organization

`src/services/synthEngine.ts` coordinates voices, modulation, and the ordered
audio graph. Individual Web Audio module definitions, graph wiring, setting
application, and cleanup live in `src/services/audio-modules/`; the engine
continues to re-export its established settings factories and types.

## External MIDI controllers

Use a Web MIDI-compatible browser in a secure context, click **Connect**, choose
your MIDI input, then click a learnable synth control (or select a parameter under **CC
parameter**) and click **Learn CC**. Clicking a learnable control selects its
matching CC parameter automatically, including filter, overdrive, and resonator
modules inside delays and reverbs. Move a knob or fader on the controller to bind it; subsequent
movements update that parameter on the learned MIDI channel. When available,
the Akai MIDImix is selected automatically; otherwise choose it in the input
selector. The MIDImix works with its knobs and faders as standard MIDI CC
controls.

The MIDI panel has separate **Control & clock input** and **Note input**
selectors. Both default to **BroadcastChannel**, which receives clock/transport
from `arpeggiator-midi-clock-v1` and notes from `arpeggiator-midi-events-v1`
respectively, allowing a same-origin Web Arpeggiator tab to drive the synth.
Choose hardware inputs to use Web MIDI instead. The IAC driver is preferred for
notes and the Akai MIDImix for controls when both devices are available.

## Custom sliders

The **Custom Sliders** panel below Output creates per-channel macro faders.
Click a slider's **Learn** button, then click one or more learnable synth
controls to add them to that slider. Each assignment captures the parameter's
current value; the centered slider position leaves it unchanged and movement
adjusts it relatively within that parameter's own range. Click a custom slider
and use the normal MIDI **Learn** workflow to assign it to a hardware CC.
Use **R** next to an assignment to reverse just that parameter's slider response.

## Module modulation

Each modulatable processing card has a **+ Mod** button. Choose **LFO** or
**ENV** in the dialog to add modulation scoped to that specific module
instance. Its controls and targets stay with that module when other instances
are added, removed, or reindexed.

## Resonator

Add a **Resonator** from the Time-based section of **Add Module**. Its warm,
saturated feedback path is tuned for the sustained, singing response of electric
guitar feedback rather than unstable self-oscillation. Place it anywhere in the
module chain to decide whether it colors the dry synth signal or another effect's
output.

- **Frequency** sets the resonant pitch.
- **Decay** controls the narrowness of the band (higher values ring longer).
- **Feedback** feeds the resonated output back into the resonator. It is capped at
  85% to keep the response musical.
- **Damping** rolls off high frequencies in the feedback path.
- **Drive** increases input gain and saturation for a rougher, more assertive tone.
- **Mix** blends the resonated signal with the dry signal.

Each resonator control is available as both an LFO target and an envelope
destination, so feedback can swell with a note while frequency, damping, or drive
move over time.

Resonator settings, bypass state, and module position are preserved in generated
seeds.

## Requirements

- Node.js 22.12 or newer
- npm

## Development

Use the required Node version before installing dependencies. With nvm:

```bash
nvm install
nvm use
```

Confirm that `node --version` reports at least `v22.12.0`, then run:

```bash
npm ci
npm run dev
```

Create a production build with:

```bash
npm run build
```

## Real-time performance checks

Audio parameter changes are smoothed and deduplicated before they are scheduled,
and custom-slider updates are coalesced to one application per animation frame.
Reverb impulse updates are cached and deferred for 100 ms after the last decay
or hall-type change so a live controller never builds large buffers on its hot
path. The most recent requested reverb setting is then applied.

Before releasing audio changes, test in a supported Chromium-based browser with
the browser performance recorder enabled:

1. Hold a multi-note MIDI chord with the maximum intended oscillator, modulation,
   and effect configuration active.
2. Move a hardware CC or custom slider continuously while MIDI clock is running.
3. Confirm no audible dropouts, that note-on/off remains immediate, and that the
   performance trace has no sustained allocation or long-task growth.

Web Audio scheduling is browser and device dependent, so this is a repeatable
stability check rather than a universal real-time guarantee.

If installation fails with a missing Rolldown native binding, remove the local
`node_modules` directory and run `npm ci` again using a supported Node version.
test
