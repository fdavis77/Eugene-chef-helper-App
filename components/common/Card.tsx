import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'white';
}

export const Card: React.FC<CardProps> = ({ children, className = '', variant = 'white' }) => {
  const baseClasses = 'rounded-2xl p-4 sm:p-6';
  
  const variantClasses = {
    primary: 'bg-black text-white',
    white: 'bg-white text-dark border border-medium',
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
};