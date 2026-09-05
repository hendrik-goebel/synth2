import type {
  AmplitudeModulationSettings,
  ChorusSettings,
  CompressorSettings,
  DelaySettings,
  DynamicsSettings,
  EqSettings,
  EffectGroup,
  EnvelopeSettings,
  FilterSettings,
  LfoSettings,
  NoiseSettings,
  OscillatorSettings,
  OutputSettings,
  OverdriveSettings,
  FlangerSettings,
  ReverbSettings,
  ResonatorSettings,
  TremoloSettings,
  Waveform,
} from './services/synthEngine'

export type InstrumentCategory = 'Bass' | 'Lead' | 'Pad' | 'Keys' | 'Pluck' | 'Organ' | 'Percussion' | 'Effects' | 'Arpeggio' | 'Strings' | 'Brass' | 'Mallets' | 'Rhythm'

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

const defaultEffectOrder: EffectGroup[] = ['filters', 'overdrives', 'choruses', 'flangers', 'tremolos', 'delays', 'reverbs', 'eqs', 'dynamics']

function oscillator(waveform: Waveform, level: number, changes: Partial<OscillatorSettings> = {}): OscillatorSettings {
  return {
    bypassed: false,
    detune: 0,
    glide: 0,
    level,
    waveform,
    unisonDetune: 0,
    stereoSpread: 0,
    fmAmount: 0,
    fmSource: 'sine',
    ...changes,
  }
}

function filter(cutoff: number, changes: Partial<FilterSettings> = {}): FilterSettings {
  return { bypassed: false, type: 'lowpass', cutoff, resonance: 0, gain: 0, ...changes }
}

function amplitudeEnvelope(changes: Partial<EnvelopeSettings> = {}): EnvelopeSettings & { bypassed: boolean } {
  return {
    attack: 8,
    decay: 20,
    hold: 0,
    release: 110,
    velocity: 0.7,
    attackCurve: 'linear',
    releaseCurve: 'linear',
    destination: 'oscillatorLevel',
    bypassed: false,
    ...changes,
  }
}

function delay(mix: number, changes: Partial<DelaySettings> = {}): DelaySettings {
  return { bypassed: false, time: 0.375, noteTime: 8, mix, ...changes, repetitions: changes.repetitions ?? 4 }
}

function reverb(mix: number, changes: Partial<ReverbSettings> = {}): ReverbSettings {
  return { bypassed: false, hallType: 'concert-hall', decay: 3.5, preDelay: 0.025, damping: 0.6, width: 0.9, mix, ...changes }
}

function chorus(changes: Partial<ChorusSettings> = {}): ChorusSettings {
  return { bypassed: false, waveform: 'sine', rate: 0.8, depth: 0.5, delay: 0.018, mix: 0.45, ...changes }
}

function flanger(changes: Partial<FlangerSettings> = {}): FlangerSettings {
  return { bypassed: false, waveform: 'sine', rate: 0.35, depth: 0.5, delay: 0.003, feedback: 0.35, mix: 0.5, ...changes }
}

function tremolo(changes: Partial<TremoloSettings> = {}): TremoloSettings {
  return { bypassed: false, waveform: 'sine', rate: 4, depth: 0.5, mix: 1, ...changes }
}

function compressor(changes: Partial<CompressorSettings> = {}): CompressorSettings {
  return { type: 'compressor', bypassed: false, threshold: -24, knee: 24, ratio: 5, attack: 0.008, release: 0.18, makeupGain: 0, ...changes }
}

function equalizer(...bands: EqSettings['bands']): EqSettings {
  return { kind: bands.length > 1 ? 'multiband' : 'single', bypassed: false, bands, envelopes: [], lfos: [] }
}

function gate(threshold: number): DynamicsSettings {
  return { type: 'gate', bypassed: false, threshold, attack: 0.008, hold: 0.04, release: 0.12 }
}

function limiter(ceiling = -1): DynamicsSettings {
  return { type: 'limiter', bypassed: false, ceiling, release: 0.08, makeupGain: 0 }
}

