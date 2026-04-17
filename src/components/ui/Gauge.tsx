import React from 'react';

interface GaugeProps {
  value: number; // 0 to 100
  label: string;
  sublabel: string;
}

const Gauge: React.FC<GaugeProps> = ({ value, label, sublabel }) => {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', width: '200px', height: '200px' }}>
      <svg width="180" height="180" style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx="90"
          cy="90"
          r={radius}
          stroke="var(--border)"
          strokeWidth="12"
          fill="transparent"
        />
        <circle
          cx="90"
          cy="90"
          r={radius}
          stroke="var(--primary)"
          strokeWidth="12"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div style={{ position: 'absolute', textAlign: 'center' }}>
        <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>{value}%</span>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</div>
      </div>
      <div style={{ marginTop: '1rem', fontWeight: '500', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{sublabel}</div>
    </div>
  );
};

export default Gauge;

