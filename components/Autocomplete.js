"use client";

// Text box that suggests matches from an API search as the user types —
// for lists too long to load at once (e.g. a category's products, a
// product's colours). Controlled: the parent keeps the text and decides
// what a pick means.
//
//   <Autocomplete
//     id="line-1-product" ariaLabel="Product" placeholder="Search product"
//     path={QUOTATION_API.products} params={{ category_id }}   // POST body; `search` + `limit` are added
//     text={line.product_name} onTextChange={(t) => …} onPick={(option) => …}
//     optionLabel={(o) => o.product_name}
//   />
//
// path = null → no suggestions (free text only). `extraOptions` are shown
// first (filtered by the text), e.g. "As per client choice". The list is
// positioned against the window, so a scrolling table doesn't clip it.

import { useEffect, useRef, useState } from "react";
import { useApiData, useDebouncedValue } from "@/lib/useApi";
import { ALL_BRANCHES } from "@/lib/team";

const LIMIT = 20;

// Where the (position: fixed) list goes: just under the input, at least 220px wide.
function boxUnder(el) {
  const rect = el?.getBoundingClientRect();
  return rect ? { top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 220) } : null;
}

export default function Autocomplete({
  id,
  ariaLabel,
  path,
  params = {},
  text,
  onTextChange,
  onPick,
  optionLabel,
  optionHint,
  extraOptions = [],
  placeholder,
  required = false,
  disabled = false,
  emptyLabel = "No matches",
}) {
  const input = useRef(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [box, setBox] = useState(null);
  const search = useDebouncedValue((text || "").trim(), 250);
  const list = useApiData(open && path && !disabled ? path : null, { ...params, search: search || undefined, limit: LIMIT }, { branchId: ALL_BRANCHES });

  const typed = (text || "").trim().toLowerCase();
  const extras = extraOptions.filter((o) => !typed || optionLabel(o).toLowerCase().includes(typed));
  const options = [...extras, ...(list.data || [])];
  const listId = `${id}-options`;

  // Keep the list under the input (it is position: fixed): placed when it
  // opens, and again on scroll / resize while open.
  function openList() {
    setBox(boxUnder(input.current));
    setOpen(true);
  }
  useEffect(() => {
    if (!open) return undefined;
    const follow = () => setBox(boxUnder(input.current));
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, [open]);

  function pick(option) {
    onPick(option);
    setOpen(false);
  }

  function handleKey(e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) openList();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setHighlight((h) => (options.length ? (h + step + options.length) % options.length : 0));
    } else if (e.key === "Enter" && open && options[highlight]) {
      e.preventDefault();
      pick(options[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && !disabled && (path || extras.length);

  return (
    <div className="wf-autocomplete">
      <input
        id={id}
        ref={input}
        className="wf-input"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={Boolean(showList)}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        required={required}
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => {
          onTextChange(e.target.value);
          setHighlight(0);
          openList();
        }}
        onFocus={openList}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKey}
      />
      {showList && box && (
        <ul id={listId} role="listbox" className="wf-autocomplete-list" style={box}>
          {options.map((o, i) => (
            <li
              key={o.id || optionLabel(o)}
              role="option"
              aria-selected={i === highlight}
              className={`wf-autocomplete-option${i === highlight ? " active" : ""}`}
              // mousedown, not click: picks before the input's blur closes the list.
              onMouseDown={(e) => {
                e.preventDefault();
                pick(o);
              }}
              onMouseEnter={() => setHighlight(i)}
            >
              <span>{optionLabel(o)}</span>
              {optionHint && optionHint(o) && <span className="wf-autocomplete-hint">{optionHint(o)}</span>}
            </li>
          ))}
          {path && !list.data && list.loading && <li className="wf-autocomplete-empty">Searching…</li>}
          {path && list.data && !options.length && <li className="wf-autocomplete-empty">{emptyLabel}</li>}
          {list.error && <li className="wf-autocomplete-empty">{list.error.message}</li>}
        </ul>
      )}
    </div>
  );
}
