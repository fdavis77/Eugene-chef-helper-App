import React, { useState } from 'react';
import { Icon } from '../common/Icon';

interface NameEntryProps {
  onContinue: () => void;
  onBack: () => void;
}

const NameEntry: React.FC<NameEntryProps> = ({ onContinue, onBack }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  const canContinue = firstName.trim() !== '' && lastName.trim() !== '';

  return (
    <div className="min-h-screen bg-white p-6 flex flex-col">
       <button onClick={onBack} className="self-start mb-8 p-2">
            <Icon name="chevron-left" className="w-6 h-6" />
       </button>
      <h1 className="text-3xl font-bold mb-2">What's your name?</h1>
      <p className="text-muted mb-8">Let us know how to properly address you.</p>
      
      <div className="space-y-4">
        <div>
            <label htmlFor="firstName" className="text-sm font-medium text-muted">First name</label>
            <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="w-full mt-1 h-14 bg-light rounded-lg px-4 text-lg text-dark focus:outline-none focus:ring-2 focus:ring-black"
                autoFocus
            />
        </div>
         <div>
            <label htmlFor="lastName" className="text-sm font-medium text-muted">Last name</label>
            <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="w-full mt-1 h-14 bg-light rounded-lg px-4 text-lg text-dark focus:outline-none focus:ring-2 focus:ring-black"
            />
        </div>
      </div>

      <div className="flex-grow"></div>

      <div className="mt-auto flex justify-end">
        <button 
          onClick={onContinue}
          disabled={!canContinue}
          className="bg-black text-white rounded-full p-4 disabled:bg-gray-300"
        >
            <Icon name="chevron-right" className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default NameEntry;