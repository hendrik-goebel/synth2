import type {
  AmplitudeModulationSettings,
  ChorusSettings,
  CompressorSettings,
  DelaySettings,
  DynamicsSettings,
  EffectGroup,
  EnvelopeDestination,
  EnvelopeSettings,
  EqSettings,
  FilterSettings,
  FlangerSettings,
  LfoSettings,
  NoiseSettings,
  OscillatorSettings,
  OutputSettings,
  OverdriveSettings,
  ResonatorSettings,
  ReverbSettings,
  TremoloSettings,
  Waveform,
} from './services/synthEngine'

export type InstrumentCategory = 'Bass' | 'Lead' | 'Pad' | 'Keys' | 'Pluck' | 'Sequence' | 'Percussion' | 'Texture'

export type InstrumentPreset = {
  id: string
  name: string
  category: InstrumentCategory
  oscillators: OscillatorSettings[]
  output: OutputSettings
  noise: NoiseSettings | null
  filters: FilterSettings[]
  delays: DelaySettings[]
  overdrives: OverdriveSettings[]
  choruses: ChorusSettings[]
  flangers: FlangerSettings[]
  tremolos: TremoloSettings[]
  bpm: number
  resonators?: ResonatorSettings[]
  reverbs: ReverbSettings[]
  amplitudeModulation: AmplitudeModulationSettings | null
  envelopes: Array<EnvelopeSettings & { bypassed: boolean }>
  lfos: Array<LfoSettings & { bypassed: boolean }>
  dynamics: DynamicsSettings[]
  eqs: EqSettings[]
  effectOrder: EffectGroup[]
  isAmplitudeModulationBypassed: boolean
}

type PresetDefinition = { id: string; name: string }

const effectOrder: EffectGroup[] = ['filters', 'overdrives', 'choruses', 'flangers', 'tremolos', 'delays', 'resonators', 'reverbs', 'eqs', 'dynamics']

function oscillator(waveform: Waveform, level: number, changes: Partial<OscillatorSettings> = {}): OscillatorSettings {
  return { bypassed: false, detune: 0, steppedDetune: false, glide: 0, level, waveform, unisonDetune: 0, stereoSpread: 0, fmAmount: 0, fmSource: 'sine', ...changes }
}

function filter(cutoff: number, changes: Partial<FilterSettings> = {}): FilterSettings {
  return { bypassed: false, type: 'lowpass', cutoff, resonance: 0, gain: 0, ...changes }
}

function envelope(destination: EnvelopeDestination, changes: Partial<EnvelopeSettings> = {}): EnvelopeSettings & { bypassed: boolean } {
  return {
    attack: 8,
    decay: 60,
    hold: 0,
    release: 120,
    velocity: 0.7,
    attackCurve: 'linear',
    releaseCurve: 'linear',
    destination,
    bypassed: false,
    ...changes,
  }
}

function lfo<T extends LfoSettings['target']>(target: T, rate: number, depth: number, waveform: Waveform = 'sine'): LfoSettings & { target: T; bypassed: boolean } {
  return { target, rate, depth, waveform, bypassed: false }
}

function delay(mix: number, changes: Partial<DelaySettings> = {}): DelaySettings {
  return { bypassed: false, time: 0.375, noteTime: 8, repetitions: 4, mix, ...changes }
}

function reverb(mix: number, changes: Partial<ReverbSettings> = {}): ReverbSettings {
  return { bypassed: false, hallType: 'concert-hall', decay: 3.5, preDelay: 0.025, damping: 0.6, width: 0.9, mix, ...changes }
}

function compressor(changes: Partial<CompressorSettings> = {}): CompressorSettings {
  return { type: 'compressor', bypassed: false, threshold: -24, knee: 24, ratio: 4, attack: 0.008, release: 0.18, makeupGain: 0, ...changes }
}

function equalizer(frequency: number, gain: number, lfos: EqSettings['lfos'] = [], envelopes: EqSettings['envelopes'] = []): EqSettings {
  return {
    kind: 'single',
    bypassed: false,
    bands: [{ bypassed: false, type: 'peaking', frequency, gain, q: 0.8 }],
    lfos,
    envelopes,
  }
}

