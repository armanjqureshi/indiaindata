// Shared clip shape for the pointed-arch motif (.arch-top in index.css).
// Rendered once in the layout; sized 0 so it takes no space.
export default function ArchDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
      <defs>
        <clipPath id="arch-top" clipPathUnits="objectBoundingBox">
          <path d="M0,1 V0.2 C0,0.12 0.28,0.08 0.5,0 C0.72,0.08 1,0.12 1,0.2 V1 Z" />
        </clipPath>
        <clipPath id="arch-sm" clipPathUnits="objectBoundingBox">
          <path d="M0,1 V0.45 C0,0.2 0.35,0.12 0.5,0 C0.65,0.12 1,0.2 1,0.45 V1 Z" />
        </clipPath>
      </defs>
    </svg>
  )
}
