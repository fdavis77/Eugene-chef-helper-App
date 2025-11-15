import React from 'react';

interface WelcomeScreenProps {
  onContinue: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onContinue }) => {
  return (
    <div className="relative h-screen bg-black">
      {/* Full screen background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center" 
        style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop)' }}
      ></div>
      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>

      <div className="relative z-10 flex flex-col h-full p-6 sm:p-8">
        <div className="flex-grow flex items-start justify-start">
            <h1 className="text-5xl font-bold text-white tracking-tighter">
              Eugene<br/>AI Chef
            </h1>
        </div>
        <div className="pb-4">
            <button
                onClick={onContinue}
                className="w-full bg-primary text-white font-bold py-4 px-6 rounded-lg hover:bg-primary-dark transition duration-300 flex items-center justify-between text-lg"
            >
                <span>Continue</span>
                <span>&rarr;</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;