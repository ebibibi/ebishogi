type ArrowProps = {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  opacity: number;
  width: number;
};

export function Arrow({ from, to, color, opacity, width }: ArrowProps) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) return null;

  const headLength = Math.min(12, length * 0.3);
  const angle = Math.atan2(dy, dx);

  const tipX = to.x - (dx / length) * 2;
  const tipY = to.y - (dy / length) * 2;

  const headAngle = Math.PI / 6;
  const head1X = tipX - headLength * Math.cos(angle - headAngle);
  const head1Y = tipY - headLength * Math.sin(angle - headAngle);
  const head2X = tipX - headLength * Math.cos(angle + headAngle);
  const head2Y = tipY - headLength * Math.sin(angle + headAngle);

  return (
    <g opacity={opacity}>
      <line
        x1={from.x}
        y1={from.y}
        x2={tipX}
        y2={tipY}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
      />
      <polygon
        points={`${tipX},${tipY} ${head1X},${head1Y} ${head2X},${head2Y}`}
        fill={color}
      />
    </g>
  );
}
