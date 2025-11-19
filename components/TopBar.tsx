import React from 'react';
import { Icon } from './common/Icon';
import { useTheme } from '../contexts/ThemeContext';

interface TopBarProps {
  onSettingsClick: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onSettingsClick }) => {
  const { activeTheme } = useTheme();

  return (
    <header className={`sticky top-0 z-10 ${activeTheme.classes.headerBg}/80 backdrop-blur-md border-b ${activeTheme.classes.cardBorder}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center">
            <h1 className={`text-2xl font-bold tracking-tighter ${activeTheme.classes.textHeading}`}>
              Eugene <span className="text-primary">AI</span>
            </h1>
          </div>
          <nav>
            <button
              onClick={onSettingsClick}
              className={`${activeTheme.classes.textMuted} hover:${activeTheme.classes.textColor} transition-colors`}
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