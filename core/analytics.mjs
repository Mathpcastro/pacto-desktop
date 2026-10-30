import { toolData } from './composio.mjs';

const DAY = 86400000;
export const ANALYTICS_TTL = 15 * 60 * 1000;
const METRICS = { reach: 'reach', profile_views: 'profileViews', accounts_engaged: 'engaged' };
const number = value => value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
const rows = value => { const v = toolData(value); return Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : []; };
const fatal = error => ['key', 'forbidden', 'reconnect', 'rate', 'network'].includes(error.code);
export function analyticsRange(days = 7, now = Date.now()) {
  if (![7, 30].includes(Number(days))) throw new Error('Escolha o período de 7 ou 30 dias.');
  const midnight = Math.floor(now / DAY) * DAY;
  return { days: Number(days), since: Math.floor((midnight - (Number(days) - 1) * DAY) / 1000), until: Math.floor(now / 1000) };
}
export function followerHistory(snapshots = [], days = 7, now = Date.now()) {
  const { since } = analyticsRange(days, now), byDate = new Map(snapshots.map(p => [p.date, number(p.followers)]));
  return Array.from({ length: Number(days) }, (_, i) => {
    const date = new Date(since * 1000 + i * DAY).toISOString().slice(0, 10);
    return { date, followers: byDate.get(date) ?? null };
  });
}
// Alcance e contas engajadas são totais únicos do período: somar dias duplicaria pessoas.
export async function fetchAnalytics(composio, account, { days = 7, now = Date.now() } = {}) {
  const range = analyticsRange(days, now), warnings = [];
  const run = (slug, args) => composio.execute(account.id, slug, args, { userId: account.userId || '' });
  const info = toolData(await run('INSTAGRAM_GET_USER_INFO', { ig_user_id: 'me', fields: 'id,username,followers_count' }));
  const metrics = { reach: null, profileViews: null, engaged: null };
  for (const [metric, key] of Object.entries(METRICS)) {
    try {
      const data = rows(await run('INSTAGRAM_GET_USER_INSIGHTS', { ig_user_id: account.igUserId, metric: [metric], period: 'day', metric_type: 'total_value', since: range.since, until: range.until }));
      metrics[key] = number(data.find(r => r.name === metric)?.total_value?.value);
    } catch (error) { if (fatal(error)) throw error; }
    if (metrics[key] === null) warnings.push(`${{ reach: 'Alcance', profileViews: 'Visitas ao perfil', engaged: 'Contas engajadas' }[key]} indisponível para esta conta ou período.`);
  }
  const posts = [], seen = new Set(); let after = '', truncated = false, postsAvailable = true;
  try {
    for (let page = 0; page < 2; page++) {
      const args = { ig_user_id: 'me', limit: 25, since: range.since, until: range.until, fields: 'id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count', ...(after ? { after } : {}) };
      const result = toolData(await run('INSTAGRAM_GET_IG_USER_MEDIA', args));
      const list = rows(result);
      for (const m of list) {
        const at = Date.parse(m.timestamp);
        if (!m.id || seen.has(String(m.id)) || !Number.isFinite(at) || at < range.since * 1000 || at > range.until * 1000) continue;
        seen.add(String(m.id));
        const post = { id: String(m.id), caption: String(m.caption || '').slice(0, 2200), type: String(m.media_type || ''), productType: String(m.media_product_type || ''), permalink: String(m.permalink || ''), timestamp: m.timestamp, likes: number(m.like_count), comments: number(m.comments_count), saves: null, shares: null, reach: null };
        try {
          const insight = rows(await run('INSTAGRAM_GET_IG_MEDIA_INSIGHTS', { ig_media_id: post.id, metric: ['saved', 'shares', 'reach'] }));
          for (const [name, key] of [['saved', 'saves'], ['shares', 'shares'], ['reach', 'reach']]) {
            const row = insight.find(r => r.name === name);
            post[key] = number(row?.total_value?.value ?? row?.values?.[0]?.value);
          }
        } catch (error) { if (fatal(error)) throw error; }
        posts.push(post);
      }
      const cursor = result?.paging?.cursors?.after;
      if (!result?.paging?.next || !cursor || cursor === after || !list.length) break;
      after = cursor;
      if (page === 1) truncated = true;
    }
  } catch (error) {
    if (fatal(error)) throw error;
    postsAvailable = false; warnings.push('Não foi possível ler todos os posts. Atualize para tentar novamente.');
  }
  if (posts.some(p => [p.saves, p.shares, p.reach].includes(null))) warnings.push('Alguns números dos posts não foram disponibilizados pelo Instagram.');
  return { accountId: account.id, username: String(info?.username || account.username || ''), ...range, metrics, followers: number(info?.followers_count), posts, postsAvailable, truncated, warnings, updatedAt: new Date(now).toISOString() };
}
