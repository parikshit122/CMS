import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/SubmitComplaint.css";
import API from "../../services/api";
import { useAlert } from "../../components/common/Alert";

// ── Icons (keeping all existing ones) ────────────────────
const Icon = {
  ArrowLeft: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="14" y1="8" x2="2" y2="8" />
      <polyline points="7 3 2 8 7 13" />
    </svg>
  ),
  ArrowRight: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="2" y1="8" x2="14" y2="8" />
      <polyline points="9 3 14 8 9 13" />
    </svg>
  ),
  Send: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="14" y1="2" x2="7" y2="9" />
      <polygon points="14 2 9.5 14 7 9 2 6.5 14 2" />
    </svg>
  ),
  Check: ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="2 6 5 9 10 3" />
    </svg>
  ),
  StepCheck: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="2.5 7 5.5 10 11.5 4" />
    </svg>
  ),
  Search: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <circle cx="7" cy="7" r="5" />
      <line x1="11" y1="11" x2="14" y2="14" />
    </svg>
  ),
  Chevron: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 6 8 10 12 6" />
    </svg>
  ),
  X: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="2" y1="2" x2="12" y2="12" />
      <line x1="12" y1="2" x2="2" y2="12" />
    </svg>
  ),
  Grid: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1" y="1" width="7" height="7" rx="2" />
      <rect x="10" y="1" width="7" height="7" rx="2" />
      <rect x="1" y="10" width="7" height="7" rx="2" />
      <rect x="10" y="10" width="7" height="7" rx="2" />
    </svg>
  ),
  FileText: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 1H4.5A1.5 1.5 0 0 0 3 2.5v13A1.5 1.5 0 0 0 4.5 17h9a1.5 1.5 0 0 0 1.5-1.5V6L11 1Z" />
      <polyline points="11 1 11 6 15 6" />
      <line x1="6" y1="10" x2="12" y2="10" />
      <line x1="6" y1="13" x2="10" y2="13" />
    </svg>
  ),
  Flag: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 16V3" />
      <path d="M2 3c2.5-1.5 5 1 7.5 0s5-1.5 7.5 0v9c-2.5 1.5-5-1-7.5 0s-5 1.5-7.5 0" />
    </svg>
  ),
  MapPin: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 1C5.68 1 3 3.68 3 6.5 3 11 9 17 9 17s6-6 6-10.5C15 3.68 12.32 1 9 1Z" />
      <circle cx="9" cy="6.5" r="2" />
    </svg>
  ),
  ReviewCheck: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="9" r="8" />
      <polyline points="6 9 8.5 11.5 12.5 6.5" />
    </svg>
  ),
  SuccessCheck: () => (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="8 18 15 25 28 11" />
    </svg>
  ),
  Upload: () => (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  ),
};

const CATEGORIES = [
  {
    id: "infrastructure",
    icon: "🏗️",
    title: "Infrastructure",
    description: "Building damage, broken furniture, structural issues",
  },
  {
    id: "cleanliness",
    icon: "🧹",
    title: "Cleanliness",
    description: "Hygiene, waste disposal, sanitation concerns",
  },
  {
    id: "electrical",
    icon: "⚡",
    title: "Electrical",
    description: "Power outages, faulty wiring, lighting issues",
  },
  {
    id: "plumbing",
    icon: "🚿",
    title: "Plumbing",
    description: "Water leaks, drainage, pipe damage",
  },
  {
    id: "safety",
    icon: "🛡️",
    title: "Safety",
    description: "Security concerns, fire safety, hazards",
  },
  {
    id: "it",
    icon: "💻",
    title: "IT & Network",
    description: "Internet issues, lab equipment, software",
  },
  {
    id: "academic",
    icon: "📚",
    title: "Academic",
    description: "Course-related, scheduling, faculty concerns",
  },
  {
    id: "other",
    icon: "📝",
    title: "Other",
    description: "Any other complaints not listed above",
  },
];

