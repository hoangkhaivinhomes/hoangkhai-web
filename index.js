/* Cloudflare Pages Function cho trang chủ "/".
   Khi link có ?can=<mã ngắn>, gắn thẻ Open Graph riêng của căn đó (tiêu đề: loại căn + phân khu + giá, ảnh: ảnh đầu tiên)
   để Facebook, Zalo, Messenger hiện đúng ảnh và giá khi chia sẻ. Không có ?can= thì trả trang tĩnh như cũ.
   Cách tạo mã ngắn phải giữ giống hàm sheetUnits() trong index.html. */
export const SHEET_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSHcr70-ByPB3DYMUNAXX4LMPpR8-XhCUyEAeGtUbtQSMS6qL1ETe6HHb1LgS4-EOynheizpYY2lwLn/pub?gid=553047661&single=true&output=csv';

export function csvRows(t) { const r = []; let row = [], c = '', q = false; for (let i = 0; i < t.length; i++) { const ch = t[i];
  if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++ } else q = false } else c += ch }
  else if (ch === '"') q = true; else if (ch === ',') { row.push(c); c = '' }
  else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; row.push(c); r.push(row); row = []; c = '' } else c += ch }
  if (c !== '' || row.length) { row.push(c); r.push(row) } return r.filter(x => x.some(v => v.trim())) }
const num = t => { const m = String(t || '').replace(',', '.').match(/\d+(\.\d+)?/); return m ? parseFloat(m[0]) : NaN };
const driveIds = t => String(t || '').split(/[,\s]+/).map(x => { const m = x.match(/[?&]id=([\w-]{15,})/) || x.match(/\/d\/([\w-]{15,})/); return m ? m[1] : '' }).filter(Boolean);
const hid = s => { let h = 0x811c9dc5; for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0 } return h.toString(36) };
const cap = t => t ? t.charAt(0).toLocaleUpperCase('vi') + t.slice(1) : t;

export function sheetUnits(csv) {
  const R = csvRows(csv); if (R.length < 2) return [];
  const H = R[0].map(h => h.toLowerCase()); const ix = (...k) => H.findIndex(h => k.some(x => h.includes(x)));
  const c = { type: ix('loại', 'loai'), zone: ix('khu', 'phân khu'), beds: ix('phòng'), area: ix('diện tích', 'dien tich'), price: H.findIndex(h => h.includes('giá') && !h.includes('tốt')), dir: ix('hướng', 'huong'), furn: ix('nội thất', 'noi that'), img: ix('ảnh', 'hình'), hide: ix('ẩn', 'an căn', 'hide'), tower: ix('tòa', 'toa'), floor: ix('tầng', 'tang'),
    rid: H.findIndex(h => /^(id|mã tin|ma tin)$/.test(h.trim())), ts: H.findIndex(h => /^(dấu thời gian|timestamp|thời gian đăng|ngày đăng)/.test(h.trim())) };
  const CAP = new Set(['zone', 'dir', 'furn']);
  const g = (row, k) => { const t = c[k] >= 0 ? String(row[c[k]] || '').trim() : ''; return CAP.has(k) ? cap(t) : t };
  const seen = new Set();
  return R.slice(1).map((row, n) => {
    if (/^(x|có|co|true|1|ẩn|an|đã bán|da ban|đã thuê|da thue)/i.test(g(row, 'hide'))) return null;
    const rent = /thuê|thue/i.test(g(row, 'type')); let raw = g(row, 'price'), v = num(raw); if (isNaN(v)) return null;
    if (!rent && (/tỷ|tỉ|ty|ti\b/i.test(raw) || v < 100)) v = Math.round(v * 1000);
    const bt = g(row, 'beds'), ids = driveIds(g(row, 'img'));
    let key = g(row, 'rid') || g(row, 'ts') || ids[0] || [rent ? 't' : 'b', g(row, 'zone'), g(row, 'tower'), g(row, 'floor'), bt, g(row, 'area')].join('|'), id = hid(key);
    while (seen.has(id)) id = hid(key + '#' + n + seen.size); seen.add(id);
    const a = num(g(row, 'area'));
    return { id, lid: 'g' + n, type: rent ? 'rent' : 'sale', zone: g(row, 'zone'), beds: bt, area: isNaN(a) ? '' : String(a).replace('.', ','), price: v, dir: g(row, 'dir'), furn: g(row, 'furn'), img: ids[0] || '' };
  }).filter(Boolean) }

const money = u => { const p = u.price; return u.type === 'rent' ? String(p).replace('.', ',') + ' triệu/tháng' : (p >= 1000 ? String(+(p / 1000).toFixed(2)).replace('.', ',') + ' tỷ' : p + ' triệu') };
const bedsLabel = t => { t = String(t || ''); return /^\d+$/.test(t) ? t + 'PN' : t };
const esc = t => String(t ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

export function ogFor(u, origin) {
  const title = cap([bedsLabel(u.beds) ? 'Căn ' + bedsLabel(u.beds) : 'Căn hộ', u.zone].filter(Boolean).join(' ') + ' – ' + money(u));
  const desc = [u.type === 'rent' ? 'Cho thuê' : 'Bán', u.area ? u.area + ' m²' : '', u.dir ? 'Hướng ' + u.dir : '', u.furn ? 'Nội thất ' + u.furn.toLowerCase() : ''].filter(Boolean).join(' · ') + '. Vinhomes Grand Park – Hoang Khai.';
  const img = u.img ? 'https://drive.google.com/thumbnail?id=' + u.img + '&sz=w1200' : '';
  return { title, desc, img, url: origin + '/?can=' + u.id };
}

export function injectOg(html, o) {
  const setMeta = (h, attr, name, val) => { const re = new RegExp('<meta ' + attr + '="' + name + '" content="[^"]*">'); const tag = '<meta ' + attr + '="' + name + '" content="' + esc(val) + '">'; return re.test(h) ? h.replace(re, tag) : h.replace('</head>', tag + '\n</head>') };
  let h = html.replace(/<title>[^<]*<\/title>/, '<title>' + esc(o.title) + '</title>');
  h = setMeta(h, 'name', 'description', o.desc);
  h = setMeta(h, 'property', 'og:title', o.title);
  h = setMeta(h, 'property', 'og:description', o.desc);
  h = setMeta(h, 'property', 'og:url', o.url);
  if (o.img) {
    h = setMeta(h, 'property', 'og:image', o.img);
    h = setMeta(h, 'name', 'twitter:image', o.img);
    h = h.replace(/<meta property="og:image:(width|height)" content="[^"]*">\n?/g, '');
  }
  return h.replace('</head>', '<link rel="canonical" href="' + esc(o.url) + '">\n</head>');
}

export async function onRequest(ctx) {
  const res = await ctx.next();
  try {
    const url = new URL(ctx.request.url), id = url.searchParams.get('can') || '';
    if (!/^[a-z0-9]{1,13}$/i.test(id) || !(res.headers.get('content-type') || '').includes('text/html')) return res;
    const r = await fetch(SHEET_CSV, { cf: { cacheTtl: 300, cacheEverything: true } });
    if (!r.ok) return res;
    const units = sheetUnits(await r.text());
    const u = units.find(x => x.id === id) || units.find(x => x.lid === id);
    if (!u) return res;
    const html = injectOg(await res.text(), ogFor(u, url.origin));
    const headers = new Headers(res.headers); headers.delete('content-length'); headers.set('cache-control', 'public, max-age=300');
    return new Response(html, { status: res.status, headers });
  } catch (e) { return res }
}
