import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase.js';

const ProjectsContext = createContext({ projects: [], loading: true, forMenu: () => [] });

export function sortForCategory(projects, categoryId) {
  return projects
    .filter((p) => (p.categories || []).includes(categoryId))
    .sort((a, b) => {
      const oa = a.orders?.[categoryId] ?? Number.MAX_SAFE_INTEGER;
      const ob = b.orders?.[categoryId] ?? Number.MAX_SAFE_INTEGER;
      return oa - ob || String(a.title).localeCompare(String(b.title));
    });
}

// Public site only ever loads published projects (Firestore rules enforce this too).
export function ProjectsProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'projects'), where('published', '==', true));
    return onSnapshot(
      q,
      (snap) => {
        setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, []);

  const value = useMemo(
    () => ({ projects, loading, forMenu: (id) => sortForCategory(projects, id) }),
    [projects, loading]
  );
  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export function useProjects() {
  return useContext(ProjectsContext);
}
