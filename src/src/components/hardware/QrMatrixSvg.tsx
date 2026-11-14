import React from 'react';

interface QrMatrixSvgProps {
  value: string;
  size?: number;
  foreground?: string;
  accent?: string;
}

export const QrMatrixSvg: React.FC<QrMatrixSvgProps> = ({
  value,
  size = 160,
  foreground = '#1E293B',
  accent = '#5BC496',
}) => {
  // Deterministic 11x11 interior data grid seeded from string value
  const cells: { x: number; y: number; isAccent: boolean }[] = [];
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      // Skip 3 finder corner zones (6x6)
      const inTopLeft = row < 6 && col < 6;
      const inTopRight = row < 6 && col >= 9;
      const inBottomLeft = row >= 9 && col < 6;
      if (inTopLeft || inTopRight || inBottomLeft) continue;

      const bit = ((hash >>> ((row * 15 + col) % 24)) ^ (row * 7 + col * 13)) & 1;
      if (bit === 1) {
        const isCenter = row >= 6 && row <= 8 && col >= 6 && col <= 8;
        cells.push({ x: col * 6 + 5, y: row * 6 + 5, isAccent: isCenter });
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className="block select-none"
      role="img"
      aria-label={`QR Code for ${value}`}
    >
      <rect x="0" y="0" width="100" height="100" rx="8" fill="#FFFFFF" />

      {/* Top-left finder */}
      <rect x="5" y="5" width="28" height="28" rx="4" fill={foreground} />
      <rect x="10" y="10" width="18" height="18" rx="2" fill="#FFFFFF" />
      <rect x="14" y="14" width="10" height="10" rx="1.5" fill={foreground} />

      {/* Top-right finder */}
      <rect x="67" y="5" width="28" height="28" rx="4" fill={foreground} />
      <rect x="72" y="10" width="18" height="18" rx="2" fill="#FFFFFF" />
      <rect x="76" y="14" width="10" height="10" rx="1.5" fill={foreground} />

      {/* Bottom-left finder */}
      <rect x="5" y="67" width="28" height="28" rx="4" fill={foreground} />
      <rect x="10" y="72" width="18" height="18" rx="2" fill="#FFFFFF" />
      <rect x="14" y="76" width="10" height="10" rx="1.5" fill={foreground} />

      {/* Encoded data modules */}
      {cells.map((c, idx) => (
        <rect
          key={idx}
          x={c.x}
          y={c.y}
          width="5"
          height="5"
          rx="1"
          fill={c.isAccent ? accent : foreground}
        />
      ))}
    </svg>
  );
};
