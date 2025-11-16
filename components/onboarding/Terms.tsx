import React, { useState } from 'react';
import { Icon } from '../common/Icon';

interface TermsProps {
  onAgree: () => void;
  onBack: () => void;
}

const Terms: React.FC<TermsProps> = ({ onAgree, onBack }) => {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="min-h-screen bg-white p-6 flex flex-col">
       <button onClick={onBack} className="self-start mb-8 p-2">
            <Icon name="chevron-left" className="w-6 h-6" />
       </button>
       <div className="w-16 h-16 bg-primary/10 text-primary flex items-center justify-center rounded-2xl mb-4">
        <Icon name="notebook" className="w-8 h-8"/>
       </div>
      <h1 className="text-3xl font-bold mb-4">Accept Eugene's Terms & Review Privacy Notice</h1>
      <p className="text-muted mb-8">
        By selecting "I Agree" below, I have reviewed and agree to the{' '}
        <a href="#" className="text-primary underline">Terms of Use</a> and acknowledge the{' '}
        <a href="#" className="text-primary underline">Privacy Notice</a>. I am at least 18 years of age.
      </p>
      
      <div className="mt-auto border-t border-medium pt-4">
        <label className="flex items-center justify-between w-full">
            <span className="text-lg font-medium">I Agree</span>
            <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="h-6 w-6 rounded-md border-gray-300 text-black focus:ring-black"
            />
        </label>
      </div>

      <div className="mt-6 flex justify-end">
        <button 
          onClick={onAgree}
          disabled={!agreed}
          className="bg-black text-white rounded-full p-4 disabled:bg-gray-300"
        >
            <Icon name="chevron-right" className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default Terms;
