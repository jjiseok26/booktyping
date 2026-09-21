import React, { useMemo, useState } from 'react';
import { expandSchoolName } from '../utils/schoolName';

interface SchoolNameFieldProps {
  value: string;
  onChange: (value: string) => void;
  schools: string[];
  placeholder?: string;
  inputClassName?: string;
}

export const SchoolNameField: React.FC<SchoolNameFieldProps> = ({
  value,
  onChange,
  schools,
  placeholder = '예: 가온중학교',
  inputClassName,
}) => {
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const query = value.trim();
    const unique = Array.from(new Set(schools.map((name) => name.trim()).filter(Boolean)));
    const filtered = query ? unique.filter((name) => name.includes(query)) : unique;
    return filtered.slice(0, 10);
  }, [schools, value]);

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(expandSchoolName(e.target.value) || e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => {
          const expanded = expandSchoolName(value);
          if (expanded !== value) onChange(expanded);
          setTimeout(() => setOpen(false), 180);
        }}
        placeholder={placeholder}
        autoComplete="off"
        className={inputClassName}
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-44 overflow-y-auto rounded-xl border border-stone-700 bg-stone-950 shadow-xl text-xs">
          <li className="px-3 py-1.5 text-[10px] text-stone-500 border-b border-stone-800">
            등록된 학교
          </li>
          {matches.map((name) => (
            <li key={name}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 hover:bg-amber-500/15 hover:text-amber-200 ${
                  name === value.trim() ? 'text-amber-300' : 'text-stone-200'
                }`}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
