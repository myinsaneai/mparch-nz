import { DEFAULT_THEME } from './themes.js';

// Used until the admin saves settings for the first time.
export const DEFAULT_SETTINGS = {
  name: 'Maria Pozdnyakova',
  subtitle: 'Architectural Designer, BArch (Hons), New Zealand Licensed Building Practitioner',
  theme: DEFAULT_THEME,
  menus: [
    { id: 'interior-design', label: 'Interior Design', path: 'interior-design', kind: 'projects' },
    { id: 'work', label: 'Work', path: 'work', kind: 'projects' },
    { id: 'contact', label: 'Contact', path: 'contact', kind: 'contact' },
  ],
};

// Pre-filled (empty) detail fields for a new project. The admin can rename, add or remove them per project.
export const DEFAULT_FIELD_LABELS = ['Project Type', 'Project Stage', 'Software', 'My Role'];

export const RESERVED_PATHS = ['admin', 'project'];
