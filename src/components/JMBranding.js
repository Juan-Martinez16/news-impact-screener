// JM Trading Services Brand Components
import React from 'react';

export const JMLogo = ({ variant = 'horizontal', width = 150, height = 50, className = '' }) => {
  const logos = {
    primary: (
      <svg width={width} height={height} viewBox="0 0 150 90" xmlns="http://www.w3.org/2000/svg" className={className}>
        <defs>
          <linearGradient id="jm-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{stopColor:'#1e40af', stopOpacity:1}} />
            <stop offset="100%" style={{stopColor:'#3b82f6', stopOpacity:1}} />
          </linearGradient>
        </defs>
        <text x="75" y="35" fontFamily="Arial, sans-serif" fontSize="34" fontWeight="700" fill="url(#jm-gradient)" textAnchor="middle" letterSpacing="1.5">JM</text>
        <text x="75" y="55" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="300" fill="#475569" textAnchor="middle" letterSpacing="2">TRADING</text>
        <text x="75" y="70" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="300" fill="#475569" textAnchor="middle" letterSpacing="2">SERVICES</text>
      </svg>
    ),
    horizontal: (
      <svg width={width} height={height} viewBox="0 0 150 50" xmlns="http://www.w3.org/2000/svg" className={className}>
        <text x="25" y="30" fontFamily="Arial, sans-serif" fontSize="28" fontWeight="700" fill="#1e40af" letterSpacing="1">JM</text>
        <text x="65" y="30" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="400" fill="#475569" letterSpacing="1">TRADING SERVICES</text>
      </svg>
    ),
    icon: (
      <svg width={width} height={height} viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" className={className}>
        <defs>
          <linearGradient id="jm-icon-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{stopColor:'#1e40af', stopOpacity:1}} />
            <stop offset="100%" style={{stopColor:'#3b82f6', stopOpacity:1}} />
          </linearGradient>
        </defs>
        <text x="25" y="30" fontFamily="Arial, sans-serif" fontSize="24" fontWeight="700" fill="url(#jm-icon-gradient)" textAnchor="middle">JM</text>
        <text x="25" y="42" fontFamily="Arial, sans-serif" fontSize="6" fontWeight="400" fill="#475569" textAnchor="middle" letterSpacing="1">TRADING</text>
      </svg>
    )
  };

  return logos[variant] || logos.primary;
};

export const brandColors = {
  primary: {
    deepBlue: '#1e40af',
    brightBlue: '#3b82f6',
    skyBlue: '#60a5fa',
    gradient: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    gradientHover: 'linear-gradient(135deg, #1a3a9f 0%, #3575e0 100%)',
  },
  charts: [
    '#1e40af', '#3b82f6', '#60a5fa', '#93bbfc',
    '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'
  ]
};