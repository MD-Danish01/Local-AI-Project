/**
 * Thinking Tag Parser
 * Handles extraction and parsing of <think> tags from model responses
 */

export interface ParsedResponse {
  /** The thinking/reasoning process (content inside <think> tags) */
  thinking: string;
  /** The main response (content outside <think> tags) */
  mainResponse: string;
  /** Whether thinking is currently in progress (unclosed tag) */
  isThinking: boolean;
  /** Raw original text */
  raw: string;
}

/**
 * Parse response text to extract thinking and main content
 * Handles both closed and unclosed <think> tags
 */
export function parseThinkingResponse(text: string): ParsedResponse {
  let thinking = '';
  let mainResponse = '';
  let isThinking = false;

  // Pattern to match <think>...</think> tags (including unclosed)
  const thinkRegex = /<think>([\s\S]*?)(?:<\/think>|$)/gi;
  
  // Extract all thinking sections
  let match;
  let lastIndex = 0;
  const thinkingSections: string[] = [];
  
  while ((match = thinkRegex.exec(text)) !== null) {
    // Add content before this think tag to main response
    if (match.index > lastIndex) {
      mainResponse += text.substring(lastIndex, match.index);
    }
    
    // Extract thinking content
    const thinkingContent = match[1].trim();
    if (thinkingContent) {
      thinkingSections.push(thinkingContent);
    }
    
    // Check if tag is unclosed (ends without </think>)
    if (!match[0].includes('</think>')) {
      isThinking = true;
    }
    
    lastIndex = match.index + match[0].length;
  }

  // Add any remaining content after last think tag
  if (lastIndex < text.length) {
    mainResponse += text.substring(lastIndex);
  }

  // Combine all thinking sections
  thinking = thinkingSections.join('\n\n');

  return {
    thinking: thinking.trim(),
    mainResponse: mainResponse.trim(),
    isThinking,
    raw: text,
  };
}

/**
 * Extract only the main response (strip all <think> tags)
 */
export function stripThinkingTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

/**
 * Extract only the thinking content
 */
export function extractThinking(text: string): string {
  const matches = text.match(/<think>([\s\S]*?)(?:<\/think>|$)/gi);
  if (!matches) return '';
  
  return matches
    .map(m => m.replace(/<\/?think>/gi, '').trim())
    .join('\n\n');
}

/**
 * Check if text contains thinking tags
 */
export function hasThinkingTags(text: string): boolean {
  return /<think>/i.test(text);
}

/**
 * Format thinking for display with improved readability
 */
export function formatThinkingForDisplay(thinking: string): string {
  return thinking
    // Add line breaks for better readability
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
}
