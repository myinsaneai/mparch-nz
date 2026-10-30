import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase.js';
import { DEFAULT_SETTINGS } from '../lib/defaults.js';
import { DEFAULT_THEME, THEMES, fontsHref, themeOf } from '../lib/themes.js';

const SiteContext = createContext(null);

function applyTheme(id) {
  const theme = THEMES[id] ? id : DEFAULT_THEME;
  document.documentElement.dataset.theme = theme;
  const link = document.getElementById('theme-font');
  const href = fontsHref(theme);
  if (link && link.getAttribute('href') !== href) link.setAttribute('href', href);
}

export function SiteProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  // Live: when the admin changes the theme or menus, every open page updates.
  useEffect(() => {
    return onSnapshot(
      doc(db, 'settings', 'site'),
      (snap) => {
        setSettings(snap.exists() ? { ...DEFAULT_SETTINGS, ...snap.data() } : DEFAULT_SETTINGS);
        setReady(true);
      },
      () => setReady(true)
    );
  }, []);

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  const value = useMemo(
    () => ({ settings, ready, layout: themeOf(settings.theme).layout }),
    [settings, ready]
  );
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  return useContext(SiteContext);
}
