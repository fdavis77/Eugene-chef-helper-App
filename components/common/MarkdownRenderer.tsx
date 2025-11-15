import React from 'react';

interface MarkdownRendererProps {
  content: string;
  containerClassName?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  content, 
  containerClassName = "font-sans bg-white p-4 rounded-md text-dark space-y-1" 
}) => {
  const renderContent = () => {
    // Split content by newlines to process line by line
    return content.split('\n').map((line, lineIndex) => {
      // 1. Remove heading hashtags (e.g., #, ##) from the start of the line
      let processedLine = line.replace(/^#+\s*/, '');

      // 2. Split the processed line by the bold markdown syntax, keeping the delimiters
      const parts = processedLine.split(/(\*\*.*?\*\*)/g).filter(part => part);
      
      const renderedParts = parts.map((part, partIndex) => {
        // 3. If a part is bolded, render it as a <strong> element
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={partIndex} className="font-semibold text-primary">{part.slice(2, -2)}</strong>;
        }
        // Otherwise, return it as plain text
        return part;
      });

      // 4. Wrap the processed line in a paragraph, but only if it's not empty after trimming
      if (processedLine.trim() === '') return null;
      
      return <p key={lineIndex}>{renderedParts}</p>;
    });
  };

  return (
    <div className={containerClassName}>
      {renderContent()}
    </div>
  );
};