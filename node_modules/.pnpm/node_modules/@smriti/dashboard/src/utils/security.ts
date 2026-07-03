/**
 * Helper to mask sensitive local paths (like usernames/user profile folders)
 * for enhanced security and privacy on screen shares, screenshots, and presentations.
 */
export function maskPath(path: string | undefined | null, enabled: boolean): string {
  if (!path) return '';
  if (!enabled) return path;

  let masked = path;

  // Mask Windows paths: e.g. C:\Users\username\folder -> C:\Users\***\folder
  const winMatch = masked.match(/^([a-zA-Z]:\\Users\\)([^\\]+)(.*)$/);
  if (winMatch) {
    return `${winMatch[1]}***${winMatch[3]}`;
  }

  // Mask Unix paths: e.g. /Users/username/folder or /home/username/folder -> /Users/***/folder
  const unixMatch = masked.match(/^(\/(?:Users|home)\/)([^\/]+)(.*)$/);
  if (unixMatch) {
    return `${unixMatch[1]}***${unixMatch[3]}`;
  }

  // Fallback: If it's a long path, replace the middle segments
  const parts = masked.split(/[\\/]/);
  if (parts.length > 3) {
    const sep = masked.includes('\\') ? '\\' : '/';
    return `...${sep}${parts.slice(-2).join(sep)}`;
  }

  return masked;
}
