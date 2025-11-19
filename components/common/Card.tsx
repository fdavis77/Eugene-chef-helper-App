import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  const { activeTheme } = useTheme();
  const baseClasses = 'rounded-2xl p-4 sm:p-6';
  
  return (
    <div className={`${baseClasses} ${activeTheme.classes.cardBg} border ${activeTheme.classes.cardBorder} ${className}`}>
      {children}
    </div>
  );
};