function createBassPreset(definition: PresetDefinition, variation: number): InstrumentPreset {
  const waveforms: OscillatorType[] = ['sawtooth', 'square', 'triangle', 'sawtooth', 'square', 'triangle', 'sawtooth']
  const cutoff = 550 + variation * 230
  return {
    id: definition.id,
    name: definition.name,
    category: 'Bass',
    oscillators: [
      oscillator(waveforms[variation % waveforms.length], 0.76, { unisonDetune: variation % 2 ? 8 : 0 }),
      oscillator('sine', 0.34, { detune: -12, stereoSpread: 0.05 }),
    ],
    output: { volume: 0.8, pan: 0 },
    noise: variation === 5 ? { bypassed: false, color: 'brown', level: 0.08, stereoSpread: 0 } : null,
    filters: [filter(cutoff, { resonance: 0.35 + variation * 0.05 })],
    delays: variation === 6 ? [delay(0.16, { noteTime: 16 })] : [],
    overdrives: variation === 1 || variation === 4 ? [{ bypassed: false, drive: 0.24 + variation * 0.04, tone: 0.4, feedback: 0, mix: 0.55 }] : [],
    choruses: [],
    flangers: [],
    tremolos: [],
    eqs: [],
    bpm: 120,
    reverbs: [],
    amplitudeModulation: null,
    envelopes: [
      amplitudeEnvelope({ attack: 3 + variation * 2, decay: 55, release: 60 + variation * 12 }),
      amplitudeEnvelope({ destination: 'filterCutoff', attack: 2, decay: 70, release: 80, velocity: 0.55 }),
    ],
    lfos: variation === 3 ? [{ waveform: 'triangle', rate: 4, depth: 0.1, target: 'filter:0:cutoff', bypassed: false }] : [],
    dynamics: [compressor({ ratio: 7, threshold: -28 })],
    effectOrder: defaultEffectOrder,
    isAmplitudeModulationBypassed: false,
  }
}

function createLeadPreset(definition: PresetDefinition, variation: number): InstrumentPreset {
  const waveforms: OscillatorType[] = ['sawtooth', 'square', 'triangle', 'sawtooth', 'square', 'triangle', 'sawtooth']
  return {
    id: definition.id,
    name: definition.name,
    category: 'Lead',
    oscillators: [
      oscillator(waveforms[variation % waveforms.length], 0.65, { glide: 45 + variation * 20, unisonDetune: 10 + variation * 4, stereoSpread: 0.3 }),
      oscillator('sawtooth', 0.32, { detune: variation % 2 ? 7 : -7, stereoSpread: 0.45 }),
    ],
    output: { volume: 0.72, pan: 0 },
    noise: null,
    filters: [filter(2800 + variation * 650, { resonance: 0.25 })],
    delays: [delay(0.18 + variation * 0.015, { noteTime: variation % 2 ? 8 : 16 })],
    overdrives: variation === 2 || variation === 5 ? [{ bypassed: false, drive: 0.22, tone: 0.65, feedback: 0, mix: 0.35 }] : [],
    choruses: [],
    flangers: [],
    tremolos: [],
    eqs: [],
    bpm: 124,
    reverbs: [reverb(0.12 + variation * 0.015, { decay: 2.1 + variation * 0.2, hallType: 'small-hall' })],
    amplitudeModulation: null,
    envelopes: [amplitudeEnvelope({ attack: 4 + variation, decay: 35, release: 140 + variation * 25 })],
    lfos: variation % 3 === 0 ? [{ waveform: 'sine', rate: 5 + variation, depth: 0.08, target: 'oscillator:0:detune', bypassed: false }] : [],
    dynamics: [compressor({ ratio: 4, threshold: -22 })],
    effectOrder: defaultEffectOrder,
    isAmplitudeModulationBypassed: false,
  }
}

function createPadPreset(definition: PresetDefinition, variation: number): InstrumentPreset {
  return {
    id: definition.id,
    name: definition.name,
    category: 'Pad',
    oscillators: [
      oscillator(variation % 2 ? 'sawtooth' : 'triangle', 0.52, { unisonDetune: 28 + variation * 3, stereoSpread: 0.82 }),
      oscillator('sine', 0.28, { detune: variation % 2 ? 12 : -12, stereoSpread: 0.55 }),
    ],
    output: { volume: 0.68, pan: 0 },
    noise: variation === 5 ? { bypassed: false, color: 'pink', level: 0.06, stereoSpread: 0.7 } : null,
    filters: [filter(1800 + variation * 320, { resonance: 0.12 })],
    delays: [delay(0.16, { noteTime: 4 })],
    overdrives: [],
    choruses: variation >= 3 ? [chorus({ rate: 0.3, depth: 0.4, mix: 0.4 })] : [],
    flangers: [],
    tremolos: [],
    eqs: [],
    bpm: 110,
    reverbs: [reverb(0.3 + variation * 0.025, { decay: 4.5 + variation * 0.45, hallType: variation % 2 ? 'cathedral' : 'concert-hall' })],
    amplitudeModulation: variation === 4 ? { waveform: 'sine', rate: 2, depth: 0.18 } : null,
    envelopes: [amplitudeEnvelope({ attack: 180 + variation * 35, decay: 120, release: 320 + variation * 45 })],
    lfos: [{ waveform: variation % 2 ? 'triangle' : 'sine', rate: 0.15 + variation * 0.08, depth: 0.2, target: 'filter:0:cutoff', bypassed: false }],
    dynamics: [compressor({ ratio: 2.5, threshold: -25 })],
    effectOrder: defaultEffectOrder,
    isAmplitudeModulationBypassed: false,
  }
}

