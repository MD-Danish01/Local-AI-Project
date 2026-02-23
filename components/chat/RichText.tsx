/**
 * RichText — lightweight Markdown renderer for React Native.
 *
 * Takes raw model output, sanitizes it, parses Markdown tokens,
 * and renders them with native <Text> / <View> — zero dependencies.
 *
 * Supports: headings, bold, italic, inline code, fenced code blocks,
 * ordered/unordered lists, blockquotes, inline/display math, and
 * copy-to-clipboard on code blocks.
 */
import {
    parseMarkdown,
    type InlineSpan,
    type Token,
} from "@/utils/markdownParser";
import { sanitizeModelOutput } from "@/utils/textSanitizer";
import * as Clipboard from "expo-clipboard";
import React, { useCallback, useMemo } from "react";
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

// ── Props ───────────────────────────────────────────────────────────

interface RichTextProps {
  /** Raw model output (will be sanitized internally) */
  children: string;
  /** Base text color (inherits from bubble) */
  color?: string;
  /** Font size for body text */
  fontSize?: number;
}

// ── Component ───────────────────────────────────────────────────────

export const RichText = React.memo(function RichText({
  children: raw,
  color = "#FFFFFF",
  fontSize = 15,
}: RichTextProps) {
  // Pipeline: sanitize → parse → render (all sync, memoised)
  const tokens = useMemo(() => {
    const clean = sanitizeModelOutput(raw);
    return parseMarkdown(clean);
  }, [raw]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
    } catch {
      // silently fail — clipboard may not be available
    }
  }, []);

  if (tokens.length === 0) return null;

  return (
    <View style={styles.root}>
      {tokens.map((token, i) =>
        renderToken(token, i, color, fontSize, copyToClipboard),
      )}
    </View>
  );
});

// ── Token renderer ──────────────────────────────────────────────────

function renderToken(
  token: Token,
  key: number,
  color: string,
  fontSize: number,
  onCopy: (text: string) => void,
): React.ReactElement | null {
  switch (token.type) {
    // ── Heading ─────────────────────────────────────────────────
    case "heading": {
      const sizes = [fontSize + 7, fontSize + 4, fontSize + 2];
      const size = sizes[Math.min((token.level ?? 1) - 1, 2)];
      return (
        <Text key={key} style={[styles.heading, { color, fontSize: size }]}>
          {renderInlineSpans(token.children ?? [], color, fontSize)}
        </Text>
      );
    }

    // ── Code block ──────────────────────────────────────────────
    case "code-block":
      return (
        <View key={key} style={styles.codeBlockContainer}>
          <View style={styles.codeBlockHeader}>
            <Text style={styles.codeBlockLang}>{token.language || "code"}</Text>
            <TouchableOpacity
              onPress={() => onCopy(token.content)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.copyBtn}>Copy</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.codeBlockBody}>
            <Text style={styles.codeBlockText} selectable>
              {token.content}
            </Text>
          </View>
        </View>
      );

    // ── Block math ──────────────────────────────────────────────
    case "math-block":
      return (
        <View key={key} style={styles.mathBlock}>
          <Text style={[styles.mathText, { color }]} selectable>
            {token.content}
          </Text>
        </View>
      );

    // ── Blockquote ──────────────────────────────────────────────
    case "blockquote":
      return (
        <View key={key} style={styles.blockquote}>
          <Text style={[styles.blockquoteText, { fontSize }]}>
            {renderInlineSpans(token.children ?? [], "#9CA3AF", fontSize)}
          </Text>
        </View>
      );

    // ── List item ───────────────────────────────────────────────
    case "list-item":
      return (
        <View key={key} style={styles.listItem}>
          <Text style={[styles.listBullet, { color, fontSize }]}>
            {token.ordered ? "•" : "•"}
          </Text>
          <Text style={[styles.listText, { color, fontSize }]}>
            {renderInlineSpans(token.children ?? [], color, fontSize)}
          </Text>
        </View>
      );

    // ── Newline / spacing ───────────────────────────────────────
    case "newline":
      return <View key={key} style={styles.spacer} />;

    // ── Normal text paragraph ───────────────────────────────────
    case "text":
    default:
      return (
        <Text key={key} style={[styles.paragraph, { color, fontSize }]}>
          {renderInlineSpans(token.children ?? [], color, fontSize)}
        </Text>
      );
  }
}

// ── Inline span renderer ────────────────────────────────────────────

function renderInlineSpans(
  spans: InlineSpan[],
  color: string,
  fontSize: number,
): React.ReactNode[] {
  return spans.map((span, i) => {
    switch (span.type) {
      case "bold":
        return (
          <Text key={i} style={{ fontWeight: "700", color }}>
            {span.content}
          </Text>
        );
      case "italic":
        return (
          <Text key={i} style={{ fontStyle: "italic", color }}>
            {span.content}
          </Text>
        );
      case "bold-italic":
        return (
          <Text
            key={i}
            style={{ fontWeight: "700", fontStyle: "italic", color }}
          >
            {span.content}
          </Text>
        );
      case "code-inline":
        return (
          <Text key={i} style={styles.inlineCode}>
            {span.content}
          </Text>
        );
      case "math-inline":
        return (
          <Text key={i} style={[styles.inlineMath, { color }]}>
            {span.content}
          </Text>
        );
      case "text":
      default:
        return (
          <Text key={i} style={{ color }}>
            {span.content}
          </Text>
        );
    }
  });
}

// ── Styles ──────────────────────────────────────────────────────────

const MONO_FONT = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "monospace",
});

const styles = StyleSheet.create({
  root: {
    gap: 2,
  },

  // Text
  paragraph: {
    lineHeight: 22,
  },
  heading: {
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 4,
    lineHeight: 28,
  },

  // Code block
  codeBlockContainer: {
    marginVertical: 8,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333",
  },
  codeBlockHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#252525",
  },
  codeBlockLang: {
    fontSize: 11,
    color: "#888",
    fontFamily: MONO_FONT,
    textTransform: "uppercase",
  },
  copyBtn: {
    fontSize: 11,
    color: "#00D9FF",
    fontWeight: "600",
  },
  codeBlockBody: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  codeBlockText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#E0E0E0",
    fontFamily: MONO_FONT,
  },

  // Inline code
  inlineCode: {
    fontFamily: MONO_FONT,
    fontSize: 13,
    color: "#FF7B72",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 4,
    borderRadius: 4,
  },

  // Math
  mathBlock: {
    marginVertical: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#00D9FF",
  },
  mathText: {
    fontFamily: MONO_FONT,
    fontSize: 14,
    lineHeight: 20,
    fontStyle: "italic",
  },
  inlineMath: {
    fontFamily: MONO_FONT,
    fontStyle: "italic",
  },

  // Blockquote
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: "#555",
    paddingLeft: 12,
    marginVertical: 4,
  },
  blockquoteText: {
    color: "#9CA3AF",
    fontStyle: "italic",
    lineHeight: 22,
  },

  // List
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingLeft: 4,
    marginVertical: 2,
  },
  listBullet: {
    width: 16,
    textAlign: "center",
  },
  listText: {
    flex: 1,
    lineHeight: 22,
  },

  // Spacing
  spacer: {
    height: 8,
  },
});