function createBassPreset(definition: PresetDefinition, variation: number): InstrumentPreset {
  return {
    id: definition.id,
    name: definition.name,
    category: 'Bass',
    oscillators: [
      oscillator(variation % 2 ? 'square' : 'sawtooth', 0.72, { unisonDetune: 7 + variation * 2, fmAmount: 0.12 + variation * 0.025, fmSource: 'sine' }),
      oscillator('sine', 0.35, { detune: -12 }),
    ],
    output: { volume: 0.78, pan: 0 },
    noise: variation === 3 ? { bypassed: false, color: 'brown', level: 0.05, stereoSpread: 0 } : null,
    filters: [filter(620 + variation * 250, { resonance: 0.32 + variation * 0.04 })],
    delays: variation === 4 ? [delay(0.12, { noteTime: 16, filter: filter(2600), moduleOrder: ['filter'] })] : [],
    overdrives: [{ bypassed: false, drive: 0.16 + variation * 0.04, tone: 0.42, feedback: 0, mix: 0.38 }],
    choruses: [],
    flangers: [],
    tremolos: [],
    bpm: 120,
    resonators: [],
    reverbs: [],
    amplitudeModulation: null,
    envelopes: [envelope('oscillatorLevel', { attack: 3, decay: 70, release: 75 }), envelope('filterCutoff', { attack: 2, decay: 95, release: 65, velocity: 0.58 })],
    lfos: [lfo('filter:0:cutoff', 0.18 + variation * 0.05, 0.13, 'triangle')],
    dynamics: [compressor({ ratio: 6, threshold: -28 })],
    eqs: [],
    effectOrder,
    isAmplitudeModulationBypassed: false,
  }
}

function createLeadPreset(definition: PresetDefinition, variation: number): InstrumentPreset {
  return {
    id: definition.id,
    name: definition.name,
    category: 'Lead',
    oscillators: [
      oscillator('sawtooth', 0.62, { glide: 55 + variation * 18, unisonDetune: 14 + variation * 3, stereoSpread: 0.45, fmAmount: variation % 2 ? 0.2 : 0.1, fmSource: 'triangle' }),
      oscillator(variation % 2 ? 'square' : 'triangle', 0.27, { detune: variation % 2 ? 7 : -7, stereoSpread: 0.35 }),
    ],
    output: { volume: 0.7, pan: 0 },
    noise: null,
    filters: [filter(3000 + variation * 520, { resonance: 0.22 })],
    delays: [delay(0.2, { noteTime: variation % 2 ? 8 : 16, repetitions: 4 + variation })],
    overdrives: variation === 2 ? [{ bypassed: false, drive: 0.25, tone: 0.66, feedback: 0.06, mix: 0.28 }] : [],
    choruses: [],
    flangers: [{ bypassed: false, waveform: 'sine', rate: 0.18 + variation * 0.05, depth: 0.3, delay: 0.0025, feedback: 0.22, mix: 0.18 }],
    tremolos: [],
    bpm: 126,
    resonators: [],
    reverbs: [reverb(0.16, { hallType: 'small-hall', decay: 2.2 })],
    amplitudeModulation: null,
    envelopes: [envelope('oscillatorLevel', { attack: 5, decay: 45, release: 160 }), envelope('flangerMix', { attack: 80, decay: 180, release: 220, velocity: 0.35 })],
    lfos: [lfo('oscillator:0:detune', 4.8 + variation * 0.5, 0.07), lfo('flanger:0:depth', 0.35, 0.18, 'triangle')],
    dynamics: [compressor({ ratio: 3.5, threshold: -22 })],
    eqs: [],
    effectOrder,
    isAmplitudeModulationBypassed: false,
  }
}

