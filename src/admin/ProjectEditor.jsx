import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useSite } from '../context/SiteContext.jsx';
import { slugify } from '../lib/slug.js';
import { deleteImageFiles, deleteProjectFiles } from '../lib/image.js';
import ImageUploader from './ImageUploader.jsx';
import SortableList from './SortableList.jsx';

export default function ProjectEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSite();
  const categories = settings.menus.filter((m) => m.kind === 'projects');

  const [p, setP] = useState(null); // null = loading, false = not found
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState({ type: '', text: '' });
  const imagesRef = useRef([]);
  imagesRef.current = p ? p.images || [] : [];

  useEffect(() => {
    let live = true;
    getDoc(doc(db, 'projects', id))
      .then((s) => live && setP(s.exists() ? { id, ...s.data() } : false))
      .catch((e) => {
        if (live) {
          setP(false);
          setNote({ type: 'error', text: e.message });
        }
      });
    return () => {
      live = false;
    };
  }, [id]);

  const set = (patch) => setP((prev) => ({ ...prev, ...patch }));

  const persistImages = async (images) => {
    set({ images });
    await updateDoc(doc(db, 'projects', id), { images, updatedAt: serverTimestamp() });
  };

  const onUploaded = async (newImages) => {
    try {
      await persistImages([...imagesRef.current, ...newImages]);
    } catch (e) {
      setNote({ type: 'error', text: e.message });
    }
  };

  const removeImage = async (img) => {
    if (!window.confirm('Delete this image? This cannot be undone.')) return;
    try {
      await deleteImageFiles(img);
      await persistImages(imagesRef.current.filter((i) => i.id !== img.id));
    } catch (e) {
      setNote({ type: 'error', text: e.message });
    }
  };

  const makeCover = async (img) => {
    try {
      await persistImages([img, ...imagesRef.current.filter((i) => i.id !== img.id)]);
    } catch (e) {
      setNote({ type: 'error', text: e.message });
    }
  };

  const reorderImages = async (next) => {
    try {
      await persistImages(next);
    } catch (e) {
      setNote({ type: 'error', text: e.message });
    }
  };

  const toggleCategory = (catId) => {
    const has = (p.categories || []).includes(catId);
    set({ categories: has ? p.categories.filter((c) => c !== catId) : [...(p.categories || []), catId] });
  };

  const setField = (i, patch) => set({ fields: p.fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)) });

  const save = async () => {
    setNote({ type: '', text: '' });
    const title = p.title.trim();
    const slug = slugify(p.slug || title);
    if (!title) return setNote({ type: 'error', text: 'Please enter a title.' });
    if (!slug) return setNote({ type: 'error', text: 'Please enter a URL name (letters and numbers).' });
    if (['admin', 'project'].includes(slug)) return setNote({ type: 'error', text: 'That URL name is reserved.' });

    setSaving(true);
    try {
      const clash = await getDocs(query(collection(db, 'projects'), where('slug', '==', slug)));
      if (clash.docs.some((d) => d.id !== id)) {
        setNote({ type: 'error', text: 'Another project already uses that URL name. Please change it.' });
        return;
      }
      // Give newly added categories a position at the end of their list.
      const orders = { ...(p.orders || {}) };
      const missing = (p.categories || []).filter((c) => orders[c] === undefined);
      if (missing.length) {
        const all = await getDocs(collection(db, 'projects'));
        missing.forEach((c) => {
          const max = all.docs.reduce((m, d) => Math.max(m, d.data().orders?.[c] ?? -1), -1);
          orders[c] = max + 1;
        });
      }
      const fields = (p.fields || []).filter((f) => f.label.trim()).map((f) => ({ label: f.label.trim(), value: f.value.trim() }));
      await updateDoc(doc(db, 'projects', id), {
        title,
        slug,
        year: String(p.year || '').trim(),
        location: String(p.location || '').trim(),
        categories: p.categories || [],
        orders,
        fields,
        published: Boolean(p.published),
        updatedAt: serverTimestamp(),
      });
      set({ title, slug, orders, fields });
      setNote({ type: 'ok', text: 'Saved.' });
    } catch (e) {
      setNote({ type: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const removeProject = async () => {
    const n = imagesRef.current.length;
    if (!window.confirm(`Delete "${p.title}" and all ${n} of its image${n === 1 ? '' : 's'}? This cannot be undone.`)) return;
    try {
      await deleteProjectFiles(id);
      await deleteDoc(doc(db, 'projects', id));
      navigate('/admin/projects', { replace: true });
    } catch (e) {
      setNote({ type: 'error', text: e.message });
    }
  };

  if (p === null) return <p className="muted">Loading…</p>;
  if (p === false) {
    return (
      <div>
        <p className="error">Project not found.</p>
        <Link to="/admin/projects">← Back to projects</Link>
      </div>
    );
  }

  const images = p.images || [];

  return (
    <div>
      <div className="page-head">
        <div>
          <Link to="/admin/projects" className="muted">
            ← All projects
          </Link>
          <h1>{p.title || 'Untitled project'}</h1>
        </div>
        <div className="actions">
          {p.published && (
            <Link className="btn" to={`/project/${p.slug}`} target="_blank" rel="noreferrer">
              View ↗
            </Link>
          )}
          <button className="btn primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {note.text && (
        <p className={note.type === 'error' ? 'error' : 'ok'} role={note.type === 'error' ? 'alert' : 'status'}>
          {note.text}
        </p>
      )}

      <section className="panel">
        <h2>Details</h2>
        <div className="form-grid">
          <div>
            <label className="lbl" htmlFor="p-title">
              Title
            </label>
            <input id="p-title" value={p.title} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div>
            <label className="lbl" htmlFor="p-slug">
              URL name
            </label>
            <input id="p-slug" value={p.slug} onChange={(e) => set({ slug: e.target.value })} />
            <span className="hint">/project/{slugify(p.slug)}</span>
          </div>
          <div>
            <label className="lbl" htmlFor="p-year">
              Year
            </label>
            <input id="p-year" value={p.year || ''} onChange={(e) => set({ year: e.target.value })} placeholder="2026" />
          </div>
          <div>
            <label className="lbl" htmlFor="p-loc">
              Location
            </label>
            <input id="p-loc" value={p.location || ''} onChange={(e) => set({ location: e.target.value })} placeholder="Tawa, Wellington" />
          </div>
        </div>

        <fieldset className="checks">
          <legend className="lbl">Shown on</legend>
          {categories.map((c) => (
            <label key={c.id} className="check">
              <input type="checkbox" checked={(p.categories || []).includes(c.id)} onChange={() => toggleCategory(c.id)} />
              {c.label}
            </label>
          ))}
          {categories.length === 0 && <span className="muted">Add a project list menu in “Site, menus &amp; design” first.</span>}
        </fieldset>

        <label className="check">
          <input type="checkbox" checked={Boolean(p.published)} onChange={(e) => set({ published: e.target.checked })} />
          Published (visible on the website)
        </label>
      </section>

      <section className="panel">
        <h2>Project fields</h2>
        <p className="muted">These appear next to the main image on the project page. Rename, add or remove them as you like. “Year Created” is added automatically from the Year above.</p>
        {(p.fields || []).map((f, i) => (
          <div className="field-row" key={i}>
            <input aria-label="Field name" placeholder="Field name" value={f.label} onChange={(e) => setField(i, { label: e.target.value })} />
            <input aria-label="Field value" placeholder="Value" value={f.value} onChange={(e) => setField(i, { value: e.target.value })} />
            <button type="button" className="btn small danger" onClick={() => set({ fields: p.fields.filter((_, idx) => idx !== i) })}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="btn small" onClick={() => set({ fields: [...(p.fields || []), { label: '', value: '' }] })}>
          + Add field
        </button>
      </section>

      <section className="panel">
        <h2>Images</h2>
        <p className="muted">The first image is the cover and the large image on the project page. Drag to reorder, or use “Make cover”.</p>
        <ImageUploader projectId={id} onUploaded={onUploaded} />
        {images.length > 0 && (
          <SortableList
            grid
            className="igrid"
            items={images}
            onReorder={reorderImages}
            renderItem={(img, handle) => (
              <figure className="iitem">
                <button type="button" className="ihandle" aria-label="Drag to reorder" {...handle}>
                  <img src={img.thumbUrl || img.url} alt={img.name || ''} />
                </button>
                {images[0].id === img.id && <span className="badge">Cover</span>}
                <figcaption>
                  {images[0].id !== img.id && (
                    <button type="button" className="btn small" onClick={() => makeCover(img)}>
                      Make cover
                    </button>
                  )}
                  <button type="button" className="btn small danger" onClick={() => removeImage(img)}>
                    Delete
                  </button>
                </figcaption>
              </figure>
            )}
          />
        )}
      </section>

      <section className="panel danger-zone">
        <h2>Delete project</h2>
        <p className="muted">Removes the project and permanently deletes all of its images from storage.</p>
        <button type="button" className="btn danger" onClick={removeProject}>
          Delete project and images
        </button>
      </section>
    </div>
  );
}
