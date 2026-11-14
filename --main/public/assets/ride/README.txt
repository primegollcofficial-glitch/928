RIDE PAYMENT QR CODES
=====================

1. Add your QR images to this folder:
   - venmo-qr.png
   - zelle-qr.png

2. Open src/data/rideData.ts and fill in the RIDE_PAYMENT block:

   venmoHandle: 'YourVenmoUsername',       // no leading @
   venmoQrImage: '/assets/ride/venmo-qr.png',
   zelleContact: 'you@example.com',        // or your Zelle phone number
   zelleQrImage: '/assets/ride/zelle-qr.png',

The booking page will show the QR images automatically. Until they are
added, the page displays a clearly marked placeholder with the contact
email so clients can still reach you.