function createPadPreset(definition: PresetDefinition, variation: number): InstrumentPreset {
  return {
    id: definition.id,
    name: definition.name,
    category: 'Pad',
    oscillators: [
      oscillator(variation % 2 ? 'sawtooth' : 'triangle', 0.5, { unisonDetune: 25 + variation * 4, stereoSpread: 0.9 }),
      oscillator('sine', 0.26, { detune: 12, stereoSpread: 0.65 }),
    ],
    output: { volume: 0.65, pan: 0 },
    noise: { bypassed: false, color: variation % 2 ? 'pink' : 'white', level: 0.035 + variation * 0.01, stereoSpread: 0.85 },
    filters: [filter(1700 + variation * 280, { resonance: 0.16 })],
    delays: [delay(0.16, { noteTime: 4, repetitions: 3 })],
    overdrives: [],
    choruses: [{ bypassed: false, waveform: 'sine', rate: 0.22, depth: 0.46, delay: 0.02, mix: 0.4 }],
    flangers: [],
    tremolos: [],
    bpm: 108,
    resonators: [],
    reverbs: [reverb(0.36, { hallType: variation % 2 ? 'cathedral' : 'opera-house', decay: 5 + variation * 0.45, filter: filter(7200), moduleOrder: ['filter'] })],
    amplitudeModulation: { waveform: 'sine', rate: 0.16 + variation * 0.035, depth: 0.09 },
    envelopes: [envelope('oscillatorLevel', { attack: 240 + variation * 35, decay: 160, release: 500 }), envelope('filterCutoff', { attack: 360, decay: 260, release: 420, velocity: 0.48 })],
    lfos: [lfo('filter:0:cutoff', 0.08 + variation * 0.035, 0.2, 'triangle'), lfo('chorus:0:depth', 0.12, 0.13)],
    dynamics: [compressor({ ratio: 2.2, threshold: -26 })],
    eqs: [],
    effectOrder,
    isAmplitudeModulationBypassed: false,
  }
}

function createKeysPreset(definition: PresetDefinition, variation: number): InstrumentPreset {
  return {
    id: definition.id,
    name: definition.name,
    category: 'Keys',
    oscillators: [
      oscillator(variation % 2 ? 'sine' : 'triangle', 0.68, { fmAmount: 0.2 + variation * 0.04, fmSource: variation % 2 ? 'square' : 'sine' }),
      oscillator('sine', 0.22, { detune: 12, stereoSpread: 0.24 }),
    ],
    output: { volume: 0.74, pan: 0 },
    noise: variation === 3 ? { bypassed: false, color: 'white', level: 0.045, stereoSpread: 0.45 } : null,
    filters: [filter(2800 + variation * 480, { resonance: 0.1 })],
    delays: [delay(0.1 + variation * 0.02, { noteTime: 16, repetitions: 3 })],
    overdrives: [],
    choruses: variation === 1 ? [{ bypassed: false, waveform: 'sine', rate: 0.45, depth: 0.3, delay: 0.015, mix: 0.28 }] : [],
    flangers: [],
    tremolos: [{ bypassed: false, waveform: 'sine', rate: 3.5 + variation * 0.5, depth: 0.1, mix: 0.4 }],
    bpm: 116,
    resonators: [],
    reverbs: [reverb(0.17, { hallType: 'wooden-hall', decay: 2.1 })],
    amplitudeModulation: null,
    envelopes: [envelope('oscillatorLevel', { attack: 2, decay: 85, release: 145, attackCurve: 'exponential' }), envelope('tremoloDepth', { attack: 110, decay: 140, release: 160, velocity: 0.4 })],
    lfos: [lfo('oscillator:0:fmAmount', 0.4 + variation * 0.1, 0.12, 'triangle')],
    dynamics: [compressor({ ratio: 3, threshold: -23 })],
    eqs: [equalizer(2400, 1.5, [lfo('eq:0:0:gain', 0.2, 0.15)])],
    effectOrder,
    isAmplitudeModulationBypassed: false,
  }
}

