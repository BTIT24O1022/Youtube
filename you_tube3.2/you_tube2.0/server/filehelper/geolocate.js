// Free, keyless IP geolocation via ip-api.com. No signup, no API key -- but
// also no guarantees: it's rate-limited (45 req/min) and approximate at
// best. Always wrapped in try/catch by the caller, and never blocks posting
// a comment if it fails or times out.
// Free, keyless IP geolocation via ip-api.com. No signup, no API key -- but
// also no guarantees: it's rate-limited (45 req/min) and approximate at
// best. Always wrapped in try/catch by the caller, and never blocks posting
// a comment or completing a login if it fails or times out.
export const geolocateIpDetailed = async (ip) => {
  try {
    if (!ip || ip === "::1" || ip.startsWith("127.") || ip.startsWith("192.168.") || ip.startsWith("10.")) {
      return { city: "", state: "", country: "" };
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=city,regionName,country,status`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json();
    if (data.status !== "success") return { city: "", state: "", country: "" };
    return { city: data.city || "", state: data.regionName || "", country: data.country || "" };
  } catch (error) {
    return { city: "", state: "", country: "" };
  }
};

export const geolocateIp = async (ip) => {
  const { city, country } = await geolocateIpDetailed(ip);
  return [city, country].filter(Boolean).join(", ");
};
