/**
 * Filters out harmless browser extension errors from the console
 * These errors are caused by browser extensions (ad blockers, password managers, etc.)
 * and don't affect the application's functionality.
 */
export function setupErrorFilter() {
  if (typeof window === 'undefined') return;

  const originalError = console.error;
  const originalWarn = console.warn;

  // Patterns that indicate browser extension errors
  const extensionErrorPatterns = [
    /message channel closed/i,
    /runtime\.lastError/i,
    /listener indicated an asynchronous response/i,
    /Extension context invalidated/i,
    /chrome-extension:/i,
    /moz-extension:/i,
    /safari-extension:/i,
  ];

  const isExtensionError = (message: string): boolean => {
    return extensionErrorPatterns.some(pattern => pattern.test(message));
  };

  // Override console.error
  console.error = (...args: unknown[]) => {
    const message = args.map(arg => 
      typeof arg === 'string' ? arg : String(arg)
    ).join(' ');

    // Only filter extension-specific noise in all environments
    if (isExtensionError(message)) {
      return; // Silently ignore extension errors
    }

    originalError.apply(console, args);
  };

  // Override console.warn for similar extension warnings
  console.warn = (...args: unknown[]) => {
    const message = args.map(arg => 
      typeof arg === 'string' ? arg : String(arg)
    ).join(' ');

    if (isExtensionError(message)) {
      return; // Silently ignore extension warnings
    }

    originalWarn.apply(console, args);
  };

  // Handle unhandled promise rejections from extensions
  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || String(event.reason || '');
    
    if (isExtensionError(message)) {
      event.preventDefault(); // Prevent the error from showing in console
      return;
    }
  });

  // Handle general errors (though these are less common from extensions)
  window.addEventListener('error', (event) => {
    const message = event.message || String(event.error || '');
    
    if (isExtensionError(message)) {
      event.preventDefault(); // Prevent the error from showing in console
      return;
    }
  });
}


