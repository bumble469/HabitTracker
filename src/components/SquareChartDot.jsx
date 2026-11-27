export default function SquareChartDot({ cx, cy }) {
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;

  return (
    <rect
      x={cx - 2}
      y={cy - 2}
      width={4}
      height={4}
      fill="#244b3d"
      aria-hidden="true"
    />
  );
}
