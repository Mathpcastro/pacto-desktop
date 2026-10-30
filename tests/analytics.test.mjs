import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchAnalytics, analyticsRange, followerHistory } from '../core/analytics.mjs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Profiles } from '../core/profiles.mjs';
import { Runtime } from '../core/runtime.mjs';

const now = Date.parse('2026-10-30T15:00:00Z');
const account = { id: 'ca_ana', igUserId: '1001', username: 'ana', userId: 'owner' };
function api({ missing = [], pages, denied = false } = {}) {
  const calls = [];
  return { calls, async execute(id, slug, args, opts) {
    calls.push({ id, slug, args, opts });
    if (denied) throw Object.assign(new Error('Reconecte a conta.'), { code: 'reconnect' });
    if (slug === 'INSTAGRAM_GET_USER_INFO') return { id: '1001', username: 'ana', followers_count: 1500 };
    if (slug === 'INSTAGRAM_GET_USER_INSIGHTS') {
      const metric = args.metric[0];
      if (missing.includes(metric)) throw new Error('Metric unavailable');
      return { data: [{ name: metric, total_value: { value: { reach: 400, profile_views: 0, accounts_engaged: 90 }[metric] } }] };
    }
    if (slug === 'INSTAGRAM_GET_IG_USER_MEDIA') return pages?.(args) ?? { data: [{ id: 'old-post', caption: 'Texto real', media_type: 'CAROUSEL_ALBUM', timestamp: '2026-10-29T12:00:00Z', like_count: 3, comments_count: 2 }], paging: {} };
    if (slug === 'INSTAGRAM_GET_IG_MEDIA_INSIGHTS') return { data: [{ name: 'saved', values: [{ value: 7 }] }, { name: 'reach', values: [{ value: 100 }] }] };
    throw Error(slug);
  } };
}
test('analytics uses selected account and period totals, keeping real zero distinct from missing', async () => {
  const client = api({ missing: ['accounts_engaged'] });
  const report = await fetchAnalytics(client, account, { days: 7, now });
  assert.equal(report.metrics.reach, 400);
  assert.equal(report.metrics.profileViews, 0);
  assert.equal(report.metrics.engaged, null);
  assert.equal(report.followers, 1500);
  assert.equal(report.posts[0].saves, 7);
  assert.equal(report.posts[0].shares, null);
  assert.ok(report.warnings.length);
  for (const call of client.calls) assert.equal(call.id, account.id);
  for (const call of client.calls.filter(c => c.slug === 'INSTAGRAM_GET_USER_INSIGHTS')) {
    assert.equal(call.args.metric_type, 'total_value');
    assert.equal(call.args.period, 'day');
    assert.equal(call.args.ig_user_id, account.igUserId);
    assert.equal(call.opts.userId, account.userId);
  }
});
test('unique account metrics are never calculated by summing daily reach', async () => {
  const client = api();
  const original = client.execute;
  client.execute = async (...args) => args[1] === 'INSTAGRAM_GET_USER_INSIGHTS' ? { data: [{ name: args[2].metric[0], values: [{ value: 10 }, { value: 20 }] }] } : original(...args);
  assert.equal((await fetchAnalytics(client, account, { days: 7, now })).metrics.reach, null);
});
test('pagination respects period and caps the ranking with explicit truncation', async () => {
  const client = api({ pages: args => ({ data: Array.from({ length: 25 }, (_, i) => ({ id: `${args.after || 'a'}-${i}`, timestamp: '2026-10-29T12:00:00Z' })), paging: { next: 'https://example.invalid/never-follow', cursors: { after: args.after ? 'c' : 'b' } } }) });
  const report = await fetchAnalytics(client, account, { days: 30, now });
  assert.equal(report.posts.length, 50);
  assert.equal(report.truncated, true);
  assert.equal(client.calls.filter(c => c.slug === 'INSTAGRAM_GET_IG_USER_MEDIA').length, 2);
  assert.ok(client.calls.filter(c => c.slug === 'INSTAGRAM_GET_IG_USER_MEDIA').every(c => c.args.since && c.args.until));
});
test('authorization errors propagate instead of presenting an empty successful report', async () => {
  await assert.rejects(fetchAnalytics(api({ denied: true }), account, { days: 7, now }), /Reconecte/);
  assert.throws(() => analyticsRange(8, now), /período/i);
});
test('followers history preserves gaps and uses only measured totals', () => {
  const history = followerHistory([{ date: '2026-10-28', followers: 1480 }, { date: '2026-10-30', followers: 1500 }], 7, now);
  assert.equal(history.length, 7);
  assert.equal(history.find(x => x.date === '2026-10-29').followers, null);
  assert.equal(history.at(-1).followers, 1500);
  assert.equal(history.filter(x => x.followers !== null).length, 2);
});