function createPluckPreset(definition: PresetDefinition, variation: number): InstrumentPreset {
  return {
    id: definition.id,
    name: definition.name,
    category: 'Pluck',
    oscillators: [
      oscillator(variation % 2 ? 'square' : 'sawtooth', 0.68, { unisonDetune: 5 + variation * 3, stereoSpread: 0.3 }),
      oscillator('triangle', 0.22, { detune: 12 }),
    ],
    output: { volume: 0.72, pan: 0 },
    noise: { bypassed: false, color: 'white', level: 0.025 + variation * 0.012, stereoSpread: 0.3 },
    filters: [filter(1800 + variation * 340, { resonance: 0.42 })],
    delays: [delay(0.21, { noteTime: variation % 2 ? 8 : 16, resonator: { bypassed: false, frequency: 1200 + variation * 180, decay: 0.6, feedback: 0.18, damping: 0.48, drive: 0.08, mix: 0.25 }, moduleOrder: ['resonator'] })],
    overdrives: [],
    choruses: [],
    flangers: [],
    tremolos: [],
    bpm: 122,
    resonators: [{ bypassed: false, frequency: 1500 + variation * 220, decay: 0.8, feedback: 0.2, damping: 0.45, drive: 0.05, mix: 0.2 }],
    reverbs: [reverb(0.12, { hallType: 'small-hall', decay: 1.8 })],
    amplitudeModulation: null,
    envelopes: [envelope('oscillatorLevel', { attack: 1, decay: 95, release: 115, attackCurve: 'exponential' }), envelope('filterCutoff', { attack: 1, decay: 120, release: 80, velocity: 0.62 })],
    lfos: [lfo('resonator:0:frequency', 0.25 + variation * 0.06, 0.1, 'triangle')],
    dynamics: [compressor({ ratio: 3.5, threshold: -24 })],
    eqs: [],
    effectOrder,
    isAmplitudeModulationBypassed: false,
  }
}

function createSequencePreset(definition: PresetDefinition, variation: number): InstrumentPreset {
  return {
    id: definition.id,
    name: definition.name,
    category: 'Sequence',
    oscillators: [
      oscillator(variation % 2 ? 'square' : 'sawtooth', 0.58, { fmAmount: 0.14 + variation * 0.035, fmSource: 'triangle', stereoSpread: 0.42 }),
      oscillator('sine', 0.2, { detune: 12 }),
    ],
    output: { volume: 0.7, pan: 0 },
    noise: null,
    filters: [filter(2200 + variation * 380, { resonance: 0.3 })],
    delays: [delay(0.18, { noteTime: variation % 2 ? 8 : 16, repetitions: 5 })],
    overdrives: variation === 3 ? [{ bypassed: false, drive: 0.22, tone: 0.56, feedback: 0.08, mix: 0.25 }] : [],
    choruses: [],
    flangers: [],
    tremolos: [{ bypassed: false, waveform: 'square', rate: 5 + variation, depth: 0.3, mix: 0.65 }],
    bpm: 128,
    resonators: [],
    reverbs: [reverb(0.1, { hallType: 'small-hall', decay: 1.7 })],
    amplitudeModulation: { waveform: 'square', rate: 3 + variation * 0.5, depth: 0.18 },
    envelopes: [envelope('oscillatorLevel', { attack: 2, decay: 60, release: 80 }), envelope('delayMix', { attack: 60, decay: 180, release: 180, velocity: 0.45 })],
    lfos: [lfo('filter:0:cutoff', 1.5 + variation * 0.3, 0.16, 'triangle'), lfo('delay:0:mix', 0.25, 0.1)],
    dynamics: [compressor({ ratio: 4, threshold: -25 })],
    eqs: [],
    effectOrder,
    isAmplitudeModulationBypassed: false,
  }
}

