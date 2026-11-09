import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useSite } from '../context/SiteContext.jsx';
import { ProjectsProvider } from '../context/ProjectsContext.jsx';

export default function PublicLayout() {
  const { settings, known } = useSite();
  return (
    <ProjectsProvider>
      <div className="site">
        <header className="site-header">
          <nav className="site-nav" aria-label="Main">
            {(known ? settings.menus : []).map((m) => (
              <NavLink key={m.id} to={`/${m.path}`}>
                {m.label}
              </NavLink>
            ))}
          </nav>
          <Link className="site-brand" to="/">
            {known ? settings.name : ''}
          </Link>
          <div className="site-header-spacer" aria-hidden="true" />
        </header>
        <main>
          <Outlet />
        </main>
      </div>
    </ProjectsProvider>
  );
}
