'use client';

import { getRetroIconSrc, type RetroIconName } from '../../assets/icons/win98/registry';

export interface RetroIconProps {
  name: RetroIconName;
  size?: number;
  className?: string;
  alt?: string;
  title?: string;
}

export function RetroIcon({
  name,
  size = 16,
  className = '',
  alt = '',
  title,
}: RetroIconProps) {
  return (
    <img
      src={getRetroIconSrc(name)}
      width={size}
      height={size}
      className={`retro-icon ${className}`.trim()}
      alt={alt}
      title={title}
      aria-hidden={alt ? undefined : true}
      draggable={false}
    />
  );
}
