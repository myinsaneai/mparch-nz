import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase.js';
import { DEFAULT_SETTINGS } from '../lib/defaults.js';
import { DEFAULT_THEME, THEMES, fontsHref, themeOf } from '../lib/themes.js';

const SiteContext = createContext(null);

// The last settings seen on this device. They are shown straight away on the next visit, so the menu and
// theme do not flash the built-in defaults before the live settings arrive from Firestore.
const CACHE_KEY = 'site-settings-v1';
function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const data = raw ? JSON.parse(raw) : null;
    return data && Array.isArray(data.menus) ? { ...DEFAULT_SETTINGS, ...data } : null;
  } catch {
    return null;
  }
}
function writeCache(settings) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(settings));
  } catch {
    /* private mode or storage blocked: fine, just no cache */
  }
}

function applyTheme(id) {
  const theme = THEMES[id] ? id : DEFAULT_THEME;
  document.documentElement.dataset.theme = theme;
  const link = document.getElementById('theme-font');
  const href = fontsHref(theme);
  if (link && link.getAttribute('href') !== href) link.setAttribute('href', href);
}

export function SiteProvider({ children }) {
  const [cached] = useState(readCache);
  const [settings, setSettings] = useState(cached || DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  // Live: when the admin changes the theme or menus, every open page updates.
  useEffect(() => {
    return onSnapshot(
      doc(db, 'settings', 'site'),
      (snap) => {
        const next = snap.exists() ? { ...DEFAULT_SETTINGS, ...snap.data() } : DEFAULT_SETTINGS;
        setSettings(next);
        writeCache(next);
        setReady(true);
      },
      () => setReady(true)
    );
  }, []);

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  const value = useMemo(
    // `known`: the menu is trustworthy (live settings arrived, or we have a copy from an earlier visit).
    () => ({ settings, ready, known: ready || Boolean(cached), layout: themeOf(settings.theme).layout }),
    [settings, ready, cached]
  );
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  return useContext(SiteContext);
}
