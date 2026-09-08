import type { HallType, ReverbModuleKind, ReverbSettings } from './types'
import { createWarmOverdriveCurve } from './overdrive'
import { applyResonatorSettings, createResonatorModule, createResonatorSettings, destroyResonatorModule, routeResonatorModule, type ResonatorModule } from './resonator'

const impulseCache = new Map<string, AudioBuffer>()
const IMPULSE_UPDATE_DELAY_MS = 100

export type ReverbModule = {
  input: GainNode; preDelay: DelayNode; convolver: ConvolverNode; tone: BiquadFilterNode
  splitter: ChannelSplitterNode; left: GainNode; right: GainNode; leftCross: GainNode; rightCross: GainNode
  merger: ChannelMergerNode; filter: BiquadFilterNode; overdriveGain: GainNode; overdrive: WaveShaperNode
  overdriveFeedbackDelay: DelayNode; overdriveFeedback: GainNode; resonator: ResonatorModule; wet: GainNode; dry: GainNode; output: GainNode; settings: ReverbSettings
  impulseUpdateTimer?: ReturnType<typeof setTimeout>
}

export function createReverbSettings(): ReverbSettings {
  return { bypassed: false, hallType: 'concert-hall', decay: 3.5, preDelay: 0.025, damping: 0.6, width: 0.9, mix: 0.25 }
}

export function createReverbModule(audioContext: AudioContext, settings: ReverbSettings): ReverbModule {
  const module = {
    input: audioContext.createGain(), preDelay: audioContext.createDelay(0.25), convolver: audioContext.createConvolver(),
    tone: audioContext.createBiquadFilter(), splitter: audioContext.createChannelSplitter(2), left: audioContext.createGain(),
    right: audioContext.createGain(), leftCross: audioContext.createGain(), rightCross: audioContext.createGain(),
    merger: audioContext.createChannelMerger(2), filter: audioContext.createBiquadFilter(), overdriveGain: audioContext.createGain(),
    overdrive: audioContext.createWaveShaper(), overdriveFeedbackDelay: audioContext.createDelay(0.05), overdriveFeedback: audioContext.createGain(),
    resonator: createResonatorModule(audioContext, settings.resonator ?? { ...createResonatorSettings(), bypassed: true }),
    wet: audioContext.createGain(), dry: audioContext.createGain(),
    output: audioContext.createGain(), settings: { ...settings },
  }
  module.input.connect(module.preDelay).connect(module.convolver).connect(module.tone).connect(module.splitter)
  module.splitter.connect(module.left, 0).connect(module.merger, 0, 0)
  module.splitter.connect(module.right, 1).connect(module.merger, 0, 1)
  module.splitter.connect(module.leftCross, 0).connect(module.merger, 0, 1)
  module.splitter.connect(module.rightCross, 1).connect(module.merger, 0, 0)
  module.wet.connect(module.output)
  module.input.connect(module.dry).connect(module.output)
  return module
}

