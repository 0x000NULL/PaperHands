import type { CSSProperties } from 'react';

interface TourSpotlightProps {
  targetRect: DOMRect | null;
  padding?: number;
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1001,
    pointerEvents: 'none',
  },
};

export function TourSpotlight({ targetRect, padding = 8 }: TourSpotlightProps) {
  if (!targetRect) {
    return (
      <div
        style={{
          ...styles.overlay,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
        }}
      />
    );
  }

  // Calculate the spotlight cutout position
  const spotlightStyle: CSSProperties = {
    ...styles.overlay,
    // Use box-shadow to create spotlight effect
    boxShadow: `
      0 0 0 9999px rgba(0, 0, 0, 0.85),
      0 0 15px 5px rgba(0, 255, 136, 0.3)
    `,
    // Position the "hole" using clip-path
    clipPath: `polygon(
      0% 0%,
      0% 100%,
      ${targetRect.left - padding}px 100%,
      ${targetRect.left - padding}px ${targetRect.top - padding}px,
      ${targetRect.right + padding}px ${targetRect.top - padding}px,
      ${targetRect.right + padding}px ${targetRect.bottom + padding}px,
      ${targetRect.left - padding}px ${targetRect.bottom + padding}px,
      ${targetRect.left - padding}px 100%,
      100% 100%,
      100% 0%
    )`,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  };

  return <div style={spotlightStyle} />;
}
