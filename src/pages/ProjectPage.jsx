import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSite } from '../context/SiteContext.jsx';
import { useProjects } from '../context/ProjectsContext.jsx';
import usePageTitle from '../hooks/usePageTitle.js';
import NotFound from './NotFound.jsx';

function Lightbox({ images, index, onClose, onChange }) {
  const img = images[index];
  const prev = useCallback(() => onChange((index + images.length - 1) % images.length), [index, images.length, onChange]);
  const next = useCallback(() => onChange((index + 1) % images.length), [index, images.length, onChange]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, prev, next]);

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Image viewer" onClick={onClose}>
      <img src={img.url} alt="" onClick={(e) => e.stopPropagation()} />
      <button type="button" className="lb-btn lb-close" aria-label="Close" onClick={onClose}>
        ×
      </button>
      {images.length > 1 && (
        <>
          <button type="button" className="lb-btn lb-prev" aria-label="Previous image" onClick={(e) => { e.stopPropagation(); prev(); }}>
            ‹
          </button>
          <button type="button" className="lb-btn lb-next" aria-label="Next image" onClick={(e) => { e.stopPropagation(); next(); }}>
            ›
          </button>
        </>
      )}
    </div>
  );
}

export default function ProjectPage() {
  const { slug } = useParams();
  const { settings } = useSite();
  const { projects, loading } = useProjects();
  const [viewer, setViewer] = useState(-1);
  const project = projects.find((p) => p.slug === slug);
  usePageTitle(project ? `${project.title} · ${settings.name}` : undefined);

  useEffect(() => {
    setViewer(-1);
    window.scrollTo(0, 0);
  }, [slug]);

  if (loading) return null;
  if (!project) return <NotFound />;

  const images = project.images || [];
  const main = images[0];
  const portrait = Boolean(main && main.width && main.height && main.height > main.width);
  const gallery = images.slice(1);
  const details = (project.fields || []).filter((f) => f.label && f.value);

  const shared = (p) => (p.categories || []).filter((c) => (project.categories || []).includes(c)).length;
  const related = projects
    .filter((p) => p.id !== project.id)
    .sort((a, b) => shared(b) - shared(a) || String(a.title).localeCompare(String(b.title)))
    .slice(0, 3);

  return (
    <article>
      <header className="project-head">
        <h1>{project.title}</h1>
        {project.location && <p>{project.location}</p>}
      </header>

      <div className="project-top">
        <div className={portrait ? 'project-main portrait' : 'project-main'}>
          {main ? (
            <button type="button" className="zoom" onClick={() => setViewer(0)} aria-label="Open image">
              <img
                src={main.url}
                alt={project.title}
                width={main.width}
                height={main.height}
                style={portrait ? { height: `min(85vh, 900px, ${main.height}px)` } : undefined}
              />
            </button>
          ) : (
            <div className="cover cover-empty" />
          )}
        </div>
        <dl className="project-details">
          {details.map((f, i) => (
            <div key={i}>
              <dt>{f.label}:</dt> <dd>{f.value}</dd>
            </div>
          ))}
          {project.year && (
            <div>
              <dt>Year Created:</dt> <dd>{project.year}</dd>
            </div>
          )}
        </dl>
      </div>

      {gallery.length > 0 && (
        <div className="gallery">
          {gallery.map((img, i) => (
            <button type="button" className="zoom" key={img.id} onClick={() => setViewer(i + 1)} aria-label={`Open image ${i + 2}`}>
              <img src={img.thumbUrl || img.url} alt="" width={img.width} height={img.height} loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}

      {related.length > 0 && (
        <section className="related">
          <h2>You may also like</h2>
          <div className="related-grid">
            {related.map((p) => (
              <Link key={p.id} to={`/project/${p.slug}`} className="card">
                <div className="media">
                  {p.images?.[0] ? (
                    <img className="cover" src={p.images[0].thumbUrl || p.images[0].url} alt={p.title} loading="lazy" decoding="async" />
                  ) : (
                    <div className="cover cover-empty" />
                  )}
                </div>
                <div className="caption">
                  <h3>{p.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {viewer >= 0 && <Lightbox images={images} index={viewer} onClose={() => setViewer(-1)} onChange={setViewer} />}
    </article>
  );
}
