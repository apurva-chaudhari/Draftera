/**
 * Decorative line drawing for the sign-in panel: a building elevation with
 * grid bubbles and dimension lines, in the style of a construction drawing.
 */
function BlueprintArt() {
  const stroke = "rgba(255,255,255,0.28)";
  return (
    <svg className="blueprint-art" viewBox="0 0 420 300" fill="none" aria-hidden="true" preserveAspectRatio="xMidYMax slice">
      {/* grid bubbles */}
      {["A", "B", "C", "D"].map((label, i) => (
        <g key={label} transform={`translate(${70 + i * 90} 26)`}>
          <circle r="11" stroke={stroke} strokeWidth="1.5" />
          <text textAnchor="middle" y="4" fontSize="11" fill={stroke} fontFamily="IBM Plex Mono, monospace">{label}</text>
          <path d="M0 11V270" stroke={stroke} strokeWidth="1" strokeDasharray="8 5 2 5" />
        </g>
      ))}
      {/* building outline: 5 storeys */}
      <path d="M70 270V70h180v50h70v150" stroke={stroke} strokeWidth="2" />
      {[100, 130, 160, 190, 220, 250].map((y) => (
        <path key={y} d={`M70 ${y}H${y < 120 ? 250 : 340}`} stroke={stroke} strokeWidth="1" />
      ))}
      {[110, 150, 190, 230].map((x) => (
        <rect key={x} x={x} y="80" width="22" height="26" stroke={stroke} strokeWidth="1" />
      ))}
      <path d="M40 270H380" stroke={stroke} strokeWidth="2" />
      {/* dimension line */}
      <path d="M70 288H340M70 282v12M340 282v12" stroke="#f26a1b" strokeWidth="1.5" />
      <text x="205" y="284" textAnchor="middle" fontSize="10" fill="#f26a1b" fontFamily="IBM Plex Mono, monospace">REV C</text>
    </svg>
  );
}

export default BlueprintArt;
