export function normalizeClip(input) {
  if (!input || typeof input.id !== 'string' || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(input.id)) throw Error('Invalid clip.');
  let url; try { url = new URL(input.url); } catch {}
  if (!url || !['https:', 'http:'].includes(url.protocol) || url.username || url.password || input.url.length > 2000 || typeof input.title !== 'string' || !input.title.trim() || input.title.length > 200 || typeof input.excerpt !== 'string' || input.excerpt.length > 4000) throw Error('Invalid clip.');
  return { id: input.id, title: input.title.trim(), url: url.href, excerpt: input.excerpt, tags: ['Read later'] };
}
