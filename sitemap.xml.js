/* Sitemap cho Google: trang chủ, trang ký gửi và từng căn đang hiện trên web (lấy từ Google Sheet). */
import { SHEET_CSV, sheetUnits } from './index.js';
export async function onRequest({ request }) {
  const o = new URL(request.url).origin;
  let units = [];
  try { const r = await fetch(SHEET_CSV, { cf: { cacheTtl: 3600, cacheEverything: true } }); if (r.ok) units = sheetUnits(await r.text()) } catch (e) {}
  const urls = [o + '/', o + '/ky-gui'].concat(units.map(u => o + '/?can=' + u.id));
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(u => '<url><loc>' + u.replace(/&/g, '&amp;') + '</loc></url>').join('\n') + '\n</urlset>';
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
