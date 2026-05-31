const mojibakePattern = /[ÃÂ]|ì|ë|ê|í|ã|ð|¢||�/;
const cp1252 = new Map(Object.entries({ '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87, 'ˆ': 0x88, '‰': 0x89, 'Š': 0x8a, '‹': 0x8b, 'Œ': 0x8c, 'Ž': 0x8e, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '˜': 0x98, '™': 0x99, 'š': 0x9a, '›': 0x9b, 'œ': 0x9c, 'ž': 0x9e, 'Ÿ': 0x9f }));

export function repairText(value) {
  if (typeof value !== 'string' || !mojibakePattern.test(value)) return value;
  const candidates = [
    value,
    decodeAs(value, 'latin1'),
    decodeCp1252(value),
    decodeAs(value.replace(/Â/g, ''), 'latin1')
  ].filter(Boolean);
  return candidates.sort((a, b) => scoreText(b) - scoreText(a))[0] ?? value;
}

export function repairObjectText(object, keys) {
  return keys.reduce((next, key) => ({ ...next, [key]: repairText(next[key]) }), { ...object });
}

export function repairTextList(values) {
  return Array.isArray(values) ? values.map(repairText) : [];
}

export function repairDeep(value) {
  if (typeof value === 'string') return repairText(value);
  if (Array.isArray(value)) return value.map(repairDeep);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, repairDeep(item)]));
}

function decodeAs(value, encoding) {
  try { return Buffer.from(value, encoding).toString('utf8'); } catch { return ''; }
}

function decodeCp1252(value) {
  try {
    const bytes = [...value].map((char) => cp1252.get(char) ?? char.charCodeAt(0)).filter((code) => code <= 255);
    return Buffer.from(bytes).toString('utf8');
  } catch {
    return '';
  }
}

function scoreText(value) {
  const korean = (value.match(/[가-힣]/g) ?? []).length;
  const broken = (value.match(/[ÃÂìëêíãð¢�]/g) ?? []).length;
  return korean * 3 - broken * 4 - Math.abs(value.length - [...value].length);
}
