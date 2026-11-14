import React, { useEffect, useState } from 'react';
import { PaymentQR } from './PaymentQR';
import { useDialogA11y } from '../hooks/useDialogA11y';

type PaymentKind = 'deposit' | 'balance' | 'tip';

interface RidePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  reference: string;
  note: string;
  kind: PaymentKind;
  onConfirm: () => void;
}

const formatCurrency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const COPY: Record<
  PaymentKind,
  { title: string; eyebrow: string; icon: string; confirmLabel: string; success: string }
> = {
  deposit: {
    title: 'Reserve with 25% Deposit',
    eyebrow: 'Step 1 — Secure your date',
    icon: 'event_available',
    confirmLabel: "I've Sent the Deposit",
    success:
      'Your deposit has been marked as sent. Saad will verify the payment and confirm your reservation.',
  },
  balance: {
    title: 'Pay Balance at Pickup',
    eyebrow: 'Step 2 — Final payment',
    icon: 'payments',
    confirmLabel: "I've Paid the Balance",
    success:
      'Your balance payment has been marked as sent. Thank you — enjoy the ride.',
  },
  tip: {
    title: 'Add a Tip',
    eyebrow: 'Gratitude — anytime',
    icon: 'volunteer_activism',
    confirmLabel: "I've Sent the Tip",
    success:
      'Your tip has been marked as sent. Thank you for supporting the ride.',
  },
};

export const RidePaymentModal: React.FC<RidePaymentModalProps> = ({
  isOpen,
  onClose,
  amount,
  reference,
  note,
  kind,
  onConfirm,
}) => {
  const [confirmed, setConfirmed] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const dialogRef = useDialogA11y(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setConfirmed(false);
      setCopiedAmount(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!copiedAmount) return;
    const timer = setTimeout(() => setCopiedAmount(false), 2000);
    return () => clearTimeout(timer);
  }, [copiedAmount]);

  if (!isOpen) return null;

  const copy = COPY[kind];

  const handleCopyAmount = async () => {
    try {
      await navigator.clipboard.writeText(amount.toFixed(2));
      setCopiedAmount(true);
    } catch {
      // Clipboard access can be blocked; ignore.
    }
  };

  const handleConfirm = () => {
    onConfirm();
    setConfirmed(true);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ride-payment-title"
        tabIndex={-1}
        className="bg-white border border-red-100 rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative text-[#18181b] outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-11 h-11 flex items-center justify-center text-[#71717a] hover:text-[#18181b] transition-colors rounded-full bg-neutral-100 hover:bg-neutral-200 cursor-pointer"
          aria-label="Close payment dialog"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {confirmed ? (
          <div className="py-6 text-center">
            <span className="material-symbols-outlined text-6xl text-[#dc2626]">
              check_circle
            </span>
            <h3
              id="ride-payment-title"
              className="mt-4 font-['Space_Grotesk'] text-2xl font-bold text-[#18181b]"
            >
              Payment Marked as Sent
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-[#52525b] font-['Plus_Jakarta_Sans']">
              {copy.success}
            </p>
            <div className="mt-5 rounded-xl bg-[#faf9f8] border border-red-100 px-4 py-3 text-left">
              <p className="text-[10px] font-['Space_Grotesk'] uppercase tracking-widest text-[#71717a] font-bold">
                Reference
              </p>
              <p className="mt-1 font-mono text-sm text-[#18181b]">{reference}</p>
              <p className="mt-2 text-[10px] font-['Space_Grotesk'] uppercase tracking-widest text-[#71717a] font-bold">
                Amount
              </p>
              <p className="mt-1 font-['Space_Grotesk'] text-xl font-bold text-[#dc2626]">
                {formatCurrency(amount)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-6 w-full py-3.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-['Space_Grotesk'] uppercase tracking-widest font-bold rounded-full transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-[#dc2626] text-xs font-['Space_Grotesk'] uppercase tracking-widest mb-2 font-bold pr-12">
              <span className="material-symbols-outlined text-[18px]">{copy.icon}</span>
              <span>{copy.eyebrow}</span>
            </div>
            <h3
              id="ride-payment-title"
              className="font-['Space_Grotesk'] text-2xl font-bold tracking-tight text-[#18181b] mb-4 pr-8"
            >
              {copy.title}
            </h3>

            <div className="rounded-2xl bg-[#faf9f8] border border-red-100 p-4 mb-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-['Space_Grotesk'] uppercase tracking-widest text-[#71717a] font-bold">
                    Amount to send
                  </p>
                  <p className="mt-1 font-['Space_Grotesk'] text-3xl font-bold text-[#dc2626]">
                    {formatCurrency(amount)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyAmount}
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-3 py-2 text-[10px] font-['Space_Grotesk'] uppercase tracking-wider font-bold text-[#dc2626] hover:bg-red-50 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {copiedAmount ? 'check' : 'content_copy'}
                  </span>
                  {copiedAmount ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-[#52525b] font-['Plus_Jakarta_Sans']">
                <span className="font-semibold text-[#18181b]">Note:</span> {note}
              </p>
              <p className="mt-1 text-[11px] text-[#71717a] font-['Plus_Jakarta_Sans']">
                Reference: <span className="font-mono text-[#18181b]">{reference}</span>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <PaymentQR method="venmo" amount={amount} note={note} compact />
              <PaymentQR method="zelle" amount={amount} note={note} compact />
            </div>

            <div className="mt-5 rounded-xl bg-red-50 border border-red-100 p-3.5">
              <p className="flex items-start gap-2 text-[11px] leading-relaxed text-[#52525b] font-['Plus_Jakarta_Sans']">
                <span className="material-symbols-outlined text-[16px] text-[#dc2626] shrink-0">
                  info
                </span>
                <span>
                  {kind === 'deposit'
                    ? 'The deposit reserves your date and is non-refundable. The remaining balance is due at pickup.'
                    : kind === 'balance'
                      ? 'Send the exact amount using Venmo or Zelle, then tap the button below so Saad can verify it.'
                      : 'Tips can be sent at the end of the ride or the next day. Thank you for your generosity.'}
                </span>
              </p>
            </div>

            <button
              onClick={handleConfirm}
              className="mt-5 w-full py-3.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-['Space_Grotesk'] uppercase tracking-widest font-bold rounded-full transition-colors shadow-md cursor-pointer"
            >
              {copy.confirmLabel}
            </button>
            <button
              onClick={onClose}
              className="mt-2 w-full py-3 text-[11px] font-['Space_Grotesk'] uppercase tracking-widest font-bold text-[#71717a] hover:text-[#18181b] transition-colors cursor-pointer"
            >
              Pay Later
            </button>
          </>
        )}
      </div>
    </div>
  );
};
