import React from 'react';
import { Link } from 'react-router-dom';
import usePageTitle from '../hooks/usePageTitle.js';

export default function NotFound() {
  usePageTitle('Page not found');
  return (
    <section className="hero">
      <h1>Page not found</h1>
      <p>
        <Link to="/" className="text-link">
          Back to the portfolio
        </Link>
      </p>
    </section>
  );
}
