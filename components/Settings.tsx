import React from 'react';
import { Card } from './common/Card';
import { Icon } from './common/Icon';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, onLogout }) => {
    if (!isOpen) return null;

    return (
        <div 
          className="fixed inset-0 bg-light z-50 animate-fade-in-up"
        >
          <div 
            className="w-full h-full p-4 sm:p-6"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-dark">Settings</h2>
              <button onClick={onClose} className="text-muted hover:text-dark">
                <Icon name="x-circle" className="h-8 w-8" />
              </button>
            </div>
            
            <div className="space-y-4">
               <Card>
                  <h3 className="text-lg font-bold text-dark mb-2">Account</h3>
                   <p className="text-muted mb-4 text-sm">
                        Manage your account settings and preferences.
                    </p>
                    <button
                        onClick={onLogout}
                        className="bg-red-500 text-white font-bold py-3 px-5 rounded-lg hover:bg-red-600 transition duration-300 w-full sm:w-auto"
                    >
                        Log Out
                    </button>
              </Card>

            </div>
          </div>
        </div>
    );
};

export default Settings;