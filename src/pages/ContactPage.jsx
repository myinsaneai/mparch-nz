import React, { useRef, useState } from 'react';
import emailjs from '@emailjs/browser';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useSite } from '../context/SiteContext.jsx';
import usePageTitle from '../hooks/usePageTitle.js';

// Keys come from .env (VITE_* variables are read at build time; restart the dev server after changing them).
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const HCAPTCHA_SITEKEY = import.meta.env.VITE_HCAPTCHA_SITEKEY;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactPage({ menu }) {
  const { settings } = useSite();
  usePageTitle(`${menu.label} · ${settings.name}`);
  const [form, setForm] = useState({ name: '', email: '', message: '', website: '' });
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [errorText, setErrorText] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const captchaRef = useRef(null);

  // A captcha token works once, so it is cleared (and the widget reset) after every attempt and on expiry.
  const resetCaptcha = () => {
    setCaptchaToken('');
    if (captchaRef.current) captchaRef.current.resetCaptcha();
  };

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (status === 'sending') return;
    if (form.website) {
      // Honeypot field filled in: do not send anything (the visitor, probably a bot, just sees the thank-you).
      setStatus('sent');
      return;
    }

    const name = form.name.trim();
    const email = form.email.trim();
    const message = form.message.trim();
    if (!name || !email || !message) {
      setErrorText('Please fill in your name, email address and message.');
      setStatus('error');
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      setErrorText('Please enter a valid email address.');
      setStatus('error');
      return;
    }
    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY || !HCAPTCHA_SITEKEY) {
      console.error('Contact form: EmailJS or hCaptcha settings are missing (VITE_EMAILJS_* / VITE_HCAPTCHA_SITEKEY).');
      setErrorText('Sorry, the contact form is not available right now. Please try again later.');
      setStatus('error');
      return;
    }
    if (!captchaToken) {
      setErrorText('Please tick the box to confirm you are not a robot.');
      setStatus('error');
      return;
    }

    setStatus('sending');
    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          from_name: name,
          reply_to: email,
          message,
          'h-captcha-response': captchaToken,
        },
        { publicKey: EMAILJS_PUBLIC_KEY }
      );
      setStatus('sent');
      setErrorText('');
      setForm({ name: '', email: '', message: '', website: '' });
    } catch (err) {
      console.error('Contact form: sending failed', err);
      setErrorText('Sorry, something went wrong. Please try again.');
      setStatus('error');
      resetCaptcha();
      return;
    }
    resetCaptcha();

    // Keep a copy in the admin "Messages" inbox. This is best effort: the email has already been sent.
    try {
      await addDoc(collection(db, 'messages'), { name, email, message, createdAt: serverTimestamp() });
    } catch (err) {
      console.error('Contact form: could not save a copy of the message', err);
    }
  };

  return (
    <section>
      <h1 className="page-title">{menu.label}</h1>
      <div aria-live="polite" aria-atomic="true">
        {status === 'sent' && <p className="form-note">Thank you, your message has been sent.</p>}
        {status === 'error' && <p className="form-note">{errorText}</p>}
      </div>
      {status === 'sent' ? null : (
        <form className="contact-form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="c-name">Name *</label>
            <input id="c-name" type="text" required maxLength={100} placeholder="Your Name..." value={form.name} onChange={update('name')} autoComplete="name" />
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
          <div className="captcha">
            {HCAPTCHA_SITEKEY && (
              <HCaptcha
                sitekey={HCAPTCHA_SITEKEY}
                ref={captchaRef}
                onVerify={(token) => setCaptchaToken(token)}
                onExpire={resetCaptcha}
                onError={(err) => {
                  console.error('Contact form: captcha error', err);
                  setCaptchaToken('');
                }}
              />
            )}
          </div>
          <div>
            <button type="submit" className="site-btn" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending…' : 'Submit'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