function createKeysPreset(definition: PresetDefinition, variation: number): InstrumentPreset {
  return {
    id: definition.id,
    name: definition.name,
    category: 'Keys',
    oscillators: [
      oscillator(variation % 3 === 0 ? 'sine' : variation % 3 === 1 ? 'triangle' : 'square', 0.74, { fmAmount: variation % 3 === 2 ? 0.18 : 0, fmSource: 'sine' }),
      oscillator('sine', 0.24, { detune: 12, stereoSpread: 0.2 }),
    ],
    output: { volume: 0.76, pan: 0 },
    noise: variation === 4 ? { bypassed: false, color: 'white', level: 0.06, stereoSpread: 0.4 } : null,
    filters: [filter(2400 + variation * 620, { resonance: 0.1 })],
    delays: variation % 2 ? [delay(0.12, { noteTime: 16 })] : [],
    overdrives: variation === 5 ? [{ bypassed: false, drive: 0.18, tone: 0.6, feedback: 0, mix: 0.22 }] : [],
    choruses: [],
    flangers: [],
    tremolos: [],
    eqs: [],
    bpm: 118,
    reverbs: [reverb(0.16 + variation * 0.02, { decay: 1.8 + variation * 0.25, hallType: 'wooden-hall' })],
    amplitudeModulation: null,
    envelopes: [amplitudeEnvelope({ attack: 3 + variation * 2, decay: 70 + variation * 15, release: 130 + variation * 18 })],
    lfos: [],
    dynamics: [compressor({ ratio: 3.5, threshold: -23 })],
    effectOrder: defaultEffectOrder,
    isAmplitudeModulationBypassed: false,
  }
}

function createPluckPreset(definition: PresetDefinition, variation: number): InstrumentPreset {
  return {
    id: definition.id,
    name: definition.name,
    category: 'Pluck',
    oscillators: [
      oscillator(variation % 2 ? 'square' : 'sawtooth', 0.7, { unisonDetune: variation * 3, stereoSpread: 0.26 }),
      oscillator('triangle', 0.24, { detune: 12 }),
    ],
    output: { volume: 0.73, pan: 0 },
    noise: variation === 3 ? { bypassed: false, color: 'white', level: 0.1, stereoSpread: 0.2 } : null,
    filters: [filter(1500 + variation * 460, { resonance: 0.4 })],
    delays: [delay(0.19 + variation * 0.02, { noteTime: variation % 2 ? 8 : 16 })],
    overdrives: [],
    choruses: [],
    flangers: [],
    tremolos: [],
    eqs: [],
    bpm: 128,
    reverbs: [reverb(0.14 + variation * 0.02, { decay: 1.4 + variation * 0.2, hallType: 'small-hall' })],
    amplitudeModulation: null,
    envelopes: [
      amplitudeEnvelope({ attack: 1, decay: 45 + variation * 8, release: 55 + variation * 10 }),
      amplitudeEnvelope({ destination: 'filterCutoff', attack: 1, decay: 55, release: 40, velocity: 0.8 }),
    ],
    lfos: [],
    dynamics: [compressor({ ratio: 4, threshold: -24 })],
    effectOrder: defaultEffectOrder,
    isAmplitudeModulationBypassed: false,
  }
}

function createOrganPreset(definition: PresetDefinition, variation: number): InstrumentPreset {
  return {
    id: definition.id,
    name: definition.name,
    category: 'Organ',
    oscillators: [
      oscillator('sine', 0.48, { detune: -12, stereoSpread: 0.32 }),
      oscillator('sine', 0.42, { detune: 0, stereoSpread: 0.15 }),
      oscillator('sine', 0.32, { detune: 12, stereoSpread: 0.32 }),
    ],
    output: { volume: 0.72, pan: 0 },
    noise: variation === 4 ? { bypassed: false, color: 'brown', level: 0.04, stereoSpread: 0.1 } : null,
    filters: [filter(4200 + variation * 400)],
    delays: variation === 2 ? [delay(0.13)] : [],
    overdrives: variation === 3 ? [{ bypassed: false, drive: 0.12, tone: 0.45, feedback: 0, mix: 0.2 }] : [],
    choruses: [chorus({ rate: 4.5 + variation * 0.5, depth: 0.6, delay: 0.012, mix: 0.55 })],
    flangers: [],
    tremolos: [],
    eqs: [],
    bpm: 116,
    reverbs: [reverb(0.16 + variation * 0.02, { decay: 2.1, hallType: 'wooden-hall' })],
    amplitudeModulation: { waveform: 'sine', rate: 4.5 + variation * 0.5, depth: 0.12 + variation * 0.015 },
    envelopes: [amplitudeEnvelope({ attack: 8, decay: 0, release: 90 + variation * 15 })],
    lfos: [],
    dynamics: [compressor({ ratio: 3, threshold: -22 })],
    effectOrder: defaultEffectOrder,
    isAmplitudeModulationBypassed: false,
  }
}

