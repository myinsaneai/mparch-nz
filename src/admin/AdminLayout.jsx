import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  return (
    <div className="admin">
      <header className="admin-bar">
        <strong className="admin-title">Portfolio admin</strong>
        <nav className="admin-nav" aria-label="Admin">
          <NavLink to="/admin/projects">Projects</NavLink>
          <NavLink to="/admin/settings">Site, menus &amp; design</NavLink>
          <NavLink to="/admin/messages">Messages</NavLink>
        </nav>
        <div className="admin-user">
          <Link to="/" target="_blank" rel="noreferrer">
            View site ↗
          </Link>
          <span className="muted">{user?.email}</span>
          <button className="btn small" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
