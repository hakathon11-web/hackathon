// Script to switch language to English
// Run this in the browser console or save as a bookmark

// Method 1: Use the debug function (if available)
if (typeof window !== 'undefined' && window.resetLanguageToEnglish) {
  window.resetLanguageToEnglish();
} else {
  // Method 2: Manual approach
  localStorage.setItem('i18nextLng', 'en');
  console.log('🔄 Language set to English in localStorage');
  console.log('Please refresh the page to see the changes');
  window.location.reload();
}
