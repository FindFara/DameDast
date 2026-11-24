import { normalizeClip } from './extension/shared/clips.js';
function request(type, extra = {}) {
  return new Promise((resolve, reject) => {
    const nonce = crypto.randomUUID();
    const timer = setTimeout(() => { window.removeEventListener('message', listener); reject(Error('Connect the extension to this app URL, then reload this page.')); }, 5000);
    const listener = event => {
      if (event.source !== window || event.origin !== location.origin || event.data?.type !== 'damdast:clips-result' || event.data.nonce !== nonce) return;
      clearTimeout(timer); window.removeEventListener('message', listener);
      event.data.ok ? resolve(event.data) : reject(Error('Connect the extension to this app URL, then reload this page.'));
    };
    window.addEventListener('message', listener); window.postMessage({ type, nonce, ...extra }, location.origin);
  });
}
export async function extensionClips() {
  const result = await request('damdast:clips');
  if (!Array.isArray(result.clips) || result.clips.length > 100) throw Error('Invalid clip.');
  return result.clips.map(normalizeClip);
}
export async function acknowledgeClip(id) { try { await request('damdast:clip-ack', { id }); } catch {} }
