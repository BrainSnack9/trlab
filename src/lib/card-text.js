export function formatCardText(value) {
  return `${value ?? ''}`
    .replace(/\s[-–—]\s/g, '\n')
    .replace(/(?:^|\s)([-–—•])\s+/g, '\n')
    .replace(/(\d+[.)])\s+/g, '\n$1 ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim().replace(/^[-–—•]\s*/, ''))
    .filter(Boolean)
    .join('\n');
}

export function cardTextLines(value, limit = 28, max = 4) {
  const lines = [];
  formatCardText(value).split('\n').forEach((line) => {
    for (let index = 0; index < line.length && lines.length < max; index += limit) {
      lines.push(line.slice(index, index + limit));
    }
  });
  return lines;
}
