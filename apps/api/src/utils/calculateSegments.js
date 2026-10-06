// SMS segment calculation.
//
// GSM 7-bit default alphabet → 160 chars per single segment, 153 per
// concatenated segment. Anything outside the GSM set (Unicode/UCS-2) →
// 70 chars per single segment, 67 per concatenated segment.
//
// Returns the number of billable segments for a message body.

// GSM 03.38 default alphabet (basic char set) as a string. Includes the
// explicit newline (\n) and carriage return (\r) control chars.
const GSM_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';

// GSM 7-bit extension characters (each counts as 2 chars in the 7-bit buffer,
// but for segment-length purposes they still belong to the GSM family).
const GSM_EXT = new Set(['^', '{', '}', '\\', '[', ']', '~', '|', '€']);

const GSM_BASIC_SET = new Set(GSM_BASIC);

function isGsm(message) {
  for (const ch of message) {
    if (!GSM_BASIC_SET.has(ch) && !GSM_EXT.has(ch)) return false;
  }
  return true;
}

export function calculateSegments(message) {
  const text = message ?? '';
  if (text.length === 0) return 1;

  const gsm = isGsm(text);
  const singleLen = gsm ? 160 : 70;
  const multiLen = gsm ? 153 : 67;

  if (text.length <= singleLen) return 1;
  return Math.ceil(text.length / multiLen);
}

export default calculateSegments;
