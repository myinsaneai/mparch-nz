import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import './admin.css';
import { AuthProvider, useAuth } from './AuthContext.jsx';
import AdminLogin from './AdminLogin.jsx';
import AdminLayout from './AdminLayout.jsx';
import ProjectsAdmin from './ProjectsAdmin.jsx';
import ProjectEditor from './ProjectEditor.jsx';
import SettingsAdmin from './SettingsAdmin.jsx';
import MessagesAdmin from './MessagesAdmin.jsx';

function Gate() {
  const { user, loading, isAdmin, signOut } = useAuth();

  if (loading) {
    return (
      <div className="admin admin-center">
        <p>Loading…</p>
      </div>
    );
  }
  if (!user) return <AdminLogin />;
  if (!isAdmin) {
    return (
      <div className="admin admin-center">
        <div className="panel narrow">
          <h1>Not authorised</h1>
          <p>This account is not the site administrator.</p>
          <button className="btn" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="projects" replace />} />
        <Route path="projects" element={<ProjectsAdmin />} />
        <Route path="projects/:id" element={<ProjectEditor />} />
        <Route path="settings" element={<SettingsAdmin />} />
        <Route path="messages" element={<MessagesAdmin />} />
        <Route path="*" element={<Navigate to="projects" replace />} />
      </Route>
    </Routes>
  );
}

export default function AdminApp() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
