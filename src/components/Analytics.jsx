import { useEffect, useRef, useState } from 'react';
import { ArrowRight, BarChart3, Bookmark, ExternalLink, RefreshCw, Users } from 'lucide-react';
import { Spinner } from '../ui.jsx';

const number = value => value === null || value === undefined ? '—' : Number(value).toLocaleString('pt-BR');
const date = value => new Date(value.length === 10 ? `${value}T12:00:00Z` : value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
const RANK = { saves: 'Salvamentos', shares: 'Compartilhamentos', reach: 'Alcance' };
const errorText = error => String(error?.message || 'Não foi possível atualizar. Tente de novo.').replace(/^Error invoking remote method '[^']+': (?:\w*Error: )?/, '');

function Followers({ history }) {
  const measured = history.filter(p => p.followers !== null);
  const first = measured[0], last = measured.at(-1), diff = first && last ? last.followers - first.followers : null;
  const min = Math.min(...measured.map(p => p.followers)), max = Math.max(...measured.map(p => p.followers));
  const x = i => 18 + i * 564 / Math.max(1, history.length - 1);
  const y = n => 105 - (n - min) * 80 / Math.max(1, max - min);
  return <section className="card-box analytics-history" aria-label="Evolução de seguidores">
    <div className="section-head"><h2>Evolução de seguidores</h2>{measured.length > 1 && <span className="chip">{diff > 0 ? '+' : ''}{number(diff)} desde {date(first.date)}</span>}</div>
    {measured.length >= 4 ? <>
      <svg viewBox="0 0 600 130" role="img" aria-label={`Seguidores coletados em ${measured.length} dias, de ${number(first.followers)} para ${number(last.followers)}. Dias sem coleta ficam em branco.`}>
        {[25, 65, 105].map(y => <line key={y} x1="18" x2="582" y1={y} y2={y} className="analytics-gridline" />)}
        {history.map((p, i) => p.followers === null ? null : <g key={p.date}>
          {i > 0 && history[i - 1].followers !== null && <line x1={x(i - 1)} y1={y(history[i - 1].followers)} x2={x(i)} y2={y(p.followers)} className="analytics-line" />}
          <circle cx={x(i)} cy={y(p.followers)} r="4" className="analytics-point"><title>{date(p.date)}: {number(p.followers)} seguidores</title></circle>
        </g>)}
      </svg>
      <div className="analytics-axis"><span>{date(history[0].date)}</span><span>{date(history.at(-1).date)}</span></div>
    </> : <div className="analytics-history-empty"><Users size={22} /><p>{measured.length > 1 ? `${measured.length} coletas disponíveis. O gráfico aparece a partir de 4 dias medidos.` : 'Seu histórico começa nesta primeira coleta.'}<br /><span className="hint">Atualize em outros dias para acompanhar a evolução.</span></p></div>}
    <details className="analytics-data"><summary>Ver coletas por dia · horário UTC</summary><div className="analytics-dates">{history.map(p => <div key={p.date}><span>{date(p.date)}</span><b>{p.followers === null ? 'Sem coleta' : number(p.followers)}</b></div>)}</div></details>
  </section>;
}

export default function Analytics({ state, request, onInstagram, onNotice }) {
  const accounts = (state.composio?.accounts || []).filter(a => a.status === 'ACTIVE');
  const [account, setAccount] = useState(() => state.composio?.defaults?.find(id => accounts.some(a => a.id === id)) || accounts[0]?.id || '');
  const [days, setDays] = useState(7), [rank, setRank] = useState('saves'), [offset, setOffset] = useState(0);
  const [report, setReport] = useState(null), [loading, setLoading] = useState(false), [error, setError] = useState('');
  const [using, setUsing] = useState('');
  const generation = useRef(0);
  const profileId = state.profileId;
  useEffect(() => { if (!accounts.some(a => a.id === account)) setAccount(accounts[0]?.id || ''); }, [accounts.map(a => a.id).join(','), account]);
  const load = async (refresh = false) => {
    const n = ++generation.current;
    setLoading(true); setError('');
    try {
      const result = await request('instagramAnalytics', { account, days, refresh });
      if (generation.current === n) { setReport({ ...result, profileId }); setOffset(0); }
    } catch (error) { if (generation.current === n) setError(errorText(error)); }
    finally { if (generation.current === n) setLoading(false); }
  };
  useEffect(() => {
    setReport(null); setError(''); setOffset(0);
    if (account) void load();
    return () => { generation.current++; };
  }, [account, days, profileId]);
  const data = report?.accountId === account && report?.days === days && report?.profileId === profileId ? report : null;
  const ranked = [...(data?.posts || [])].sort((a, b) => (b[rank] ?? -1) - (a[rank] ?? -1) || Date.parse(b.timestamp) - Date.parse(a.timestamp));
  const selected = accounts.find(a => a.id === account);
  const usePost = async post => {
    const n = generation.current;
    setUsing(post.id);
    try {
      await request('importInstagramPost', { account, mediaId: post.id, days });
      if (generation.current === n) onNotice('Post salvo como referência. Você já pode gerar variações no Replicador.');
    } catch {} finally { setUsing(''); }
  };
  const replicate = async post => {
    setUsing(post.id);
    try {
      await request('replicateInstagram', { account, mediaId: post.id, days });
      onNotice('Variações criadas. Veja as ideias do Replicador no Início.');
    } catch {} finally { setUsing(''); }
  };
  const sources = state.analytics?.sources || [];
  return <section className="analytics" aria-label="Analytics do Instagram">
    <div className="section-head"><div><h2><BarChart3 size={20} /> Analytics</h2><p className="hint">Entenda o que funciona e transforme seus melhores posts em novas ideias.</p></div></div>
    {!accounts.length ? <div className="card-box analytics-empty"><BarChart3 size={30} /><h3>Os números da sua conta, aqui</h3><p className="hint">Conecte uma conta profissional do Instagram para ver o desempenho e usar posts no Replicador.</p><button className="btn primary" onClick={onInstagram}>Conectar Instagram</button></div> : <>
      <div className="analytics-toolbar">
        <label className="fld"><span>Conta do Instagram</span><select value={account} onChange={e => setAccount(e.target.value)}>{accounts.map(a => <option key={a.id} value={a.id}>@{a.username}</option>)}</select></label>
        <div className="seg" role="group" aria-label="Período do Analytics">{[7, 30].map(d => <button key={d} aria-pressed={days === d} onClick={() => setDays(d)}>Últimos {d} dias</button>)}</div>
        <button className="btn small" disabled={loading || !account} onClick={() => load(true)}><RefreshCw size={14} />{loading ? 'Atualizando…' : 'Atualizar'}</button>
      </div>
      {error && <div className="analytics-error" role="alert"><p>{error}</p><button className="btn small" disabled={loading} onClick={() => load(true)}>Tentar novamente</button></div>}
      {loading && !data && <div className="card-box analytics-empty" role="status"><Spinner /><p>Buscando os números de @{selected?.username}…</p></div>}
      {data && <>
        <div className="analytics-stamp"><span>@{data.username} · {date(new Date(data.since * 1000).toISOString())} a {date(new Date(data.until * 1000).toISOString())} · inclui hoje (UTC)</span><span>Coleta: {new Date(data.updatedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span></div>
        <div className="analytics-stats">{[['Alcance', data.metrics.reach, 'Contas únicas no período'], ['Visitas ao perfil', data.metrics.profileViews, 'No período selecionado'], ['Contas engajadas', data.metrics.engaged, 'Contas únicas no período'], ['Seguidores', data.followers, 'Total na última coleta']].map(([label, value, hint]) => <div className="card-box" key={label}><span>{label}</span><strong>{number(value)}</strong><small>{value === null ? 'Não disponibilizado' : hint}</small></div>)}</div>
        {data.warnings.length > 0 && <details className="analytics-data"><summary>Disponibilidade dos dados</summary>{data.warnings.map(w => <p className="hint" key={w}>{w}</p>)}</details>}
        <Followers history={data.history} />
        <section className="card-box analytics-ranking" aria-label="Ranking dos posts">
          <div className="section-head"><div><h2>Posts que mais funcionaram</h2><p className="hint">Publicados no período · números acumulados desde a publicação.</p></div><label className="analytics-sort"><span>Ordenar por</span><select value={rank} onChange={e => { setRank(e.target.value); setOffset(0); }}>{Object.entries(RANK).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
          {!ranked.length ? <p className="hint">{data.postsAvailable ? 'Nenhum post encontrado neste período. Experimente os últimos 30 dias.' : 'Os posts não puderam ser carregados. Use Atualizar para tentar novamente.'}</p> : <div className="analytics-posts">{ranked.slice(offset, offset + 5).map((post, i) => {
            const imported = sources.some(s => s.accountId === account && s.id === post.id);
            return <article className="analytics-post" key={post.id}>
              <span className="analytics-position">{offset + i + 1}</span>
              <div className="analytics-caption"><b>{post.caption.trim() || 'Post sem legenda disponível'}</b><small>{date(post.timestamp)} · {post.type === 'CAROUSEL_ALBUM' ? 'Carrossel' : post.productType === 'REELS' || post.type === 'VIDEO' ? 'Vídeo' : 'Imagem'}</small></div>
              <div className="analytics-post-metrics">{Object.entries(RANK).map(([key, label]) => <div className={rank === key ? 'selected' : ''} key={key}><b aria-label={`${label}: ${post[key] === null ? 'indisponível' : number(post[key])}`}>{number(post[key])}</b><small>{label}</small></div>)}</div>
              <div className="analytics-post-actions">{post.permalink && <button className="icon-only" aria-label={`Ver post de ${date(post.timestamp)} no Instagram`} onClick={() => request('openPermalink', { url: post.permalink }).catch(() => {})}><ExternalLink size={15} /></button>}<button className="btn small" disabled={!post.caption.trim() || Boolean(using) || (imported && (!state.account?.connected || Boolean(state.working)))} onClick={() => imported ? replicate(post) : usePost(post)}>{using === post.id ? <Spinner small /> : imported ? <ArrowRight size={14} /> : <Bookmark size={14} />}{imported ? 'Gerar variações' : 'Usar no Replicador'}</button></div>
            </article>;
          })}</div>}
          <div className="analytics-footer"><span className="hint">{data.truncated ? 'Ranking limitado aos 50 posts mais recentes do período.' : `${ranked.length} ${ranked.length === 1 ? 'post encontrado' : 'posts encontrados'}`} · — significa indisponível.</span>{ranked.length > 5 && <div className="row"><button className="btn small" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 5))}>Anterior</button><span className="hint">{Math.floor(offset / 5) + 1} / {Math.ceil(ranked.length / 5)}</span><button className="btn small" disabled={offset + 5 >= ranked.length} onClick={() => setOffset(offset + 5)}>Próximos</button></div>}</div>
          {!state.account?.connected && <p className="hint">Você pode salvar referências agora. Conecte sua conta ChatGPT para gerar as variações.</p>}
        </section>
      </>}
    </>}
  </section>;
}
