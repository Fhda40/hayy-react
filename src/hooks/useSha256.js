export async function sha256(str, salt = 'hayy_user_2026') {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(str + salt)
  );
  return [...new Uint8Array(buf)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
