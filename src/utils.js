/** Haversine distance between two coordinates (returns km) */
export function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const x =
    Math.sin(((lat2 - lat1) * Math.PI) / 360) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(((lng2 - lng1) * Math.PI) / 360) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/** Human-readable relative date in Arabic */
export function relativeDate(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'منذ لحظات';
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  if (diff < 172800) return 'منذ يوم';
  if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} أيام`;
  if (diff < 2592000) return `منذ ${Math.floor(diff / 604800)} أسابيع`;
  return `منذ ${Math.floor(diff / 2592000)} أشهر`;
}