function createPercussionPreset(definition: PresetDefinition, variation: number): InstrumentPreset {
  return {
    id: definition.id,
    name: definition.name,
    category: 'Percussion',
    oscillators: [
      oscillator(variation % 2 ? 'sine' : 'triangle', 0.7, { fmAmount: 0.24 + variation * 0.05, fmSource: variation % 2 ? 'square' : 'sine' }),
    ],
    output: { volume: 0.78, pan: 0 },
    noise: { bypassed: false, color: variation % 2 ? 'white' : 'pink', level: 0.12 + variation * 0.025, stereoSpread: 0.25 },
    filters: [filter(1000 + variation * 640, { type: variation === 4 ? 'bandpass' : 'lowpass', resonance: 0.35 })],
    delays: variation === 2 ? [delay(0.14, { noteTime: 16, repetitions: 2 })] : [],
    overdrives: variation === 3 ? [{ bypassed: false, drive: 0.34, tone: 0.4, feedback: 0, mix: 0.3 }] : [],
    choruses: [],
    flangers: [],
    tremolos: [],
    bpm: 124,
    resonators: [{ bypassed: false, frequency: 320 + variation * 340, decay: 0.35 + variation * 0.08, feedback: 0.12, damping: 0.52, drive: 0.04, mix: 0.28 }],
    reverbs: [reverb(0.08 + variation * 0.025, { hallType: 'small-hall', decay: 1.1 + variation * 0.2 })],
    amplitudeModulation: null,
    envelopes: [envelope('oscillatorLevel', { attack: 1, decay: 75 + variation * 18, release: 50, attackCurve: 'exponential' }), envelope('noiseLevel', { attack: 1, decay: 35 + variation * 12, release: 20, velocity: 0.7 }), envelope('oscillatorPitch', { attack: 1, decay: 40 + variation * 10, release: 10, velocity: 0.6 })],
    lfos: [lfo('resonator:0:mix', 0.35, 0.1, 'triangle')],
    dynamics: [compressor({ ratio: 5, threshold: -27 })],
    eqs: [],
    effectOrder,
    isAmplitudeModulationBypassed: false,
  }
}

function createTexturePreset(definition: PresetDefinition, variation: number): InstrumentPreset {
  return {
    id: definition.id,
    name: definition.name,
    category: 'Texture',
    oscillators: [
      oscillator(variation % 2 ? 'random' : 'sawtooth', 0.42, { unisonDetune: 32, stereoSpread: 0.95, fmAmount: 0.16, fmSource: 'triangle' }),
      oscillator('sine', 0.18, { detune: -12, stereoSpread: 0.72 }),
    ],
    output: { volume: 0.62, pan: 0 },
    noise: { bypassed: false, color: variation % 2 ? 'pink' : 'brown', level: 0.1, stereoSpread: 1 },
    filters: [filter(1300 + variation * 420, { resonance: 0.5 })],
    delays: [delay(0.28, { noteTime: 4, repetitions: 6, overdrive: { bypassed: false, gain: 0.16, feedback: 0.12 }, moduleOrder: ['overdrive'] })],
    overdrives: [],
    choruses: [{ bypassed: false, waveform: 'random', rate: 0.1 + variation * 0.04, depth: 0.58, delay: 0.022, mix: 0.48 }],
    flangers: [{ bypassed: false, waveform: 'triangle', rate: 0.12, depth: 0.42, delay: 0.004, feedback: 0.28, mix: 0.2 }],
    tremolos: [],
    bpm: 96,
    resonators: [],
    reverbs: [reverb(0.45, { hallType: 'cathedral', decay: 6 + variation * 0.6, resonator: { bypassed: false, frequency: 1800, decay: 1.2, feedback: 0.2, damping: 0.6, drive: 0.06, mix: 0.15 }, moduleOrder: ['resonator'] })],
    amplitudeModulation: { waveform: variation % 2 ? 'random' : 'triangle', rate: 0.3 + variation * 0.12, depth: 0.2 },
    envelopes: [envelope('oscillatorLevel', { attack: 80 + variation * 35, decay: 160, release: 420 }), envelope('reverbMix', { attack: 220, decay: 260, release: 500, velocity: 0.4 }), envelope('flangerFeedback', { attack: 160, decay: 190, release: 280, velocity: 0.3 })],
    lfos: [lfo('filter:0:cutoff', 0.06 + variation * 0.03, 0.25, 'random'), lfo('reverb:0:width', 0.1, 0.12), lfo('noise:0:stereoSpread', 0.18, 0.16, 'triangle')],
    dynamics: [compressor({ ratio: 2.5, threshold: -27 })],
    eqs: [equalizer(1800, -2, [lfo('eq:0:0:frequency', 0.11, 0.12, 'triangle')])],
    effectOrder,
    isAmplitudeModulationBypassed: false,
  }
}

