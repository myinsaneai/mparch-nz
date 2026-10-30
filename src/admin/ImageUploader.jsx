import React, { useRef, useState } from 'react';
import { processAndUpload } from '../lib/image.js';

const WORKERS = 2;

// Drop zone: resizes each image to max 4K (+ thumbnail) in the browser, uploads to Firebase Storage,
// then reports the new image records via onUploaded.
export default function ImageUploader({ projectId, onUploaded }) {
  const [dragging, setDragging] = useState(false);
  const [jobs, setJobs] = useState([]);
  const inputRef = useRef(null);

  const setJob = (key, patch) => setJobs((all) => all.map((j) => (j.key === key ? { ...j, ...patch } : j)));

  const handleFiles = async (fileList) => {
    const files = [...fileList].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    const stamp = Date.now();
    const initial = files.map((f, i) => ({ key: `${stamp}-${i}`, name: f.name, status: 'queued', message: '' }));
    setJobs((all) => [...all, ...initial]);

    const results = new Array(files.length);
    let cursor = 0;
    const worker = async () => {
      while (cursor < files.length) {
        const i = cursor++;
        const key = initial[i].key;
        setJob(key, { status: 'working' });
        try {
          results[i] = await processAndUpload(projectId, files[i]);
          setJob(key, { status: 'done' });
        } catch (e) {
          setJob(key, { status: 'error', message: e?.message || 'Upload failed' });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(WORKERS, files.length) }, worker));

    const ok = results.filter(Boolean);
    if (ok.length) await onUploaded(ok);
    setTimeout(() => setJobs((all) => all.filter((j) => j.status === 'error')), 2000);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <div
        className={dragging ? 'dropzone on' : 'dropzone'}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <p>
          <strong>Drop images here</strong> or
        </p>
        <button type="button" className="btn" onClick={() => inputRef.current?.click()}>
          Choose files
        </button>
        <p className="muted small-text">Images larger than 4K (3840 px) are resized automatically before upload.</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      {jobs.length > 0 && (
        <ul className="jobs" aria-live="polite">
          {jobs.map((j) => (
            <li key={j.key} className={`job ${j.status}`}>
              <span>{j.name}</span>
              <span>{j.status === 'error' ? j.message : j.status === 'done' ? 'Done' : j.status === 'working' ? 'Resizing & uploading…' : 'Waiting…'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
