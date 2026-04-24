import React from 'react';
import type { OtpInputGroupProps } from '../types';

export const OtpInputGroup: React.FC<OtpInputGroupProps> = ({
  otp,
  labelId,
  isDisabled = false,
  setInputRef,
  onChange,
  onKeyDown,
  onPaste,
}) => {
  return (
    <div
      className="grid grid-cols-6 gap-2 sm:gap-3"
      role="group"
      aria-labelledby={labelId}
    >
      {otp.map((digit, index) => (
        <input
          key={index}
          ref={setInputRef(index)}
          className="otp-input focus-ring-premium aspect-square w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest text-center text-2xl font-bold text-on-surface outline-none transition-all disabled:cursor-not-allowed disabled:opacity-60"
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          pattern="\d*"
          value={digit}
          onChange={(event) => onChange(index, event.target.value)}
          onKeyDown={(event) => onKeyDown(index, event)}
          onPaste={(event) => onPaste(index, event)}
          onFocus={(event) => event.currentTarget.select()}
          aria-label={`Digit ${index + 1} of ${otp.length}`}
          disabled={isDisabled}
        />
      ))}
    </div>
  );
};
