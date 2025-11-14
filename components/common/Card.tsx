import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-gray-800/50 border border-gray-700 rounded-lg shadow-xl p-6 ${className}`}>
      {children}
    </div>
  );
};