const presetDefinitions: Record<InstrumentCategory, PresetDefinition[]> = {
  Bass: [
    { id: 'subway-pressure', name: 'Subway Pressure' }, { id: 'carbon-pulse', name: 'Carbon Pulse' }, { id: 'iron-current', name: 'Iron Current' }, { id: 'night-engine', name: 'Night Engine' }, { id: 'low-orbit', name: 'Low Orbit' },
  ],
  Lead: [
    { id: 'laser-silk', name: 'Laser Silk' }, { id: 'glass-comet', name: 'Glass Comet' }, { id: 'chrome-voice', name: 'Chrome Voice' }, { id: 'solar-needle', name: 'Solar Needle' }, { id: 'violet-signal', name: 'Violet Signal' },
  ],
  Pad: [
    { id: 'tidal-bloom', name: 'Tidal Bloom' }, { id: 'polar-veil', name: 'Polar Veil' }, { id: 'halo-garden', name: 'Halo Garden' }, { id: 'afterglow-field', name: 'Afterglow Field' }, { id: 'cloud-memory', name: 'Cloud Memory' },
  ],
  Keys: [
    { id: 'opal-keys', name: 'Opal Keys' }, { id: 'static-piano', name: 'Static Piano' }, { id: 'mercury-ep', name: 'Mercury EP' }, { id: 'warm-circuit', name: 'Warm Circuit' }, { id: 'prism-chord', name: 'Prism Chord' },
  ],
  Pluck: [
    { id: 'copper-pick', name: 'Copper Pick' }, { id: 'raindrop-wire', name: 'Raindrop Wire' }, { id: 'ember-harp', name: 'Ember Harp' }, { id: 'bright-thread', name: 'Bright Thread' }, { id: 'kinetic-string', name: 'Kinetic String' },
  ],
  Sequence: [
    { id: 'vector-run', name: 'Vector Run' }, { id: 'binary-garden', name: 'Binary Garden' }, { id: 'neon-lattice', name: 'Neon Lattice' }, { id: 'signal-stairs', name: 'Signal Stairs' }, { id: 'motorik-star', name: 'Motorik Star' },
  ],
  Percussion: [
    { id: 'concrete-kick', name: 'Concrete Kick' }, { id: 'alloy-tom', name: 'Alloy Tom' }, { id: 'paper-snare', name: 'Paper Snare' }, { id: 'glass-strike', name: 'Glass Strike' }, { id: 'distant-clap', name: 'Distant Clap' },
  ],
  Texture: [
    { id: 'weather-system', name: 'Weather System' }, { id: 'ghost-network', name: 'Ghost Network' }, { id: 'dust-horizon', name: 'Dust Horizon' }, { id: 'slow-satellite', name: 'Slow Satellite' }, { id: 'empty-station', name: 'Empty Station' },
  ],
}

export const instrumentPresets: InstrumentPreset[] = [
  ...presetDefinitions.Bass.map(createBassPreset),
  ...presetDefinitions.Lead.map(createLeadPreset),
  ...presetDefinitions.Pad.map(createPadPreset),
  ...presetDefinitions.Keys.map(createKeysPreset),
  ...presetDefinitions.Pluck.map(createPluckPreset),
  ...presetDefinitions.Sequence.map(createSequencePreset),
  ...presetDefinitions.Percussion.map(createPercussionPreset),
  ...presetDefinitions.Texture.map(createTexturePreset),
]

export const instrumentCategories = Object.keys(presetDefinitions) as InstrumentCategory[]
