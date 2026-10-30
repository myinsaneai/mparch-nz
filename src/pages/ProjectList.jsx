import React from 'react';
import { Link } from 'react-router-dom';
import { useSite } from '../context/SiteContext.jsx';
import { useProjects } from '../context/ProjectsContext.jsx';
import usePageTitle from '../hooks/usePageTitle.js';

function Cover({ project, full = false }) {
  const img = project.images?.[0];
  if (!img) return <div className="cover cover-empty" aria-hidden="true" />;
  return (
    <img
      className="cover"
      src={full ? img.url : img.thumbUrl || img.url}
      alt={project.title}
      width={img.width}
      height={img.height}
      loading="lazy"
      decoding="async"
    />
  );
}

function Rows({ projects }) {
  return (
    <div className="rows">
      {projects.map((p) => (
        <Link key={p.id} to={`/project/${p.slug}`} className="row">
          <div className="media">
            <Cover project={p} />
          </div>
          <div className="caption">
            <h2>{p.title}</h2>
            {p.year && <span className="meta">{p.year}</span>}
          </div>
        </Link>
      ))}
    </div>
  );
}

function Grid({ projects }) {
  return (
    <div className="grid">
      {projects.map((p) => (
        <Link key={p.id} to={`/project/${p.slug}`} className="card">
          <div className="media">
            <Cover project={p} />
          </div>
          <div className="caption">
            <h2>{p.title}</h2>
            {p.year && <span className="meta">{p.year}</span>}
          </div>
        </Link>
      ))}
    </div>
  );
}

function Index({ projects }) {
  return (
    <div className="index">
      {projects.map((p, i) => (
        <Link key={p.id} to={`/project/${p.slug}`} className="index-row">
          <span className="num">{String(i + 1).padStart(2, '0')}</span>
          <h2>{p.title}</h2>
          <span className="meta">{p.year}</span>
          <div className="media">
            <Cover project={p} />
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function ProjectList({ menu }) {
  const { settings, layout } = useSite();
  const { forMenu, loading } = useProjects();
  usePageTitle(`${menu.label} · ${settings.name}`);
  const projects = forMenu(menu.id);

  return (
    <>
      <section className="hero">
        <h1>{settings.name}</h1>
        {settings.subtitle && <p>{settings.subtitle}</p>}
      </section>
      {!loading && projects.length === 0 && <p className="empty">No projects here yet.</p>}
      {layout === 'index' ? <Index projects={projects} /> : layout === 'grid' ? <Grid projects={projects} /> : <Rows projects={projects} />}
    </>
  );
}
