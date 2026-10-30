import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSite } from '../context/SiteContext.jsx';

export default function HomeRedirect() {
  const { settings, ready } = useSite();
  if (!ready) return null;
  const first = settings.menus[0];
  return first ? <Navigate to={`/${first.path}`} replace /> : null;
}
