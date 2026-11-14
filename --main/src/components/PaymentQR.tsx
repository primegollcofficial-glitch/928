import React, { useEffect, useState } from 'react';
import { RIDE_PAYMENT } from '../data/rideData';

type PaymentMethod = 'venmo' | 'zelle';

interface PaymentQRProps {
  method: PaymentMethod;
  amount?: number;
  note?: string;
  compact?: boolean;
}

const formatCurrency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export const PaymentQR: React.FC<PaymentQRProps> = ({
  method,
  amount,
  note,
  compact = false,
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  const isVenmo = method === 'venmo';
  const name = isVenmo ? 'Venmo' : 'Zelle';
  const qrImage = isVenmo ? RIDE_PAYMENT.venmoQrImage : RIDE_PAYMENT.zelleQrImage;
  const handle = isVenmo ? RIDE_PAYMENT.venmoHandle : RIDE_PAYMENT.zelleContact;
  const accentClass = isVenmo ? 'bg-[#008CFF]' : 'bg-[#6D1ED4]';

  useEffect(() => {
    setImageFailed(false);
  }, [qrImage]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const venmoLink =
    isVenmo && RIDE_PAYMENT.venmoHandle
      ? `https://venmo.com/u/${RIDE_PAYMENT.venmoHandle.replace(/^@/, '')}${
          amount
            ? `?txn=pay&amount=${amount.toFixed(2)}${
                note ? `&note=${encodeURIComponent(note)}` : ''
              }`
            : ''
        }`
      : null;

  const handleCopy = async () => {
    if (!handle) return;
    try {
      await navigator.clipboard.writeText(handle);
      setCopied(true);
    } catch {
      // Clipboard access can be blocked by the browser; ignore.
    }
  };

  return (
    <div
      className={`rounded-2xl border border-red-100 bg-white ${
        compact ? 'p-4' : 'p-5'
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-9 h-9 rounded-full ${accentClass} text-white flex items-center justify-center font-['Space_Grotesk'] font-bold text-sm shadow-sm`}
            aria-hidden="true"
          >
            {name.charAt(0)}
          </span>
          <div>
            <p className="font-['Space_Grotesk'] text-sm font-bold text-[#18181b]">
              {name}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-[#71717a] font-['Space_Grotesk'] font-semibold">
              Scan to pay
            </p>
          </div>
        </div>
        {typeof amount === 'number' && (
          <span className="font-['Space_Grotesk'] text-lg font-bold text-[#dc2626]">
            {formatCurrency(amount)}
          </span>
        )}
      </div>

      <div className="mx-auto max-w-[220px]">
        {qrImage && !imageFailed ? (
          <img
            src={qrImage}
            alt={`${name} payment QR code`}
            className="w-full aspect-square object-contain rounded-xl border border-red-100 bg-white p-2"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="w-full aspect-square rounded-xl border-2 border-dashed border-red-200 bg-[#faf9f8] flex flex-col items-center justify-center text-center p-5">
            <span className="material-symbols-outlined text-5xl text-[#dc2626]">
              qr_code_2
            </span>
            <p className="mt-2 text-xs font-['Space_Grotesk'] uppercase tracking-widest font-bold text-[#18181b]">
              {name} QR code
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#71717a] font-['Plus_Jakarta_Sans']">
              {handle
                ? 'Your QR image is being prepared. Use the handle below to pay.'
                : `Contact ${RIDE_PAYMENT.contactEmail} to complete payment directly.`}
            </p>
          </div>
        )}
      </div>

      {handle ? (
        <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-[#faf9f8] border border-red-100 px-3 py-2.5">
          <span className="font-['Space_Grotesk'] text-xs font-semibold text-[#18181b] truncate">
            {handle}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 inline-flex items-center gap-1 text-[10px] font-['Space_Grotesk'] uppercase tracking-wider font-bold text-[#dc2626] hover:text-[#b91c1c] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">
              {copied ? 'check' : 'content_copy'}
            </span>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      ) : (
        <p className="mt-4 text-[11px] text-center text-[#71717a] font-['Plus_Jakarta_Sans']">
          Payment handle coming soon. Email{' '}
          <a
            href={`mailto:${RIDE_PAYMENT.contactEmail}`}
            className="text-[#dc2626] font-semibold hover:underline"
          >
            {RIDE_PAYMENT.contactEmail}
          </a>{' '}
          to send payment.
        </p>
      )}

      {venmoLink && !compact && (
        <a
          href={venmoLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#008CFF] hover:bg-[#0079de] text-white px-4 py-2.5 text-[11px] font-['Space_Grotesk'] uppercase tracking-widest font-bold transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          Open Venmo
        </a>
      )}
    </div>
  );
};
