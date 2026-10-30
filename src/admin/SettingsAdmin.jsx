import React, { useEffect, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useSite } from '../context/SiteContext.jsx';
import { RESERVED_PATHS } from '../lib/defaults.js';
import { THEMES } from '../lib/themes.js';
import { shortId, slugify } from '../lib/slug.js';

const KINDS = [
  { value: 'projects', label: 'Project list' },
  { value: 'page', label: 'Text page' },
  { value: 'contact', label: 'Contact form' },
];

export default function SettingsAdmin() {
  const { settings, ready } = useSite();
  const [form, setForm] = useState(null);
  const [note, setNote] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (ready && !form) {
      setForm({
        name: settings.name,
        subtitle: settings.subtitle,
        menus: settings.menus.map((m) => ({ ...m })),
      });
    }
  }, [ready, settings, form]);

  if (!form) return <p className="muted">Loading…</p>;

  const setMenu = (i, patch) => setForm((f) => ({ ...f, menus: f.menus.map((m, idx) => (idx === i ? { ...m, ...patch } : m)) }));
  const move = (i, d) =>
    setForm((f) => {
      const menus = [...f.menus];
      const j = i + d;
      if (j < 0 || j >= menus.length) return f;
      [menus[i], menus[j]] = [menus[j], menus[i]];
      return { ...f, menus };
    });
  const addMenu = () =>
    setForm((f) => ({
      ...f,
      menus: [...f.menus, { id: `menu-${shortId(5)}`, label: 'New menu', path: `new-menu-${shortId(3)}`, kind: 'page', content: '' }],
    }));
  const removeMenu = (i) => {
    const m = form.menus[i];
    if (!window.confirm(`Remove the “${m.label}” menu? Projects are kept but will no longer appear on it.`)) return;
    setForm((f) => ({ ...f, menus: f.menus.filter((_, idx) => idx !== i) }));
  };

  const chooseTheme = async (id) => {
    setNote({ type: '', text: '' });
    try {
      // Saved straight away: every visitor's page switches live.
      await setDoc(doc(db, 'settings', 'site'), { theme: id }, { merge: true });
      setNote({ type: 'ok', text: `Design switched to “${THEMES[id].label}”.` });
    } catch (e) {
      setNote({ type: 'error', text: e.message });
    }
  };

  const save = async () => {
    setNote({ type: '', text: '' });
    const menus = form.menus.map((m) => ({ ...m, label: m.label.trim(), path: slugify(m.path || m.label) }));
    const paths = new Set();
    for (const m of menus) {
      if (!m.label) return setNote({ type: 'error', text: 'Every menu needs a name.' });
      if (!m.path) return setNote({ type: 'error', text: `Menu “${m.label}” needs a URL name.` });
      if (RESERVED_PATHS.includes(m.path)) return setNote({ type: 'error', text: `“${m.path}” is reserved. Choose another URL name.` });
      if (paths.has(m.path)) return setNote({ type: 'error', text: `Two menus use the URL name “${m.path}”.` });
      paths.add(m.path);
    }
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'site'), { name: form.name.trim(), subtitle: form.subtitle.trim(), menus }, { merge: true });
      setForm((f) => ({ ...f, menus }));
      setNote({ type: 'ok', text: 'Saved.' });
    } catch (e) {
      setNote({ type: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>Site, menus &amp; design</h1>
        <button className="btn primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
      {note.text && (
        <p className={note.type === 'error' ? 'error' : 'ok'} role={note.type === 'error' ? 'alert' : 'status'}>
          {note.text}
        </p>
      )}

      <section className="panel">
        <h2>Design</h2>
        <p className="muted">Pick a look. It applies to the live site immediately.</p>
        <div className="themes">
          {Object.entries(THEMES).map(([id, t]) => (
            <button key={id} type="button" className={settings.theme === id ? 'theme on' : 'theme'} aria-pressed={settings.theme === id} onClick={() => chooseTheme(id)}>
              <span className="swatches" aria-hidden="true">
                {t.swatch.map((c, i) => (
                  <span key={i} style={{ background: c }} />
                ))}
              </span>
              <strong>{t.label}</strong>
              <span className="muted">{t.blurb}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Site</h2>
        <div className="form-grid">
          <div>
            <label className="lbl" htmlFor="s-name">
              Name
            </label>
            <input id="s-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="lbl" htmlFor="s-sub">
              Subtitle
            </label>
            <input id="s-sub" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Menus</h2>
        <p className="muted">Each menu gets its own link. A project list is also a category projects can be added to.</p>
        {form.menus.map((m, i) => (
          <div className="menu-row" key={m.id}>
            <div className="form-grid">
              <div>
                <label className="lbl" htmlFor={`m-label-${i}`}>
                  Name
                </label>
                <input id={`m-label-${i}`} value={m.label} onChange={(e) => setMenu(i, { label: e.target.value })} />
              </div>
              <div>
                <label className="lbl" htmlFor={`m-path-${i}`}>
                  URL name
                </label>
                <input id={`m-path-${i}`} value={m.path} onChange={(e) => setMenu(i, { path: e.target.value })} />
                <span className="hint">/{slugify(m.path)}</span>
              </div>
              <div>
                <label className="lbl" htmlFor={`m-kind-${i}`}>
                  Type
                </label>
                <select id={`m-kind-${i}`} value={m.kind} onChange={(e) => setMenu(i, { kind: e.target.value })}>
                  {KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {m.kind === 'page' && (
              <div>
                <label className="lbl" htmlFor={`m-content-${i}`}>
                  Page text (blank line between paragraphs)
                </label>
                <textarea id={`m-content-${i}`} rows={5} value={m.content || ''} onChange={(e) => setMenu(i, { content: e.target.value })} />
              </div>
            )}
            <div className="actions">
              <button type="button" className="btn small" onClick={() => move(i, -1)} disabled={i === 0}>
                ↑ Up
              </button>
              <button type="button" className="btn small" onClick={() => move(i, 1)} disabled={i === form.menus.length - 1}>
                ↓ Down
              </button>
              <button type="button" className="btn small danger" onClick={() => removeMenu(i)}>
                Remove
              </button>
            </div>
          </div>
        ))}
        <button type="button" className="btn" onClick={addMenu}>
          + Add menu
        </button>
      </section>
    </div>
  );
}
