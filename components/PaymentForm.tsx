import React, { useState, useEffect, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import type { StripeCardElement } from '@stripe/stripe-js';
import { CreditCard, Smartphone, Loader2, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { apiService } from '../services/apiService';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

interface PaymentFormProps {
  orderId: string;
  amount: number;
  currency?: string;
  onSuccess: () => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

type PaymentStatus = 'idle' | 'processing' | 'success' | 'failed' | 'timeout';

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#32325d',
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#fa755a',
      iconColor: '#fa755a',
    },
  },
};

const TIMEOUT_DURATION = 10 * 60 * 1000;

function SuccessPage({ onViewDetails, autoRedirectTime = 1 }: { onViewDetails: () => void; autoRedirectTime?: number }) {
  const [countdown, setCountdown] = useState(autoRedirectTime);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onViewDetails();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onViewDetails]);

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 animate-fade-in">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce-in">
        <CheckCircle className="h-10 w-10 text-green-500" />
      </div>
      <h2 className="text-2xl font-bold text-green-700 mb-2">Payment Successful!</h2>
      <p className="text-slate-600 mb-8 text-center">Your payment has been processed successfully.</p>
      <div className="w-full bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <p className="text-green-700 text-sm text-center">
          Redirecting to order details in {countdown} second{countdown !== 1 ? 's' : ''}...
        </p>
      </div>
      <button
        onClick={onViewDetails}
        className="w-full px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
      >
        View Order Details
      </button>
    </div>
  );
}

