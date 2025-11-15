import React from 'react';

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-primary flex flex-col items-center justify-center text-white z-50">
        <div className="flex items-center space-x-4">
            <h1 className="text-5xl font-bold tracking-tighter">
                Eugene <span className="text-white/80">AI</span>
            </h1>
        </div>
        <p className="mt-4 text-white/90">Your AI Sous-Chef</p>
    </div>
  );
};

export default SplashScreen;