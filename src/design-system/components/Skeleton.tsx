import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ 
  width = '100%', 
  height = '1rem', 
  borderRadius = '4px',
  className = '',
  style 
}: SkeletonProps) {
  return (
    <div 
      className={`ds-skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style
      }}
    />
  );
}

export function TableSkeleton({ rows = 3, cols = 4 }: { rows?: number, cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} style={{ padding: '1rem' }}>
              <Skeleton height="1.5rem" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function CardSkeleton() {
  return (
    <div className="card glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Skeleton width="40%" height="1.5rem" />
      <Skeleton width="100%" height="4rem" />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Skeleton width="25%" height="1rem" />
        <Skeleton width="25%" height="1rem" />
      </div>
    </div>
  );
}