const LOCATION_GROUPS = [
  {
    label: "Academic",
    icon: "🎓",
    items: [
      { id: "bsc", label: "BSc Department", icon: "🔬" },
      { id: "bcom", label: "BCom Department", icon: "📊" },
      { id: "eng-cse", label: "Engineering — CSE", icon: "💻" },
      { id: "eng-ece", label: "Engineering — ECE", icon: "📡" },
      { id: "eng-mech", label: "Engineering — Mechanical", icon: "⚙️" },
      { id: "eng-civil", label: "Engineering — Civil", icon: "🏗️" },
      { id: "lab-cs", label: "Computer Lab", icon: "🖥️" },
      { id: "lab-phy", label: "Physics Lab", icon: "⚛️" },
      { id: "lab-chem", label: "Chemistry Lab", icon: "🧪" },
    ],
  },
  {
    label: "Facilities",
    icon: "🏢",
    items: [
      { id: "canteen", label: "Canteen", icon: "🍽️" },
      { id: "library", label: "Library", icon: "📚" },
      { id: "auditorium", label: "Auditorium", icon: "🎭" },
      { id: "parking", label: "Parking Area", icon: "🅿️" },
      { id: "sports", label: "Sports Complex", icon: "🏃" },
      { id: "medical", label: "Medical Center", icon: "🏥" },
    ],
  },
  {
    label: "Staff Areas",
    icon: "👔",
    items: [
      { id: "staff-room", label: "Staff Room", icon: "🪑" },
      { id: "conference", label: "Conference Room", icon: "📋" },
      { id: "admin", label: "Admin Office", icon: "🏛️" },
      { id: "principal", label: "Principal's Office", icon: "👤" },
    ],
  },
  {
    label: "Residential",
    icon: "🏠",
    items: [
      { id: "hostel-a", label: "Hostel Block A", icon: "🏘️" },
      { id: "hostel-b", label: "Hostel Block B", icon: "🏘️" },
      { id: "hostel-c", label: "Hostel Block C", icon: "🏘️" },
      { id: "hostel-girls", label: "Girls' Hostel", icon: "🏘️" },
    ],
  },
];

const PRIORITIES = [
  { key: "low", label: "Low", color: "green" },
  { key: "medium", label: "Medium", color: "yellow" },
  { key: "high", label: "High", color: "red" },
];

const STEPS = [
  { number: 1, label: "Category" },
  { number: 2, label: "Details" },
  { number: 3, label: "Review" },
];

const MAX_FILES = 5;
const MAX_FILE_MB = 5;
const MAX_FILE_SIZE = MAX_FILE_MB * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

// ── Helpers ───────────────────────────────────────────────
const highlightMatch = (text, query) => {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  return text.split(regex).map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="sc-highlight">
        {part}
      </mark>
    ) : (
      part
    ),
  );
};

const findLocationItem = (id) => {
  if (!id) return null;
  for (const group of LOCATION_GROUPS) {
    const found = group.items.find((item) => item.id === id);
    if (found) return found;
  }
  return null;
};

