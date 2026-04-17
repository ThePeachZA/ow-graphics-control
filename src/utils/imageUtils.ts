export function getImageSrc(path: string): string {
  if (!path) return '';
  
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  const normalizedPath = path.replace(/\\/g, '/');
  
  if (normalizedPath.match(/^[a-zA-Z]:/)) {
    return `file:///${normalizedPath}`;
  }
  
  return `file://${normalizedPath}`;
}
