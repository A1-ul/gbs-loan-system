import React from 'react';

export const GBS_CREST_SRC = '/images/gbs-official-logo.jpeg';

/**
 * Official GBS® Registered Corporate Crest emblem.
 * Uses a custom tenant logo when provided, otherwise renders the official GBS® crest.
 */
export default function GbsBrandLogo({
  src = GBS_CREST_SRC,
  alt = 'GBS® — Intelligence Talks To Wisdom',
  size = 44,
  borderColor = '#D4AF37',
  className = '',
  style = {},
}) {
  return (
    <img
      src={src || GBS_CREST_SRC}
      alt={alt}
      className={className}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: 10,
        objectFit: 'cover',
        border: `1.5px solid ${borderColor}`,
        background: '#0A1428',
        boxShadow: '0 2px 10px rgba(212, 175, 55, 0.25)',
        display: 'block',
        ...style,
      }}
    />
  );
}

