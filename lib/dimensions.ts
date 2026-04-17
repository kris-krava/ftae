export interface ParsedDimensions {
  height: number | null;
  width: number | null;
  depth: number | null;
  unit: 'in' | 'cm';
}

const NUMBER = '(\\d+(?:\\.\\d+)?)';
const SEPARATOR = '\\s*[x×X]\\s*';
const UNIT = '(in|cm|inches|centimeters|centimetres)?';
const PATTERN = new RegExp(
  `^\\s*${NUMBER}(?:${SEPARATOR}${NUMBER}(?:${SEPARATOR}${NUMBER})?)?\\s*${UNIT}\\s*$`,
  'i',
);

export function parseDimensions(raw: string): ParsedDimensions | null {
  if (!raw) return null;
  const match = raw.match(PATTERN);
  if (!match) return null;
  const a = parseFloat(match[1]);
  const b = match[2] ? parseFloat(match[2]) : null;
  const c = match[3] ? parseFloat(match[3]) : null;
  const unitRaw = (match[4] ?? 'in').toLowerCase();
  const unit: 'in' | 'cm' = unitRaw.startsWith('c') ? 'cm' : 'in';

  return {
    height: a,
    width: b,
    depth: c,
    unit,
  };
}
