export function productUrl(raw) {
  const message='Use um link do produto com protocolo HTTP ou HTTPS.';
  if (typeof raw!=='string'||raw.length>2048||!/^https?:\/\//i.test(raw.trim())) throw new Error(message);
  let url;
  try { url=new URL(raw.trim()); } catch { throw new Error(message); }
  if (!['http:','https:'].includes(url.protocol)||url.username||url.password) throw new Error(message);
  return url.href;
}
