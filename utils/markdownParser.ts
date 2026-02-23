/**
 * Lightweight Markdown parser for React Native.
 *
 * Converts a sanitized string into an array of typed tokens that
 * the RichText component renders with native <Text> / <View>.
 *
 * Supported syntax:
 *   # / ## / ### headings
 *   **bold**  /  *italic*  /  ***bold-italic***
 *   `inline code`
 *   ```lang\n…\n```  fenced code blocks
 *   - / * / •  unordered lists
 *   1. / 2.   ordered lists
 *   $…$ inline math  /  $$…$$ display math
 *   > blockquote
 *
 * Does NOT produce HTML — returns data structures only.
 */

// ── Token types ─────────────────────────────────────────────────────

export type TokenType =
  | "text"
  | "heading"
  | "bold"
  | "italic"
  | "bold-italic"
  | "code-inline"
  | "code-block"
  | "list-item"
  | "math-inline"
  | "math-block"
  | "blockquote"
  | "newline";

export interface Token {
  type: TokenType;
  content: string;
  /** Heading level 1-3, or list nesting depth */
  level?: number;
  /** Language hint for code blocks */
  language?: string;
  /** For ordered lists: the number */
  ordered?: boolean;
  /** Inline segments within a block-level token */
  children?: InlineSpan[];
}

export interface InlineSpan {
  type:
    | "text"
    | "bold"
    | "italic"
    | "bold-italic"
    | "code-inline"
    | "math-inline";
  content: string;
}

// ── Public API ──────────────────────────────────────────────────────

export function parseMarkdown(text: string): Token[] {
  if (!text) return [];
  const lines = text.split("\n");
  const tokens: Token[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── Fenced code block ───────────────────────────────────────
    const codeFence = line.match(/^```(\w*)\s*$/);
    if (codeFence) {
      const language = codeFence[1] || "";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].match(/^```\s*$/)) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      tokens.push({
        type: "code-block",
        content: codeLines.join("\n"),
        language,
      });
      continue;
    }

    // ── Display math $$ … $$ ────────────────────────────────────
    if (line.trim().startsWith("$$")) {
      const mathLines: string[] = [line.replace(/^\$\$/, "")];
      if (!line.trim().endsWith("$$") || line.trim() === "$$") {
        i++;
        while (i < lines.length) {
          if (lines[i].trim().endsWith("$$")) {
            mathLines.push(lines[i].replace(/\$\$$/, ""));
            break;
          }
          mathLines.push(lines[i]);
          i++;
        }
      } else {
        // Single-line $$…$$
        mathLines[0] = line.trim().slice(2, -2);
      }
      i++;
      tokens.push({
        type: "math-block",
        content: mathLines.join("\n").trim(),
      });
      continue;
    }

    // ── Heading ─────────────────────────────────────────────────
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      tokens.push({
        type: "heading",
        content: headingMatch[2].trim(),
        level: headingMatch[1].length,
        children: parseInlineSpans(headingMatch[2].trim()),
      });
      i++;
      continue;
    }

    // ── Blockquote ──────────────────────────────────────────────
    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      tokens.push({
        type: "blockquote",
        content: quoteMatch[1],
        children: parseInlineSpans(quoteMatch[1]),
      });
      i++;
      continue;
    }

    // ── Unordered list ──────────────────────────────────────────
    const ulMatch = line.match(/^(\s*)[-*•]\s+(.+)$/);
    if (ulMatch) {
      tokens.push({
        type: "list-item",
        content: ulMatch[2],
        ordered: false,
        children: parseInlineSpans(ulMatch[2]),
      });
      i++;
      continue;
    }

    // ── Ordered list ────────────────────────────────────────────
    const olMatch = line.match(/^(\s*)\d+[.)]\s+(.+)$/);
    if (olMatch) {
      tokens.push({
        type: "list-item",
        content: olMatch[2],
        ordered: true,
        children: parseInlineSpans(olMatch[2]),
      });
      i++;
      continue;
    }

    // ── Blank line ──────────────────────────────────────────────
    if (line.trim() === "") {
      // Collapse multiple blank lines; only push if last wasn't a newline
      if (tokens.length === 0 || tokens[tokens.length - 1].type !== "newline") {
        tokens.push({ type: "newline", content: "" });
      }
      i++;
      continue;
    }

    // ── Normal paragraph (inline parsing) ───────────────────────
    tokens.push({
      type: "text",
      content: line,
      children: parseInlineSpans(line),
    });
    i++;
  }

  return tokens;
}

// ── Inline span parser ──────────────────────────────────────────────

/**
 * Parse inline Markdown spans from a single line of text.
 * Order: math-inline → code-inline → bold-italic → bold → italic → text
 */
export function parseInlineSpans(text: string): InlineSpan[] {
  if (!text) return [];

  const spans: InlineSpan[] = [];

  // Regex that matches inline patterns in priority order
  // Group 1: inline math $…$
  // Group 2: inline code `…`
  // Group 3: bold-italic ***…***
  // Group 4: bold **…**
  // Group 5: italic *…* (not preceded by *)
  const inlineRe =
    /\$([^\$]+?)\$|`([^`]+?)`|\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*([^*]+?)\*/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRe.exec(text)) !== null) {
    // Push any plain text before this match
    if (match.index > lastIndex) {
      spans.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }

    if (match[1] !== undefined) {
      spans.push({ type: "math-inline", content: match[1] });
    } else if (match[2] !== undefined) {
      spans.push({ type: "code-inline", content: match[2] });
    } else if (match[3] !== undefined) {
      spans.push({ type: "bold-italic", content: match[3] });
    } else if (match[4] !== undefined) {
      spans.push({ type: "bold", content: match[4] });
    } else if (match[5] !== undefined) {
      spans.push({ type: "italic", content: match[5] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last match
  if (lastIndex < text.length) {
    spans.push({ type: "text", content: text.slice(lastIndex) });
  }

  // If nothing was parsed, return the whole thing as text
  if (spans.length === 0) {
    spans.push({ type: "text", content: text });
  }

  return spans;
}
