import React from 'react';
import { useSite } from '../context/SiteContext.jsx';
import usePageTitle from '../hooks/usePageTitle.js';

// Simple text page for future menu items (e.g. About). Paragraphs are separated by blank lines.
export default function ContentPage({ menu }) {
  const { settings } = useSite();
  usePageTitle(`${menu.label} · ${settings.name}`);
  const paragraphs = String(menu.content || '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <section className="content-page">
      <h1 className="page-title">{menu.label}</h1>
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </section>
  );
}
