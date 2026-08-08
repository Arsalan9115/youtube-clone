export const SOUTH_STATES = [
  "Tamil Nadu",
  "Kerala",
  "Karnataka",
  "Andhra Pradesh",
  "Telangana",
];

const STATE_BOUNDING_BOXES = {
  "Tamil Nadu": {
    maxLatitude: 13.9,
    maxLongitude: 80.4,
    minLatitude: 8,
    minLongitude: 76,
  },
  Kerala: {
    maxLatitude: 12.9,
    maxLongitude: 77.5,
    minLatitude: 8.1,
    minLongitude: 74.8,
  },
  Karnataka: {
    maxLatitude: 18.6,
    maxLongitude: 78.7,
    minLatitude: 11.5,
    minLongitude: 74,
  },
  "Andhra Pradesh": {
    maxLatitude: 19.3,
    maxLongitude: 84.9,
    minLatitude: 12.6,
    minLongitude: 77,
  },
  Telangana: {
    maxLatitude: 19.95,
    maxLongitude: 81,
    minLatitude: 15.7,
    minLongitude: 77.2,
  },
} as const;

export const normalizeState = (state = "") =>
  state
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export const isSouthState = (state = "") =>
  SOUTH_STATES.map(normalizeState).includes(normalizeState(state));

export const detectSouthStateFromCoordinates = (
  latitude?: number | null,
  longitude?: number | null
) => {
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }

  return (
    Object.entries(STATE_BOUNDING_BOXES).find(([, bounds]) => {
      return (
        latitude >= bounds.minLatitude &&
        latitude <= bounds.maxLatitude &&
        longitude >= bounds.minLongitude &&
        longitude <= bounds.maxLongitude
      );
    })?.[0] || null
  );
};

export const getIstHour = () => {
  const hourValue = new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  return Number(hourValue);
};

export const getIstHourForDate = (dateInput?: string | number | Date | null) => {
  const date = dateInput ? new Date(dateInput) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const hourValue = new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).format(safeDate);

  return Number(hourValue);
};

export const resolveThemeMode = (
  state = "",
  loginDate?: string | number | Date | null
) => {
  const istHour = getIstHourForDate(loginDate);
  const isSouth = isSouthState(state);
  const isLightWindow = istHour >= 10 && istHour < 12;

  return isSouth && isLightWindow ? "light" : "dark";
};