export function applyReverbSettings(audioContext: AudioContext, reverb: ReverbModule, replaceImpulse: boolean): void {
  const { preDelay, convolver, tone, left, right, leftCross, rightCross, filter, overdriveGain, overdrive, overdriveFeedbackDelay, overdriveFeedback, wet, dry, output, settings } = reverb
  const now = audioContext.currentTime
  preDelay.delayTime.setTargetAtTime(settings.preDelay, now, 0.02)
  tone.type = 'lowpass'
  tone.frequency.setTargetAtTime(13000 - settings.damping * 9500, now, 0.04)
  tone.Q.setTargetAtTime(0.35 + settings.damping * 0.5, now, 0.04)
  const directGain = (1 + settings.width) / 2
  const crossGain = (1 - settings.width) / 2
  left.gain.setTargetAtTime(directGain, now, 0.02); right.gain.setTargetAtTime(directGain, now, 0.02)
  leftCross.gain.setTargetAtTime(crossGain, now, 0.02); rightCross.gain.setTargetAtTime(crossGain, now, 0.02)
  const filterSettings = settings.filter
  filter.type = filterSettings?.type ?? 'lowpass'
  filter.frequency.setTargetAtTime(filterSettings?.cutoff ?? 20000, now, 0.02)
  filter.Q.setTargetAtTime(filterSettings?.resonance ?? 0, now, 0.02)
  filter.gain.setTargetAtTime(filterSettings?.gain ?? 0, now, 0.02)
  const overdriveSettings = settings.overdrive
  overdriveGain.gain.setTargetAtTime(1 + (overdriveSettings?.gain ?? 0) * 18, now, 0.02)
  overdrive.oversample = '4x'
  overdrive.curve = overdriveSettings && overdriveSettings.gain > 0 ? createWarmOverdriveCurve(overdriveSettings.gain) : null
  overdriveFeedbackDelay.delayTime.setTargetAtTime(0.012, now, 0.02)
  overdriveFeedback.gain.setTargetAtTime(Math.min(0.6, overdriveSettings?.feedback ?? 0), now, 0.03)
  reverb.resonator.settings = { ...(settings.resonator ?? reverb.resonator.settings), bypassed: settings.resonator?.bypassed ?? true }
  applyResonatorSettings(audioContext, reverb.resonator)
  wet.gain.setTargetAtTime(settings.mix, now, 0.02)
  dry.gain.setTargetAtTime(1 - settings.mix, now, 0.02)
  output.gain.setTargetAtTime(1 / Math.max(1, (1 - settings.mix) + settings.mix * 1.4), now, 0.02)
  if (replaceImpulse) convolver.buffer = createHallImpulse(audioContext, settings)
}

export function scheduleReverbImpulse(audioContext: AudioContext, reverb: ReverbModule, settings: ReverbSettings = reverb.settings): void {
  if (reverb.impulseUpdateTimer !== undefined) clearTimeout(reverb.impulseUpdateTimer)
  reverb.impulseUpdateTimer = setTimeout(() => {
    reverb.convolver.buffer = createHallImpulse(audioContext, settings)
    reverb.impulseUpdateTimer = undefined
  }, IMPULSE_UPDATE_DELAY_MS)
}

export function routeReverbModule(input: AudioNode, reverb: ReverbModule): AudioNode {
  reverb.output.disconnect()
  reverb.merger.disconnect()
  reverb.filter.disconnect()
  reverb.overdriveGain.disconnect()
  reverb.overdrive.disconnect()
  reverb.overdriveFeedbackDelay.disconnect()
  reverb.overdriveFeedback.disconnect()
  reverb.resonator.output.disconnect()
  if (reverb.settings.bypassed) return input
  input.connect(reverb.input)
  const available = new Set<ReverbModuleKind>()
  if (reverb.settings.filter) available.add('filter')
  if (reverb.settings.overdrive) available.add('overdrive')
  if (reverb.settings.resonator) available.add('resonator')
  const configuredOrder = reverb.settings.moduleOrder?.filter((module, index, modules) => available.has(module) && modules.indexOf(module) === index) ?? []
  const order = [...configuredOrder, ...(['filter', 'overdrive', 'resonator'] as ReverbModuleKind[]).filter((module) => available.has(module) && !configuredOrder.includes(module))]
  let wetInput: AudioNode = reverb.merger
  for (const module of order) {
    if (module === 'filter') {
      if (reverb.settings.filter && !reverb.settings.filter.bypassed) wetInput = wetInput.connect(reverb.filter)
    } else if (module === 'overdrive') {
      const overdrive = reverb.settings.overdrive
      if (overdrive && !overdrive.bypassed && (overdrive.gain > 0 || overdrive.feedback > 0)) {
        wetInput = wetInput.connect(reverb.overdriveGain).connect(reverb.overdrive)
        reverb.overdrive.connect(reverb.overdriveFeedbackDelay).connect(reverb.overdriveFeedback).connect(reverb.overdriveGain)
      }
    } else if (reverb.settings.resonator && !reverb.settings.resonator.bypassed) {
      wetInput = routeResonatorModule(wetInput, reverb.resonator)
    }
  }
  wetInput.connect(reverb.wet)
  return reverb.output
}

