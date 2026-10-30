import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useSite } from '../context/SiteContext.jsx';
import { ProjectsProvider } from '../context/ProjectsContext.jsx';

export default function PublicLayout() {
  const { settings } = useSite();
  return (
    <ProjectsProvider>
      <div className="site">
        <header className="site-header">
          <nav className="site-nav" aria-label="Main">
            {settings.menus.map((m) => (
              <NavLink key={m.id} to={`/${m.path}`}>
                {m.label}
              </NavLink>
            ))}
          </nav>
          <Link className="site-brand" to="/">
            {settings.name}
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
