import React from 'react';
import { NavTab } from '../constants';
import { Icon } from './common/Icon';

interface BottomNavProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

const navItems = [
  { id: NavTab.Home, icon: 'home', label: 'Home' },
  { id: NavTab.Planner, icon: 'calendar', label: 'Planner' },
  { id: NavTab.Logs, icon: 'clipboard-check', label: 'Logs' },
  { id: NavTab.Vision, icon: 'eye', label: 'Vision' },
] as const;

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-medium z-20">
      <div className="container mx-auto flex justify-around">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center pt-3 pb-2 w-full transition-colors duration-200 text-sm ${
              activeTab === item.id ? 'text-black' : 'text-muted hover:text-dark'
            }`}
            aria-current={activeTab === item.id ? 'page' : undefined}
          >
            <Icon
              name={item.icon}
              className="h-6 w-6 mb-1"
            />
            <span className="font-semibold">{item.label}</span>
            {activeTab === item.id && (
              <div className="w-8 h-1 bg-primary rounded-full mt-1.5" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;