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
    for (const wrapped of wrapLine(line, limit)) {
      if (lines.length >= max) break;
      lines.push(wrapped);
    }
  });
  return lines;
}

function wrapLine(line, limit) {
  if (line.length <= limit) return [line];
  const words = line.split(/(\s+)/).filter(Boolean);
  const output = [];
  let current = '';
  for (const word of words) {
    if (/^\s+$/.test(word)) {
      if (current && !current.endsWith(' ')) current += ' ';
      continue;
    }
    if (word.length > limit) {
      if (current.trim()) output.push(current.trim());
      for (let index = 0; index < word.length; index += limit) output.push(word.slice(index, index + limit));
      current = '';
      continue;
    }
    const next = `${current}${word}`;
    if (next.trim().length > limit && current.trim()) {
      output.push(current.trim());
      current = word;
    } else {
      current = next;
    }
  }
  if (current.trim()) output.push(current.trim());
  return output;
}