function createPercussionPreset(definition: PresetDefinition, variation: number): InstrumentPreset {
  return {
    id: definition.id,
    name: definition.name,
    category: 'Percussion',
    oscillators: [oscillator(variation % 2 ? 'sine' : 'triangle', 0.76, { fmAmount: variation % 3 === 0 ? 0.38 : 0, fmSource: 'sine' })],
    output: { volume: 0.77, pan: 0 },
    noise: { bypassed: false, color: variation % 2 ? 'white' : 'pink', level: 0.1 + variation * 0.025, stereoSpread: 0.18 },
    filters: [filter(900 + variation * 550, { resonance: 0.45 })],
    delays: variation === 4 ? [delay(0.12)] : [],
    overdrives: variation === 2 ? [{ bypassed: false, drive: 0.32, tone: 0.45, feedback: 0, mix: 0.38 }] : [],
    choruses: [],
    flangers: [],
    tremolos: [],
    eqs: [],
    bpm: 126,
    reverbs: variation === 5 ? [reverb(0.22, { decay: 3.5, hallType: 'arena' })] : [],
    amplitudeModulation: null,
    envelopes: [
      amplitudeEnvelope({ attack: 1, decay: 18 + variation * 9, release: 24 + variation * 12 }),
      amplitudeEnvelope({ destination: 'filterCutoff', attack: 1, decay: 24, release: 20, velocity: 0.7 }),
    ],
    lfos: [],
    dynamics: [compressor({ ratio: 6, threshold: -27 })],
    effectOrder: defaultEffectOrder,
    isAmplitudeModulationBypassed: false,
  }
}

function createEffectsPreset(definition: PresetDefinition, variation: number): InstrumentPreset {
  return {
    id: definition.id,
    name: definition.name,
    category: 'Effects',
    oscillators: [
      oscillator(variation % 2 ? 'random' : 'sawtooth', 0.48, { unisonDetune: 35, stereoSpread: 0.9, fmAmount: variation % 3 === 0 ? 0.28 : 0, fmSource: 'triangle' }),
      oscillator('sine', 0.25, { detune: variation % 2 ? -24 : 24, stereoSpread: 0.85 }),
    ],
    output: { volume: 0.62, pan: 0 },
    noise: { bypassed: false, color: variation % 2 ? 'pink' : 'brown', level: 0.08 + variation * 0.015, stereoSpread: 0.9 },
    filters: [filter(1000 + variation * 700, { resonance: 0.65 })],
    delays: [delay(0.3, { noteTime: variation % 2 ? 4 : 8 })],
    overdrives: variation === 1 || variation === 4 ? [{ bypassed: false, drive: 0.3, tone: 0.55, feedback: 0.12, mix: 0.45 }] : [],
    choruses: variation % 2 === 0 ? [chorus({ rate: 0.2 + variation * 0.1, depth: 0.65, mix: 0.45 })] : [],
    flangers: variation === 1 || variation === 4 ? [flanger({ rate: 0.35 + variation * 0.2, feedback: 0.5 })] : [],
    tremolos: variation === 2 || variation === 5 ? [tremolo({ rate: 1.5 + variation, depth: 0.55 })] : [],
    eqs: [],
    bpm: 100,
    reverbs: [reverb(0.36, { decay: 5 + variation, hallType: variation % 2 ? 'cathedral' : 'arena' })],
    amplitudeModulation: { waveform: variation % 2 ? 'random' : 'triangle', rate: 1.5 + variation, depth: 0.2 + variation * 0.04 },
    envelopes: [amplitudeEnvelope({ attack: 40 + variation * 28, decay: 100, release: 280 + variation * 60 })],
    lfos: [
      { waveform: 'random', rate: 0.35 + variation * 0.18, depth: 0.3, target: 'filter:0:cutoff', bypassed: false },
      { waveform: 'sine', rate: 0.15 + variation * 0.05, depth: 0.2, target: 'output:0:pan', bypassed: false },
    ],
    dynamics: [compressor({ ratio: 3, threshold: -26 })],
    effectOrder: defaultEffectOrder,
    isAmplitudeModulationBypassed: false,
  }
}

