import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';

interface UserAvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<UserAvatarProps['size']>, string> = {
  sm: 'w-8 h-8',
  md: 'w-9 h-9',
  lg: 'w-12 h-12',
  xl: 'w-24 h-24',
};

const ICON_CLASSES: Record<NonNullable<UserAvatarProps['size']>, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-11 h-11',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name,
  size = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const hasCustomImage = Boolean(src && src.trim() !== '' && src !== 'default' && !imgError);

  if (hasCustomImage) {
    return (
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`${SIZE_CLASSES[size]} rounded-full object-cover border border-[#E2E8F0] shrink-0 bg-[#EDF2F5] ${className}`}
      />
    );
  }

  return (
    <div
      aria-label={`${name} default profile avatar`}
      className={`${SIZE_CLASSES[size]} rounded-full bg-[#EDF2F5] border border-[#4E6E81]/30 text-[#4E6E81] flex items-center justify-center shrink-0 ${className}`}
    >
      <User className={ICON_CLASSES[size]} />
    </div>
  );
};
