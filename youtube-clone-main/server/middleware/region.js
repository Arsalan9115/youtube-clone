const SOUTH_STATES = new Set([
  "Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana",
]);

const cache = new Map();
const cacheForMs = 10 * 60 * 1000;

const getClientIp = (req) => (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "")
  .split(",")[0].trim().replace("::ffff:", "");

const isLocalIp = (ip) => !ip || ip === "::1" || ip === "127.0.0.1";
const getIstHour = () => Number(new Intl.DateTimeFormat("en-IN", {
  hour: "numeric", hour12: false, timeZone: "Asia/Kolkata",
}).format(new Date()));

const lookup = async (ip) => {
  if (isLocalIp(ip)) return { city: "", country_name: "India", region: "" };
  const saved = cache.get(ip);
  if (saved?.expiresAt > Date.now()) return saved.value;
  const response = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
    signal: AbortSignal.timeout(4000),
  });
  if (!response.ok) throw new Error("IP location lookup failed");
  const value = await response.json();
  cache.set(ip, { expiresAt: Date.now() + cacheForMs, value });
  return value;
};

/** Restricts public traffic to India and exposes an IST/location based theme. */
export const regionMiddleware = async (req, res, next) => {
  try {
    const location = await lookup(getClientIp(req));
    if (location.country_name !== "India") {
      return res.status(403).json({ error: "Only India allowed" });
    }
    req.location = location;
    req.theme = getIstHour() >= 10 && getIstHour() < 12 && SOUTH_STATES.has(location.region)
      ? "light"
      : "dark";
    return next();
  } catch (error) {
    // Do not make the app unusable when the external GeoIP provider is down
    // or rate-limited. A verified non-India response is still blocked above.
    req.location = { city: "", country_name: "India", region: "" };
    req.theme = "dark";
    return next();
  }
};