function createArpeggioPreset(definition: PresetDefinition, variation: number): InstrumentPreset {
  return {
    id: definition.id,
    name: definition.name,
    category: 'Arpeggio',
    oscillators: [
      oscillator(variation % 3 === 0 ? 'square' : 'sawtooth', 0.62, { unisonDetune: 6 + variation * 2, stereoSpread: 0.42 }),
      oscillator('triangle', 0.25, { detune: 12, stereoSpread: 0.28 }),
    ],
    output: { volume: 0.7, pan: 0 },
    noise: variation === 4 ? { bypassed: false, color: 'white', level: 0.04, stereoSpread: 0.4 } : null,
    filters: [filter(2200 + variation * 420, { resonance: 0.28 })],
    delays: [delay(0.2, { noteTime: variation % 2 ? 16 : 8 })],
    overdrives: variation === 7 ? [{ bypassed: false, drive: 0.2, tone: 0.62, feedback: 0, mix: 0.26 }] : [],
    choruses: variation % 3 === 0 ? [chorus({ rate: 0.55, depth: 0.32, mix: 0.25 })] : [],
    flangers: variation === 5 ? [flanger({ rate: 0.65, depth: 0.3, feedback: 0.28, mix: 0.22 })] : [],
    tremolos: variation === 2 || variation === 8 ? [tremolo({ rate: 8, depth: 0.38, mix: 0.6 })] : [],
    eqs: [equalizer({ bypassed: false, type: 'highpass', frequency: 120, gain: 0, q: 0.7 })],
    bpm: 128,
    reverbs: [reverb(0.16, { decay: 2 + variation * 0.12, hallType: 'small-hall' })],
    amplitudeModulation: null,
    envelopes: [amplitudeEnvelope({ attack: 2, decay: 58 + variation * 5, release: 70 + variation * 9 })],
    lfos: variation % 2 ? [{ waveform: 'triangle', rate: 0.35 + variation * 0.06, depth: 0.12, target: 'filter:0:cutoff', bypassed: false }] : [],
    dynamics: [compressor({ ratio: 4, threshold: -23 }), limiter()],
    effectOrder: defaultEffectOrder,
    isAmplitudeModulationBypassed: false,
  }
}

function createStringsPreset(definition: PresetDefinition, variation: number): InstrumentPreset {
  return {
    id: definition.id,
    name: definition.name,
    category: 'Strings',
    oscillators: [
      oscillator('sawtooth', 0.48, { unisonDetune: 18 + variation * 2, stereoSpread: 0.78 }),
      oscillator(variation % 2 ? 'triangle' : 'sawtooth', 0.32, { detune: variation % 2 ? -7 : 7, stereoSpread: 0.65 }),
    ],
    output: { volume: 0.66, pan: 0 },
    noise: variation === 6 ? { bypassed: false, color: 'pink', level: 0.035, stereoSpread: 0.7 } : null,
    filters: [filter(2100 + variation * 280, { resonance: 0.16 })],
    delays: variation % 3 === 0 ? [delay(0.12, { noteTime: 8 })] : [],
    overdrives: [],
    choruses: [chorus({ rate: 0.2 + variation * 0.03, depth: 0.36, delay: 0.016, mix: 0.32 })],
    flangers: variation === 8 ? [flanger({ rate: 0.18, depth: 0.22, feedback: 0.18, mix: 0.18 })] : [],
    tremolos: variation === 3 ? [tremolo({ rate: 5.5, depth: 0.16, mix: 0.45 })] : [],
    eqs: [equalizer(
      { bypassed: false, type: 'lowshelf', frequency: 180, gain: -2, q: 0.7 },
      { bypassed: false, type: 'highshelf', frequency: 5200, gain: variation % 2 ? 2 : -1, q: 0.7 },
    )],
    bpm: 112,
    reverbs: [reverb(0.28 + variation * 0.01, { decay: 3.8 + variation * 0.25, hallType: variation % 2 ? 'concert-hall' : 'opera-house' })],
    amplitudeModulation: null,
    envelopes: [amplitudeEnvelope({ attack: 70 + variation * 18, decay: 100, release: 260 + variation * 35 })],
    lfos: [{ waveform: 'sine', rate: 0.16 + variation * 0.02, depth: 0.1, target: 'oscillator:0:detune', bypassed: false }],
    dynamics: [compressor({ ratio: 2.5, threshold: -25 })],
    effectOrder: defaultEffectOrder,
    isAmplitudeModulationBypassed: false,
  }
}

