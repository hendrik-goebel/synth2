const scheduledValues = new WeakMap<AudioParam, number>()

export function setSmoothedValue(parameter: AudioParam, value: number, now: number, timeConstant: number): void {
  if (scheduledValues.get(parameter) === value) return
  scheduledValues.set(parameter, value)
  parameter.setTargetAtTime(value, now, timeConstant)
}

export function hasChanged<T extends object>(changes: Partial<T> | undefined, key: keyof T): boolean {
  return changes === undefined || Object.hasOwn(changes, key)
}
