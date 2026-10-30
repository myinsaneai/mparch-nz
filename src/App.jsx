import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { isConfigured } from './firebase.js';
import { SiteProvider } from './context/SiteContext.jsx';
import PublicLayout from './components/PublicLayout.jsx';
import MenuPage from './pages/MenuPage.jsx';
import ProjectPage from './pages/ProjectPage.jsx';
import HomeRedirect from './pages/HomeRedirect.jsx';

// The admin area is a separate chunk so visitors never download it.
const AdminApp = React.lazy(() => import('./admin/AdminApp.jsx'));

function SetupNotice() {
  return (
    <div style={{ maxWidth: 640, margin: '12vh auto', padding: 24, fontFamily: 'system-ui, sans-serif', lineHeight: 1.5 }}>
      <h1>Firebase is not configured yet</h1>
      <p>
        Copy <code>.env.example</code> to <code>.env</code>, fill in your Firebase web app settings, then restart the dev
        server. See <code>README.md</code> for the full setup.
      </p>
    </div>
  );
}

export default function App() {
  if (!isConfigured) return <SetupNotice />;
  return (
    <SiteProvider>
      <Routes>
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={null}>
              <AdminApp />
            </Suspense>
          }
        />
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/project/:slug" element={<ProjectPage />} />
          <Route path="/:menuPath" element={<MenuPage />} />
        </Route>
      </Routes>
    </SiteProvider>
  );
}
