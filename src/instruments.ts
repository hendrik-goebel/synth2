import instrumentConfigs from './instruments.json'
import type {
  AmplitudeModulationSettings,
  ChorusSettings,
  DelaySettings,
  DynamicsSettings,
  EffectGroup,
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

// Envelope times in instruments.json follow the engine's attack/decay/hold/release
// limits (300/150/150/450 ms). Oscillator-level decay delays the attack; keep it
// at zero for responsive patches. Shared effect envelopes restart for every note,
// so the defaults bypass them except for the intentional pluck cutoff transient.
export const instrumentPresets = instrumentConfigs as InstrumentPreset[]
export const instrumentCategories = [...new Set(instrumentPresets.map(({ category }) => category))]
