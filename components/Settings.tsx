import React, { useRef } from 'react';
import { Card } from './common/Card';
import { Icon } from './common/Icon';
import type { ProfileData } from '../types';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  profileData: ProfileData;
  onUpdateProfile: (data: Partial<ProfileData>) => void;
}

const ProfileInput: React.FC<{
  label: string;
  id: keyof ProfileData;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ label, id, value, onChange }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-muted mb-1">{label}</label>
        <input
            type="text"
            id={id}
            name={id}
            value={value}
            onChange={onChange}
            className="w-full bg-light border-medium text-dark placeholder:text-muted focus:ring-black border rounded-md p-3 focus:ring-2 focus:outline-none transition"
        />
    </div>
);


const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, onLogout, profileData, onUpdateProfile }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    if (!isOpen) return null;

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                onUpdateProfile({ image: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdateProfile({ [e.target.name]: e.target.value });
    };

    return (
        <div 
          className="fixed inset-0 bg-light z-50 animate-fade-in-up overflow-y-auto"
        >
          <div 
            className="w-full p-4 sm:p-6"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-dark">Settings</h2>
              <button onClick={onClose} className="text-muted hover:text-dark">
                <Icon name="x-circle" className="h-8 w-8" />
              </button>
            </div>
            
            <div className="space-y-6 max-w-2xl mx-auto">
               <Card>
                  <h3 className="text-xl font-bold text-dark mb-4">Profile</h3>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                     <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-medium flex items-center justify-center overflow-hidden">
                            {profileData.image ? (
                                <img src={profileData.image} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <Icon name="user-circle" className="w-16 h-16 text-muted" />
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
                            className="absolute bottom-0 right-0 bg-black text-white p-2 rounded-full hover:bg-gray-800"
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