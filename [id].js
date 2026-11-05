/* /img/<driveId>?sz=w720 — lấy ảnh thumbnail từ Google Drive một lần rồi lưu ở Cloudflare,
   lần sau khách mở web thì ảnh tải từ Cloudflare (nhanh) thay vì chờ Google Drive. */
export async function onRequest({ request, params }) {
  const id = String(params.id || '');
  if (!/^[\w-]{15,}$/.test(id)) return new Response('bad id', { status: 400 });
  const u = new URL(request.url);
  const sz = /^w\d{2,4}$/.test(u.searchParams.get('sz') || '') ? u.searchParams.get('sz') : 'w1400';
  const cache = caches.default, key = new Request(u.origin + '/img/' + id + '?sz=' + sz);
  let res = await cache.match(key);
  if (res) return res;
  const r = await fetch('https://drive.google.com/thumbnail?id=' + id + '&sz=' + sz, { cf: { cacheTtl: 2592000, cacheEverything: true } });
  const ct = r.headers.get('content-type') || '';
  if (!r.ok || !ct.startsWith('image/')) return Response.redirect('https://drive.google.com/thumbnail?id=' + id + '&sz=' + sz, 302);
  res = new Response(r.body, { headers: { 'content-type': ct, 'cache-control': 'public, max-age=2592000, immutable' } });
  await cache.put(key, res.clone());
  return res;
}
