export function getLanguageFromUrl() {
    let lang = 'fa'
    const subdomain = window.location.hostname.split('.')[1];
  
    // List of known language codes for validation
    const knownLanguages = ['en', 'fa', 'ru']; // Add more as needed
  
    // Check if the subdomain is a known language code
    if (knownLanguages.includes(subdomain)) {
      lang = subdomain;
    }
  
    // If set,overwrite with lan in the path
    const urlSegments = window.location.pathname.split('/');
    const langInUrl = urlSegments[1] || ''
    if (knownLanguages.includes(langInUrl)) {
      lang = langInUrl;
    }
  
    return lang
  }
  
  export function getQueryParam(key) {
    const search = window.location.search;
    const params = new URLSearchParams(search);
    return params.get(key);
  }
  
  export function isTruthy(value) {
    return value === 1 || value === 'true' || value === '1'
  }
  