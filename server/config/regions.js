export const SOUTH_INDIAN_STATES = [
  "Tamil Nadu",
  "Kerala",
  "Karnataka",
  "Andhra Pradesh",
  "Telangana",
];

export const normalizeState = (state = "") =>
  state
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export const isSouthIndianState = (state = "") =>
  SOUTH_INDIAN_STATES.map(normalizeState).includes(normalizeState(state));
