/* Seoul Signal optional local language model. No download, model, or request
   occurs when this script is included; call load() from an explicit button. */
(() => {
  'use strict';
  const w = window;
  const ownURL = document.currentScript && document.currentScript.src;
  // If the opt-in module is unavailable in a single-file/offline handout, the
  // data assistant can still use its ordinary deterministic answers.
  const workerURL = ownURL ? new URL('model-worker.mjs', ownURL).href : null;
  const info = Object.freeze({
    name: 'Qwen2.5 0.5B Instruct',
    model: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    engine: 'WebLLM 0.2.85',
    license: 'Apache-2.0',
    download: 'About 290 MB of model files, plus the inference runtime',
    downloadMB: 290,
    gpuMemoryMB: 945,
    privacy: 'Questions and business plans are processed on this device. Public model files are fetched on first use.',
    source: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct'
  });
  const frames = new Set(['recommend', 'compare', 'explain', 'limits']);
  let worker = null, state = 'idle', initial = null, observer = null, order = 0;
  const pending = new Map();
  function canUse() {
    return Boolean(workerURL && w.isSecureContext && w.Worker && w.navigator &&
      w.navigator.gpu && w.location && ['https:', 'http:'].includes(w.location.protocol));
  }
  function emit(progress, text) {
    if (typeof observer === 'function') {
      try { observer({progress: Math.max(0, Math.min(1, Number(progress) || 0)), text: String(text)}); }
      catch (_) { /* A progress view must never interrupt the model. */ }
    }
  }
  function stop(message) {
    const active = worker;
    worker = null; state = 'idle'; initial = null; observer = null;
    if (active) active.terminate();
    for (const p of pending.values()) { clearTimeout(p.timer); p.reject(new Error(message)); }
    pending.clear();
  }
  function send(kind, payload, timeout) {
    const job = ++order;
    return new Promise((resolve, reject) => {
      let timer;
      const arm = () => {
        clearTimeout(timer);
        timer = setTimeout(() => stop('The local model timed out. You can keep using the data guide.'), timeout);
        if (pending.has(job)) pending.get(job).timer = timer;
      };
      pending.set(job, {kind, resolve, reject, timer, arm});
      arm();
      try { worker.postMessage({kind, job, payload}); }
      catch (_) { stop('Could not start the local model. You can keep using the data guide.'); }
    });
  }
  function boot() {
    const made = new w.Worker(workerURL, {type:'module', name:'seoul-signal-local-language'});
    worker = made;
    made.onmessage = ev => {
      if (made !== worker) return;
      const m = ev.data;
      if (!m || typeof m !== 'object' || !Number.isSafeInteger(m.job)) return;
      const p = pending.get(m.job);
      if (!p) return;
      if (m.kind === 'progress') {
        p.arm(); emit(m.progress, m.text || 'Preparing your local model'); return;
      }
      clearTimeout(p.timer); pending.delete(m.job);
      if (m.kind === 'error') { p.reject(new Error(String(m.message || 'The local model could not answer.'))); return; }
      if (m.kind !== 'result') { p.reject(new Error('The local model returned an invalid response.')); return; }
      p.resolve(m.result);
    };
    made.onerror = ev => {
      if (made !== worker) return;
      if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
      stop('The local model could not start on this browser. The data guide is still available.');
    };
    made.onmessageerror = () => {
      if (made === worker) stop('The local model stopped unexpectedly. You can keep using the data guide.');
    };
  }
  async function load(onProgress) {
    if (state === 'ready') {
      if (typeof onProgress === 'function') onProgress({progress:1, text:'Local model ready'});
      return info;
    }
    if (initial) return initial;
    if (!canUse()) throw new Error('Use a secure page in a WebGPU-capable browser for the optional model. The data guide works without it.');
    observer = onProgress;
    try { boot(); } catch (_) { stop('Local model unavailable.'); throw new Error('This browser or page blocks the local model worker. You can keep using the data guide.'); }
    state = 'loading'; emit(0, 'Checking this device before downloading');
    const starting = worker;
    const run = send('load', null, 180000).then(() => {
      if (worker !== starting) throw new Error('The local model was stopped.');
      state = 'ready'; emit(1, 'Local model ready'); observer = null;
      return info;
    }).catch(err => {
      if (worker === starting) stop('The local model was stopped.');
      throw err;
    }).finally(() => { if (worker === starting) initial = null; });
    initial = run; return run;
  }
  async function explain(payload) {
    if (state !== 'ready') throw new Error('The optional local model has not been started.');
    if (Array.from(pending.values()).some(p => p.kind === 'explain')) throw new Error('The local model is still reading the previous question.');
    // Window and worker independently check the allowlist before returning
    // anything to the UI: generated prose and unverified numbers never leave.
    const facts = Array.isArray(payload && payload.facts) ? payload.facts.slice(0,12) : [];
    const available = new Set(facts.map(x => x && x.id).filter(x => typeof x === 'string'));
    const res = await send('explain', {question: payload && payload.question, history:payload && payload.history, facts}, 90000);
    if (!res || !frames.has(res.frame) || !Array.isArray(res.ids) || res.ids.length > 3 ||
        res.ids.some(id => !available.has(id)) || new Set(res.ids).size !== res.ids.length ||
        Object.keys(res).some(key => key !== 'ids' && key !== 'frame')) {
      throw new Error('The local model did not identify usable evidence. Use the data guide for this question.');
    }
    return {ids:res.ids, frame:res.frame};
  }
  async function unload() { stop('The local model was turned off. The data guide is still available.'); }
  w.SeoulLocalAI = Object.freeze({canUse, info, load, explain, unload, get state() {return state;}});
})();
