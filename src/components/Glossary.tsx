import { useState } from 'react';
import { GLOSSARY } from '../data/glossary';

export function Glossary({ terms }: { terms: string[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="glossary">
      <span className="small muted">用語：</span>
      {terms.map((t) => (
        <button
          key={t}
          className={`term ${open === t ? 'active' : ''}`}
          aria-expanded={open === t}
          onClick={() => setOpen(open === t ? null : t)}
        >
          {t}
        </button>
      ))}
      {open && (
        <p className="term-desc" role="note">
          <strong>{open}</strong>：{GLOSSARY[open]}
        </p>
      )}
    </div>
  );
}
