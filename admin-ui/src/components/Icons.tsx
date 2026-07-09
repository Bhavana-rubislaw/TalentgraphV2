import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}

const base = (size: number, color: string) => ({
  width: size,
  height: size,
  display: 'inline-block',
  flexShrink: 0,
  fill: 'none',
  stroke: color,
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export const IconUsers = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const IconUser = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const IconUserPlus = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" />
    <line x1="16" y1="11" x2="22" y2="11" />
  </svg>
);

export const IconBriefcase = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

export const IconBriefcasePlus = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    <line x1="12" y1="12" x2="12" y2="17" />
    <line x1="9.5" y1="14.5" x2="14.5" y2="14.5" />
  </svg>
);

export const IconCheckCircle = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export const IconCalendar = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export const IconMail = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

export const IconShield = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export const IconBuilding = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

export const IconTarget = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

export const IconGrid = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

export const IconFileList = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

export const IconHierarchy = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <rect x="9" y="2" width="6" height="4" rx="1" />
    <rect x="2" y="18" width="6" height="4" rx="1" />
    <rect x="9" y="18" width="6" height="4" rx="1" />
    <rect x="16" y="18" width="6" height="4" rx="1" />
    <line x1="12" y1="6" x2="12" y2="11" />
    <line x1="5" y1="11" x2="19" y2="11" />
    <line x1="5" y1="11" x2="5" y2="18" />
    <line x1="12" y1="11" x2="12" y2="18" />
    <line x1="19" y1="11" x2="19" y2="18" />
  </svg>
);

export const IconSearch = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const IconLogOut = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export const IconMapPin = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export const IconMonitor = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

export const IconDollarSign = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

export const IconClock = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export const IconEdit = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export const IconSnowflake = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <line x1="12" y1="2" x2="12" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

export const IconXCircle = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

export const IconPlay = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

export const IconRefreshCw = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

export const IconAlertTriangle = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const IconCheck = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const IconTrendingUp = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

export const IconPieChart = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
    <path d="M22 12A10 10 0 0 0 12 2v10z" />
  </svg>
);

export const IconTrash = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

export const IconBarChart = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

export const IconList = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

export const IconActivity = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

export const IconX = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const IconDownload = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export const IconSend = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

export const IconBuildings = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
    <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
    <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
    <path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" />
  </svg>
);

export const IconInbox = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);

export const IconFilter = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

export const IconChevronRight = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export const IconInfo = ({ size = 20, color = 'currentColor', style }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, color), ...style }}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);
