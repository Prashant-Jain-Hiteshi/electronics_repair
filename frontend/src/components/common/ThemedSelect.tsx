import React, { useEffect, useMemo, useRef, useState } from 'react';

export type Option = { label: string; value: string };

type ThemedSelectProps = {
  options: (string | Option)[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
};

function normalizeOptions(options: (string | Option)[]): Option[] {
  return options.map((o) => (typeof o === 'string' ? { label: o, value: o } : o));
}

const ThemedSelect: React.FC<ThemedSelectProps> = ({ options, value, onChange, placeholder = 'Select', className = '' }) => {
  const opts = useMemo(() => normalizeOptions(options), [options]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState<number>(() => Math.max(0, opts.findIndex((o) => o.value === value)));
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    const i = opts.findIndex((o) => o.value === value);
    if (i >= 0) setHighlight(i);
  }, [value, opts]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (buttonRef.current?.contains(t)) return;
      if (listRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  function commit(index: number) {
    const o = opts[index];
    if (!o) return;
    onChange(o.value);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(opts.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commit(highlight);
    }
  }

  const selected = opts.find((o) => o.value === value);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        ref={buttonRef}
        className="w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-left text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#A48AFB] focus:border-[#A48AFB] flex items-center justify-between"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
      >
        <span className={selected ? '' : 'text-slate-400'}>{selected ? selected.label : placeholder}</span>
        <svg className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          tabIndex={-1}
          className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-md border border-white/10 bg-[#0f1218] py-1 text-sm shadow-lg focus:outline-none"
          role="listbox"
          aria-activedescendant={opts[highlight]?.value}
          onKeyDown={onKeyDown}
        >
          {opts.map((o, i) => {
            const isSelected = o.value === value;
            const isActive = i === highlight;
            return (
              <li
                id={o.value}
                key={o.value}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => commit(i)}
                className={
                  'cursor-pointer select-none px-3 py-2 ' +
                  (isActive
                    ? 'bg-[#A48AFB] text-[#0b0d12]'
                    : isSelected
                    ? 'bg-white/10 text-white'
                    : 'text-slate-200 hover:bg-white/5')
                }
              >
                {o.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ThemedSelect;