export function destroyReverbModule(module: ReverbModule): void {
  if (module.impulseUpdateTimer !== undefined) clearTimeout(module.impulseUpdateTimer)
  module.input.disconnect(); module.preDelay.disconnect(); module.convolver.disconnect(); module.tone.disconnect(); module.splitter.disconnect()
  module.left.disconnect(); module.right.disconnect(); module.leftCross.disconnect(); module.rightCross.disconnect(); module.merger.disconnect()
  module.filter.disconnect(); module.overdriveGain.disconnect(); module.overdrive.disconnect(); module.overdriveFeedbackDelay.disconnect(); module.overdriveFeedback.disconnect()
  destroyResonatorModule(module.resonator)
  module.wet.disconnect(); module.dry.disconnect(); module.output.disconnect()
}

export function createHallImpulse(audioContext: AudioContext, settings: ReverbSettings): AudioBuffer {
  const cacheKey = `${audioContext.sampleRate}:${settings.hallType}:${Math.round(settings.decay * 100)}`
  const cached = impulseCache.get(cacheKey)
  if (cached) return cached
  const hallTypes: Record<HallType, { duration: number; density: number; reflections: number; reflectionWindow: number }> = {
    'small-hall': { duration: 0.72, density: 0.8, reflections: 56, reflectionWindow: 0.055 },
    'wooden-hall': { duration: 0.88, density: 0.9, reflections: 72, reflectionWindow: 0.075 },
    'concert-hall': { duration: 1, density: 1, reflections: 96, reflectionWindow: 0.095 },
    'opera-house': { duration: 1.12, density: 1.05, reflections: 124, reflectionWindow: 0.115 },
    cathedral: { duration: 1.45, density: 1.2, reflections: 160, reflectionWindow: 0.16 },
    arena: { duration: 1.8, density: 1.35, reflections: 196, reflectionWindow: 0.2 },
  }
  const hall = hallTypes[settings.hallType]
  const frameCount = Math.ceil(audioContext.sampleRate * Math.min(12, Math.max(0.6, settings.decay * hall.duration)))
  const impulse = audioContext.createBuffer(2, frameCount, audioContext.sampleRate)
  const channels = Array.from({ length: impulse.numberOfChannels }, (_, channel) => impulse.getChannelData(channel))
  for (const data of channels) {
    let filteredNoise = 0
    for (let frame = 0; frame < frameCount; frame += 1) {
      const progress = frame / frameCount
      const envelope = Math.pow(1 - progress, 1.35 + 2.4 / settings.decay)
      const onset = Math.min(1, frame / (audioContext.sampleRate * 0.032))
      filteredNoise = filteredNoise * 0.94 + (Math.random() * 2 - 1) * 0.06
      data[frame] = filteredNoise * envelope * onset * hall.density * 0.42
    }
  }
  for (let reflection = 0; reflection < hall.reflections; reflection += 1) {
    const position = (reflection + Math.random() * 0.85) / hall.reflections
    const time = 0.004 + position * position * hall.reflectionWindow
    const frame = Math.floor(time * audioContext.sampleRate)
    if (frame >= frameCount) continue
    const gain = 0.22 * hall.density * Math.exp(-time / (hall.reflectionWindow * 0.8))
    const pan = Math.random()
    channels[0][frame] += gain * Math.sqrt(1 - pan); channels[1][frame] += gain * Math.sqrt(pan)
    for (let tap = 1; tap <= 3; tap += 1) {
      const diffuseFrame = frame + Math.floor((0.0006 + Math.random() * 0.0028) * tap * audioContext.sampleRate)
      if (diffuseFrame >= frameCount) continue
      const diffuseGain = gain * Math.pow(0.42, tap)
      channels[0][diffuseFrame] += diffuseGain * Math.sqrt(1 - pan); channels[1][diffuseFrame] += diffuseGain * Math.sqrt(pan)
    }
  }
  impulseCache.set(cacheKey, impulse)
  if (impulseCache.size > 64) impulseCache.delete(impulseCache.keys().next().value!)
  return impulse
}
