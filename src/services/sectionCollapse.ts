const initiallyOpenSections = new Set<string>()
const initiallyOpenEnvelopeIndexes = new Set<number>()

export function markSectionOpen(headingId: string) {
  initiallyOpenSections.add(headingId)
}

export function markEnvelopeOpen(index: number) {
  initiallyOpenEnvelopeIndexes.add(index)
}

export function clearMarkedOpenSections() {
  initiallyOpenSections.clear()
  initiallyOpenEnvelopeIndexes.clear()
}

export function isSectionInitiallyOpen(headingId: string) {
  const envelopeIndex = /-envelope-(\d+)-heading$/.exec(headingId)?.[1]
  return initiallyOpenSections.has(headingId)
    || (envelopeIndex !== undefined && initiallyOpenEnvelopeIndexes.has(Number(envelopeIndex)))
}
