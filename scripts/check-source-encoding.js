import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRoots = ['apps', 'scripts', 'test'];
const textExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.css']);
const ignoredDirs = new Set(['.next', 'node_modules', 'dist', 'coverage']);
const intentionalFiles = new Set([
  path.normalize('apps/was/src/core/trlab/modules/helpers/text-repair.js'),
  path.normalize('scripts/check-source-encoding.js')
]);

const mojibakeFragments = [
  '\uFFFD',
  'ï¿½',
  '諛붾',
  '寃',
  '利앹',
  '願',
  '媛',
  '怨?',
  '蹂',
  '?쒖',
  '?꾨',
  '?붿',
  '?щ',
  '?댁',
  '?덉'
];

const latin1Utf8Pattern = /(?:Ã.|Â.|ì.|ë.|ê.|í.|ã.|ð.)/u;
const c1ControlPattern = /[\u0080-\u009F]/u;

export function scanSourceText({ cwd = process.cwd(), roots = defaultRoots } = {}) {
  const files = roots.flatMap((root) => walk(path.join(cwd, root)));
  const findings = [];

  for (const file of files) {
    const relative = path.normalize(path.relative(cwd, file));
    if (intentionalFiles.has(relative)) continue;
    const text = fs.readFileSync(file, 'utf8');
    text.split(/\r?\n/).forEach((line, index) => {
      const reason = getMojibakeReason(line);
      if (reason) findings.push({ file: relative, line: index + 1, reason, text: line.trim().slice(0, 180) });
    });
  }

  return findings;
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) walk(fullPath, files);
      continue;
    }
    if (textExtensions.has(path.extname(entry.name))) files.push(fullPath);
  }
  return files;
}

function getMojibakeReason(line) {
  const fragment = mojibakeFragments.find((item) => line.includes(item));
  if (fragment) return `suspicious fragment "${fragment}"`;
  if (latin1Utf8Pattern.test(line)) return 'UTF-8 text decoded as Latin-1/Windows-1252';
  if (c1ControlPattern.test(line)) return 'C1 control character';
  return '';
}

function formatFindings(findings) {
  return findings.map((finding) => (
    `${finding.file}:${finding.line} ${finding.reason}\n  ${finding.text}`
  )).join('\n');
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const findings = scanSourceText();
  if (findings.length) {
    console.error(`Found ${findings.length} suspicious source text encoding issue(s):`);
    console.error(formatFindings(findings));
    process.exitCode = 1;
  } else {
    console.log('Source text encoding check passed.');
  }
}
