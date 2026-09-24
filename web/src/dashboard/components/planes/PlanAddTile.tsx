// The "+ Nuevo …" entry of a Planes grid — Android's dashed add row
// (1.5px dashed --line2, "+" and label in --accent2), as the grid's last
// tile. The Web mockup draws no create entry; parity needs one.
export function PlanAddTile({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[64px] cursor-pointer items-center justify-center gap-2 rounded-[16px] border-[1.5px] border-dashed border-v2-line2 bg-transparent p-3.5 text-[12.5px] font-extrabold text-v2-accent2 focus-visible:outline-2 focus-visible:outline-v2-accent"
    >
      <span className="text-[15px] leading-none">+</span>
      {label}
    </button>
  )
}
