export const RATE_LIMITS = {
  login: { points: 5, duration: 600, blockDuration: 900 },
  api: { points: 1000, duration: 60 },
  search: { points: 10, duration: 60 },
  export: { points: 5, duration: 3600 },
  passwordReset: { points: 3, duration: 3600 },
} as const;
