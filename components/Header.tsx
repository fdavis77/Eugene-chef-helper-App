import React from 'react';
import { NavTab } from '../constants';
import { Icon } from './common/Icon';

interface HeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {

  const navItems = [
    { id: NavTab.ChefBot, icon: 'bot' },
    { id: NavTab.Menu, icon: 'utensils' },
    { id: NavTab.HACCP, icon: 'book' },
    { id: NavTab.Seasonal, icon: 'leaf' },
    { id: NavTab.Vision, icon: 'visibility' },
  ] as const;

  return (
    <header className="bg-gray-800 shadow-lg sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between py-4">
          <div className="flex items-center mb-4 sm:mb-0">
             <Icon name="chef" className="h-8 w-8 text-blue-400 mr-3" />
            <h1 className="text-2xl font-bold text-white tracking-wider">
              Chef's <span className="text-blue-400">Omni-Tool</span>
            </h1>
          </div>
          <nav className="flex space-x-2 sm:space-x-4 p-1 bg-gray-700 rounded-lg">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center justify-center px-3 py-2 text-sm sm:px-4 sm:py-2 font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-gray-800 focus:ring-blue-500 ${
                  activeTab === item.id
                    ? "bg-blue-500 text-white shadow-md"
                    : "text-gray-300 hover:bg-gray-600"
                }`}
                aria-current={activeTab === item.id ? 'page' : undefined}
              >
                 <Icon name={item.icon} className="h-5 w-5 mr-0 sm:mr-2" />
                 <span className="hidden sm:inline">{item.id}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;