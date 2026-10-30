import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useSite } from '../context/SiteContext.jsx';
import usePageTitle from '../hooks/usePageTitle.js';

export default function ContactPage({ menu }) {
  const { settings } = useSite();
  usePageTitle(`${menu.label} · ${settings.name}`);
  const [form, setForm] = useState({ name: '', email: '', message: '', website: '' });
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.website) {
      // Honeypot field filled in: pretend success.
      setStatus('sent');
      return;
    }
    setStatus('sending');
    try {
      await addDoc(collection(db, 'messages'), {
        name: form.name.trim(),
        email: form.email.trim(),
        message: form.message.trim(),
        createdAt: serverTimestamp(),
      });
      setStatus('sent');
      setForm({ name: '', email: '', message: '', website: '' });
    } catch {
      setStatus('error');
    }
  };

  return (
    <section>
      <h1 className="page-title">{menu.label}</h1>
      {status === 'sent' ? (
        <p className="form-note" role="status">
          Thank you, your message has been sent.
        </p>
      ) : (
        <form className="contact-form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="c-name">Name *</label>
            <input id="c-name" type="text" required maxLength={200} placeholder="Your Name..." value={form.name} onChange={update('name')} autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="c-email">Email Address *</label>
            <input id="c-email" type="email" required maxLength={320} placeholder="Your Email Address..." value={form.email} onChange={update('email')} autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="c-message">Message *</label>
            <textarea id="c-message" required maxLength={5000} rows={6} placeholder="Your Message..." value={form.message} onChange={update('message')} />
          </div>
          <div className="hp" aria-hidden="true">
            <label htmlFor="c-website">Website</label>
            <input id="c-website" type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={update('website')} />
          </div>
          <div>
            <button type="submit" className="site-btn" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending…' : 'Submit'}
            </button>
          </div>
          {status === 'error' && (
            <p className="form-note" role="alert">
              Sorry, something went wrong. Please try again.
            </p>
          )}
        </form>
      )}
    </section>
  );
}
