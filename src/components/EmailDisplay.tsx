import React from 'react';
import { useAppStore } from '../state/store';

interface EmailDisplayProps {
  email: string;
  className?: string;
  showIcon?: boolean;
}

/**
 * Display email with registered name if available
 */
export const EmailDisplay: React.FC<EmailDisplayProps> = ({ 
  email, 
  className = '', 
  showIcon = true 
}) => {
  const emailToName = useAppStore((state) => state.emailToName);
  const registeredName = emailToName.get(email);

  return (
    <div className={className}>
      {showIcon && '✉ '}
      {registeredName ? (
        <>
          <span className="font-medium">{registeredName}</span>
          <span className="text-gray-500"> ({email})</span>
        </>
      ) : (
        email
      )}
    </div>
  );
};