function createBrassPreset(definition: PresetDefinition, variation: number): InstrumentPreset {
  return {
    id: definition.id,
    name: definition.name,
    category: 'Brass',
    oscillators: [
      oscillator('sawtooth', 0.66, { unisonDetune: 5 + variation, stereoSpread: 0.22 }),
      oscillator('square', 0.2, { detune: 7, stereoSpread: 0.16 }),
    ],
    output: { volume: 0.71, pan: 0 },
    noise: { bypassed: false, color: 'pink', level: 0.02 + variation * 0.004, stereoSpread: 0.1 },
    filters: [filter(1700 + variation * 370, { resonance: 0.32 })],
    delays: variation === 9 ? [delay(0.14, { noteTime: 8 })] : [],
    overdrives: variation === 4 || variation === 7 ? [{ bypassed: false, drive: 0.14, tone: 0.58, feedback: 0, mix: 0.22 }] : [],
    choruses: variation === 6 ? [chorus({ rate: 0.42, depth: 0.28, mix: 0.2 })] : [],
    flangers: [],
    tremolos: variation === 2 ? [tremolo({ rate: 4.8, depth: 0.14, mix: 0.35 })] : [],
    eqs: [equalizer({ bypassed: false, type: 'peaking', frequency: 1300, gain: 2, q: 1.1 })],
    bpm: 116,
    reverbs: [reverb(0.13 + variation * 0.01, { decay: 1.7 + variation * 0.12, hallType: 'wooden-hall' })],
    amplitudeModulation: null,
    envelopes: [amplitudeEnvelope({ attack: 18 + variation * 5, decay: 65, release: 110 + variation * 12 })],
    lfos: variation % 3 === 0 ? [{ waveform: 'sine', rate: 5.2, depth: 0.06, target: 'oscillator:0:detune', bypassed: false }] : [],
    dynamics: [compressor({ ratio: 4.5, threshold: -22 }), limiter(-1.5)],
    effectOrder: defaultEffectOrder,
    isAmplitudeModulationBypassed: false,
  }
}

function createMalletsPreset(definition: PresetDefinition, variation: number): InstrumentPreset {
  return {
    id: definition.id,
    name: definition.name,
    category: 'Mallets',
    oscillators: [
      oscillator('sine', 0.68, { fmAmount: 0.18 + variation * 0.025, fmSource: variation % 2 ? 'square' : 'sine' }),
      oscillator('triangle', 0.2, { detune: 12, stereoSpread: 0.3 }),
    ],
    output: { volume: 0.7, pan: 0 },
    noise: variation === 5 ? { bypassed: false, color: 'white', level: 0.045, stereoSpread: 0.25 } : null,
    filters: [filter(3000 + variation * 500, { resonance: 0.18 })],
    delays: [delay(0.17 + variation * 0.01, { noteTime: variation % 2 ? 8 : 16 })],
    overdrives: [],
    choruses: variation === 7 ? [chorus({ rate: 0.6, depth: 0.25, mix: 0.22 })] : [],
    flangers: variation === 3 ? [flanger({ rate: 0.42, depth: 0.25, feedback: 0.2, mix: 0.2 })] : [],
    tremolos: variation === 8 ? [tremolo({ rate: 6, depth: 0.28, mix: 0.45 })] : [],
    eqs: [equalizer({ bypassed: false, type: 'highshelf', frequency: 4200, gain: 2 + variation * 0.2, q: 0.7 })],
    bpm: 122,
    reverbs: [reverb(0.2 + variation * 0.01, { decay: 2.4 + variation * 0.16, hallType: 'small-hall' })],
    amplitudeModulation: null,
    envelopes: [amplitudeEnvelope({ attack: 1, decay: 85 + variation * 11, release: 120 + variation * 16 })],
    lfos: [],
    dynamics: [compressor({ ratio: 3, threshold: -24 })],
    effectOrder: defaultEffectOrder,
    isAmplitudeModulationBypassed: false,
  }
}

