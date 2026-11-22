import React, { useMemo } from 'react';
import QRCode from 'qrcode';

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
  const qr = useMemo(() => {
    const safeValue = (value && value.trim()) || 'UNICHARGE-USTP';
    return QRCode.create(safeValue, { errorCorrectionLevel: 'M' });
  }, [value]);

  const moduleCount = qr.modules.size;
  const quietZone = 4;
  const totalUnits = moduleCount + quietZone * 2;

  const rects: { x: number; y: number; fill: string }[] = [];
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (qr.modules.get(row, col)) {
        rects.push({
          x: col + quietZone,
          y: row + quietZone,
          fill: foreground,
        });
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${totalUnits} ${totalUnits}`}
      shapeRendering="crispEdges"
      className="block select-none"
      role="img"
      aria-label={`QR Code for ${value}`}
    >
      <rect x={0} y={0} width={totalUnits} height={totalUnits} fill="#FFFFFF" />
      {rects.map((r, idx) => (
        <rect
          key={idx}
          x={r.x}
          y={r.y}
          width={1}
          height={1}
          fill={r.fill}
        />
      ))}
    </svg>
  );
};
