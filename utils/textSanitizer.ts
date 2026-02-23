/**
 * Text Sanitizer — deterministic post-processing pipeline
 *
 * Strips chat-template tokens, leftover XML/reasoning tags, and
 * dangerous content before the text reaches the Markdown renderer.
 * Runs synchronously; no allocations beyond the result string.
 */

// ── Chat-template tokens to remove ──────────────────────────────────
const CHAT_TOKENS = [
  // ChatML / Qwen
  "<|im_start|>",
  "<|im_end|>",
  "<|endoftext|>",
  // Gemma
  "<start_of_turn>",
  "<end_of_turn>",
  "<eos>",
  // Generic
  "<|pad|>",
  "<|sep|>",
  "<|assistant|>",
  "<|user|>",
  "<|system|>",
];

// Build one combined regex so we only scan the string once
const CHAT_TOKEN_RE = new RegExp(
  CHAT_TOKENS.map((t) => t.replace(/[|<>]/g, "\\$&")).join("|"),
  "gi",
);

// ── XML-style reasoning / analysis tags ─────────────────────────────
// Matches <analysis>…</analysis>, <reasoning>…</reasoning>, etc.
// Does NOT touch <think> — that is handled earlier by thinkingParser.
const REASONING_TAG_RE =
  /<\/?(analysis|reasoning|reflection|observation|step|scratchpad|internal|meta)\b[^>]*>/gi;

// ── Stray HTML that could pose XSS risk ─────────────────────────────
// Strip any remaining < tag > that isn't a known Markdown construct.
// Preserve Markdown-safe angle brackets used in comparisons (e.g. a < b).
const HTML_TAG_RE = /<\/?[a-z][a-z0-9]*\b[^>]*>/gi;

// ── Role prefixes models sometimes leak ─────────────────────────────
const ROLE_PREFIX_RE = /^(assistant|model|user|system)\s*:\s*/im;

/**
 * Sanitize raw model output before rendering.
 *
 * Pipeline order matters:
 *  1. Chat tokens   (cheap string replace)
 *  2. XML tags       (regex)
 *  3. HTML tags      (regex)
 *  4. Role prefixes  (regex, start-of-string only)
 *  5. Whitespace     (trim + collapse blank lines)
 */
export function sanitizeModelOutput(raw: string): string {
  if (!raw) return "";

  let text = raw;

  // 1. Strip chat-template tokens
  text = text.replace(CHAT_TOKEN_RE, "");

  // 2. Strip XML reasoning tags (keep inner content)
  text = text.replace(REASONING_TAG_RE, "");

  // 3. Strip stray HTML tags (security)
  text = text.replace(HTML_TAG_RE, "");

  // 4. Remove leaked role prefixes at start of response
  text = text.replace(ROLE_PREFIX_RE, "");

  // 5. Collapse excessive blank lines (3+ → 2) and trim
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  return text;
}
