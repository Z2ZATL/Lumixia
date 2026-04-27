import React, { useCallback, useReducer } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type {
  AuthFlowAction,
  AuthFlowProps,
  AuthFlowState,
} from '../types';
import { acceleratedStyle, pageVariants } from '../config/animations';
import { requestEmailOtp, signInWithGoogle, verifyEmailOtp } from '../lib/auth';
import { EmailStep } from './EmailStep';
import { OtpStep } from './OtpStep';

const initialState: AuthFlowState = {
  step: 'LOGIN',
  email: '',
  direction: 'forward',
  isAnimating: false,
  requestStatus: 'idle',
  errorMessage: null,
  statusMessage: null,
};

function authFlowReducer(
  state: AuthFlowState,
  action: AuthFlowAction,
): AuthFlowState {
  switch (action.type) {
    case 'START_GOOGLE_SIGN_IN':
      return {
        ...state,
        requestStatus: 'signing_in_with_google',
        errorMessage: null,
        statusMessage: null,
      };

    case 'GOOGLE_SIGN_IN_ERROR':
      return {
        ...state,
        requestStatus: 'idle',
        errorMessage: action.message,
        statusMessage: null,
      };

    case 'START_EMAIL_REQUEST':
      return {
        ...state,
        requestStatus: 'sending_email',
        errorMessage: null,
        statusMessage: null,
      };

    case 'EMAIL_REQUEST_SUCCESS':
      return {
        ...state,
        step: 'VERIFY_OTP',
        email: action.email,
        direction: 'forward',
        isAnimating: true,
        requestStatus: 'idle',
        errorMessage: null,
        statusMessage: 'A secure verification code is on its way.',
      };

    case 'GO_BACK':
      if (
        state.isAnimating ||
        state.requestStatus !== 'idle' ||
        state.step === 'LOGIN'
      ) {
        return state;
      }

      return {
        ...state,
        step: 'LOGIN',
        direction: 'backward',
        isAnimating: true,
        errorMessage: null,
        statusMessage: null,
      };

    case 'EMAIL_REQUEST_ERROR':
      return {
        ...state,
        requestStatus: 'idle',
        errorMessage: action.message,
        statusMessage: null,
      };

    case 'START_OTP_VERIFY':
      return {
        ...state,
        requestStatus: 'verifying_otp',
        errorMessage: null,
        statusMessage: null,
      };

    case 'OTP_VERIFY_SUCCESS':
      return {
        ...state,
        requestStatus: 'idle',
        errorMessage: null,
      };

    case 'OTP_VERIFY_ERROR':
      return {
        ...state,
        requestStatus: 'idle',
        errorMessage: action.message,
        statusMessage: null,
      };

    case 'START_RESEND':
      return {
        ...state,
        requestStatus: 'resending_email',
        errorMessage: null,
        statusMessage: null,
      };

    case 'RESEND_SUCCESS':
      return {
        ...state,
        requestStatus: 'idle',
        errorMessage: null,
        statusMessage: action.message,
      };

    case 'RESEND_ERROR':
      return {
        ...state,
        requestStatus: 'idle',
        errorMessage: action.message,
        statusMessage: null,
      };

    case 'ANIMATION_COMPLETE':
      if (!state.isAnimating) {
        return state;
      }

      return {
        ...state,
        isAnimating: false,
      };

    default:
      return state;
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Unexpected authentication error.';
}

function mapAuthError(
  error: unknown,
  mode: 'google' | 'request' | 'verify' | 'resend',
) {
  const rawMessage = getErrorMessage(error);
  const normalizedMessage = rawMessage.toLowerCase();

  if (normalizedMessage.includes('not configured')) {
    return 'Supabase is not configured yet. Double-check your local environment values.';
  }

  if (normalizedMessage.includes('vite_public_app_origin')) {
    return 'Passwordless auth redirects are not configured yet. Set VITE_PUBLIC_APP_ORIGIN to your trusted browser origin and try again.';
  }

  if (
    mode === 'google' &&
    (normalizedMessage.includes('provider') ||
      normalizedMessage.includes('oauth') ||
      normalizedMessage.includes('redirect'))
  ) {
    return 'Google sign-in is not fully configured yet. Check the Google provider, redirect URLs, and allowed origins in Supabase.';
  }

  if (
    normalizedMessage.includes('rate limit') ||
    normalizedMessage.includes('security purposes')
  ) {
    return 'A code was sent recently. Please wait a moment and try again.';
  }

  if (
    mode === 'verify' &&
    (normalizedMessage.includes('expired') ||
      normalizedMessage.includes('invalid') ||
      normalizedMessage.includes('token'))
  ) {
    return 'That code is invalid or expired. Request a new one and try again.';
  }

  if (mode === 'request') {
    return 'We could not send your secure code right now. Please try again in a moment.';
  }

  if (mode === 'google') {
    return 'We could not start Google sign-in right now. Please try again in a moment.';
  }

  if (mode === 'resend') {
    return 'We could not send a fresh code right now. Please try again shortly.';
  }

  return 'We could not verify that code. Please try again.';
}

export const AuthFlow: React.FC<AuthFlowProps> = ({ onLoginSuccess }) => {
  const [state, dispatch] = useReducer(authFlowReducer, initialState);

  const handleGoogleSignIn = useCallback(async () => {
    if (state.isAnimating || state.requestStatus !== 'idle') {
      return;
    }

    dispatch({ type: 'START_GOOGLE_SIGN_IN' });

    try {
      await signInWithGoogle();
    } catch (error) {
      dispatch({
        type: 'GOOGLE_SIGN_IN_ERROR',
        message: mapAuthError(error, 'google'),
      });
    }
  }, [state.isAnimating, state.requestStatus]);

  const handleEmailSubmit = useCallback(async (submittedEmail: string) => {
    if (state.isAnimating || state.requestStatus !== 'idle') {
      return;
    }

    dispatch({ type: 'START_EMAIL_REQUEST' });

    try {
      const trimmedEmail = submittedEmail.trim();
      await requestEmailOtp(trimmedEmail);
      dispatch({ type: 'EMAIL_REQUEST_SUCCESS', email: trimmedEmail });
    } catch (error) {
      dispatch({
        type: 'EMAIL_REQUEST_ERROR',
        message: mapAuthError(error, 'request'),
      });
    }
  }, [state.isAnimating, state.requestStatus]);

  const handleBack = useCallback(() => {
    dispatch({ type: 'GO_BACK' });
  }, []);

  const handleOtpVerify = useCallback(async (otp: string) => {
    if (state.isAnimating || state.requestStatus !== 'idle') {
      return;
    }

    dispatch({ type: 'START_OTP_VERIFY' });

    try {
      const session = await verifyEmailOtp(state.email, otp);
      dispatch({ type: 'OTP_VERIFY_SUCCESS' });
      onLoginSuccess?.(session?.user.email ?? state.email);
    } catch (error) {
      dispatch({
        type: 'OTP_VERIFY_ERROR',
        message: mapAuthError(error, 'verify'),
      });
    }
  }, [onLoginSuccess, state.email, state.isAnimating, state.requestStatus]);

  const handleResend = useCallback(async () => {
    if (
      state.step !== 'VERIFY_OTP' ||
      state.isAnimating ||
      state.requestStatus !== 'idle'
    ) {
      return false;
    }

    dispatch({ type: 'START_RESEND' });

    try {
      await requestEmailOtp(state.email);
      dispatch({
        type: 'RESEND_SUCCESS',
        message: 'A fresh code is on its way to your inbox.',
      });
      return true;
    } catch (error) {
      dispatch({
        type: 'RESEND_ERROR',
        message: mapAuthError(error, 'resend'),
      });
      return false;
    }
  }, [state.email, state.isAnimating, state.requestStatus, state.step]);

  const handleAnimationComplete = useCallback((definition: unknown) => {
    const completedVariant = Array.isArray(definition)
      ? definition[definition.length - 1]
      : definition;

    if (state.isAnimating && completedVariant === 'animate') {
      dispatch({ type: 'ANIMATION_COMPLETE' });
    }
  }, [state.isAnimating]);

  return (
    <div className="relative w-full">
      <AnimatePresence mode="wait" initial={false} custom={state.direction}>
        {state.step === 'LOGIN' && (
          <motion.div
            key="login"
            className="hardware-accelerated"
            custom={state.direction}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onAnimationComplete={handleAnimationComplete}
            style={acceleratedStyle}
          >
            <EmailStep
              onGoogleSignIn={handleGoogleSignIn}
              onSubmitEmail={handleEmailSubmit}
              isDisabled={
                state.isAnimating || state.requestStatus !== 'idle'
              }
              isGoogleDisabled={
                state.isAnimating || state.requestStatus !== 'idle'
              }
              errorMessage={state.errorMessage}
              googleLabel={
                state.requestStatus === 'signing_in_with_google'
                  ? 'Redirecting to Google...'
                  : 'Continue with Google'
              }
              submitLabel={
                state.requestStatus === 'sending_email'
                  ? 'Sending secure code...'
                  : 'Continue with Email'
              }
            />
          </motion.div>
        )}

        {state.step === 'VERIFY_OTP' && (
          <motion.div
            key="verify"
            className="hardware-accelerated"
            custom={state.direction}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onAnimationComplete={handleAnimationComplete}
            style={acceleratedStyle}
          >
            <OtpStep
              email={state.email}
              onBack={handleBack}
              onVerify={handleOtpVerify}
              onResend={handleResend}
              isDisabled={
                state.isAnimating || state.requestStatus !== 'idle'
              }
              isResendDisabled={
                state.isAnimating || state.requestStatus !== 'idle'
              }
              errorMessage={state.errorMessage}
              statusMessage={state.statusMessage}
              verifyLabel={
                state.requestStatus === 'verifying_otp'
                  ? 'Verifying code...'
                  : 'Enter verification code'
              }
              resendLabel={
                state.requestStatus === 'resending_email'
                  ? 'Sending a fresh code...'
                  : 'Resend email'
              }
              timerDuration={60}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
