import React from 'react';
import { Icon } from './common/Icon';

interface TopBarProps {
  onSettingsClick: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onSettingsClick }) => {
  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-medium">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-dark tracking-tighter">
              Eugene <span className="text-primary">AI</span>
            </h1>
          </div>
          <nav>
            <button
              onClick={onSettingsClick}
              className="text-muted hover:text-dark transition-colors"
              aria-label="Open Settings"
            >
              <Icon name="user-circle" className="h-8 w-8" />
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default TopBar;