function createRhythmPreset(definition: PresetDefinition, variation: number): InstrumentPreset {
  return {
    id: definition.id,
    name: definition.name,
    category: 'Rhythm',
    oscillators: [
      oscillator(variation % 2 ? 'square' : 'sawtooth', 0.65, { fmAmount: variation % 3 === 0 ? 0.2 : 0, fmSource: 'sine' }),
      oscillator('sine', 0.2, { detune: -12 }),
    ],
    output: { volume: 0.74, pan: 0 },
    noise: { bypassed: false, color: variation % 2 ? 'white' : 'pink', level: 0.045 + variation * 0.008, stereoSpread: 0.35 },
    filters: [filter(1000 + variation * 390, { resonance: 0.42 })],
    delays: variation % 2 ? [delay(0.14, { noteTime: 16 })] : [],
    overdrives: variation === 4 || variation === 9 ? [{ bypassed: false, drive: 0.28, tone: 0.45, feedback: 0.08, mix: 0.35 }] : [],
    choruses: variation === 6 ? [chorus({ rate: 1.2, depth: 0.34, mix: 0.3 })] : [],
    flangers: variation === 1 || variation === 7 ? [flanger({ rate: 0.7 + variation * 0.05, depth: 0.4, feedback: 0.38, mix: 0.3 })] : [],
    tremolos: [tremolo({ waveform: variation % 2 ? 'square' : 'triangle', rate: 6 + variation, depth: 0.26 + variation * 0.02, mix: 0.55 })],
    eqs: [equalizer({ bypassed: false, type: 'highpass', frequency: 75 + variation * 8, gain: 0, q: 0.7 })],
    bpm: 126,
    reverbs: variation === 8 ? [reverb(0.16, { decay: 2.8, hallType: 'arena' })] : [],
    amplitudeModulation: { waveform: variation % 2 ? 'square' : 'triangle', rate: 2 + variation * 0.5, depth: 0.1 + variation * 0.01 },
    envelopes: [amplitudeEnvelope({ attack: 1, decay: 42 + variation * 8, release: 48 + variation * 7 })],
    lfos: variation % 2 ? [{ waveform: 'triangle', rate: 0.7 + variation * 0.1, depth: 0.16, target: 'filter:0:cutoff', bypassed: false }] : [],
    dynamics: [gate(-44 + variation), compressor({ ratio: 5, threshold: -25 }), limiter()],
    effectOrder: defaultEffectOrder,
    isAmplitudeModulationBypassed: false,
  }
}

