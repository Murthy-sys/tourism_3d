const paths = {
  route: 'M4 19c3 0 3-6 6-6s3 6 6 6 3-6 6-6M4 5c3 0 3 6 6 6',
  bed: 'M3 18v-7a2 2 0 012-2h14a2 2 0 012 2v7M3 18h18M3 18v2M21 18v2M5 9V6a1 1 0 011-1h5a1 1 0 011 1v3',
  passport: 'M6 3h12a1 1 0 011 1v16a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1zM12 8a2 2 0 100 4 2 2 0 000-4zM9 17h6',
  compass: 'M12 21a9 9 0 100-18 9 9 0 000 18zM15 9l-2 6-6 2 2-6 6-2z',
  map: 'M9 3l-6 2v16l6-2 6 2 6-2V3l-6 2-6-2zM9 5v16M15 5v16',
  users: 'M16 11a4 4 0 10-8 0 4 4 0 008 0zM3 21c0-3.5 3-6 6-6h6c3 0 6 2.5 6 6',
}

export default function Icon({ name, size = 26 }) {
  const d = paths[name] || paths.compass
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}
