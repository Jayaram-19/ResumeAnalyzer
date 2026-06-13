import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const ClassicDropdown = ({ value, options, onChange, compact = false, className = '' }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const selectedOption = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (nextValue) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className={`classic-dropdown ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`classic-dropdown-trigger ${compact ? 'classic-dropdown-trigger-compact' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selectedOption.label}</span>
        <ChevronDown size={14} className={`classic-dropdown-icon ${open ? 'classic-dropdown-icon-open' : ''}`} />
      </button>

      {open && (
        <div className="classic-dropdown-menu" role="listbox">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => handleSelect(option.value)}
              className={`classic-dropdown-option ${option.value === value ? 'classic-dropdown-option-selected' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClassicDropdown;