async function runtimeFor(t) {
  const root = await mkdtemp(join(tmpdir(), 'analytics-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const profiles = await new Profiles(root).init(), store = await profiles.store(), client = api();
  const rt = new Runtime({ store, profiles, knowledge: { method: '', lessons: [], prompts: [] }, codex: { status: { account: { connected: true } } }, instagram: { composio: () => client, now: () => now }, dialogs: { secrets: { getKey: () => 'test-only-key', hasKey: () => true, installId: () => 'test', accounts: () => [{ ...account, status: 'ACTIVE' }] } } });
  return { rt, profiles, client };
}
test('reports cache reads, explicit refresh bypasses it and each profile owns its history', async t => {
  const { rt, profiles, client } = await runtimeFor(t);
  const args = { account: account.id, days: 7 };
  await rt.request('instagramAnalytics', args);
  const count = client.calls.length;
  await rt.request('instagramAnalytics', args);
  assert.equal(client.calls.length, count);
  await rt.request('instagramAnalytics', { ...args, refresh: true });
  assert.equal(client.calls.length, 2 * count);
  const other = await profiles.create('Outra marca');
  const otherStore = await profiles.store(other.id);
  assert.equal(Object.keys(otherStore.analytics().reports).length, 0);
  await rt.request('instagramAnalytics', { ...args, profileId: other.id });
  assert.equal(client.calls.length, 3 * count);
  assert.equal(rt.store.analytics().snapshots[account.id].length, 1);
  assert.equal(otherStore.analytics().snapshots[account.id].length, 1);
  const reopened = await new Profiles(profiles.root).init();
  assert.equal((await reopened.store()).analytics().reports[`${account.id}:7`].metrics.reach, 400);
});
test('import uses real cached caption and metrics, is idempotent and does not fabricate a project', async t => {
  const { rt, profiles } = await runtimeFor(t);
  await rt.request('instagramAnalytics', { account: account.id, days: 7 });
  const args = { account: account.id, mediaId: 'old-post', days: 7 };
  const imported = await rt.request('importInstagramPost', args);
  await rt.request('importInstagramPost', args);
  assert.equal(imported.source.caption, 'Texto real');
  assert.equal(imported.source.saves, 7);
  assert.equal(imported.source.shares, null);
  assert.equal(rt.store.analytics().sources.length, 1);
  assert.equal(rt.store.state().projects.length, 0);
  await assert.rejects(rt.request('importInstagramPost', { ...args, mediaId: 'inventado' }), /Atualize/);
  const other = await profiles.create('Outra marca');
  await assert.rejects(rt.request('importInstagramPost', { ...args, profileId: other.id }), /Atualize/);
});
test('Replicador receives only known caption and measurements for external posts', async t => {
  const { rt } = await runtimeFor(t);
  await rt.request('instagramAnalytics', { account: account.id, days: 7 });
  let captured;
  rt.ideas = async (kind, args) => { captured = { kind, args }; return { ok: true }; };
  await rt.request('replicateInstagram', { account: account.id, mediaId: 'old-post', days: 7 });
  assert.equal(captured.kind, 'replicador');
  assert.equal(captured.args.project.caption, 'Texto real');
  assert.deepEqual(captured.args.project.slides, []);
  assert.equal(captured.args.metrics.sales, null);
  assert.match(captured.args.project.architecture, /não disponível/);
});
test('a partial update does not erase a measured followers total from the same day', async t => {
  const { rt } = await runtimeFor(t);
  const report = await rt.request('instagramAnalytics', { account: account.id, days: 7 });
  await rt.store.saveAnalytics({ ...report, followers: null });
  assert.equal(rt.store.analytics().snapshots[account.id].at(-1).followers, 1500);
});
