import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../common/Icon';

interface VerifyCodeProps {
  phoneNumber: string;
  onContinue: () => void;
  onBack: () => void;
}

const VerifyCode: React.FC<VerifyCodeProps> = ({ phoneNumber, onContinue, onBack }) => {
  const [code, setCode] = useState(['', '', '', '']);
  const [resendTimer, setResendTimer] = useState(30);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const timer = resendTimer > 0 && setInterval(() => setResendTimer(t => t - 1), 1000);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendTimer]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const { value } = e.target;
    if (/[^0-9]/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 3) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').slice(0, 4);
    if (/^\d{4}$/.test(paste)) {
      const newCode = paste.split('');
      setCode(newCode);
      inputsRef.current[3]?.focus();
    }
  };

  const isCodeComplete = code.every(c => c !== '');
  
  // Simulate successful verification
  useEffect(() => {
      if (isCodeComplete) {
          const timer = setTimeout(() => onContinue(), 500);
          return () => clearTimeout(timer);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCodeComplete, onContinue]);

  return (
    <div className="min-h-screen bg-white p-6 flex flex-col">
       <button onClick={onBack} className="self-start mb-8 p-2">
            <Icon name="chevron-left" className="w-6 h-6" />
       </button>
      <h1 className="text-3xl font-bold mb-2">Enter the 4-digit code</h1>
      <p className="text-muted mb-8">Sent to you at {phoneNumber}.</p>
      
      <div className="flex gap-3 justify-center mb-6">
        {code.map((digit, index) => (
          <input
            key={index}
            // Fix: Changed arrow function to block body to ensure void return type for ref callback.
            ref={el => { inputsRef.current[index] = el; }}
            type="tel"
            maxLength={1}
            value={digit}
            onChange={e => handleChange(e, index)}
            onKeyDown={e => handleKeyDown(e, index)}
            onPaste={index === 0 ? handlePaste : undefined}
            className="w-14 h-16 bg-light rounded-lg text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-black"
          />
        ))}
      </div>
      
      <button 
        onClick={() => setResendTimer(30)}
        disabled={resendTimer > 0}
        className="text-center text-primary font-semibold disabled:text-muted"
       >
        Resend code {resendTimer > 0 && `(${resendTimer}s)`}
      </button>

      <div className="flex-grow"></div>

       {isCodeComplete && (
            <div className="mt-auto flex justify-end">
                <div className="bg-black text-white rounded-full p-4">
                     <Icon name="check" className="w-6 h-6" />
                </div>
            </div>
       )}
    </div>
  );
};

export default VerifyCode;
