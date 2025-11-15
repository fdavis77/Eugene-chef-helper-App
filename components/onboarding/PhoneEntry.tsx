import React, { useState, useRef, useEffect } from 'react';
import { countries, Country } from '../../data/countries';

interface PhoneEntryProps {
  onContinue: (fullNumber: string) => void;
}

const PhoneEntry: React.FC<PhoneEntryProps> = ({ onContinue }) => {
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim()) {
        onContinue(`${selectedCountry.dialCode}${phone.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-white p-6 flex flex-col">
      <h1 className="text-3xl font-bold mb-8">Enter your mobile number</h1>
      
      <form onSubmit={handleContinue} className="space-y-4">
        <div className="flex gap-2">
          {/* Country Selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="bg-light h-14 w-24 flex items-center justify-center rounded-lg"
            >
              <span className="text-2xl">{selectedCountry.flag}</span>
              <span className="ml-2 text-xs">&#9662;</span>
            </button>
            {isDropdownOpen && (
              <div className="absolute top-full mt-2 w-72 max-h-60 overflow-y-auto bg-white rounded-lg shadow-lg border z-10">
                {countries.map(country => (
                  <button
                    type="button"
                    key={country.name}
                    onClick={() => {
                      setSelectedCountry(country);
                      setIsDropdownOpen(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-left hover:bg-light"
                  >
                    <span className="text-xl mr-3">{country.flag}</span>
                    <span className="flex-grow">{country.name}</span>
                    <span className="text-muted">{country.dialCode}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Phone Input */}
          <div className="relative flex-grow">
             <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="Mobile number"
                className="w-full h-14 bg-light rounded-lg pl-4 pr-12 text-lg text-dark focus:outline-none focus:ring-2 focus:ring-black"
                autoFocus
             />
             <span className="absolute top-1/2 right-4 -translate-y-1/2 text-muted text-sm">{selectedCountry.dialCode}</span>
          </div>
        </div>
        <button
          type="submit"
          disabled={!phone.trim()}
          className="w-full bg-black text-white font-bold py-4 rounded-lg hover:bg-gray-800 transition disabled:bg-gray-300"
        >
          Continue
        </button>
      </form>

      <div className="flex items-center my-6">
        <div className="flex-grow border-t border-medium"></div>
        <span className="flex-shrink mx-4 text-muted text-sm">or</span>
        <div className="flex-grow border-t border-medium"></div>
      </div>
      
      <div className="space-y-3">
        <button disabled className="w-full bg-light text-dark font-semibold py-3 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed">Continue with Google</button>
        <button disabled className="w-full bg-light text-dark font-semibold py-3 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed">Continue with Apple</button>
        <button disabled className="w-full bg-light text-dark font-semibold py-3 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed">Continue with Email</button>
      </div>
      <p className="text-center text-xs text-muted mt-3">Note: Social sign-in options are for display purposes. Please use the phone number entry to continue.</p>


      <div className="mt-auto text-xs text-muted text-center">
        By proceeding, you consent to get calls, WhatsApp or SMS messages, including by automated means, from Eugene and its affiliates to the number provided.
      </div>
    </div>
  );
};

export default PhoneEntry;