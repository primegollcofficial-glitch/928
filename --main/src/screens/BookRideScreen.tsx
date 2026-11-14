import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PageId, RideBooking, RideFeedback } from '../types';
import {
  RIDE_FAQ,
  RIDE_PAYMENT,
  RIDE_PRICING,
  RIDE_SERVICES,
} from '../data/rideData';
import { PaymentQR } from '../components/PaymentQR';
import { RidePaymentModal } from '../components/RidePaymentModal';

interface BookRideScreenProps {
  onNavigate: (page: PageId) => void;
}

const BOOKINGS_KEY = '928_ride_bookings';
const FEEDBACK_KEY = '928_ride_feedback';
const ACTIVE_BOOKING_KEY = '928_active_ride';

const formatCurrency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const round2 = (value: number) => Math.round(value * 100) / 100;

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable in private mode; keep the in-memory state.
  }
}

export const BookRideScreen: React.FC<BookRideScreenProps> = ({ onNavigate }) => {
  const [bookingForm, setBookingForm] = useState({
    name: '',
    phone: '',
    email: '',
    pickupDate: '',
    pickupTime: '',
    pickupLocation: '',
    destination: '',
    hours: '2',
    passengers: '1',
    notes: '',
  });
  const [agreed, setAgreed] = useState(false);
  const [formError, setFormError] = useState('');
  const [justBooked, setJustBooked] = useState<RideBooking | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const [bookings, setBookings] = useState<RideBooking[]>(() =>
    readStorage<RideBooking[]>(BOOKINGS_KEY, [])
  );
  const [activeBookingId, setActiveBookingId] = useState<string>(() =>
    readStorage<string>(ACTIVE_BOOKING_KEY, '')
  );

  const [feedback, setFeedback] = useState<RideFeedback[]>(() =>
    readStorage<RideFeedback[]>(FEEDBACK_KEY, [])
  );
  const [feedbackForm, setFeedbackForm] = useState({
    name: '',
    bookingRef: '',
    rating: 5,
    comment: '',
    tip: '',
  });
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackThanks, setFeedbackThanks] = useState(false);

  const [tipLater, setTipLater] = useState({ reference: '', amount: '' });
  const [tipLaterError, setTipLaterError] = useState('');

  const [pickupHours, setPickupHours] = useState('2');
  const [tipPercent, setTipPercent] = useState(15);
  const [customTip, setCustomTip] = useState('');

  const [payment, setPayment] = useState<{
    open: boolean;
    amount: number;
    reference: string;
    note: string;
    kind: 'deposit' | 'balance' | 'tip';
  }>({
    open: false,
    amount: 0,
    reference: '',
    note: '',
    kind: 'deposit',
  });

  const prefilledRef = useRef(false);

  const activeBooking = useMemo(
    () =>
      bookings.find((booking) => booking.id === activeBookingId) ??
      bookings[0] ??
      null,
    [bookings, activeBookingId]
  );

  const averageRating = useMemo(() => {
    if (feedback.length === 0) return 0;
    return (
      feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length
    );
  }, [feedback]);

  useEffect(() => {
    if (!prefilledRef.current && activeBooking) {
      setPickupHours(String(activeBooking.hours));
      prefilledRef.current = true;
    }
  }, [activeBooking]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('book') !== 'ride') return;
    const timer = setTimeout(() => {
      document
        .getElementById('book-now')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!shareCopied) return;
    const timer = setTimeout(() => setShareCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [shareCopied]);

  const saveBookings = (next: RideBooking[]) => {
    setBookings(next);
    writeStorage(BOOKINGS_KEY, next);
  };

  const saveFeedback = (next: RideFeedback[]) => {
    setFeedback(next);
    writeStorage(FEEDBACK_KEY, next);
  };

  const parsedFormHours = parseFloat(bookingForm.hours);
  const formHours = Math.min(
    RIDE_PRICING.maxHours,
    Math.max(RIDE_PRICING.minHours, Number.isFinite(parsedFormHours) ? parsedFormHours : RIDE_PRICING.minHours)
  );
  const formTotal = round2(formHours * RIDE_PRICING.hourlyRate);
  const formDeposit = round2((formTotal * RIDE_PRICING.depositPercent) / 100);
  const formBalance = round2(formTotal - formDeposit);

  const pickupHoursValue = Math.min(
    RIDE_PRICING.maxHours,
    Math.max(0, parseFloat(pickupHours) || 0)
  );
  const pickupTotal = round2(pickupHoursValue * RIDE_PRICING.hourlyRate);
  const pickupDeposit = round2((pickupTotal * RIDE_PRICING.depositPercent) / 100);
  const pickupBalance = round2(pickupTotal - pickupDeposit);
  const parsedCustomTip = parseFloat(customTip);
  const tipValue = Number.isFinite(parsedCustomTip) && parsedCustomTip > 0
    ? round2(parsedCustomTip)
    : round2((pickupTotal * tipPercent) / 100);
  const pickupDue = round2(pickupBalance + tipValue);

  const shareUrl = `${window.location.origin}/?book=ride`;

  // Local (not UTC) date so the browser does not reject "today" in negative-offset zones.
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(now.getDate()).padStart(2, '0')}`;

  const bookingMailto = justBooked
    ? `mailto:${RIDE_PAYMENT.contactEmail}?subject=${encodeURIComponent(
        `Ride booking ${justBooked.id}`
      )}&body=${encodeURIComponent(
        [
          `New ride booking: ${justBooked.id}`,
          `Name: ${justBooked.name}`,
          `Phone: ${justBooked.phone}`,
          `Email: ${justBooked.email}`,
          `Pickup: ${justBooked.pickupDate} at ${justBooked.pickupTime}`,
          `Pickup location: ${justBooked.pickupLocation}`,
          `Destination: ${justBooked.destination || '—'}`,
          `Hours: ${justBooked.hours}`,
          `Passengers: ${justBooked.passengers}`,
          `Notes: ${justBooked.notes || '—'}`,
          '',
          `Estimated total: ${formatCurrency(justBooked.total)}`,
          `25% deposit: ${formatCurrency(justBooked.deposit)}`,
          `Balance at pickup: ${formatCurrency(justBooked.balance)}`,
          `Deposit status: ${justBooked.status}`,
        ].join('\n')
      )}`
    : '#';

  const updateBookingForm = (field: keyof typeof bookingForm, value: string) => {
    setBookingForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleBookSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');

    if (
      !bookingForm.name.trim() ||
      !bookingForm.phone.trim() ||
      !bookingForm.email.trim() ||
      !bookingForm.pickupDate ||
      !bookingForm.pickupTime ||
      !bookingForm.pickupLocation.trim()
    ) {
      setFormError('Please complete all required fields marked with an asterisk.');
      return;
    }

    if (!agreed) {
      setFormError('Please accept the deposit and cancellation policy to continue.');
      return;
    }

    const booking: RideBooking = {
      ...bookingForm,
      id: `RIDE-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      hours: formHours,
      hourlyRate: RIDE_PRICING.hourlyRate,
      total: formTotal,
      deposit: formDeposit,
      balance: formBalance,
      status: 'deposit-pending',
      createdAt: new Date().toISOString(),
    };

    saveBookings([booking, ...bookings]);
    setActiveBookingId(booking.id);
    writeStorage(ACTIVE_BOOKING_KEY, booking.id);
    setJustBooked(booking);
    setPickupHours(String(booking.hours));
    setPayment({
      open: true,
      amount: booking.deposit,
      reference: booking.id,
      note: `25% deposit — ${booking.hours} hr ride on ${booking.pickupDate} at ${booking.pickupTime}`,
      kind: 'deposit',
    });
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Book a Ride with Saad Hamed',
      text: 'Private rides across Cleveland and Northeast Ohio — $125/hour plus tip. Reserve with a 25% deposit.',
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // The user cancelled the native share sheet; fall back to copying.
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
    } catch {
      // Clipboard access can be blocked; the link is still visible in the field.
    }
  };

  const handlePaymentConfirm = () => {
    if (payment.kind === 'deposit') {
      const next = bookings.map((booking) =>
        booking.id === payment.reference
          ? { ...booking, status: 'deposit-sent' as const }
          : booking
      );
      saveBookings(next);
      setJustBooked((prev) =>
        prev && prev.id === payment.reference
          ? { ...prev, status: 'deposit-sent' }
          : prev
      );
    }

    if (payment.kind === 'balance') {
      const next = bookings.map((booking) =>
        booking.id === payment.reference
          ? { ...booking, status: 'balance-paid' as const }
          : booking
      );
      saveBookings(next);
    }
  };

  const handleKeypad = (key: string) => {
    setPickupHours((prev) => {
      if (key === 'clear') return '';
      if (key === 'back') return prev.slice(0, -1);
      if (key === '.') return prev.includes('.') ? prev : `${prev || '0'}.`;
      const next = `${prev === '0' ? '' : prev}${key}`;
      if (next.length > 4) return prev;
      if (parseFloat(next) > RIDE_PRICING.maxHours) return prev;
      return next;
    });
  };

  const adjustHours = (delta: number) => {
    const current = parseFloat(pickupHours) || 0;
    const next = Math.min(
      RIDE_PRICING.maxHours,
      Math.max(0, round2(current + delta))
    );
    setPickupHours(String(next));
  };

  const handlePayBalance = () => {
    if (pickupDue <= 0) return;
    setPayment({
      open: true,
      amount: pickupDue,
      reference: activeBooking?.id ?? 'WALK-UP',
      note: `${pickupHoursValue} hr at ${formatCurrency(
        RIDE_PRICING.hourlyRate
      )}/hr — balance plus ${formatCurrency(tipValue)} tip`,
      kind: 'balance',
    });
  };

  const handleFeedbackSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFeedbackError('');

    if (!feedbackForm.name.trim() || !feedbackForm.comment.trim()) {
      setFeedbackError('Please add your name and a short comment about the ride.');
      return;
    }

    const tipAmount = Math.max(0, round2(parseFloat(feedbackForm.tip) || 0));
    const entry: RideFeedback = {
      id: `FB-${Date.now().toString(36).toUpperCase()}`,
      name: feedbackForm.name.trim(),
      bookingRef: feedbackForm.bookingRef.trim().toUpperCase(),
      rating: feedbackForm.rating,
      comment: feedbackForm.comment.trim(),
      tipAmount,
      createdAt: new Date().toISOString(),
    };

    saveFeedback([entry, ...feedback]);
    setFeedbackForm({ name: '', bookingRef: '', rating: 5, comment: '', tip: '' });
    setFeedbackThanks(true);

    if (tipAmount > 0) {
      setPayment({
        open: true,
        amount: tipAmount,
        reference: entry.bookingRef || entry.id,
        note: `Tip from ${entry.name}${entry.bookingRef ? ` — ${entry.bookingRef}` : ''}`,
        kind: 'tip',
      });
    }
  };

  const handleTipLater = (event: React.FormEvent) => {
    event.preventDefault();
    setTipLaterError('');
    const amount = round2(parseFloat(tipLater.amount) || 0);

    if (amount <= 0) {
      setTipLaterError('Enter a tip amount to continue.');
      return;
    }

    setPayment({
      open: true,
      amount,
      reference: tipLater.reference.trim().toUpperCase() || 'TIP',
      note: `Tip${tipLater.reference ? ` — ${tipLater.reference.toUpperCase()}` : ''}`,
      kind: 'tip',
    });
    setTipLater({ reference: '', amount: '' });
  };

  return (
    <div className="min-h-screen bg-white text-[#18181b] pt-24 pb-20 selection:bg-[#dc2626] selection:text-white">
      {/* Ledger Strip */}
      <div className="border-b border-red-100 bg-[#faf9f8]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-3 flex flex-wrap items-center justify-between text-xs font-['Space_Grotesk'] uppercase tracking-widest text-[#71717a]">
          <div className="flex items-center gap-3">
            <span className="inline-block w-2 h-2 rounded-full bg-[#dc2626] animate-pulse"></span>
            <span className="font-bold text-[#18181b]">Private Ride Bureau</span>
            <span className="text-red-200">•</span>
            <span>Cleveland, Ohio</span>
          </div>
          <div className="flex items-center gap-4">
            <span>$125 / hour + tip</span>
            <span className="hidden sm:inline text-red-200">|</span>
            <span className="hidden sm:inline">25% deposit secures your date</span>
          </div>
        </div>
      </div>

      {/* In-page jump navigation — sticks just below the fixed header on long scrolls */}
      <nav
        aria-label="Book a ride sections"
        className="sticky top-[72px] md:top-[80px] z-30 border-b border-red-100 bg-white/95 backdrop-blur-md"
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <ul className="flex items-center gap-1 overflow-x-auto py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {[
              { id: 'book-now', label: 'Booking' },
              { id: 'payment', label: 'Payment' },
              { id: 'pickup', label: 'Pickup' },
              { id: 'share', label: 'Share' },
              { id: 'feedback', label: 'Feedback' },
              { id: 'faq', label: 'FAQ' },
            ].map((item) => (
              <li key={item.id} className="shrink-0">
                <a
                  href={`#${item.id}`}
                  className="inline-flex min-h-[40px] items-center whitespace-nowrap rounded-full px-4 text-[11px] font-['Space_Grotesk'] font-bold uppercase tracking-wider text-[#52525b] transition-colors hover:bg-red-50 hover:text-[#dc2626]"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 lg:px-12 pt-14 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div>
            <p className="text-xs font-['Space_Grotesk'] uppercase tracking-[0.2em] text-[#dc2626] font-bold mb-4">
              Mobility with meaning
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-['Space_Grotesk'] font-bold tracking-tight text-[#18181b] leading-[1.05] uppercase">
              Book a Ride{' '}
              <span className="font-['Playfair_Display'] italic font-normal text-[#dc2626] lowercase">
                with Saad
              </span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-[#52525b] leading-relaxed font-['Plus_Jakarta_Sans'] max-w-xl">
              Private, respectful transportation across Cleveland and Northeast
              Ohio. Whether it is an airport run, a medical appointment, or a
              quiet conversation on the way home, every ride is treated like a
              sanctuary on wheels.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#book-now"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-['Space_Grotesk'] uppercase tracking-widest font-bold rounded-full transition-colors shadow-md hover:shadow-lg"
              >
                Book Now
                <span className="material-symbols-outlined text-[17px]">
                  arrow_downward
                </span>
              </a>
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-white hover:bg-red-50 border border-red-200 text-[#18181b] text-xs font-['Space_Grotesk'] uppercase tracking-widest font-bold rounded-full transition-colors shadow-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-[17px] text-[#dc2626]">
                  ios_share
                </span>
                {shareCopied ? 'Link Copied' : 'Share Booking Link'}
              </button>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3 max-w-lg">
              <div className="rounded-xl border border-red-100 bg-[#faf9f8] p-4">
                <p className="font-['Space_Grotesk'] text-xl sm:text-2xl font-bold text-[#18181b]">
                  $125
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-[#71717a] font-semibold font-['Space_Grotesk']">
                  Per hour + tip
                </p>
              </div>
              <div className="rounded-xl border border-red-100 bg-[#faf9f8] p-4">
                <p className="font-['Space_Grotesk'] text-xl sm:text-2xl font-bold text-[#18181b]">
                  25%
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-[#71717a] font-semibold font-['Space_Grotesk']">
                  Deposit to reserve
                </p>
              </div>
              <div className="rounded-xl border border-red-100 bg-[#faf9f8] p-4">
                <p className="font-['Space_Grotesk'] text-xl sm:text-2xl font-bold text-[#dc2626]">
                  75%
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-[#71717a] font-semibold font-['Space_Grotesk']">
                  Balance at pickup
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-3 rounded-[2rem] bg-red-50 border border-red-100 rotate-1"></div>
            <div className="relative rounded-[1.6rem] border border-red-100 bg-white p-6 sm:p-8 shadow-xl">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-['Space_Grotesk'] uppercase tracking-widest font-bold text-[#dc2626]">
                  Simple, transparent booking
                </span>
                <span className="w-10 h-10 rounded-full bg-red-50 text-[#dc2626] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">
                    route
                  </span>
                </span>
              </div>

              <h2 className="mt-3 font-['Space_Grotesk'] text-2xl font-bold text-[#18181b]">
                Three steps to your ride
              </h2>

              <ol className="mt-6 space-y-5">
                <li className="flex gap-4">
                  <span className="w-9 h-9 shrink-0 rounded-full bg-red-50 text-[#dc2626] flex items-center justify-center font-['Space_Grotesk'] text-sm font-bold">
                    1
                  </span>
                  <div>
                    <p className="font-['Space_Grotesk'] text-sm font-bold text-[#18181b]">
                      Choose your date &amp; time
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[#71717a] font-['Plus_Jakarta_Sans']">
                      Share your pickup, destination, and how many hours you
                      need the vehicle.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="w-9 h-9 shrink-0 rounded-full bg-red-50 text-[#dc2626] flex items-center justify-center font-['Space_Grotesk'] text-sm font-bold">
                    2
                  </span>
                  <div>
                    <p className="font-['Space_Grotesk'] text-sm font-bold text-[#18181b]">
                      Reserve with a 25% deposit
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[#71717a] font-['Plus_Jakarta_Sans']">
                      Send the non-refundable deposit by Venmo or Zelle. Your
                      date is held once it is verified.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="w-9 h-9 shrink-0 rounded-full bg-red-50 text-[#dc2626] flex items-center justify-center font-['Space_Grotesk'] text-sm font-bold">
                    3
                  </span>
                  <div>
                    <p className="font-['Space_Grotesk'] text-sm font-bold text-[#18181b]">
                      Pay the balance at pickup
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[#71717a] font-['Plus_Jakarta_Sans']">
                      Confirm your final hours, add a tip, and send the balance
                      from the pickup fare pad.
                    </p>
                  </div>
                </li>
              </ol>

              <div className="mt-6 rounded-xl bg-[#faf9f8] border border-red-100 p-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-['Space_Grotesk'] uppercase tracking-widest text-[#71717a] font-bold">
                      Rate
                    </p>
                    <p className="mt-1 font-['Space_Grotesk'] text-xl font-bold text-[#dc2626]">
                      $125/hour + tip
                    </p>
                  </div>
                  <p className="text-[10px] font-['Space_Grotesk'] uppercase tracking-widest text-[#71717a] font-semibold">
                    Cleveland &amp; Northeast Ohio
                  </p>
                </div>
              </div>

              <p className="mt-5 font-['Playfair_Display'] italic text-base text-[#52525b] leading-snug">
                “Every ride is a chance to listen, encourage, and help someone
                keep moving forward.”
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="border-y border-red-100 bg-[#faf9f8]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-[11px] font-['Space_Grotesk'] uppercase tracking-widest text-[#dc2626] font-bold">
                Where we go
              </p>
              <h2 className="mt-1 text-2xl sm:text-3xl font-['Space_Grotesk'] font-bold text-[#18181b]">
                Rides built around your day
              </h2>
            </div>
            <p className="text-sm text-[#71717a] font-['Plus_Jakarta_Sans'] max-w-md">
              Hourly service means the vehicle stays with you. No surge pricing,
              no strangers, no rush.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {RIDE_SERVICES.map((service) => (
              <div
                key={service.title}
                className="bg-white border border-red-100 rounded-2xl p-5 shadow-sm"
              >
                <span className="w-11 h-11 rounded-full bg-red-50 text-[#dc2626] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">
                    {service.icon}
                  </span>
                </span>
                <h3 className="mt-4 font-['Space_Grotesk'] text-base font-bold text-[#18181b]">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#52525b] font-['Plus_Jakarta_Sans']">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Booking Form */}
      <section id="book-now" className="max-w-7xl mx-auto px-6 lg:px-12 pt-14 scroll-mt-16">
        <div className="max-w-3xl mb-8">
          <p className="text-[11px] font-['Space_Grotesk'] uppercase tracking-widest text-[#dc2626] font-bold">
            Reserve your ride
          </p>
          <h2 className="mt-1 text-3xl sm:text-4xl font-['Space_Grotesk'] font-bold text-[#18181b]">
            Book now, pay the deposit, ride when ready
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#52525b] leading-relaxed font-['Plus_Jakarta_Sans']">
            Send your trip details below. A 25% non-refundable deposit locks in
            your date and time; the balance is paid at pickup by Venmo, Zelle,
            or cash.
          </p>
        </div>

        {justBooked && (
          <div
            role="status"
            aria-live="polite"
            className="mb-8 rounded-2xl border border-green-200 bg-green-50 p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-2xl text-green-700">
                  check_circle
                </span>
                <div>
                  <h3 className="font-['Space_Grotesk'] text-lg font-bold text-[#18181b]">
                    {justBooked.status === 'deposit-sent'
                      ? `Deposit marked as sent — ${justBooked.id}`
                      : `Ride request received — ${justBooked.id}`}
                  </h3>
                  <p className="mt-1 text-sm text-[#52525b] font-['Plus_Jakarta_Sans']">
                    {justBooked.status === 'deposit-sent'
                      ? `Saad will verify your ${formatCurrency(
                          justBooked.deposit
                        )} deposit. Your ${justBooked.hours} hr ride is held for ${
                          justBooked.pickupDate
                        } at ${justBooked.pickupTime}. The ${formatCurrency(
                          justBooked.balance
                        )} balance is due at pickup.`
                      : `Send the ${formatCurrency(
                          justBooked.deposit
                        )} deposit using the Venmo or Zelle QR code. Saad will verify it and confirm your reservation.`}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={bookingMailto}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#dc2626] hover:bg-[#b91c1c] px-4 py-2.5 text-[10px] font-['Space_Grotesk'] uppercase tracking-wider font-bold text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    send
                  </span>
                  Email booking
                </a>
                <a
                  href="#payment"
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-4 py-2.5 text-[10px] font-['Space_Grotesk'] uppercase tracking-wider font-bold text-[#dc2626] hover:bg-red-50 transition-colors"
                >
                  Pay deposit
                </a>
                <a
                  href="#pickup"
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-100 bg-white px-4 py-2.5 text-[10px] font-['Space_Grotesk'] uppercase tracking-wider font-bold text-[#52525b] hover:bg-[#faf9f8] transition-colors"
                >
                  Pickup pad
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleBookSubmit}
            className="lg:col-span-2 bg-white border border-red-100 rounded-2xl p-6 sm:p-8 shadow-sm"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-['Space_Grotesk'] uppercase tracking-wider text-[#71717a] mb-1.5 font-semibold">
                  Full name *
                </label>
                <input
                  type="text"
                  required
                  value={bookingForm.name}
                  onChange={(event) => updateBookingForm('name', event.target.value)}
                  placeholder="e.g. Jordan Ellis"
                  className="w-full bg-[#faf9f8] border border-red-100 rounded-xl px-4 py-3 text-sm text-[#18181b] focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-['Space_Grotesk'] uppercase tracking-wider text-[#71717a] mb-1.5 font-semibold">
                  Phone number *
                </label>
                <input
                  type="tel"
                  required
                  value={bookingForm.phone}
                  onChange={(event) => updateBookingForm('phone', event.target.value)}
                  placeholder="(216) 555-0128"
                  className="w-full bg-[#faf9f8] border border-red-100 rounded-xl px-4 py-3 text-sm text-[#18181b] focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-[11px] font-['Space_Grotesk'] uppercase tracking-wider text-[#71717a] mb-1.5 font-semibold">
                Email address *
              </label>
              <input
                type="email"
                required
                value={bookingForm.email}
                onChange={(event) => updateBookingForm('email', event.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#faf9f8] border border-red-100 rounded-xl px-4 py-3 text-sm text-[#18181b] focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-['Space_Grotesk'] uppercase tracking-wider text-[#71717a] mb-1.5 font-semibold">
                  Pickup date *
                </label>
                <input
                  type="date"
                  required
                  min={todayIso}
                  value={bookingForm.pickupDate}
                  onChange={(event) => updateBookingForm('pickupDate', event.target.value)}
                  className="w-full bg-[#faf9f8] border border-red-100 rounded-xl px-4 py-3 text-sm text-[#18181b] focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-['Space_Grotesk'] uppercase tracking-wider text-[#71717a] mb-1.5 font-semibold">
                  Pickup time *
                </label>
                <input
                  type="time"
                  required
                  value={bookingForm.pickupTime}
                  onChange={(event) => updateBookingForm('pickupTime', event.target.value)}
                  className="w-full bg-[#faf9f8] border border-red-100 rounded-xl px-4 py-3 text-sm text-[#18181b] focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-[11px] font-['Space_Grotesk'] uppercase tracking-wider text-[#71717a] mb-1.5 font-semibold">
                Pickup location *
              </label>
              <input
                type="text"
                required
                value={bookingForm.pickupLocation}
                onChange={(event) => updateBookingForm('pickupLocation', event.target.value)}
                placeholder="Address, hospital, airport, or landmark"
                className="w-full bg-[#faf9f8] border border-red-100 rounded-xl px-4 py-3 text-sm text-[#18181b] focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-['Space_Grotesk'] uppercase tracking-wider text-[#71717a] mb-1.5 font-semibold">
                  Estimated hours *
                </label>
                <input
                  type="number"
                  min={RIDE_PRICING.minHours}
                  max={RIDE_PRICING.maxHours}
                  step="0.5"
                  required
                  value={bookingForm.hours}
                  onChange={(event) => updateBookingForm('hours', event.target.value)}
                  className="w-full bg-[#faf9f8] border border-red-100 rounded-xl px-4 py-3 text-sm text-[#18181b] focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-['Space_Grotesk'] uppercase tracking-wider text-[#71717a] mb-1.5 font-semibold">
                  Passengers
                </label>
                <select
                  value={bookingForm.passengers}
                  onChange={(event) => updateBookingForm('passengers', event.target.value)}
                  className="w-full bg-[#faf9f8] border border-red-100 rounded-xl px-4 py-3 text-sm text-[#18181b] focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-red-500"
                >
                  <option value="1">1 passenger</option>
                  <option value="2">2 passengers</option>
                  <option value="3">3 passengers</option>
                  <option value="4">4 passengers</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-['Space_Grotesk'] uppercase tracking-wider text-[#71717a] mb-1.5 font-semibold">
                  Destination
                </label>
                <input
                  type="text"
                  value={bookingForm.destination}
                  onChange={(event) => updateBookingForm('destination', event.target.value)}
                  placeholder="Optional"
                  className="w-full bg-[#faf9f8] border border-red-100 rounded-xl px-4 py-3 text-sm text-[#18181b] focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-[11px] font-['Space_Grotesk'] uppercase tracking-wider text-[#71717a] mb-1.5 font-semibold">
                Notes for Saad
              </label>
              <textarea
                rows={3}
                value={bookingForm.notes}
                onChange={(event) => updateBookingForm('notes', event.target.value)}
                placeholder="Flight number, mobility needs, luggage, or anything that would make the ride smoother."
                className="w-full bg-[#faf9f8] border border-red-100 rounded-xl p-4 text-sm text-[#18181b] focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-red-500"
              ></textarea>
            </div>

            <label className="mt-4 flex items-start gap-3 rounded-xl border border-red-100 bg-[#faf9f8] p-4 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(event) => setAgreed(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#dc2626]"
              />
              <span className="text-xs leading-relaxed text-[#52525b] font-['Plus_Jakarta_Sans']">
                I understand the 25% deposit is non-refundable and secures my
                date and time. The remaining balance is due at pickup.
              </span>
            </label>

            {formError && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-[#b91c1c] font-['Plus_Jakarta_Sans']"
              >
                {formError}
              </p>
            )}

            <button
              type="submit"
              className="mt-5 w-full py-4 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-['Space_Grotesk'] uppercase tracking-widest font-bold rounded-full transition-colors shadow-md hover:shadow-lg cursor-pointer"
            >
              Book Now — Reserve with 25% Deposit
            </button>
            <p className="mt-3 text-center text-[10px] uppercase tracking-widest text-[#71717a] font-['Space_Grotesk'] font-semibold">
              No charge is taken automatically — you choose Venmo or Zelle next.
            </p>
          </form>

          {/* Fare summary */}
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-28 rounded-2xl border border-red-100 bg-[#faf9f8] p-6 shadow-sm">
              <p className="text-[10px] font-['Space_Grotesk'] uppercase tracking-widest text-[#dc2626] font-bold">
                Your estimate
              </p>
              <h3 className="mt-1 font-['Space_Grotesk'] text-xl font-bold text-[#18181b]">
                {formHours} hour{formHours === 1 ? '' : 's'} with Saad
              </h3>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between text-sm text-[#52525b] font-['Plus_Jakarta_Sans']">
                  <span>
                    {formatCurrency(RIDE_PRICING.hourlyRate)} × {formHours} hr
                  </span>
                  <span className="font-semibold text-[#18181b]">
                    {formatCurrency(formTotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-[#52525b] font-['Plus_Jakarta_Sans']">
                  <span>25% deposit due now</span>
                  <span className="font-semibold text-[#dc2626]">
                    {formatCurrency(formDeposit)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-[#52525b] font-['Plus_Jakarta_Sans']">
                  <span>Balance at pickup</span>
                  <span className="font-semibold text-[#18181b]">
                    {formatCurrency(formBalance)}
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-5 border-t border-red-100">
                <div className="flex items-end justify-between gap-3">
                  <span className="text-xs font-['Space_Grotesk'] uppercase tracking-wider text-[#71717a] font-bold">
                    Deposit today
                  </span>
                  <span className="font-['Space_Grotesk'] text-3xl font-bold text-[#dc2626]">
                    {formatCurrency(formDeposit)}
                  </span>
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-[#71717a] font-['Plus_Jakarta_Sans']">
                  Tip is not included. You can add a tip at pickup or after the
                  ride.
                </p>
              </div>

              <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-100 bg-white p-3">
                <span className="material-symbols-outlined text-[17px] text-[#dc2626] shrink-0">
                  lock
                </span>
                <p className="text-[11px] leading-relaxed text-[#52525b] font-['Plus_Jakarta_Sans']">
                  The deposit is non-refundable. Reschedules are accommodated
                  when possible with 24 hours notice.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Payment QR Codes */}
      <section id="payment" className="max-w-7xl mx-auto px-6 lg:px-12 pt-16 scroll-mt-16">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-[11px] font-['Space_Grotesk'] uppercase tracking-widest text-[#dc2626] font-bold">
              Pay by phone
            </p>
            <h2 className="mt-1 text-3xl sm:text-4xl font-['Space_Grotesk'] font-bold text-[#18181b]">
              Venmo &amp; Zelle QR codes
            </h2>
            <p className="mt-3 text-sm text-[#52525b] max-w-2xl font-['Plus_Jakarta_Sans']">
              Scan the code for your preferred app. Send the exact deposit amount
              shown at checkout, then mark it as sent so Saad can verify it. The
              same codes are used for the balance at pickup and for tips.
            </p>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
            <p className="text-[10px] font-['Space_Grotesk'] uppercase tracking-widest text-[#dc2626] font-bold">
              Example deposit
            </p>
            <p className="mt-1 text-sm font-['Plus_Jakarta_Sans'] text-[#18181b]">
              2 hours = <strong>$62.50</strong> deposit
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl">
          <PaymentQR method="venmo" amount={formDeposit} note={`Deposit for ${formHours} hr ride`} />
          <PaymentQR method="zelle" amount={formDeposit} note={`Deposit for ${formHours} hr ride`} />
        </div>

        <p className="mt-4 text-[11px] text-[#71717a] font-['Plus_Jakarta_Sans']">
          QR images and payment handles will be added at launch. Until then,
          email{' '}
          <a
            href={`mailto:${RIDE_PAYMENT.contactEmail}`}
            className="text-[#dc2626] font-semibold hover:underline"
          >
            {RIDE_PAYMENT.contactEmail}
          </a>{' '}
          to complete payment.
        </p>
      </section>

      {/* Pickup Fare Pad */}
      <section id="pickup" className="max-w-7xl mx-auto px-6 lg:px-12 pt-16 scroll-mt-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p className="text-[11px] font-['Space_Grotesk'] uppercase tracking-widest text-[#dc2626] font-bold">
              At pickup
            </p>
            <h2 className="mt-1 text-3xl sm:text-4xl font-['Space_Grotesk'] font-bold text-[#18181b]">
              Pay the balance with the fare pad
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#52525b] leading-relaxed font-['Plus_Jakarta_Sans']">
              Confirm the final hours at pickup, add a tip if you would like, and
              send the balance through Venmo or Zelle. The pad recalculates your
              deposit, balance, and total automatically.
            </p>

            <div className="mt-6 rounded-2xl border border-red-100 bg-[#faf9f8] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-['Space_Grotesk'] uppercase tracking-widest text-[#71717a] font-bold">
                    Active booking
                  </p>
                  <p className="mt-1 font-mono text-sm text-[#18181b]">
                    {activeBooking ? activeBooking.id : 'No booking on this device'}
                  </p>
                </div>
                {activeBooking && (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-[10px] font-['Space_Grotesk'] uppercase tracking-wider font-bold text-[#dc2626]">
                    {activeBooking.status.replace('-', ' ')}
                  </span>
                )}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-[#71717a] font-['Plus_Jakarta_Sans']">
                {activeBooking
                  ? `${activeBooking.hours} hr reserved for ${activeBooking.pickupDate} at ${activeBooking.pickupTime}. Adjust the hours below if the ride runs longer or shorter.`
                  : 'Book a ride first to link a reference, or use this as a walk-up fare estimate.'}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-['Space_Grotesk'] uppercase tracking-widest text-[#71717a] font-bold">
                  Hours at pickup
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-['Space_Grotesk'] text-4xl font-bold text-[#18181b]">
                    {pickupHours || '0'}
                  </span>
                  <span className="text-sm text-[#71717a] font-['Plus_Jakarta_Sans']">
                    hrs
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-['Space_Grotesk'] uppercase tracking-widest text-[#71717a] font-bold">
                  Tip
                </p>
                <p className="mt-1 font-['Space_Grotesk'] text-xl font-bold text-[#dc2626]">
                  {formatCurrency(tipValue)}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'].map(
                (key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleKeypad(key)}
                    aria-label={key === 'back' ? 'Delete last digit' : key}
                    className="min-h-[48px] rounded-xl border border-red-100 bg-[#faf9f8] hover:bg-red-50 text-[#18181b] font-['Space_Grotesk'] text-lg font-bold transition-colors cursor-pointer flex items-center justify-center"
                  >
                    {key === 'back' ? (
                      <span className="material-symbols-outlined text-[20px]">
                        backspace
                      </span>
                    ) : (
                      key
                    )}
                  </button>
                )
              )}
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => adjustHours(-0.5)}
                disabled={pickupHoursValue <= 0}
                className="min-h-[44px] rounded-xl border border-red-100 bg-white hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-['Space_Grotesk'] uppercase tracking-wider font-bold text-[#52525b] transition-colors cursor-pointer"
              >
                − 0.5
              </button>
              <button
                type="button"
                onClick={() => adjustHours(0.5)}
                disabled={pickupHoursValue >= RIDE_PRICING.maxHours}
                className="min-h-[44px] rounded-xl border border-red-100 bg-white hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-['Space_Grotesk'] uppercase tracking-wider font-bold text-[#52525b] transition-colors cursor-pointer"
              >
                + 0.5
              </button>
              <button
                type="button"
                onClick={() => handleKeypad('clear')}
                className="min-h-[44px] rounded-xl border border-red-100 bg-white hover:bg-red-50 text-xs font-['Space_Grotesk'] uppercase tracking-wider font-bold text-[#dc2626] transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>

            <div className="mt-4">
              <p className="text-[10px] font-['Space_Grotesk'] uppercase tracking-widest text-[#71717a] font-bold mb-2">
                Add a tip
              </p>
              <div className="flex flex-wrap gap-2">
                {[0, 10, 15, 20].map((percent) => (
                  <button
                    key={percent}
                    type="button"
                    onClick={() => {
                      setTipPercent(percent);
                      setCustomTip('');
                    }}
                    aria-pressed={customTip === '' && tipPercent === percent}
                    className={`min-h-[40px] px-4 rounded-full border text-xs font-['Space_Grotesk'] font-bold transition-colors cursor-pointer ${
                      customTip === '' && tipPercent === percent
                        ? 'bg-[#dc2626] text-white border-[#dc2626]'
                        : 'bg-white text-[#52525b] border-red-100 hover:bg-red-50'
                    }`}
                  >
                    {percent === 0 ? 'No tip' : `${percent}%`}
                  </button>
                ))}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#71717a]">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={customTip}
                    onChange={(event) => setCustomTip(event.target.value)}
                    placeholder="Custom"
                    aria-label="Custom tip amount"
                    className="min-h-[40px] w-28 rounded-full border border-red-100 bg-white pl-7 pr-3 text-xs text-[#18181b] focus:border-[#dc2626] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-[#faf9f8] border border-red-100 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-[#52525b] font-['Plus_Jakarta_Sans']">
                <span>Fare ({pickupHoursValue} hr)</span>
                <span className="font-semibold text-[#18181b]">
                  {formatCurrency(pickupTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#52525b] font-['Plus_Jakarta_Sans']">
                <span>Deposit already applied (25%)</span>
                <span className="font-semibold text-[#18181b]">
                  −{formatCurrency(pickupDeposit)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#52525b] font-['Plus_Jakarta_Sans']">
                <span>Balance</span>
                <span className="font-semibold text-[#18181b]">
                  {formatCurrency(pickupBalance)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#52525b] font-['Plus_Jakarta_Sans']">
                <span>Tip</span>
                <span className="font-semibold text-[#18181b]">
                  {formatCurrency(tipValue)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-red-100 pt-2.5">
                <span className="text-[10px] font-['Space_Grotesk'] uppercase tracking-widest font-bold text-[#71717a]">
                  Due at pickup
                </span>
                <span
                  aria-live="polite"
                  className="font-['Space_Grotesk'] text-xl font-bold text-[#dc2626]"
                >
                  {formatCurrency(pickupDue)}
                </span>
              </div>
            </div>

            {pickupHoursValue <= 0 && (
              <p className="mt-2 text-[11px] text-[#71717a] font-['Plus_Jakarta_Sans']">
                Add your ride hours above to calculate the balance and tip.
              </p>
            )}

            <button
              type="button"
              onClick={handlePayBalance}
              disabled={pickupDue <= 0}
              className="mt-4 w-full py-3.5 bg-[#dc2626] hover:bg-[#b91c1c] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-['Space_Grotesk'] uppercase tracking-widest font-bold rounded-full transition-colors shadow-md cursor-pointer"
            >
              Pay Balance &amp; Tip
            </button>
          </div>
        </div>
      </section>

      {/* Share */}
      <section id="share" className="max-w-7xl mx-auto px-6 lg:px-12 pt-16 scroll-mt-16">
        <div className="rounded-2xl border border-red-100 bg-[#faf9f8] p-6 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            <div className="lg:col-span-2">
              <p className="text-[11px] font-['Space_Grotesk'] uppercase tracking-widest text-[#dc2626] font-bold">
                Share the ride
              </p>
              <h2 className="mt-1 text-2xl sm:text-3xl font-['Space_Grotesk'] font-bold text-[#18181b]">
                Send this booking link to someone who needs a ride
              </h2>
              <p className="mt-2 text-sm text-[#52525b] font-['Plus_Jakarta_Sans']">
                Friends, family, and clients can open the link and reserve their
                own time with Saad. The link goes straight to this page.
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  onFocus={(event) => event.currentTarget.select()}
                  aria-label="Shareable booking link"
                  className="flex-1 rounded-xl border border-red-100 bg-white px-4 py-3 text-xs font-mono text-[#52525b] focus:border-[#dc2626] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] px-5 py-3 text-xs font-['Space_Grotesk'] uppercase tracking-wider font-bold text-white transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[17px]">
                    {shareCopied ? 'check' : 'content_copy'}
                  </span>
                  {shareCopied ? 'Copied' : 'Copy link'}
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-red-100 bg-white p-5">
              <p className="text-[10px] font-['Space_Grotesk'] uppercase tracking-widest text-[#71717a] font-bold">
                Good to know
              </p>
              <ul className="mt-3 space-y-2 text-xs text-[#52525b] font-['Plus_Jakarta_Sans']">
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[15px] text-[#dc2626]">
                    check
                  </span>
                  Shareable with family and friends
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[15px] text-[#dc2626]">
                    check
                  </span>
                  No app or account required
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[15px] text-[#dc2626]">
                    check
                  </span>
                  Deposit and balance handled by QR
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feedback & Tips */}
      <section id="feedback" className="max-w-7xl mx-auto px-6 lg:px-12 pt-16 scroll-mt-16">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-[11px] font-['Space_Grotesk'] uppercase tracking-widest text-[#dc2626] font-bold">
              Rider feedback
            </p>
            <h2 className="mt-1 text-3xl sm:text-4xl font-['Space_Grotesk'] font-bold text-[#18181b]">
              Leave feedback &amp; add a tip
            </h2>
            <p className="mt-3 text-sm text-[#52525b] max-w-2xl font-['Plus_Jakarta_Sans']">
              Share a comment about your ride at the end of the trip or the next
              day. You can add a tip in the same step, or use the quick tip form
              below with your booking reference.
            </p>
          </div>
          <div className="rounded-xl border border-red-100 bg-[#faf9f8] px-5 py-4 text-center">
            <p className="font-['Space_Grotesk'] text-3xl font-bold text-[#18181b]">
              {feedback.length > 0 ? averageRating.toFixed(1) : 'New'}
            </p>
            <div className="mt-1 flex items-center justify-center gap-0.5 text-[#dc2626]">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`material-symbols-outlined text-[15px] ${
                    feedback.length > 0 && star <= Math.round(averageRating)
                      ? 'text-[#dc2626]'
                      : 'text-red-200'
                  }`}
                >
                  star
                </span>
              ))}
            </div>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-[#71717a] font-['Space_Grotesk'] font-semibold">
              {feedback.length} review{feedback.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {feedback.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-red-200 bg-[#faf9f8] p-8 text-center">
                <span className="material-symbols-outlined text-4xl text-[#dc2626]">
                  reviews
                </span>
                <h3 className="mt-3 font-['Space_Grotesk'] text-lg font-bold text-[#18181b]">
                  No rider feedback yet
                </h3>
                <p className="mt-1 text-sm text-[#71717a] font-['Plus_Jakarta_Sans']">
                  Be the first to share how your ride went.
                </p>
              </div>
            ) : (
              feedback.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#dc2626] text-white flex items-center justify-center font-['Space_Grotesk'] font-bold text-sm">
                        {item.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-['Space_Grotesk'] text-sm font-bold text-[#18181b]">
                          {item.name}
                        </p>
                        <p className="text-[10px] uppercase tracking-widest text-[#71717a] font-['Space_Grotesk'] font-semibold">
                          {formatDate(item.createdAt)}
                          {item.bookingRef && ` • ${item.bookingRef}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={`material-symbols-outlined text-[16px] ${
                            star <= item.rating ? 'text-[#dc2626]' : 'text-red-200'
                          }`}
                        >
                          star
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-[#52525b] font-['Plus_Jakarta_Sans']">
                    {item.comment}
                  </p>
                  {item.tipAmount > 0 && (
                    <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-[10px] font-['Space_Grotesk'] uppercase tracking-wider font-bold text-[#dc2626]">
                      <span className="material-symbols-outlined text-[14px]">
                        volunteer_activism
                      </span>
                      Tip {formatCurrency(item.tipAmount)} added
                    </p>
                  )}
                </article>
              ))
            )}
          </div>

          <div className="lg:col-span-1 space-y-4">
            <form
              onSubmit={handleFeedbackSubmit}
              className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm"
            >
              <h3 className="font-['Space_Grotesk'] text-base font-bold text-[#18181b]">
                Share your experience
              </h3>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-['Space_Grotesk'] uppercase tracking-wider text-[#71717a] mb-1 font-semibold">
                    Your name *
                  </label>
                  <input
                    type="text"
                    required
                    value={feedbackForm.name}
                    onChange={(event) =>
                      setFeedbackForm({ ...feedbackForm, name: event.target.value })
                    }
                    placeholder="First name or initials"
                    className="w-full bg-[#faf9f8] border border-red-100 rounded-xl px-3.5 py-2.5 text-xs text-[#18181b] focus:border-[#dc2626] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-['Space_Grotesk'] uppercase tracking-wider text-[#71717a] mb-1 font-semibold">
                    Booking ref
                  </label>
                  <input
                    type="text"
                    value={feedbackForm.bookingRef}
                    onChange={(event) =>
                      setFeedbackForm({ ...feedbackForm, bookingRef: event.target.value })
                    }
                    placeholder="RIDE-XXXXXX"
                    className="w-full bg-[#faf9f8] border border-red-100 rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#18181b] focus:border-[#dc2626] focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-3">
                <p className="text-[10px] font-['Space_Grotesk'] uppercase tracking-wider text-[#71717a] mb-1 font-semibold">
                  Rating *
                </p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackForm({ ...feedbackForm, rating: star })}
                      aria-label={`${star} star${star === 1 ? '' : 's'}`}
                      aria-pressed={feedbackForm.rating === star}
                      className="p-1 cursor-pointer"
                    >
                      <span
                        className={`material-symbols-outlined text-[24px] ${
                          star <= feedbackForm.rating
                            ? 'text-[#dc2626]'
                            : 'text-red-200'
                        }`}
                      >
                        star
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-[10px] font-['Space_Grotesk'] uppercase tracking-wider text-[#71717a] mb-1 font-semibold">
                  Comment *
                </label>
                <textarea
                  rows={3}
                  required
                  value={feedbackForm.comment}
                  onChange={(event) =>
                    setFeedbackForm({ ...feedbackForm, comment: event.target.value })
                  }
                  placeholder="How was the ride? Safe, on time, thoughtful conversation..."
                  className="w-full bg-[#faf9f8] border border-red-100 rounded-xl p-3.5 text-xs text-[#18181b] focus:border-[#dc2626] focus:outline-none"
                ></textarea>
              </div>

              <div className="mt-3">
                <label className="block text-[10px] font-['Space_Grotesk'] uppercase tracking-wider text-[#71717a] mb-1 font-semibold">
                  Add a tip (optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#71717a]">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={feedbackForm.tip}
                    onChange={(event) =>
                      setFeedbackForm({ ...feedbackForm, tip: event.target.value })
                    }
                    placeholder="0.00"
                    className="w-full bg-[#faf9f8] border border-red-100 rounded-xl pl-7 pr-3.5 py-2.5 text-xs text-[#18181b] focus:border-[#dc2626] focus:outline-none"
                  />
                </div>
              </div>

              {feedbackError && (
                <p
                  role="alert"
                  className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-[#b91c1c] font-['Plus_Jakarta_Sans']"
                >
                  {feedbackError}
                </p>
              )}

              {feedbackThanks && (
                <p
                  role="status"
                  aria-live="polite"
                  className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-[11px] font-semibold text-green-800 font-['Plus_Jakarta_Sans']"
                >
                  Thank you — your feedback has been saved.
                </p>
              )}

              <button
                type="submit"
                className="mt-4 w-full py-3 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-[11px] font-['Space_Grotesk'] uppercase tracking-widest font-bold rounded-full transition-colors cursor-pointer"
              >
                Submit Feedback
              </button>
              <p className="mt-2 text-center text-[10px] text-[#a1a1aa] font-['Plus_Jakarta_Sans']">
                Saved on this device in this preview.
              </p>
            </form>

            <form
              onSubmit={handleTipLater}
              className="rounded-2xl border border-red-100 bg-[#faf9f8] p-5"
            >
              <h3 className="flex items-center gap-2 font-['Space_Grotesk'] text-sm font-bold text-[#18181b]">
                <span className="material-symbols-outlined text-[18px] text-[#dc2626]">
                  volunteer_activism
                </span>
                Send a tip later
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-[#71717a] font-['Plus_Jakarta_Sans']">
                Tips are welcome at the end of the ride or the next day. Use your
                booking reference so Saad can match it.
              </p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={tipLater.reference}
                  onChange={(event) =>
                    setTipLater({ ...tipLater, reference: event.target.value })
                  }
                  placeholder="RIDE-XXXXXX"
                  aria-label="Booking reference for tip"
                  className="w-full bg-white border border-red-100 rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#18181b] focus:border-[#dc2626] focus:outline-none"
                />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#71717a]">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={tipLater.amount}
                    onChange={(event) =>
                      setTipLater({ ...tipLater, amount: event.target.value })
                    }
                    placeholder="Tip amount"
                    aria-label="Tip amount"
                    className="w-full bg-white border border-red-100 rounded-xl pl-7 pr-3.5 py-2.5 text-xs text-[#18181b] focus:border-[#dc2626] focus:outline-none"
                  />
                </div>
              </div>
              {tipLaterError && (
                <p
                  role="alert"
                  className="mt-2 text-[11px] font-semibold text-[#b91c1c] font-['Plus_Jakarta_Sans']"
                >
                  {tipLaterError}
                </p>
              )}
              <button
                type="submit"
                className="mt-3 w-full py-2.5 rounded-full border border-red-200 bg-white hover:bg-red-50 text-[10px] font-['Space_Grotesk'] uppercase tracking-widest font-bold text-[#dc2626] transition-colors cursor-pointer"
              >
                Add Tip
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-7xl mx-auto px-6 lg:px-12 pt-16 scroll-mt-16">
        <div className="max-w-3xl mb-8">
          <p className="text-[11px] font-['Space_Grotesk'] uppercase tracking-widest text-[#dc2626] font-bold">
            Before you book
          </p>
          <h2 className="mt-1 text-3xl sm:text-4xl font-['Space_Grotesk'] font-bold text-[#18181b]">
            Booking questions, answered
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {RIDE_FAQ.map((item) => (
            <details
              key={item.question}
              className="group rounded-2xl border border-red-100 bg-white p-5 shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-['Space_Grotesk'] text-sm font-bold text-[#18181b]">
                {item.question}
                <span className="material-symbols-outlined text-[18px] text-[#dc2626] transition-transform group-open:rotate-45">
                  add
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-[#52525b] font-['Plus_Jakarta_Sans']">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 lg:px-12 pt-16">
        <div className="rounded-2xl border border-red-100 bg-[#18181b] p-8 lg:p-12 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#dc2626]/20 blur-3xl"></div>
          <div className="relative z-10 max-w-2xl">
            <p className="text-[11px] font-['Space_Grotesk'] uppercase tracking-widest text-red-300 font-bold">
              Need a custom route?
            </p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-['Space_Grotesk'] font-bold text-white leading-tight">
              Tell us where you need to go
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#d4d4d8] leading-relaxed font-['Plus_Jakarta_Sans']">
              For longer regional trips, recurring medical appointments, or group
              transportation, reach out directly and we will build a plan around
              your schedule.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={`mailto:${RIDE_PAYMENT.contactEmail}`}
                className="inline-flex items-center gap-2 rounded-full bg-[#dc2626] hover:bg-[#b91c1c] px-6 py-3 text-xs font-['Space_Grotesk'] uppercase tracking-widest font-bold text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[17px]">mail</span>
                Email Saad
              </a>
              <button
                type="button"
                onClick={() => onNavigate('contact')}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 px-6 py-3 text-xs font-['Space_Grotesk'] uppercase tracking-widest font-bold text-white transition-colors cursor-pointer"
              >
                Contact page
                <span className="material-symbols-outlined text-[17px]">
                  arrow_forward
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <RidePaymentModal
        isOpen={payment.open}
        onClose={() => setPayment((prev) => ({ ...prev, open: false }))}
        amount={payment.amount}
        reference={payment.reference}
        note={payment.note}
        kind={payment.kind}
        onConfirm={handlePaymentConfirm}
      />
    </div>
  );
};
