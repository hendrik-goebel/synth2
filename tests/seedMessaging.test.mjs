import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

const source = readFileSync(new URL('../src/services/seedMessaging.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { createSeedMessageHandler, SEED_MESSAGE_PROTOCOL: protocol } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
)

function setup(actions = {}, popup = false) {
  const replies = []
  const container = { postMessage: (data, origin) => replies.push({ data, origin }) }
  const host = popup ? { opener: container } : { parent: container }
  if (popup) host.parent = host
  const handler = createSeedMessageHandler(host, { generate: () => 'osc1.current', load: () => {}, ...actions })
  const send = (data, overrides = {}) => handler({
    source: container, origin: 'https://container.example',
    data: { protocol, requestId: 'request-1', ...data }, ...overrides,
  })
  return { replies, send }
}

test('exports a fresh seed for every request and correlates replies to the exact origin', () => {
  let count = 0
  const { send, replies } = setup({ generate: () => `osc1.${++count}` })
  send({ type: 'export' })
  send({ type: 'export', requestId: 'request-2' })
  assert.deepEqual(replies[1], {
    origin: 'https://container.example',
    data: { protocol, type: 'response', requestId: 'request-2', action: 'export', ok: true, seed: 'osc1.2' },
  })
})

test('loads the supplied seed and acknowledges success', () => {
  let loaded
  const { send, replies } = setup({ load: seed => { loaded = seed } })
  send({ type: 'load', seed: 'osc1.saved' })
  assert.equal(loaded, 'osc1.saved')
  assert.equal(replies[0].data.ok, true)
})

test('returns validation and operation failures', () => {
  const { send, replies } = setup({ load: () => { throw new Error('Invalid setup') }, generate: () => { throw new Error('Export failed') } })
  send({ type: 'load', seed: '' })
  send({ type: 'load', seed: 42 })
  send({ type: 'load', seed: 'bad' })
  send({ type: 'export' })
  assert.deepEqual(replies.map(reply => reply.data.error.code), ['INVALID_REQUEST', 'INVALID_REQUEST', 'LOAD_FAILED', 'EXPORT_FAILED'])
  assert.equal(replies[2].data.error.message, 'Invalid setup')
})

test('ignores unrelated windows, opaque origins, and malformed envelopes', () => {
  const { send, replies } = setup()
  send({ type: 'export' }, { source: {} })
  send({ type: 'export' }, { origin: 'null' })
  send({ type: 'export', protocol: 'other' })
  send({ type: 'export', requestId: '' })
  send({ type: 'unknown' })
  send({}, { data: null })
  send({}, { data: 'export' })
  assert.equal(replies.length, 0)
})

test('readiness works for both an iframe and a popup without touching the synth', () => {
  for (const popup of [false, true]) {
    const fail = () => { throw new Error('Must not be called') }
    const { send, replies } = setup({ generate: fail, load: fail }, popup)
    send({ type: 'ready' })
    assert.equal(replies[0].data.ok, true)
  }
})
