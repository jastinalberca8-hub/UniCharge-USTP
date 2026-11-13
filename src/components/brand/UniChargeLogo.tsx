import React from 'react';

interface UniChargeLogoProps {
  variant?: 'stacked' | 'horizontal';
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const UniChargeLogo: React.FC<UniChargeLogoProps> = ({
  variant = 'horizontal',
  subtitle,
  size = 'md',
  className = '',
}) => {
  const iconDimensions =
    variant === 'stacked'
      ? size === 'lg'
        ? 'w-20 h-20'
        : 'w-16 h-16'
      : size === 'sm'
      ? 'w-8 h-8'
      : 'w-10 h-10';

  const wordmarkSize =
    variant === 'stacked'
      ? size === 'lg'
        ? 'text-2xl'
        : 'text-xl'
      : size === 'sm'
      ? 'text-base'
      : 'text-lg';

  const renderMark = () => (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${iconDimensions} shrink-0`}
      aria-hidden="true"
    >
      {/* Graduation Cap (#4E6E81) */}
      <path d="M60 7 L98 22 L60 36 L22 22 Z" fill="#4E6E81" />
      <path
        d="M40 30 L40 39 C40 39 50 43.5 60 43.5 C70 43.5 80 39 80 39 L80 30 L60 37.5 Z"
        fill="#4E6E81"
      />
      {/* Cap Tassel */}
      <path d="M87 26 L87 43" stroke="#4E6E81" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="87" cy="44" r="2.2" fill="#4E6E81" />
      <path d="M87 45 L84 53 L90 53 Z" fill="#4E6E81" />

      {/* Bidirectional Circular Charging Ring (#4E6E81) */}
      {/* Top-left arc: from 195deg to 262deg */}
      <path
        d="M 32.0 64.5 A 29 29 0 0 1 56.0 43.3"
        stroke="#4E6E81"
        strokeWidth="5.5"
        strokeLinecap="butt"
      />
      {/* Top-right arc: from 278deg to 350deg */}
      <path
        d="M 64.0 43.3 A 29 29 0 0 1 88.6 67.0"
        stroke="#4E6E81"
        strokeWidth="5.5"
        strokeLinecap="butt"
      />
      {/* Right Downward Arrowhead */}
      <path d="M 81.5 65.5 L 96.0 65.5 L 88.8 77.5 Z" fill="#4E6E81" />

      {/* Bottom-right arc: from 18deg to 82deg */}
      <path
        d="M 87.6 81.0 A 29 29 0 0 1 64.0 100.7"
        stroke="#4E6E81"
        strokeWidth="5.5"
        strokeLinecap="butt"
      />
      {/* Bottom-left arc: from 98deg to 170deg */}
      <path
        d="M 56.0 100.7 A 29 29 0 0 1 31.4 77.0"
        stroke="#4E6E81"
        strokeWidth="5.5"
        strokeLinecap="butt"
      />
      {/* Left Upward Arrowhead */}
      <path d="M 24.0 78.5 L 38.5 78.5 L 31.2 66.5 Z" fill="#4E6E81" />

      {/* Center Mint Emerald Lightning Bolt (#5BC496) */}
      <path
        d="M 67 41 L 47 75 L 59.5 75 L 51 104 L 74 68 L 61.5 68 Z"
        fill="#5BC496"
      />
    </svg>
  );

  if (variant === 'stacked') {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        {renderMark()}
        <span className={`font-extrabold tracking-tight leading-none mt-2 ${wordmarkSize}`}>
          <span className="text-[#4E6E81]">Uni</span>
          <span className="text-[#5BC496]">Charge</span>
        </span>
        {subtitle && (
          <span className="text-xs font-medium text-[#64748B] mt-1">{subtitle}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 min-w-0 ${className}`}>
      {renderMark()}
      <div className="min-w-0 leading-tight">
        <span className={`font-extrabold tracking-tight block whitespace-nowrap ${wordmarkSize}`}>
          <span className="text-[#4E6E81]">Uni</span>
          <span className="text-[#5BC496]">Charge</span>
        </span>
        {subtitle && (
          <span className="text-[11px] font-medium text-[#64748B] block truncate">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};
