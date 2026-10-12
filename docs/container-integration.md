# Container integration: seed messages, version 1

Embed Synth2 in an iframe or open it with `window.open`. The container can load
a saved seed and export a newly generated seed representing the **current setup**
(not a randomized sound). Seeds are opaque `osc1.…` strings; store them unchanged.
Export includes channels, master effects, selected channel, and MIDI mappings,
using the same format as the app's Generate/Load controls.

Output modulation is included for each channel and the master: LFOs target
`output:0:volume` or `output:0:pan`, and envelopes use `outputVolume` or
`outputPan`. Add them with **+ Mod** below the output controls, then select
Volume or Pan in the modulator's Target field. New modulators start bypassed.
Output envelopes retrigger on note-on (master envelopes respond to notes on
any channel), rising from zero volume or center pan to the output setting,
then returning after the hold and decay stages (release is used when decay
is zero). Bypassing or removing an envelope restores the output setting.

## Protocol

Send a JavaScript object using `synthWindow.postMessage(message, synthOrigin)`.
Always use the exact synth origin (scheme, hostname, and port).

Every request contains:

| Field | Type | Meaning |
| --- | --- | --- |
| `protocol` | string | Exactly `synth2.seed.v1` |
| `requestId` | non-empty string | Unique ID chosen by the container, echoed in the response |
| `type` | string | `ready`, `load`, or `export` |
| `seed` | string | Required for `load` only |

Examples:

```js
{ protocol: 'synth2.seed.v1', requestId: '1', type: 'ready' }
{ protocol: 'synth2.seed.v1', requestId: '2', type: 'load', seed: 'osc1.…' }
{ protocol: 'synth2.seed.v1', requestId: '3', type: 'export' }
```

Each recognized request receives one response:

```js
// ready or load success
{ protocol: 'synth2.seed.v1', type: 'response', requestId: '2', action: 'load', ok: true }
// export success
{ protocol: 'synth2.seed.v1', type: 'response', requestId: '3', action: 'export', ok: true, seed: 'osc1.…' }
// failure
{ protocol: 'synth2.seed.v1', type: 'response', requestId: '2', action: 'load', ok: false,
  error: { code: 'LOAD_FAILED', message: 'This seed has an invalid setup.' } }
```

Error codes: `INVALID_REQUEST` for missing/empty/non-string seed, `LOAD_FAILED`
for a seed that cannot be decoded or applied, and `EXPORT_FAILED` for generation
failure. Error messages are human-readable, not stable identifiers.
Unknown protocols/types, missing/invalid request IDs, and non-object messages
are silently ignored. IDs correlate responses; they do not deduplicate requests.

`ready` checks that the listener is installed without modifying the setup.
Wait for the iframe's `load` event, then request `ready` before loading/exporting.
Requests sent before mounting are not queued. Use a timeout; a readiness request
may be retried if needed. No unsolicited messages are emitted.

## Container example

```html
<iframe id="synth" title="Synth2"></iframe>
<script type="module">
  const frame = document.querySelector('#synth');
  const synthUrl = 'https://synth.example.com/';
  const synthOrigin = new URL(synthUrl).origin;
  const protocol = 'synth2.seed.v1';
  const pending = new Map();

  window.addEventListener('message', (event) => {
    if (event.source !== frame.contentWindow || event.origin !== synthOrigin) return;
    const data = event.data;
    if (!data || data.protocol !== protocol || data.type !== 'response') return;
    const request = pending.get(data.requestId);
    if (!request || data.action !== request.action || typeof data.ok !== 'boolean') return;
    clearTimeout(request.timer);
    pending.delete(data.requestId);
    if (data.ok) request.resolve(data);
    else request.reject(new Error(data.error?.message ?? 'Seed request failed'));
  });

  function requestSeed(type, seed) {
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error(`Synth ${type} request timed out`));
      }, 5000);
      pending.set(requestId, { action: type, resolve, reject, timer });
      frame.contentWindow.postMessage({ protocol, requestId, type, seed }, synthOrigin);
    });
  }

  frame.addEventListener('load', async () => {
    try {
      await requestSeed('ready');
      const savedSeed = localStorage.getItem('synthSeed');
      if (savedSeed) await requestSeed('load', savedSeed);
      // Call this export request when the container's Save button is clicked.
      const { seed } = await requestSeed('export');
      localStorage.setItem('synthSeed', seed);
    } catch (error) {
      console.error('Synth integration failed:', error);
    }
  });
  frame.src = synthUrl;
</script>
```

For a popup, use the window returned by `window.open` instead of
`frame.contentWindow` and poll `ready` until it responds or your startup timeout
expires. The opener relationship must be preserved.

## Behavior and embedding requirements

- Load replaces the setup and stops currently playing notes, just like the Load
  button. Success means the settings were applied; it does not promise audible
  playback or completion of asynchronous audio activation.
- Export serializes the live controls every time, even if the seed input field
  contains an older seed. Both operations update the seed field/status in the UI.
- Audio and MIDI permission/user-gesture requirements remain in effect. Loading
  a seed does not grant permissions or automatically enable audio.
- Only the immediate iframe parent is accepted (or the opener when top-level).
  Other windows and opaque (`null`) origins are ignored. Cross-origin containers
  are supported; replies go only to the requesting window at its exact origin.
- The parent/opener is trusted to control and read the setup. There is no origin
  allowlist; restrict who can embed the app using deployment headers such as CSP
  `frame-ancestors` if your deployment requires it. The container must validate
  both response origin and source as shown above.
- Serve both apps over HTTPS (localhost for development). Any iframe sandbox
  must permit scripts and preserve origins (`allow-scripts allow-same-origin`).
  Configure embedding/permissions headers for any audio/MIDI features you use.