const presetDefinitions: Record<InstrumentCategory, PresetDefinition[]> = {
  Bass: [
    { id: 'sub-foundation', name: 'Sub Foundation' }, { id: 'acid-rush', name: 'Acid Rush' }, { id: 'rubber-floor', name: 'Rubber Floor' },
    { id: 'pulse-driver', name: 'Pulse Driver' }, { id: 'grit-bass', name: 'Grit Bass' }, { id: 'deep-noise', name: 'Deep Noise' }, { id: 'dub-anchor', name: 'Dub Anchor' },
  ],
  Lead: [
    { id: 'solar-lead', name: 'Solar Lead' }, { id: 'neon-arrow', name: 'Neon Arrow' }, { id: 'laser-line', name: 'Laser Line' },
    { id: 'silk-glide', name: 'Silk Glide' }, { id: 'mono-hero', name: 'Mono Hero' }, { id: 'driven-signal', name: 'Driven Signal' }, { id: 'skyline', name: 'Skyline' },
  ],
  Pad: [
    { id: 'cloudbed', name: 'Cloudbed' }, { id: 'aurora', name: 'Aurora' }, { id: 'glass-horizon', name: 'Glass Horizon' },
    { id: 'warm-choir', name: 'Warm Choir' }, { id: 'slow-motion', name: 'Slow Motion' }, { id: 'dusty-air', name: 'Dusty Air' }, { id: 'wide-open', name: 'Wide Open' },
  ],
  Keys: [
    { id: 'velvet-keys', name: 'Velvet Keys' }, { id: 'fm-bell', name: 'FM Bell' }, { id: 'electric-tine', name: 'Electric Tine' },
    { id: 'soft-piano', name: 'Soft Piano' }, { id: 'noisy-keys', name: 'Noisy Keys' }, { id: 'warm-wurli', name: 'Warm Wurli' },
  ],
  Pluck: [
    { id: 'crystal-pluck', name: 'Crystal Pluck' }, { id: 'nylon-snap', name: 'Nylon Snap' }, { id: 'short-circuit', name: 'Short Circuit' },
    { id: 'muted-string', name: 'Muted String' }, { id: 'digital-harp', name: 'Digital Harp' }, { id: 'echo-pick', name: 'Echo Pick' },
  ],
  Organ: [
    { id: 'drawbar-classic', name: 'Drawbar Classic' }, { id: 'chapel-air', name: 'Chapel Air' }, { id: 'echo-organ', name: 'Echo Organ' },
    { id: 'grit-organ', name: 'Grit Organ' }, { id: 'reed-organ', name: 'Reed Organ' },
  ],
  Percussion: [
    { id: 'analog-kick', name: 'Analog Kick' }, { id: 'metal-tom', name: 'Metal Tom' }, { id: 'snare-dust', name: 'Snare Dust' },
    { id: 'wood-block', name: 'Wood Block' }, { id: 'echo-click', name: 'Echo Click' }, { id: 'arena-hit', name: 'Arena Hit' },
  ],
  Effects: [
    { id: 'space-drift', name: 'Space Drift' }, { id: 'radio-ghost', name: 'Radio Ghost' }, { id: 'frozen-signal', name: 'Frozen Signal' },
    { id: 'orbit-sweep', name: 'Orbit Sweep' }, { id: 'broken-mirror', name: 'Broken Mirror' }, { id: 'night-wind', name: 'Night Wind' },
  ],
  Arpeggio: [
    { id: 'clockwork', name: 'Clockwork' }, { id: 'neon-steps', name: 'Neon Steps' }, { id: 'cascade', name: 'Cascade' }, { id: 'pixel-run', name: 'Pixel Run' }, { id: 'silver-sequence', name: 'Silver Sequence' },
    { id: 'phase-ladder', name: 'Phase Ladder' }, { id: 'sunrise-pattern', name: 'Sunrise Pattern' }, { id: 'circuit-dance', name: 'Circuit Dance' }, { id: 'glass-pulse', name: 'Glass Pulse' }, { id: 'midnight-repeat', name: 'Midnight Repeat' },
  ],
  Strings: [
    { id: 'cinema-strings', name: 'Cinema Strings' }, { id: 'silken-ensemble', name: 'Silken Ensemble' }, { id: 'northern-bow', name: 'Northern Bow' }, { id: 'chamber-glow', name: 'Chamber Glow' }, { id: 'velvet-section', name: 'Velvet Section' },
    { id: 'frosted-strings', name: 'Frosted Strings' }, { id: 'amber-ensemble', name: 'Amber Ensemble' }, { id: 'wide-bow', name: 'Wide Bow' }, { id: 'celestial-strings', name: 'Celestial Strings' }, { id: 'finale-strings', name: 'Finale Strings' },
  ],
  Brass: [
    { id: 'golden-horn', name: 'Golden Horn' }, { id: 'city-brass', name: 'City Brass' }, { id: 'royal-section', name: 'Royal Section' }, { id: 'muted-trumpet', name: 'Muted Trumpet' }, { id: 'brass-drive', name: 'Brass Drive' },
    { id: 'soft-trombone', name: 'Soft Trombone' }, { id: 'disco-horns', name: 'Disco Horns' }, { id: 'stadium-brass', name: 'Stadium Brass' }, { id: 'night-brass', name: 'Night Brass' }, { id: 'victory-fanfare', name: 'Victory Fanfare' },
  ],
  Mallets: [
    { id: 'moon-vibes', name: 'Moon Vibes' }, { id: 'crystal-mallet', name: 'Crystal Mallet' }, { id: 'marimba-garden', name: 'Marimba Garden' }, { id: 'steel-sparks', name: 'Steel Sparks' }, { id: 'wooden-rain', name: 'Wooden Rain' },
    { id: 'soft-glocken', name: 'Soft Glocken' }, { id: 'amber-bars', name: 'Amber Bars' }, { id: 'chime-choir', name: 'Chime Choir' }, { id: 'tropic-bells', name: 'Tropic Bells' }, { id: 'starlight-keys', name: 'Starlight Keys' },
  ],
  Rhythm: [
    { id: 'pulse-grid', name: 'Pulse Grid' }, { id: 'sidechain-stab', name: 'Sidechain Stab' }, { id: 'metro-chop', name: 'Metro Chop' }, { id: 'wave-gate', name: 'Wave Gate' }, { id: 'driven-rhythm', name: 'Driven Rhythm' },
    { id: 'syncopated', name: 'Syncopated' }, { id: 'chorus-chop', name: 'Chorus Chop' }, { id: 'flange-groove', name: 'Flange Groove' }, { id: 'arena-stab', name: 'Arena Stab' }, { id: 'last-beat', name: 'Last Beat' },
  ],
}

export const instrumentPresets: InstrumentPreset[] = [
  ...presetDefinitions.Bass.map(createBassPreset),
  ...presetDefinitions.Lead.map(createLeadPreset),
  ...presetDefinitions.Pad.map(createPadPreset),
  ...presetDefinitions.Keys.map(createKeysPreset),
  ...presetDefinitions.Pluck.map(createPluckPreset),
  ...presetDefinitions.Organ.map(createOrganPreset),
  ...presetDefinitions.Percussion.map(createPercussionPreset),
  ...presetDefinitions.Effects.map(createEffectsPreset),
  ...presetDefinitions.Arpeggio.map(createArpeggioPreset),
  ...presetDefinitions.Strings.map(createStringsPreset),
  ...presetDefinitions.Brass.map(createBrassPreset),
  ...presetDefinitions.Mallets.map(createMalletsPreset),
  ...presetDefinitions.Rhythm.map(createRhythmPreset),
]

export const instrumentCategories = Object.keys(presetDefinitions) as InstrumentCategory[]
