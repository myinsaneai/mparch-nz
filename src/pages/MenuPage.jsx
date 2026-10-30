import React from 'react';
import { useParams } from 'react-router-dom';
import { useSite } from '../context/SiteContext.jsx';
import ProjectList from './ProjectList.jsx';
import ContactPage from './ContactPage.jsx';
import ContentPage from './ContentPage.jsx';
import NotFound from './NotFound.jsx';

// One route handles every menu entry, so new menus added in the admin get their own link automatically.
export default function MenuPage() {
  const { menuPath } = useParams();
  const { settings, ready } = useSite();
  if (!ready) return null;
  const menu = settings.menus.find((m) => m.path === menuPath);
  if (!menu) return <NotFound />;
  if (menu.kind === 'contact') return <ContactPage menu={menu} />;
  if (menu.kind === 'page') return <ContentPage menu={menu} />;
  return <ProjectList menu={menu} />;
}
