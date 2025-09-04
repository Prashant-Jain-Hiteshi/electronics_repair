/**
 * Theme utilities for managing dark/light mode
 */

/**
 * Apply dark mode to the document
 * @param {boolean} isDark - Whether to apply dark mode
 */
export function applyDarkMode(isDark: boolean) {
  const root = document.documentElement;
  
  if (isDark) {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }
}

/**
 * Check if dark mode is currently enabled
 * @returns {boolean} True if dark mode is enabled
 */
export function isDarkMode(): boolean {
  return document.documentElement.classList.contains('dark');
}

/**
 * Toggle between dark and light mode
 * @returns {boolean} The new dark mode state (true if dark mode is now enabled)
 */
export function toggleDarkMode(): boolean {
  const newDarkMode = !isDarkMode();
  applyDarkMode(newDarkMode);
  // Optionally save preference to localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('darkMode', String(newDarkMode));
  }
  return newDarkMode;
}

/**
 * Initialize theme based on user preference or system preference
 */
export function initializeTheme() {
  // Check for saved user preference, if any
  const savedPreference = typeof window !== 'undefined' 
    ? localStorage.getItem('darkMode')
    : null;
  
  if (savedPreference !== null) {
    // Use saved preference
    applyDarkMode(savedPreference === 'true');
  } else if (typeof window !== 'undefined' && window.matchMedia) {
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyDarkMode(prefersDark);
    
    // Listen for changes to system preference
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      // Only apply system preference if user hasn't set a preference
      if (!localStorage.getItem('darkMode')) {
        applyDarkMode(e.matches);
      }
    });
  }
}
