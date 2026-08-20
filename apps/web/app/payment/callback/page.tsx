'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function CallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const ref = searchParams.get('reference') || searchParams.get('trxref') || searchParams.get('ref') || '';
    if (ref) {
      router.replace(`/order-success?reference=${encodeURIComponent(ref)}`);
    } else {
      router.replace('/');
    }
  }, [searchParams, router]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 px-4 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo border-t-transparent" />
      <p className="text-sm font-medium text-charcoal/70">Confirming your payment with Paystack...</p>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo border-t-transparent" />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
