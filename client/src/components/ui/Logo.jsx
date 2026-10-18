/** Draftera mark: a "D" drawn like a set-square, with an orange datum point. */
function Logo({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" role="img" aria-label="Draftera">
      <rect width="64" height="64" rx="14" fill="#14213d" />
      <path d="M16 48V16h14c11 0 18 6 18 16s-7 16-18 16H16Z" stroke="#fff" strokeWidth="4" strokeLinejoin="round" />
      <path d="M16 48 36 28" stroke="#f26a1b" strokeWidth="4" strokeLinecap="round" />
      <circle cx="48" cy="48" r="4" fill="#f26a1b" />
    </svg>
  );
}

export default Logo;
