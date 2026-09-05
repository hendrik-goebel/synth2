export type Waveform = OscillatorType | 'random'
export type NoiseColor = 'white' | 'pink' | 'brown'

export type OscillatorSettings = {
  bypassed: boolean
  detune: number
  glide: number
  level: number
  waveform: Waveform
  unisonDetune: number
  stereoSpread: number
  fmAmount: number
  fmSource: Waveform
}

export type NoiseSettings = {
  bypassed: boolean
  color: NoiseColor
  level: number
  stereoSpread: number
}

export type OutputSettings = { volume: number; pan: number }
export type FilterType = 'lowpass' | 'highpass' | 'bandpass'
export type FilterSettings = { bypassed: boolean; type: FilterType; cutoff: number; resonance: number; gain: number }
export type DelayOverdriveSettings = { bypassed: boolean; gain: number; feedback: number }
export type DelaySettings = { bypassed: boolean; time: number; noteTime: number; repetitions: number; mix: number; overdrive?: DelayOverdriveSettings }
export type OverdriveSettings = { bypassed: boolean; drive: number; tone: number; feedback: number; mix: number }
export type ChorusSettings = { bypassed: boolean; waveform: Waveform; rate: number; depth: number; delay: number; mix: number }
export type FlangerSettings = { bypassed: boolean; waveform: Waveform; rate: number; depth: number; delay: number; feedback: number; mix: number }
export type TremoloSettings = { bypassed: boolean; waveform: Waveform; rate: number; depth: number; mix: number }
export type HallType = 'small-hall' | 'wooden-hall' | 'concert-hall' | 'opera-house' | 'cathedral' | 'arena'
export type ReverbSettings = { bypassed: boolean; hallType: HallType; decay: number; preDelay: number; damping: number; width: number; mix: number }
export type ResonatorSettings = { bypassed: boolean; frequency: number; decay: number; feedback: number; damping: number; drive: number; mix: number }

export type CompressorSettings = {
  type: 'compressor'
  bypassed: boolean
  threshold: number
  knee: number
  ratio: number
  attack: number
  release: number
  makeupGain: number
}
export type GateSettings = { type: 'gate'; bypassed: boolean; threshold: number; attack: number; hold: number; release: number }
export type LimiterSettings = { type: 'limiter'; bypassed: boolean; ceiling: number; release: number; makeupGain: number }
export type DynamicsSettings = CompressorSettings | GateSettings | LimiterSettings
export type DynamicsSettingsChanges = Partial<{
  threshold: number
  knee: number
  ratio: number
  attack: number
  hold: number
  release: number
  makeupGain: number
  ceiling: number
  bypassed: boolean
}>

export type EqBandType = 'peaking' | 'lowshelf' | 'highshelf' | 'lowpass' | 'highpass' | 'notch'
export type EqBandSettings = { bypassed: boolean; type: EqBandType; frequency: number; gain: number; q: number }
export type EqParameter = 'frequency' | 'q' | 'gain'
export type EqModulationTarget = `eq:${number}:${number}:${EqParameter}`
export type EqSettings = { kind: 'single' | 'multiband'; bypassed: boolean; bands: EqBandSettings[]; envelopes: EqEnvelopeSettings[]; lfos: EqLfoSettings[] }

export type EffectGroup = 'filters' | 'overdrives' | 'choruses' | 'flangers' | 'tremolos' | 'dynamics' | 'delays' | 'resonators' | 'reverbs' | 'eqs'
export type FlatAudioModule = { type: EffectGroup; index: number }

export type AmplitudeModulationSettings = { rate: number; depth: number; waveform: Waveform }
export type LfoTarget =
  | `oscillator:${number}:detune` | `oscillator:${number}:level` | `oscillator:${number}:unisonDetune` | `oscillator:${number}:stereoSpread` | `oscillator:${number}:fmAmount`
  | `noise:${number}:level` | `noise:${number}:stereoSpread`
  | `filter:${number}:cutoff` | `filter:${number}:resonance` | `filter:${number}:gain`
  | `delay:${number}:time` | `delay:${number}:repetitions` | `delay:${number}:mix`
  | `overdrive:${number}:drive` | `overdrive:${number}:tone` | `overdrive:${number}:feedback` | `overdrive:${number}:mix`
  | `chorus:${number}:rate` | `chorus:${number}:depth` | `chorus:${number}:delay` | `chorus:${number}:mix`
  | `flanger:${number}:rate` | `flanger:${number}:depth` | `flanger:${number}:delay` | `flanger:${number}:feedback` | `flanger:${number}:mix`
  | `tremolo:${number}:rate` | `tremolo:${number}:depth` | `tremolo:${number}:mix`
  | `resonator:${number}:frequency` | `resonator:${number}:decay` | `resonator:${number}:feedback` | `resonator:${number}:damping` | `resonator:${number}:drive` | `resonator:${number}:mix`
  | `reverb:${number}:preDelay` | `reverb:${number}:damping` | `reverb:${number}:mix` | `reverb:${number}:width`
  | `output:0:volume` | `output:0:pan` | EqModulationTarget
export type LfoSettings = { waveform: Waveform; rate: number; depth: number; target: LfoTarget; bypassed?: boolean }

export type EnvelopeCurve = 'linear' | 'exponential'
export type EnvelopeDestination =
  | 'oscillatorLevel' | 'oscillatorPitch' | 'noiseLevel' | 'filterCutoff' | 'filterResonance'
  | 'delayTime' | 'delayRepetitions' | 'delayMix'
  | 'overdriveDrive' | 'overdriveTone' | 'overdriveFeedback' | 'overdriveMix'
  | 'chorusRate' | 'chorusDepth' | 'chorusDelay' | 'chorusMix'
  | 'flangerRate' | 'flangerDepth' | 'flangerDelay' | 'flangerFeedback' | 'flangerMix'
  | 'tremoloRate' | 'tremoloDepth' | 'tremoloMix'
  | 'resonatorFrequency' | 'resonatorDecay' | 'resonatorFeedback' | 'resonatorDamping' | 'resonatorDrive' | 'resonatorMix'
  | 'reverbDecay' | 'reverbMix' | 'reverbPreDelay' | 'reverbDamping' | 'reverbWidth'
  | EqModulationTarget
export type EnvelopeSourceType = 'oscillator' | 'noise' | 'filter' | 'delay' | 'overdrive' | 'chorus' | 'flanger' | 'tremolo' | 'resonator' | 'reverb'
export type EnvelopeSource = { type: EnvelopeSourceType; index: number }
export type EnvelopeSettings = {
  attack: number
  decay: number
  hold: number
  release: number
  velocity: number
  attackCurve: EnvelopeCurve
  releaseCurve: EnvelopeCurve
  destination: EnvelopeDestination
  source?: EnvelopeSource
}
export type EqEnvelopeSettings = EnvelopeSettings & { destination: EqModulationTarget; bypassed: boolean }
export type EqLfoSettings = LfoSettings & { target: EqModulationTarget; bypassed: boolean }
