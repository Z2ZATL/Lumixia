import type {
  ClipboardEvent,
  KeyboardEvent,
  ReactNode,
  RefCallback,
} from 'react';

export type AuthStep = 'LOGIN' | 'VERIFY_OTP';
export type TransitionDirection = 'forward' | 'backward';
export type AuthRequestStatus =
  | 'idle'
  | 'signing_in_with_google'
  | 'sending_email'
  | 'verifying_otp'
  | 'resending_email';

export interface AuthFlowProps {
  onLoginSuccess?: (email: string) => void;
}

export interface AuthFlowState {
  step: AuthStep;
  email: string;
  direction: TransitionDirection;
  isAnimating: boolean;
  requestStatus: AuthRequestStatus;
  errorMessage: string | null;
  statusMessage: string | null;
}

export type AuthFlowAction =
  | { type: 'START_GOOGLE_SIGN_IN' }
  | { type: 'GOOGLE_SIGN_IN_ERROR'; message: string }
  | { type: 'START_EMAIL_REQUEST' }
  | { type: 'EMAIL_REQUEST_SUCCESS'; email: string }
  | { type: 'EMAIL_REQUEST_ERROR'; message: string }
  | { type: 'GO_BACK' }
  | { type: 'START_OTP_VERIFY' }
  | { type: 'OTP_VERIFY_SUCCESS' }
  | { type: 'OTP_VERIFY_ERROR'; message: string }
  | { type: 'START_RESEND' }
  | { type: 'RESEND_SUCCESS'; message: string }
  | { type: 'RESEND_ERROR'; message: string }
  | { type: 'ANIMATION_COMPLETE' };

export interface EmailStepProps {
  onSubmitEmail: (email: string) => void;
  onGoogleSignIn?: () => void | Promise<void>;
  isDisabled?: boolean;
  isGoogleDisabled?: boolean;
  errorMessage?: string | null;
  googleLabel?: string;
  submitLabel?: string;
}

export interface OtpStepProps {
  email: string;
  onBack: () => void;
  onVerify: (otp: string) => void;
  onResend?: () => Promise<boolean> | boolean;
  autoSubmit?: boolean;
  timerDuration?: number;
  isDisabled?: boolean;
  isResendDisabled?: boolean;
  errorMessage?: string | null;
  statusMessage?: string | null;
  verifyLabel?: string;
  resendLabel?: string;
}

export interface OtpInputGroupProps {
  otp: string[];
  labelId: string;
  isDisabled?: boolean;
  setInputRef: (index: number) => RefCallback<HTMLInputElement>;
  onChange: (index: number, value: string) => void;
  onKeyDown: (
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => void;
  onPaste: (index: number, event: ClipboardEvent<HTMLInputElement>) => void;
}

export interface TimerProps {
  duration?: number;
  onResend?: () => Promise<boolean> | boolean;
  isDisabled?: boolean;
  resendLabel?: string;
}

export interface BrandHeaderProps {
  logoSrc?: string;
  title?: string;
  subtitle?: string;
}

export interface AuthLayoutProps {
  children: ReactNode;
  rightPanelContent?: ReactNode;
}

export interface ReviewGateSubmission {
  promoOptIn: boolean;
}

export interface ReviewGateProps {
  email: string;
  onContinue: (submission: ReviewGateSubmission) => void | Promise<void>;
  onUseDifferentEmail: () => void | Promise<void>;
  isSubmitting?: boolean;
  errorMessage?: string | null;
}

export interface OnboardingSubmission {
  displayName: string;
  allowTraining: boolean;
}

export interface OnboardingFlowProps {
  email: string;
  onComplete: (submission: OnboardingSubmission) => void | Promise<void>;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  initialDisplayName?: string;
  initialAllowTraining?: boolean;
}

export interface AnimationConfig {
  exit: {
    duration: number;
    ease: [number, number, number, number];
    translation: number;
  };
  enter: {
    duration: number;
    ease: [number, number, number, number];
    stagger: number;
    translation: number;
  };
}

export interface DesignTokens {
  colors: {
    primary: string;
    surface: string;
    onSurface: string;
    onSurfaceVariant: string;
    outline: string;
    outlineVariant: string;
    error: string;
  };
  borderRadius: {
    xl: string;
    glass: string;
  };
  fontFamily: {
    default: string;
  };
}