const findCategory = (id) => CATEGORIES.find((c) => c.id === id) || null;

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const StepIndicator = React.memo(({ currentStep }) => {
  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;
  return (
    <div className="sc-stepper">
      <div className="sc-stepper__steps">
        {STEPS.map((step, idx) => {
          const done = currentStep > step.number;
          const active = currentStep === step.number;
          return (
            <React.Fragment key={step.number}>
              <div
                className={[
                  "sc-stepper__item",
                  active ? "sc-stepper__item--active" : "",
                  done ? "sc-stepper__item--done" : "",
                ].join(" ")}
              >
                <div className="sc-stepper__node">
                  {done ? <Icon.StepCheck /> : step.number}
                </div>
                <span className="sc-stepper__label">{step.label}</span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={[
                    "sc-stepper__line",
                    done ? "sc-stepper__line--done" : "",
                  ].join(" ")}
                >
                  <div className="sc-stepper__line-fill" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div
        className="sc-stepper__bar"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="sc-stepper__bar-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
});

const CategoryCard = React.memo(
  ({ icon, title, description, selected, onClick }) => (
    <div
      className={`sc-cat-card ${selected ? "sc-cat-card--selected" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="sc-cat-card__badge" aria-hidden="true">
        <Icon.Check size={10} />
      </div>
      <span className="sc-cat-card__icon" aria-hidden="true">
        {icon}
      </span>
      <div className="sc-cat-card__title">{title}</div>
      <div className="sc-cat-card__desc">{description}</div>
    </div>
  ),
);

const FormField = React.memo(
  ({ label, value, onChange, multiline = false, maxLength }) => {
    const textareaRef = useRef(null);
    const id = useRef(`ff-${Math.random().toString(36).slice(2)}`).current;

    const handleChange = useCallback(
      (e) => {
        const v = maxLength
          ? e.target.value.slice(0, maxLength)
          : e.target.value;
        onChange(v);
      },
      [onChange, maxLength],
    );

    useEffect(() => {
      if (multiline && textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height =
          textareaRef.current.scrollHeight + "px";
      }
    }, [value, multiline]);

    const pct = maxLength ? value.length / maxLength : 0;
    const ctCls = [
      "sc-field__counter",
      pct >= 1 ? "sc-field__counter--limit" : "",
      pct >= 0.85 ? "sc-field__counter--warn" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="sc-field">
        <div className="sc-field__wrap">
          {multiline ? (
            <textarea
              ref={textareaRef}
              id={id}
              className="sc-field__textarea"
              value={value}
              onChange={handleChange}
              placeholder=" "
              maxLength={maxLength}
              rows={4}
            />
          ) : (
            <input
              id={id}
              type="text"
              className="sc-field__input"
              value={value}
              onChange={handleChange}
              placeholder=" "
              maxLength={maxLength}
            />
          )}
          <label className="sc-field__label" htmlFor={id}>
            {label}
          </label>
        </div>
        {maxLength && (
          <div className="sc-field__footer">
            <span className={ctCls}>
              {value.length} / {maxLength}
            </span>
          </div>
        )}
      </div>
    );
  },
);

// ── Priority Selector ─────────────────────────────────────
const PrioritySelector = React.memo(({ value, onChange }) => (
  <div className="sc-priority" role="radiogroup" aria-label="Priority level">
    {PRIORITIES.map(({ key, label, color }) => (
      <button
        key={key}
        type="button"
        className={[
          "sc-priority__pill",
          `sc-priority__pill--${color}`,
          value === key ? "sc-priority__pill--active" : "",
        ].join(" ")}
        onClick={() => onChange(key)}
        role="radio"
        aria-checked={value === key}
      >
        <span className="sc-priority__dot" aria-hidden="true" />
        {label}
      </button>
    ))}
  </div>
));

// ── Location Dropdown ─────────────────────────────────────
const LocationDropdown = React.memo(({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const searchRef = useRef(null);

  const selected = useMemo(() => findLocationItem(value), [value]);

  const filtered = useMemo(() => {
    if (!query.trim()) return LOCATION_GROUPS;
    const q = query.toLowerCase();
    return LOCATION_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((i) => i.label.toLowerCase().includes(q)),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      if (!prev) {
        setQuery("");
        setTimeout(() => searchRef.current?.focus(), 60);
      }
      return !prev;
    });
  }, []);

  const select = useCallback(
    (id) => {
      onChange(id);
      setOpen(false);
      setQuery("");
    },
    [onChange],
  );
  const clear = useCallback(
    (e) => {
      e.stopPropagation();
      onChange("");
    },
    [onChange],
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div
      className={`sc-location ${open ? "sc-location--open" : ""}`}
      ref={rootRef}
    >
      <button
        type="button"
        className={[
          "sc-location__trigger",
          open ? "sc-location__trigger--open" : "",
          selected ? "sc-location__trigger--filled" : "",
        ].join(" ")}
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="sc-location__trigger-label">Location</span>
        {selected && (
          <span className="sc-location__selected">
            <span aria-hidden="true">{selected.icon}</span>
            <span>{selected.label}</span>
          </span>
        )}
        <span className="sc-location__trigger-actions">
          {selected && (
            <span
              className="sc-location__clear"
              role="button"
              tabIndex={0}
              aria-label="Clear location"
              onClick={clear}
              onKeyDown={(e) => {
                if (e.key === "Enter") clear(e);
              }}
            >
              <Icon.X />
            </span>
          )}
          <span
            className={`sc-location__chevron ${open ? "sc-location__chevron--up" : ""}`}
          >
            <Icon.Chevron />
          </span>
        </span>
      </button>

      {open && (
        <div className="sc-location__panel" role="listbox">
          <div className="sc-location__search">
            <span className="sc-location__search-icon" aria-hidden="true">
              <Icon.Search />
            </span>
            <input
              ref={searchRef}
              type="text"
              className="sc-location__search-input"
              placeholder="Search locations…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search locations"
            />
            {query && (
              <button
                type="button"
                className="sc-location__search-clear"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <Icon.X />
              </button>
            )}
          </div>
          <div className="sc-location__results">
            {filtered.length === 0 ? (
              <div className="sc-location__empty">
                <span className="sc-location__empty-icon">🔍</span>
                <p className="sc-location__empty-text">
                  No results for <strong>"{query}"</strong>
                </p>
              </div>
            ) : (
              filtered.map((group) => (
                <div key={group.label} className="sc-location__group">
                  <div className="sc-location__group-label">
                    <span aria-hidden="true">{group.icon}</span>
                    <span>{group.label}</span>
                  </div>
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className={[
                        "sc-location__option",
                        value === item.id ? "sc-location__option--active" : "",
                      ].join(" ")}
                      onClick={() => select(item.id)}
                      role="option"
                      aria-selected={value === item.id}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") select(item.id);
                      }}
                    >
                      <span
                        className="sc-location__option-icon"
                        aria-hidden="true"
                      >
                        {item.icon}
                      </span>
                      <span className="sc-location__option-label">
                        {highlightMatch(item.label, query)}
                      </span>
                      {value === item.id && (
                        <span
                          className="sc-location__option-check"
                          aria-hidden="true"
                        >
                          <Icon.Check size={12} />
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
});

// ── File Upload Component ─────────────────────────────────
const FileUpload = React.memo(({ files, onChange }) => {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const validateAndAdd = useCallback(
    (incoming) => {
      const errors = [];
      const valid = [];
      const current = files.length;

      Array.from(incoming).forEach((file) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
          errors.push(`${file.name}: only images allowed`);
          return;
        }
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`${file.name}: exceeds ${MAX_FILE_MB}MB limit`);
          return;
        }
        if (current + valid.length >= MAX_FILES) {
          errors.push(`Max ${MAX_FILES} files allowed`);
          return;
        }
        valid.push(file);
      });

      if (errors.length) alert(errors.join("\n"));
      if (valid.length) onChange([...files, ...valid]);
    },
    [files, onChange],
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      validateAndAdd(e.dataTransfer.files);
    },
    [validateAndAdd],
  );

  const handleRemove = useCallback(
    (idx) => {
      onChange(files.filter((_, i) => i !== idx));
    },
    [files, onChange],
  );

  return (
    <div className="sc-upload">
      {/* Drop zone */}
      <div
        className={`sc-upload__zone ${dragging ? "sc-upload__zone--drag" : ""} ${
          files.length >= MAX_FILES ? "sc-upload__zone--full" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => files.length < MAX_FILES && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload images"
        onKeyDown={(e) => {
          if (e.key === "Enter" && files.length < MAX_FILES)
            inputRef.current?.click();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => validateAndAdd(e.target.files)}
        />

        <div className="sc-upload__icon">
          <Icon.Upload />
        </div>

        {files.length >= MAX_FILES ? (
          <p className="sc-upload__text">Maximum {MAX_FILES} files reached</p>
        ) : (
          <>
            <p className="sc-upload__text">
              <strong>Drop images here</strong> or click to browse
            </p>
            <p className="sc-upload__hint">
              JPEG, PNG, WebP, GIF · Max {MAX_FILE_MB}MB each · Up to{" "}
              {MAX_FILES} files
            </p>
          </>
        )}
      </div>

      {/* Preview grid */}
      {files.length > 0 && (
        <div className="sc-upload__previews">
          {files.map((file, idx) => {
            const url = URL.createObjectURL(file);
            return (
              <div key={idx} className="sc-upload__preview">
                <img
                  src={url}
                  alt={file.name}
                  className="sc-upload__preview-img"
                  onLoad={() => URL.revokeObjectURL(url)}
                />
                <div className="sc-upload__preview-info">
                  <span className="sc-upload__preview-name">
                    {file.name.length > 20
                      ? `${file.name.slice(0, 17)}...`
                      : file.name}
                  </span>
                  <span className="sc-upload__preview-size">
                    {formatFileSize(file.size)}
                  </span>
                </div>
                <button
                  type="button"
                  className="sc-upload__preview-remove"
                  onClick={() => handleRemove(idx)}
                  aria-label={`Remove ${file.name}`}
                >
                  <Icon.X />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Count */}
      {files.length > 0 && (
        <p className="sc-upload__count">
          {files.length} / {MAX_FILES} image{files.length !== 1 ? "s" : ""}{" "}
          selected
        </p>
      )}
    </div>
  );
});

// ── Review Section ────────────────────────────────────────
const ReviewSection = React.memo(({ formData, attachmentFiles }) => {
  const cat = findCategory(formData.category);
  const loc = findLocationItem(formData.location);
  const priority = PRIORITIES.find((p) => p.key === formData.priority);

  const sections = [
    {
      icon: "🗂️",
      title: "Category",
      rows: [
        {
          label: "Selected Category",
          value: cat ? `${cat.icon} ${cat.title}` : "—",
        },
      ],
    },
    {
      icon: "📋",
      title: "Complaint Details",
      rows: [
        { label: "Title", value: formData.title || "—" },
        { label: "Description", value: formData.description || "—" },
      ],
    },
    {
      icon: "🚩",
      title: "Priority",
      rows: [
        {
          label: "Level",
          value: priority ? priority.label : "—",
          priority: priority?.color,
        },
      ],
    },
    {
      icon: "📍",
      title: "Location",
      rows: [{ label: "Area", value: loc ? `${loc.icon} ${loc.label}` : "—" }],
    },
  ];

  return (
    <div className="sc-review">
      {sections.map((sec) => (
        <div key={sec.title} className="sc-review__card">
          <div className="sc-review__card-head">
            <span className="sc-review__card-icon" aria-hidden="true">
              {sec.icon}
            </span>
            <span className="sc-review__card-title">{sec.title}</span>
          </div>
          <div className="sc-review__card-body">
            {sec.rows.map((row) => (
              <div key={row.label} className="sc-review__row">
                <span className="sc-review__row-label">{row.label}</span>
                <span
                  className={[
                    "sc-review__row-value",
                    row.priority ? `sc-review__row-value--${row.priority}` : "",
                  ].join(" ")}
                >
                  {row.priority && (
                    <span
                      className={`sc-review__dot sc-review__dot--${row.priority}`}
                      aria-hidden="true"
                    />
                  )}
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Attachments preview in review */}
      {attachmentFiles.length > 0 && (
        <div className="sc-review__card">
          <div className="sc-review__card-head">
            <span className="sc-review__card-icon" aria-hidden="true">
              📎
            </span>
            <span className="sc-review__card-title">
              Attachments ({attachmentFiles.length})
            </span>
          </div>
          <div className="sc-review__card-body">
            <div className="sc-review__attachments">
              {attachmentFiles.map((file, idx) => (
                <div key={idx} className="sc-review__attachment">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="sc-review__attachment-thumb"
                  />
                  <span className="sc-review__attachment-name">
                    {file.name.length > 25
                      ? `${file.name.slice(0, 22)}...`
                      : file.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

const SectionHeader = ({ icon, title, desc }) => (
  <div className="sc-section-head">
    <div className="sc-section-head__icon" aria-hidden="true">
      {icon}
    </div>
    <div>
      <div className="sc-section-head__title">{title}</div>
      {desc && <div className="sc-section-head__desc">{desc}</div>}
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────
const SubmitComplaint = () => {
  const alert = useAlert();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedId, setSubmittedId] = useState("");
  const [attachmentFiles, setAttachmentFiles] = useState([]);

  const [form, setForm] = useState({
    category: "",
    title: "",
    description: "",
    priority: "",
    location: "",
  });

  const update = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const canStep1 = !!form.category;
  const canStep2 = !!(
    form.title.trim() &&
    form.description.trim() &&
    form.priority &&
    form.location
  );

  const next = useCallback(() => setStep((s) => Math.min(s + 1, 3)), []);
  const back = useCallback(() => setStep((s) => Math.max(s - 1, 1)), []);

  const submit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      // ── Build FormData for multipart upload ─────────────
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("category", form.category);
      formData.append("priority", form.priority);
      formData.append("location", form.location);

      attachmentFiles.forEach((file) => {
        formData.append("attachments", file);
      });

      const response = await API.post("/complaints", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        const newId = response.data.data?.complaintId || "";
        setSubmittedId(newId);
        setSubmitted(true);
        alert.success(
          newId
            ? `Complaint submitted! ID: ${newId}`
            : "Complaint submitted successfully!",
        );
        setTimeout(() => navigate("/dashboard", { replace: true }), 1800);
      } else {
        alert.error(response.data.message || "Failed to submit complaint");
      }
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Error submitting complaint. Please try again.";
      alert.error(message);
    } finally {
      setSubmitting(false);
    }
  }, [form, attachmentFiles, alert, submitting, navigate]);

  const reset = useCallback(() => {
    setForm({
      category: "",
      title: "",
      description: "",
      priority: "",
      location: "",
    });
    setAttachmentFiles([]);
    setStep(1);
    setSubmitted(false);
    setSubmittedId("");
  }, []);

  // ── Success screen ────────────────────────────────────
  if (submitted) {
    return (
      <div className="sc-page">
        <div className="sc-page__inner">
          <div className="sc-card sc-card--success">
            <div className="sc-success">
              <div className="sc-success__circle">
                <Icon.SuccessCheck />
              </div>
              <h2 className="sc-success__title">Complaint Submitted!</h2>
              {submittedId && (
                <p className="sc-success__id">
                  Reference ID: <strong>{submittedId}</strong>
                </p>
              )}
              <p className="sc-success__desc">
                Your complaint has been received and will be reviewed by the
                relevant department shortly.
              </p>
              <button
                type="button"
                className="sc-btn sc-btn--primary"
                onClick={reset}
              >
                Submit Another Complaint
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sc-page">
      <div className="sc-page__inner">
        <header className="sc-page__header">
          <div>
            <p className="sc-page__eyebrow">Student Portal</p>
            <h1 className="sc-page__title">Submit a Complaint</h1>
            <p className="sc-page__subtitle">
              Help us improve — describe the issue and the right team will
              handle it.
            </p>
          </div>
        </header>

        <StepIndicator currentStep={step} />

        <div className="sc-card">
          {/* ── Step 1: Category ── */}
          {step === 1 && (
            <div className="sc-step" key="step-1">
              <div className="sc-section">
                <SectionHeader
                  icon={<Icon.Grid />}
                  title="Select a Category"
                  desc="Choose the category that best describes your complaint"
                />
                <div className="sc-cat-grid">
                  {CATEGORIES.map((cat) => (
                    <CategoryCard
                      key={cat.id}
                      icon={cat.icon}
                      title={cat.title}
                      description={cat.description}
                      selected={form.category === cat.id}
                      onClick={() => update("category", cat.id)}
                    />
                  ))}
                </div>
              </div>
              <div className="sc-nav sc-nav--end">
                <button
                  type="button"
                  className="sc-btn sc-btn--primary"
                  disabled={!canStep1}
                  onClick={next}
                >
                  Continue
                  <span className="sc-btn__icon">
                    <Icon.ArrowRight />
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Details ── */}
          {step === 2 && (
            <div className="sc-step" key="step-2">
              <div className="sc-section">
                <SectionHeader
                  icon={<Icon.FileText />}
                  title="Complaint Information"
                  desc="Describe the issue clearly so we can resolve it faster"
                />
                <FormField
                  label="Complaint Title"
                  value={form.title}
                  onChange={(v) => update("title", v)}
                  maxLength={100}
                />
                <FormField
                  label="Description"
                  value={form.description}
                  onChange={(v) => update("description", v)}
                  multiline
                  maxLength={500}
                />
              </div>

              <div className="sc-divider" />

              <div className="sc-section">
                <SectionHeader
                  icon={<Icon.Flag />}
                  title="Priority Level"
                  desc="How urgent is this issue?"
                />
                <PrioritySelector
                  value={form.priority}
                  onChange={(v) => update("priority", v)}
                />
              </div>

              <div className="sc-divider" />

              <div className="sc-section">
                <SectionHeader
                  icon={<Icon.MapPin />}
                  title="Location"
                  desc="Where did you notice this issue?"
                />
                <LocationDropdown
                  value={form.location}
                  onChange={(v) => update("location", v)}
                />
              </div>

              <div className="sc-divider" />

              {/* ── NEW: Attachments ── */}
              <div className="sc-section">
                <SectionHeader
                  icon={<span style={{ fontSize: "18px" }}>📎</span>}
                  title="Attachments (Optional)"
                  desc="Add photos or images to support your complaint"
                />
                <FileUpload
                  files={attachmentFiles}
                  onChange={setAttachmentFiles}
                />
              </div>

              <div className="sc-nav">
                <button
                  type="button"
                  className="sc-btn sc-btn--ghost"
                  onClick={back}
                >
                  <span className="sc-btn__icon">
                    <Icon.ArrowLeft />
                  </span>
                  Back
                </button>
                <button
                  type="button"
                  className="sc-btn sc-btn--primary"
                  disabled={!canStep2}
                  onClick={next}
                >
                  Review
                  <span className="sc-btn__icon">
                    <Icon.ArrowRight />
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Review ── */}
          {step === 3 && (
            <div className="sc-step" key="step-3">
              <div className="sc-section">
                <SectionHeader
                  icon={<Icon.ReviewCheck />}
                  title="Review Your Complaint"
                  desc="Verify all details before submitting"
                />
                <ReviewSection
                  formData={form}
                  attachmentFiles={attachmentFiles}
                />
              </div>

              <div className="sc-nav">
                <button
                  type="button"
                  className="sc-btn sc-btn--ghost"
                  onClick={back}
                  disabled={submitting}
                >
                  <span className="sc-btn__icon">
                    <Icon.ArrowLeft />
                  </span>
                  Back
                </button>
                <button
                  type="button"
                  className="sc-btn sc-btn--submit"
                  onClick={submit}
                  disabled={submitting}
                >
                  <span className="sc-btn__icon">
                    <Icon.Send />
                  </span>
                  {submitting ? "Submitting..." : "Submit Complaint"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmitComplaint;
