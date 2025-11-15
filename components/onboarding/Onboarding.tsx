import React, { useState } from 'react';
import WelcomeScreen from './WelcomeScreen';
import PhoneEntry from './PhoneEntry';
import VerifyCode from './VerifyCode';
import NameEntry from './NameEntry';
import Terms from './Terms';

interface OnboardingProps {
  onAuthSuccess: () => void;
}

type OnboardingStep = 'welcome' | 'phone' | 'verify' | 'name' | 'terms';

const Onboarding: React.FC<OnboardingProps> = ({ onAuthSuccess }) => {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [phoneNumber, setPhoneNumber] = useState('');

  const handlePhoneContinue = (fullNumber: string) => {
    setPhoneNumber(fullNumber);
    setStep('verify');
  };

  const handleVerificationSuccess = () => {
    setStep('name');
  };

  const handleNameContinue = () => {
    setStep('terms');
  };
  
  const handleTermsAgree = () => {
    // In a real app, you would save user data and then call this
    onAuthSuccess();
  };

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return <WelcomeScreen onContinue={() => setStep('phone')} />;
      case 'phone':
        return <PhoneEntry onContinue={handlePhoneContinue} />;
      case 'verify':
        return <VerifyCode phoneNumber={phoneNumber} onContinue={handleVerificationSuccess} onBack={() => setStep('phone')} />;
      case 'name':
        return <NameEntry onContinue={handleNameContinue} onBack={() => setStep('verify')} />;
      case 'terms':
          return <Terms onAgree={handleTermsAgree} onBack={() => setStep('name')} />;
      default:
        return <WelcomeScreen onContinue={() => setStep('phone')} />;
    }
  };

  return <div className="min-h-screen bg-white">{renderStep()}</div>;
};

export default Onboarding;
