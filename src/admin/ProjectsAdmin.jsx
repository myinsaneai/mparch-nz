import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useSite } from '../context/SiteContext.jsx';
import { sortForCategory } from '../context/ProjectsContext.jsx';
import { DEFAULT_FIELD_LABELS } from '../lib/defaults.js';
import { deleteProjectFiles } from '../lib/image.js';
import SortableList from './SortableList.jsx';

export default function ProjectsAdmin() {
  const { settings } = useSite();
  const navigate = useNavigate();
  const categories = settings.menus.filter((m) => m.kind === 'projects');
  const [projects, setProjects] = useState([]);
  const [cat, setCat] = useState(categories[0]?.id || 'all');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    return onSnapshot(
      collection(db, 'projects'),
      (snap) => setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => setError(e.message)
    );
  }, []);

  const list = useMemo(() => {
    if (cat === 'all') return [...projects].sort((a, b) => String(a.title).localeCompare(String(b.title)));
    return sortForCategory(projects, cat);
  }, [projects, cat]);

  const catLabel = (id) => categories.find((c) => c.id === id)?.label || id;

  const reorder = async (next) => {
    setError('');
    try {
      const batch = writeBatch(db);
      next.forEach((p, i) => batch.update(doc(db, 'projects', p.id), { [`orders.${cat}`]: i }));
      await batch.commit();
    } catch (e) {
      setError(e.message);
    }
  };

  const create = async () => {
    setError('');
    try {
      const ref = doc(collection(db, 'projects'));
      const target = cat === 'all' ? categories[0]?.id : cat;
      const max = sortForCategory(projects, target).reduce((m, p) => Math.max(m, p.orders?.[target] ?? -1), -1);
      await setDoc(ref, {
        title: 'Untitled project',
        slug: `untitled-${ref.id.slice(0, 6).toLowerCase()}`,
        year: '',
        location: '',
        categories: target ? [target] : [],
        orders: target ? { [target]: max + 1 } : {},
        fields: DEFAULT_FIELD_LABELS.map((label) => ({ label, value: '' })),
        images: [],
        published: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      navigate(`/admin/projects/${ref.id}`);
    } catch (e) {
      setError(e.message);
    }
  };

  const togglePublished = async (p) => {
    try {
      await updateDoc(doc(db, 'projects', p.id), { published: !p.published, updatedAt: serverTimestamp() });
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async (p) => {
    const n = p.images?.length || 0;
    const ok = window.confirm(
      `Delete "${p.title}" and all ${n} of its image${n === 1 ? '' : 's'}? This cannot be undone.`
    );
    if (!ok) return;
    setBusyId(p.id);
    setError('');
    try {
      await deleteProjectFiles(p.id);
      await deleteDoc(doc(db, 'projects', p.id));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId('');
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>Projects</h1>
        <button className="btn primary" onClick={create}>
          + New project
        </button>
      </div>

      <div className="tabs" role="tablist" aria-label="Category">
        {categories.map((c) => (
          <button key={c.id} role="tab" aria-selected={cat === c.id} className={cat === c.id ? 'tab on' : 'tab'} onClick={() => setCat(c.id)}>
            {c.label}
          </button>
        ))}
        <button role="tab" aria-selected={cat === 'all'} className={cat === 'all' ? 'tab on' : 'tab'} onClick={() => setCat('all')}>
          All projects
        </button>
      </div>

      {cat !== 'all' && list.length > 1 && <p className="muted">Drag the handle to change the order projects appear in on the “{catLabel(cat)}” page.</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {list.length === 0 && <p className="muted">No projects here yet.</p>}

      <SortableList
        className="plist"
        items={list}
        disabled={cat === 'all'}
        onReorder={reorder}
        renderItem={(p, handle) => (
          <div className="prow">
            <button className="handle" aria-label={`Drag ${p.title}`} disabled={cat === 'all'} {...handle}>
              ⠿
            </button>
            <div className="pthumb">{p.images?.[0] ? <img src={p.images[0].thumbUrl || p.images[0].url} alt="" /> : <span className="muted">No image</span>}</div>
            <div className="pinfo">
              <Link to={`/admin/projects/${p.id}`} className="ptitle">
                {p.title}
              </Link>
              <div className="muted">
                {(p.categories || []).map(catLabel).join(', ') || 'No category'}
                {p.year ? ` · ${p.year}` : ''} · {p.images?.length || 0} image{(p.images?.length || 0) === 1 ? '' : 's'}
              </div>
            </div>
            <label className="switch">
              <input type="checkbox" checked={Boolean(p.published)} onChange={() => togglePublished(p)} />
              <span>{p.published ? 'Published' : 'Draft'}</span>
            </label>
            <Link className="btn small" to={`/admin/projects/${p.id}`}>
              Edit
            </Link>
            <button className="btn small danger" disabled={busyId === p.id} onClick={() => remove(p)}>
              {busyId === p.id ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        )}
      />
    </div>
  );
}
