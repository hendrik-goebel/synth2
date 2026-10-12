export const SEED_MESSAGE_PROTOCOL = 'synth2.seed.v1'

type SeedActions = {
  generate: () => string
  load: (seed: string) => void
}

/** Only the containing frame (or the window that opened this app) may control it. */
export function createSeedMessageHandler(host: Window, actions: SeedActions) {
  return (event: MessageEvent) => {
    const container = host.parent !== host ? host.parent : host.opener
    if (!container || event.source !== container || event.origin === 'null') return

    const data: unknown = event.data
    if (!data || typeof data !== 'object' || Array.isArray(data)) return
    const request = data as Record<string, unknown>
    if (request.protocol !== SEED_MESSAGE_PROTOCOL
      || typeof request.requestId !== 'string' || !request.requestId
      || !['ready', 'load', 'export'].includes(request.type as string)) return

    const reply = (result: Record<string, unknown>) => container.postMessage({
      protocol: SEED_MESSAGE_PROTOCOL,
      type: 'response',
      requestId: request.requestId,
      action: request.type,
      ...result,
    }, event.origin)

    if (request.type === 'load' && (typeof request.seed !== 'string' || !request.seed.trim())) {
      reply({ ok: false, error: { code: 'INVALID_REQUEST', message: 'seed must be a non-empty string.' } })
      return
    }

    try {
      if (request.type === 'load') actions.load(request.seed as string)
      const seed = request.type === 'export' ? actions.generate() : undefined
      reply({ ok: true, ...(seed === undefined ? {} : { seed }) })
    } catch (error: unknown) {
      reply({
        ok: false,
        error: {
          code: request.type === 'load' ? 'LOAD_FAILED' : 'EXPORT_FAILED',
          message: error instanceof Error ? error.message : 'Seed operation failed.',
        },
      })
    }
  }
}
