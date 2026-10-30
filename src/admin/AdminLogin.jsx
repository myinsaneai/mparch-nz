import React, { useState } from 'react';
import { useAuth } from './AuthContext.jsx';

export default function AdminLogin() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signIn(email.trim(), password);
    } catch {
      setError('Sign-in failed. Check the email and password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin admin-center">
      <form className="panel narrow" onSubmit={submit}>
        <h1>Admin sign-in</h1>
        <label className="lbl" htmlFor="a-email">
          Email
        </label>
        <input id="a-email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="lbl" htmlFor="a-pass">
          Password
        </label>
        <input id="a-pass" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="btn primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
