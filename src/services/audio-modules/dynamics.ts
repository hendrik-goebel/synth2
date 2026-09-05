import type { CompressorSettings, DynamicsSettings, GateSettings, LimiterSettings } from './types'

const GATE_CLOSED_GAIN = 0.0001
const GATE_ANALYSIS_INTERVAL_MS = 20

export type DynamicsModule = {
  input: GainNode; output: GainNode; compressor?: DynamicsCompressorNode; makeupGain?: GainNode
  analyser?: AnalyserNode; gateGain?: GainNode; gateLevelData?: Float32Array<ArrayBuffer>
  gateTimer?: ReturnType<typeof setInterval>; gateLastAboveThresholdTime: number; gateOpen: boolean; settings: DynamicsSettings
}

export function createCompressorSettings(): CompressorSettings {
  return { type: 'compressor', bypassed: false, threshold: -24, knee: 30, ratio: 12, attack: 0.003, release: 0.25, makeupGain: 0 }
}
export function createGateSettings(): GateSettings {
  return { type: 'gate', bypassed: false, threshold: -60, attack: 0.005, hold: 0.075, release: 0.08 }
}
export function createLimiterSettings(): LimiterSettings {
  return { type: 'limiter', bypassed: false, ceiling: -1, release: 0.1, makeupGain: 0 }
}

export function createDynamicsModule(audioContext: AudioContext, settings: DynamicsSettings): DynamicsModule {
  const module: DynamicsModule = { input: audioContext.createGain(), output: audioContext.createGain(), gateLastAboveThresholdTime: audioContext.currentTime, gateOpen: false, settings: { ...settings } }
  if (settings.type === 'gate') {
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.7
    module.analyser = analyser; module.gateGain = audioContext.createGain(); module.gateLevelData = new Float32Array(analyser.fftSize)
    module.gateGain.gain.setValueAtTime(GATE_CLOSED_GAIN, audioContext.currentTime)
    module.gateTimer = setInterval(() => updateGate(audioContext, module), GATE_ANALYSIS_INTERVAL_MS)
  } else {
    module.compressor = audioContext.createDynamicsCompressor()
    module.makeupGain = audioContext.createGain()
  }
  return module
}

export function routeDynamicsModule(input: AudioNode, dynamics: DynamicsModule): AudioNode {
  connectDynamicsModule(dynamics)
  return dynamics.settings.bypassed ? input : (input.connect(dynamics.input), dynamics.output)
}

export function applyDynamicsSettings(audioContext: AudioContext, dynamics: DynamicsModule): void {
  const { settings } = dynamics
  if (settings.type === 'gate') {
    updateGate(audioContext, dynamics)
    return
  }
  const now = audioContext.currentTime
  const compressor = dynamics.compressor!
  const makeupGain = dynamics.makeupGain!
  if (settings.type === 'compressor') {
    compressor.threshold.setTargetAtTime(settings.threshold, now, 0.01); compressor.knee.setTargetAtTime(settings.knee, now, 0.01)
    compressor.ratio.setTargetAtTime(settings.ratio, now, 0.01); compressor.attack.setTargetAtTime(settings.attack, now, 0.01); compressor.release.setTargetAtTime(settings.release, now, 0.02)
  } else {
    compressor.threshold.setTargetAtTime(settings.ceiling, now, 0.01); compressor.knee.setTargetAtTime(0, now, 0.01)
    compressor.ratio.setTargetAtTime(20, now, 0.01); compressor.attack.setTargetAtTime(0.003, now, 0.01); compressor.release.setTargetAtTime(settings.release, now, 0.02)
  }
  makeupGain.gain.setTargetAtTime(10 ** (settings.makeupGain / 20), now, 0.01)
}

export function destroyDynamicsModule(module: DynamicsModule): void {
  if (module.gateTimer !== undefined) clearInterval(module.gateTimer)
  module.input.disconnect(); module.output.disconnect(); module.compressor?.disconnect(); module.makeupGain?.disconnect(); module.analyser?.disconnect(); module.gateGain?.disconnect()
}

function connectDynamicsModule(dynamics: DynamicsModule): void {
  dynamics.input.disconnect(); dynamics.output.disconnect()
  if (dynamics.settings.type === 'gate') {
    dynamics.analyser!.disconnect(); dynamics.gateGain!.disconnect()
    dynamics.input.connect(dynamics.analyser!).connect(dynamics.gateGain!).connect(dynamics.output)
  } else if (dynamics.settings.type === 'limiter') {
    dynamics.compressor!.disconnect(); dynamics.makeupGain!.disconnect()
    dynamics.input.connect(dynamics.makeupGain!).connect(dynamics.compressor!).connect(dynamics.output)
  } else {
    dynamics.compressor!.disconnect(); dynamics.makeupGain!.disconnect()
    dynamics.input.connect(dynamics.compressor!).connect(dynamics.makeupGain!).connect(dynamics.output)
  }
}

function updateGate(audioContext: AudioContext, dynamics: DynamicsModule): void {
  if (dynamics.settings.type !== 'gate' || !dynamics.analyser || !dynamics.gateGain || !dynamics.gateLevelData) return
  dynamics.analyser.getFloatTimeDomainData(dynamics.gateLevelData)
  let sum = 0
  for (const sample of dynamics.gateLevelData) sum += sample * sample
  const level = 20 * Math.log10(Math.max(Math.sqrt(sum / dynamics.gateLevelData.length), Number.EPSILON))
  const now = audioContext.currentTime
  if (level >= dynamics.settings.threshold) {
    dynamics.gateLastAboveThresholdTime = now
    setGateOpen(dynamics, true, now)
  } else if (now - dynamics.gateLastAboveThresholdTime >= dynamics.settings.hold) setGateOpen(dynamics, false, now)
}

function setGateOpen(dynamics: DynamicsModule, open: boolean, now: number): void {
  if (dynamics.settings.type !== 'gate' || !dynamics.gateGain || dynamics.gateOpen === open) return
  dynamics.gateOpen = open
  dynamics.gateGain.gain.setTargetAtTime(open ? 1 : GATE_CLOSED_GAIN, now, Math.max(0.001, open ? dynamics.settings.attack : dynamics.settings.release))
}