function FailedPage({ 
  error, 
  onRetry, 
  onCancel 
}: { 
  error: string; 
  onRetry: () => void; 
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 animate-fade-in">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
        <XCircle className="h-10 w-10 text-red-500" />
      </div>
      <h2 className="text-2xl font-bold text-red-700 mb-2">Payment Failed</h2>
      <p className="text-slate-600 mb-4 text-center">Unfortunately, your payment could not be processed.</p>
      
      <div className="w-full bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p className="text-red-700 text-sm text-center">
          <span className="font-medium">Error: </span>
          {error || 'Unknown error occurred'}
        </p>
      </div>

      <div className="w-full space-y-3">
        <button
          onClick={onRetry}
          className="w-full px-6 py-3 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw className="h-5 w-5" />
          Try Again
        </button>
        <button
          onClick={onCancel}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function TimeoutPage({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 animate-fade-in">
      <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6">
        <Clock className="h-10 w-10 text-amber-500" />
      </div>
      <h2 className="text-2xl font-bold text-amber-700 mb-2">Payment Timeout</h2>
      <p className="text-slate-600 mb-4 text-center">
        Your payment session has expired. The payment window was open for more than 10 minutes.
      </p>
      
      <div className="w-full bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <p className="text-amber-700 text-sm text-center">
          Please start a new payment to continue with your order.
        </p>
      </div>

      <button
        onClick={onRetry}
        className="w-full px-6 py-3 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
      >
        <RefreshCw className="h-5 w-5" />
        Start New Payment
      </button>
    </div>
  );
}

function StripePaymentForm({ orderId, amount, onSuccess, onError, onCancel }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'wechat'>('card');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const logPaymentStatus = useCallback((status: string, details?: string) => {
    const timestamp = new Date().toISOString();
    console.warn(`[Payment] [${timestamp}] Status: ${status}${details ? ` | Details: ${details}` : ''}`);
  }, []);

  const clearPaymentTimeout = useCallback(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
  }, [timeoutId]);

  const startPaymentTimeout = useCallback(() => {
    clearPaymentTimeout();
    const id = setTimeout(() => {
      logPaymentStatus('TIMEOUT', 'Payment session exceeded 10 minutes');
      setPaymentStatus('timeout');
      setLoading(false);
    }, TIMEOUT_DURATION);
    setTimeoutId(id);
  }, [clearPaymentTimeout, logPaymentStatus]);

  useEffect(() => {
    return () => {
      clearPaymentTimeout();
    };
  }, [clearPaymentTimeout]);

  const handleSuccess = useCallback(() => {
    logPaymentStatus('SUCCESS', 'Payment completed successfully');
    clearPaymentTimeout();
    setPaymentStatus('success');
  }, [logPaymentStatus, clearPaymentTimeout]);

  const handleFailure = useCallback((error: string) => {
    logPaymentStatus('FAILED', error);
    clearPaymentTimeout();
    setPaymentStatus('failed');
    setErrorMessage(error);
    setLoading(false);
  }, [logPaymentStatus, clearPaymentTimeout]);

  const handleRetry = useCallback(() => {
    logPaymentStatus('RETRY', 'User clicked retry');
    setPaymentStatus('idle');
    setErrorMessage('');
    setLoading(false);
  }, [logPaymentStatus]);

  const handleViewDetails = useCallback(() => {
    logPaymentStatus('REDIRECT', 'Navigating to order details');
    onSuccess();
  }, [logPaymentStatus, onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    logPaymentStatus('START', `Payment started for order ${orderId}`);
    setPaymentStatus('processing');
    startPaymentTimeout();

    try {
      if (selectedMethod === 'card') {
        logPaymentStatus('PROCESSING', 'Processing card payment via Stripe');

        const { clientSecret, paymentIntentId } = await apiService.createStripePaymentIntent(
          orderId,
          import.meta.env.VITE_STRIPE_CURRENCY || 'cny'
        );

        logPaymentStatus('PROCESSING', `PaymentIntent created: ${paymentIntentId}`);

        const cardElement = elements.getElement(CardElement) as unknown as StripeCardElement | null;
        if (!cardElement) {
          throw new Error('Card element not found');
        }

        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
          },
        });

        if (error) {
          logPaymentStatus('ERROR', `Stripe error: ${error.message}`);
          throw new Error(error.message);
        }

        if (paymentIntent?.status === 'succeeded') {
          await apiService.confirmStripePayment(paymentIntent.id);
          logPaymentStatus('SUCCESS', `Payment succeeded: ${paymentIntent.id}`);
          handleSuccess();
        } else if (paymentIntent?.status === 'requires_action') {
          logPaymentStatus('PROCESSING', 'Additional authentication required');
        } else {
          throw new Error('Payment was not completed successfully');
        }
      } else {
        logPaymentStatus('PROCESSING', 'Processing WeChat payment');
        await apiService.createWechatPayment(orderId);
        logPaymentStatus('QR_GENERATED', 'WeChat QR code generated');
        throw new Error('WeChat Pay must be completed in the QR code payment flow.');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Payment failed';
      handleFailure(message);
      onError(message);
    }
  };

  const handleCancel = () => {
    logPaymentStatus('CANCELLED', 'User cancelled payment');
    clearPaymentTimeout();
    onCancel();
  };

  if (paymentStatus === 'success') {
    return <SuccessPage onViewDetails={handleViewDetails} autoRedirectTime={1} />;
  }

  if (paymentStatus === 'failed') {
    return (
      <FailedPage 
        error={errorMessage} 
        onRetry={handleRetry} 
        onCancel={handleCancel}
      />
    );
  }

  if (paymentStatus === 'timeout') {
    return <TimeoutPage onRetry={handleRetry} />;
  }

  const displayAmount = (amount: number, currency?: string) => {
    return currency === 'usd' ? `$${amount.toFixed(2)}` : `¥${amount.toFixed(2)}`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {paymentStatus === 'processing' && (
        <div className="flex items-center justify-center py-4 bg-blue-50 rounded-lg">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500 mr-2" />
          <span className="text-blue-700">Processing payment...</span>
        </div>
      )}

      <div className="bg-slate-50 p-4 rounded-lg">
        <div className="text-sm text-slate-500">Total Amount</div>
        <div className="text-2xl font-bold text-slate-900">{displayAmount(amount, 'cny')}</div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-700">Payment Method</label>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSelectedMethod('card')}
            disabled={paymentStatus === 'processing'}
            className={`p-4 border-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
              selectedMethod === 'card'
                ? 'border-teal-500 bg-teal-50 text-teal-700'
                : 'border-slate-200 hover:border-slate-300'
            } ${paymentStatus === 'processing' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <CreditCard className="h-5 w-5" />
            <span>Card</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedMethod('wechat')}
            disabled={paymentStatus === 'processing'}
            className={`p-4 border-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
              selectedMethod === 'wechat'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-slate-200 hover:border-slate-300'
            } ${paymentStatus === 'processing' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Smartphone className="h-5 w-5" />
            <span>WeChat</span>
          </button>
        </div>
      </div>

      {selectedMethod === 'card' && paymentStatus !== 'processing' && (
        <div className="p-4 border border-slate-300 rounded-lg">
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleCancel}
          disabled={paymentStatus === 'processing'}
          className="flex-1 px-4 py-3 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || loading || paymentStatus === 'processing'}
          className="flex-1 px-4 py-3 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {paymentStatus === 'processing' ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay ${displayAmount(amount, 'cny')}`
          )}
        </button>
      </div>
    </form>
  );
}

export default function PaymentForm(props: PaymentFormProps) {
  return (
    <Elements stripe={stripePromise}>
      <StripePaymentForm {...props} />
    </Elements>
  );
}

export { PaymentForm };
