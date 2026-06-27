'use client';

import { KeyboardEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface RetroSelectOption<T extends string | number = string | number> {
  value: T;
  label: string;
}

export interface RetroSelectProps<T extends string | number = string | number> {
  id?: string;
  value: T;
  options: RetroSelectOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  'aria-labelledby'?: string;
}

interface ListPosition {
  top: number;
  left: number;
  width: number;
}

export function RetroSelect<T extends string | number = string | number>({
  id,
  value,
  options,
  onChange,
  disabled = false,
  className = '',
  'aria-labelledby': ariaLabelledBy,
}: RetroSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [listPosition, setListPosition] = useState<ListPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  const updateListPosition = useCallback(() => {
    if (!rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    setListPosition({
      top: rect.bottom + 2,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const toggle = () => {
    if (disabled) return;
    setOpen((current) => !current);
  };

  const selectOption = (option: RetroSelectOption<T>) => {
    onChange(option.value);
    close();
  };

  useEffect(() => {
    if (!open) return;
    updateListPosition();
    const selectedIndex = options.findIndex((option) => option.value === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);

    const onDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !listRef.current?.contains(target)) {
        close();
      }
    };

    const onWindowChange = () => updateListPosition();

    document.addEventListener('mousedown', onDocumentMouseDown);
    window.addEventListener('resize', onWindowChange);
    window.addEventListener('scroll', onWindowChange, true);

    return () => {
      document.removeEventListener('mousedown', onDocumentMouseDown);
      window.removeEventListener('resize', onWindowChange);
      window.removeEventListener('scroll', onWindowChange, true);
    };
  }, [close, open, options, updateListPosition, value]);

  useEffect(() => {
    if (open) {
      listRef.current?.focus();
    }
  }, [open, listPosition]);

  const handleFieldKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
    }
  };

  const handleListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, options.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (activeIndex >= 0) {
        selectOption(options[activeIndex]);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  };

  const list =
    open && listPosition && typeof document !== 'undefined'
      ? createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            className="retro-select__list retro-select__list--portal"
            style={{
              top: listPosition.top,
              left: listPosition.left,
              width: listPosition.width,
            }}
            onKeyDown={handleListKeyDown}
            tabIndex={-1}
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === activeIndex;

              return (
                <li
                  key={String(option.value)}
                  role="option"
                  aria-selected={isSelected}
                  className={[
                    'retro-select__option',
                    isSelected ? 'retro-select__option--selected' : '',
                    isActive ? 'retro-select__option--active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    selectOption(option);
                  }}
                >
                  {option.label}
                </li>
              );
            })}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div
      ref={rootRef}
      className={[
        'retro-select',
        open ? 'retro-select--open' : '',
        disabled ? 'retro-select--disabled' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="retro-select__combobox">
        <button
          type="button"
          id={id}
          className="retro-select__field"
          onClick={toggle}
          onKeyDown={handleFieldKeyDown}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-labelledby={ariaLabelledBy}
        >
          {selectedOption?.label}
        </button>
        <button
          type="button"
          className="retro-select__trigger"
          onClick={toggle}
          disabled={disabled}
          tabIndex={-1}
          aria-label="Abrir lista"
        >
          ▼
        </button>
      </div>
      {list}
    </div>
  );
}
