/**
 * Strips common markdown formatting from a string to return plain text.
 * @param text The markdown-formatted string.
 * @returns The plain text string.
 */
export const stripMarkdown = (text: string): string => {
  if (!text) return '';
  
  return text
    // Remove bold and italic (asterisks and underscores)
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove heading hashtags
    .replace(/^#+\s*/gm, '')
    .trim();
};
