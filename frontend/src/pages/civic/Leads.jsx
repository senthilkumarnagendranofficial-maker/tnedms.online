import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Phone, MessageCircle, StickyNote, Search, X, Download, Shuffle, UserCheck } from 'lucide-react';
import api from '../../api/client.js';
import { PageHeader, Card, Pill, Segmented, inr } from '../../civic/kit.jsx';
import { DataTable, Pager, Select, Button, RowMenu, Modal, Textarea, Field, csvOf, download, fmtDate, fmtDateTime, waLink } from '../../civic/ui.jsx';

// Incomplete registrations (Ram, 2026-10-15): everyone who messaged the WhatsApp bot or finished step 1 of the website
// form but has not registered. Kept until someone marks them Interested or Not interested; a finished registration
// moves to Registered by itself. Super Admin only (full phone numbers, for calling back).
const PAGE_SIZE = 25;
const TABS = [['open', 'To follow up'], ['interested', 'Interested'], ['not_interested', 'Not interested'], ['registered', 'Registered']];
const STATUS = { new: 'Not contacted', contacted: 'Contacted', interested: 'Interested', not_interested: 'Not interested' };
const SOURCE = { whatsapp: 'WhatsApp', website: 'Website' };

export default function Leads({ isTeam = false }) {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'open';
  const page = Math.max(1, Number(params.get('page') || 1));
  const source = params.get('source') || '';
  const search = params.get('search') || '';
  const [draft, setDraft] = useState(search);
  const [data, setData] = useState({ rows: [], total: 0, counts: {}, last_rank: 7 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState('');
  const [noteFor, setNoteFor] = useState(null);
  const [note, setNote] = useState('');
  const [tick, setTick] = useState(0);
  const [msg, setMsg] = useState('');
  // Admin-only: assign incomplete leads to telecallers (round-robin / manual).
  // /crm/agents is adminOnly, so a successful fetch also tells us the user is admin.
  const [agents, setAgents] = useState(null); // null = not admin / unknown; array = admin
  const isAdmin = Array.isArray(agents);
  const [assignFor, setAssignFor] = useState(null); // the lead row being assigned
  const [assignTo, setAssignTo] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get('/crm/agents').then(({ data }) => setAgents(data.agents || [])).catch(() => setAgents(null)); }, []);

  const distribute = () => {
    if (!window.confirm('Distribute all open incomplete leads across active telecallers (round-robin)?')) return;
    setBusy(true); setErr(''); setMsg('');
    api.post('/crm/leads/distribute', {})
      .then(({ data }) => { setMsg(data.message || 'Distributed.'); setTick((t) => t + 1); })
      .catch((e) => setErr(e.response?.data?.message || 'Could not distribute leads.'))
      .finally(() => setBusy(false));
  };
  const assignLead = () => {
    if (!assignFor || !assignTo) return;
    setBusy(true); setErr(''); setMsg('');
    api.post(`/crm/leads/${assignFor.mobile}/assign`, { agent_id: assignTo })
      .then(({ data }) => { setMsg(data.message || 'Assigned.'); setAssignFor(null); setTick((t) => t + 1); })
      .catch((e) => setErr(e.response?.data?.message || 'Could not assign lead.'))
      .finally(() => setBusy(false));
  };

  useEffect(() => { setDraft(search); }, [search]);
  useEffect(() => {
    let alive = true;
    setLoading(true); setErr('');
    api.get('/leads', { params: { tab, page, pageSize: PAGE_SIZE, source, search } })
      .then(({ data: d }) => { if (alive) setData(d.success ? d : { rows: [], total: 0, counts: {} }); })
      .catch((e) => alive && setErr(e.response?.data?.message || 'Could not load the list.'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [tab, page, source, search, tick]);

  const go = (next) => {
    const p = new URLSearchParams();
    const v = { tab, source, search, ...next };
    Object.entries(v).forEach(([k, x]) => x && !(k === 'tab' && x === 'open') && p.set(k, x));
    setParams(p);
  };
  const save = async (lead, body) => {
    setSaving(lead._id); setErr('');
    try { await api.put(`/leads/${lead._id}`, body); setTick((t) => t + 1); return true; }
    catch (e) { setErr(e.response?.data?.message || 'Could not save.'); return false; }
    finally { setSaving(''); }
  };

  const columns = [
    { key: 'name', label: 'Person', primary: true, wrap: 140, render: (r) => (
      <div className="cv-two">
        <strong>{r.name || <span className="cv-muted">No name given</span>}</strong>
        <span className="cv-muted"><span className="cv-mono-sm">{r.mobile}</span></span>
      </div>
    ) },
    { key: 'source', label: 'Source', wrap: 100, render: (r) => {
      const srcs = Array.isArray(r.sources) && r.sources.length ? r.sources : (r.source ? [r.source] : ['website']);
      const hasWa = srcs.some((s) => String(s).toLowerCase().includes('whatsapp'));
      const hasWeb = srcs.some((s) => String(s).toLowerCase().includes('web'));
      if (hasWa && hasWeb) {
        return (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Pill tone="ok">WhatsApp</Pill>
            <Pill tone="info">Website</Pill>
          </div>
        );
      }
      if (hasWa) return <Pill tone="ok">WhatsApp</Pill>;
      return <Pill tone="info">Website</Pill>;
    } },
    { key: 'step', label: 'How far they got', wrap: 150, render: (r) => (
      <div className="cv-two">
        <span>{r.step_label}</span>
        <span className="cv-muted">{r.step_rank > 0 ? `step ${r.step_rank} of ${data.last_rank}` : 'first message only'}</span>
      </div>
    ) },
    { key: 'last_seen', label: 'Last active', mobile: false, render: (r) => (
      <div className="cv-two"><span className="cv-nowrap">{fmtDateTime(r.last_seen)}</span><span className="cv-muted cv-nowrap">first {fmtDate(r.first_seen)}</span></div>
    ) },
    { key: 'status', label: 'Status', render: (r) => (r.registered_at
      ? <Pill tone="ok" dot>Registered {fmtDate(r.registered_at)}</Pill>
      : (
        <span onClick={(e) => e.stopPropagation()}>
          <Select value={r.status} disabled={saving === r._id} onChange={(e) => save(r, { status: e.target.value })} aria-label={`Status of ${r.name || r.mobile}`} className="lead-status">
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </span>
      )) },
    { key: 'note', label: 'Last note', medium: false, mobile: false, wrap: 160, render: (r) => {
      const last = r.notes?.[r.notes.length - 1];
      return last ? <div className="cv-two"><span>{last.text.length > 70 ? `${last.text.slice(0, 70)}…` : last.text}</span><span className="cv-muted">{fmtDate(last.at)}{r.notes.length > 1 ? ` · ${r.notes.length} notes` : ''}</span></div> : <span className="cv-td-quiet">—</span>;
    } },
    { key: 'assigned', label: 'Telecaller', mobile: false, render: (r) => (r.assigned_agent_name ? <Pill tone="info">{r.assigned_agent_name}</Pill> : <span className="cv-td-quiet">—</span>) },
    { key: 'actions', label: '', render: (r) => (
      <RowMenu items={[
        isAdmin && { label: 'Assign to telecaller', icon: UserCheck, onClick: () => { setAssignFor(r); setAssignTo(''); } },
        { label: 'Call', icon: Phone, href: `tel:${r.mobile}` },
        { label: 'WhatsApp', icon: MessageCircle, href: waLink(r.mobile), external: true },
        { label: 'Add a note', icon: StickyNote, onClick: () => { setNoteFor(r); setNote(''); } },
      ]} />
    ) },
  ];

  const exportCsv = async () => {
    const { data: d } = await api.get('/leads', { params: { tab, source, search, page: 1, pageSize: 200 } });
    const rows = (d.rows || []).map((r) => ({ name: r.name, mobile: r.mobile, source: (r.sources || []).join('+'), how_far: r.step_label, status: r.registered_at ? 'Registered' : STATUS[r.status], first_contact: r.first_seen, last_active: r.last_seen, last_note: r.notes?.[r.notes.length - 1]?.text || '' }));
    download(`incomplete-registrations-${tab}.csv`, csvOf(rows, ['name', 'mobile', 'source', 'how_far', 'status', 'first_contact', 'last_active', 'last_note']));
  };
  const c = data.counts || {};

  return (
    <div className="cv-page">
      <PageHeader
        eyebrow={isTeam ? 'Follow-up' : undefined}
        title="Incomplete registrations"
        subtitle={loading && !data.rows.length ? 'Loading…' : `${inr(c.open || 0)} ${c.open === 1 ? 'person' : 'people'} to follow up · messaged the WhatsApp bot or started the website form but did not finish`}
        actions={(
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {isAdmin && <Button variant="ghost" icon={Shuffle} onClick={distribute} disabled={busy}>Distribute (round-robin)</Button>}
            <Button variant="ghost" icon={Download} onClick={exportCsv}>Export CSV</Button>
          </div>
        )}
      />
      <Card flush>
        <div className="cv-filters">
          <Segmented options={TABS.map(([k, label]) => ({ id: k, label: `${label} ${inr(c[k] || 0)}` }))} value={tab} onChange={(k) => go({ tab: k, page: '' })} />
        </div>
        <form className="cv-filters" onSubmit={(e) => { e.preventDefault(); go({ search: draft.trim(), page: '' }); }}>
          <label className="cv-search cv-filters-search">
            <Search size={15} />
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Name or mobile…" aria-label="Search" />
          </label>
          <Select value={source} onChange={(e) => go({ source: e.target.value, page: '' })} aria-label="Source">
            <option value="">WhatsApp & website</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="website">Website</option>
          </Select>
          <Button type="submit">Search</Button>
          {(search || source) && <Button variant="ghost" icon={X} onClick={() => go({ search: '', source: '', page: '' })}>Clear</Button>}
        </form>
        {err && <div className="cv-alert cv-alert--bad" style={{ margin: 16 }}>{err}</div>}
        {msg && <div className="cv-alert cv-alert--ok" style={{ margin: 16 }} onClick={() => setMsg('')}>{msg}</div>}
        <DataTable columns={columns} rows={data.rows} rowKey={(r) => r._id} loading={loading}
          empty={tab === 'open' ? 'Nobody to follow up right now.' : tab === 'registered' ? 'Nobody from this list has registered yet.' : `Nobody marked ${TABS.find(([k]) => k === tab)[1].toLowerCase()} yet.`} />
        <Pager page={page} pageSize={PAGE_SIZE} total={data.total} onPage={(p) => go({ page: String(p) })} />
      </Card>

      <Modal open={!!assignFor} title={assignFor ? `Assign to telecaller · ${assignFor.name || assignFor.mobile}` : ''} onClose={() => setAssignFor(null)}>
        <Field label="Telecaller" hint="The lead moves into this telecaller's inbox. A conversation is created if one doesn't exist yet.">
          <Select data-autofocus value={assignTo} onChange={(e) => setAssignTo(e.target.value)} aria-label="Telecaller">
            <option value="">Select a telecaller…</option>
            {(agents || []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </Field>
        <div className="cv-modal-actions"><Button onClick={assignLead} disabled={!assignTo || busy}>{busy ? 'Assigning…' : 'Assign'}</Button></div>
      </Modal>

      <Modal open={!!noteFor} title={noteFor ? `Note · ${noteFor.name || noteFor.mobile}` : ''} onClose={() => setNoteFor(null)}>
        {noteFor?.notes?.length > 0 && (
          <ul className="lead-notes">
            {noteFor.notes.map((n, i) => <li key={i}><span>{n.text}</span><small className="cv-muted">{fmtDateTime(n.at)} · {n.by}</small></li>)}
          </ul>
        )}
        <form onSubmit={async (e) => { e.preventDefault(); if (note.trim() && await save(noteFor, { note })) setNoteFor(null); }}>
          <Field label="New note"><Textarea data-autofocus rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did they say? When to call again?" /></Field>
          <div className="cv-modal-actions"><Button type="submit" disabled={!note.trim() || saving === noteFor?._id}>Save note</Button></div>
        </form>
      </Modal>
    </div>
  );
}
