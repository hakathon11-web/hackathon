export const savePendingBookingContext = (data: any) => {
  try {
    // Persist booking context along with optional resume hint
    // Example: { ..., resumeAt: 'payment' }
    localStorage.setItem('pendingBookingData', JSON.stringify(data));
    localStorage.setItem('pendingBookingDialog', 'true');
  } catch {}
};

export const clearPendingBookingContext = () => {
  try {
    localStorage.removeItem('pendingBookingData');
    localStorage.removeItem('pendingBookingDialog');
  } catch {}
};


