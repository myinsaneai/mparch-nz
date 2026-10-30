import React, { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase.js';

export default function MessagesAdmin() {
  const [messages, setMessages] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    return onSnapshot(
      query(collection(db, 'messages'), orderBy('createdAt', 'desc')),
      (snap) => setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => {
        setError(e.message);
        setMessages([]);
      }
    );
  }, []);

  const remove = async (m) => {
    if (!window.confirm(`Delete the message from ${m.name}?`)) return;
    try {
      await deleteDoc(doc(db, 'messages', m.id));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>Messages</h1>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {messages === null && <p className="muted">Loading…</p>}
      {messages?.length === 0 && !error && <p className="muted">No messages yet.</p>}
      {messages?.map((m) => (
        <article className="panel msg" key={m.id}>
          <header>
            <strong>{m.name}</strong> · <a href={`mailto:${m.email}`}>{m.email}</a>
            <span className="muted"> · {m.createdAt?.toDate ? m.createdAt.toDate().toLocaleString() : ''}</span>
          </header>
          <p>{m.message}</p>
          <button className="btn small danger" onClick={() => remove(m)}>
            Delete
          </button>
        </article>
      ))}
    </div>
  );
}
