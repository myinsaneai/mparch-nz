import React from 'react';

/** The project details text (Project Type: ..., Year Created: ...). Shared by the public page and the editor. */
export default function Legend({ project }) {
  const details = (project.fields || []).filter((f) => f.label && f.value);
  return (
    <dl className="project-details">
      {details.map((f, i) => (
        <div key={i}>
          <dt>{f.label}:</dt> <dd>{f.value}</dd>
        </div>
      ))}
      {project.year && (
        <div>
          <dt>Year Created:</dt> <dd>{project.year}</dd>
        </div>
      )}
    </dl>
  );
}
