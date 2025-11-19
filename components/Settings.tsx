import React, { useRef } from 'react';
import { Card } from './common/Card';
import { Icon } from './common/Icon';
import { themes } from '../utils/themes';
import { compressImage } from '../utils/image';
import { useTheme } from '../contexts/ThemeContext';
import type { ProfileData, ThemeName } from '../types';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  profileData: ProfileData;
  onUpdateProfile: (data: Partial<ProfileData>) => void;
  currentTheme: ThemeName;
  onSetTheme: (theme: ThemeName) => void;
}

const ProfileInput: React.FC<{
  label: string;
  id: keyof ProfileData;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ label, id, value, onChange }) => {
    const { activeTheme } = useTheme();
    return (
        <div>
            <label htmlFor={id} className={`block text-sm font-medium ${activeTheme.classes.textMuted} mb-1`}>{label}</label>
            <input
                type="text"
                id={id}
                name={id}
                value={value}
                onChange={onChange}
                className={`w-full border rounded-md p-3 focus:ring-2 focus:outline-none transition ${activeTheme.classes.inputBg} ${activeTheme.classes.inputBorder} ${activeTheme.classes.inputText} ${activeTheme.classes.placeholderText} focus:ring-primary`}
            />
        </div>
    );
};


const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, onLogout, profileData, onUpdateProfile, currentTheme, onSetTheme }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { activeTheme } = useTheme();
    
    if (!isOpen) return null;

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const compressedFile = await compressImage(file, 200, 200); // Compress to a smaller size for profile
                const reader = new FileReader();
                reader.onload = () => {
                    onUpdateProfile({ image: reader.result as string });
                };
                reader.readAsDataURL(compressedFile);
            } catch (err) {
                console.error("Failed to compress profile image:", err);
                // Optionally show an error to the user
            }
        }
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdateProfile({ [e.target.name]: e.target.value });
    };
    
    const getThemeIcon = (themeName: ThemeName) => {
        switch (themeName) {
            case 'light': return 'sun';
            case 'dark': return 'moon';
            case 'evergreen': return 'leaf';
            default: return 'sparkles';
        }
    }

    return (
        <div 
          className={`fixed inset-0 z-50 animate-fade-in-up overflow-y-auto ${activeTheme.classes.appBg} ${activeTheme.classes.textColor}`}
        >
          <div 
            className="w-full p-4 sm:p-6"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-2xl font-bold ${activeTheme.classes.textHeading}`}>Settings</h2>
              <button onClick={onClose} className={`${activeTheme.classes.textMuted} hover:${activeTheme.classes.textColor}`}>
                <Icon name="x-circle" className="h-8 w-8" />
              </button>
            </div>
            
            <div className="space-y-6 max-w-2xl mx-auto">
               <Card>
                  <h3 className={`text-xl font-bold ${activeTheme.classes.textHeading} mb-4`}>Profile</h3>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                     <div className="relative">
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center overflow-hidden ${activeTheme.classes.inputBg}`}>
                            {profileData.image ? (
                                <img src={profileData.image} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <Icon name="user-circle" className={`w-16 h-16 ${activeTheme.classes.textMuted}`} />
                            )}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageChange}
                            accept="image/*"
                            className="hidden"
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full hover:bg-primary-dark"
                            aria-label="Upload profile photo"
                        >
                            <Icon name="camera" className="h-4 w-4" />
                        </button>
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow w-full">
                         <ProfileInput label="First Name" id="firstName" value={profileData.firstName || ''} onChange={handleInputChange} />
                         <ProfileInput label="Last Name" id="lastName" value={profileData.lastName || ''} onChange={handleInputChange} />
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                     <ProfileInput label="Age" id="age" value={profileData.age || ''} onChange={handleInputChange} />
                     <ProfileInput label="Country" id="country" value={profileData.country || ''} onChange={handleInputChange} />
                     <ProfileInput label="City" id="city" value={profileData.city || ''} onChange={handleInputChange} />
                     <ProfileInput label="Place of Work" id="placeOfWork" value={profileData.placeOfWork || ''} onChange={handleInputChange} />
                  </div>
              </Card>

              <Card>
                  <h3 className={`text-lg font-bold ${activeTheme.classes.textHeading} mb-2`}>Appearance</h3>
                  <p className={`${activeTheme.classes.textMuted} mb-4 text-sm`}>Choose a theme for the app.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {(Object.keys(themes) as ThemeName[]).map(key => {
                          const theme = themes[key];
                          const isActive = currentTheme === key;
                          return (
                              <button
                                  key={key}
                                  onClick={() => onSetTheme(key)}
                                  className={`p-4 rounded-lg border-2 text-center transition-all flex items-center justify-center gap-2 ${isActive ? 'border-primary' : `${activeTheme.classes.inputBorder} hover:border-primary`}`}
                              >
                                  <Icon name={getThemeIcon(key)} className={`h-5 w-5 ${activeTheme.classes.textColor}`} />
                                  <span className={`font-semibold ${activeTheme.classes.textColor}`}>{theme.name}</span>
                              </button>
                          );
                      })}
                  </div>
              </Card>

               <Card>
                  <h3 className={`text-lg font-bold ${activeTheme.classes.textHeading} mb-2`}>Account</h3>
                   <p className={`${activeTheme.classes.textMuted} mb-4 text-sm`}>
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