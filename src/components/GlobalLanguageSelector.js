import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

// Simple context for language state
const LanguageContext = createContext();

// Display labels for values that don't look right as plain toUpperCase()
const DISPLAY_LABELS = { 'kcl': 'KCL', 'python': 'Python', 'go': 'Go', 'go-templating': 'Go Templating', };

function displayLabel(value) {
  return DISPLAY_LABELS[value] || value.toUpperCase();
}

// Ref-counted so an option disappears once the last CodeBlock using it
// unmounts. LanguageProvider lives at the site root (src/theme/Root.js) and
// survives client-side navigation, so a plain Set that only ever grew meant
// options from a previously visited page stuck around forever -- including a
// stale *selected* language/cloud the new page never registers, which
// silently hid every CodeBlock on the page (none can match a selection that
// doesn't exist here).
function useRefCountedSet() {
  const [counts, setCounts] = useState(new Map());

  const register = useCallback((value) => {
    setCounts(prev => {
      const next = new Map(prev);
      next.set(value, (next.get(value) || 0) + 1);
      return next;
    });
    return () => {
      setCounts(prev => {
        const count = prev.get(value) || 0;
        const next = new Map(prev);
        if (count <= 1) {
          next.delete(value);
        } else {
          next.set(value, count - 1);
        }
        return next;
      });
    };
  }, []);

  const values = new Set(counts.keys());
  return [values, register];
}

export function LanguageProvider({ children }) {
  const [selectedLanguage, setSelectedLanguage] = useState('kcl');
  const [selectedCloud, setSelectedCloud] = useState('aws');
  const [availableLanguages, registerLanguage] = useRefCountedSet();
  const [availableClouds, registerCloud] = useRefCountedSet();

  useEffect(() => {
    const savedLang = localStorage.getItem('selected-language') || 'kcl';
    const savedCloud = localStorage.getItem('selected-cloud') || 'aws';
    setSelectedLanguage(savedLang);
    setSelectedCloud(savedCloud);
  }, []);

  // Auto-select first available if current selection isn't available on this
  // page. Must still correct when only one option is registered -- with only
  // one choice there's no ambiguity, so there's no reason to leave a mismatch
  // uncorrected.
  useEffect(() => {
    if (availableLanguages.size > 0 && !availableLanguages.has(selectedLanguage)) {
      const firstLang = Array.from(availableLanguages)[0];
      setSelectedLanguage(firstLang);
      localStorage.setItem('selected-language', firstLang);
    }
  }, [availableLanguages, selectedLanguage]);

  useEffect(() => {
    if (availableClouds.size > 0 && !availableClouds.has(selectedCloud)) {
      const firstCloud = Array.from(availableClouds)[0];
      setSelectedCloud(firstCloud);
      localStorage.setItem('selected-cloud', firstCloud);
    }
  }, [availableClouds, selectedCloud]);

  const updateLanguage = (language) => {
    setSelectedLanguage(language);
    localStorage.setItem('selected-language', language);
  };

  const updateCloud = (cloud) => {
    setSelectedCloud(cloud);
    localStorage.setItem('selected-cloud', cloud);
  };

  return (
    <LanguageContext.Provider value={{
      selectedLanguage,
      selectedCloud,
      availableLanguages,
      availableClouds,
      updateLanguage,
      updateCloud,
      registerLanguage,
      registerCloud
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguageContext() {
  return useContext(LanguageContext);
}

// Simple selector with BOTH cloud and language - only shows available options
export default function GlobalLanguageSelector() {
  const { 
    selectedLanguage, 
    selectedCloud, 
    availableLanguages,
    availableClouds,
    updateLanguage, 
    updateCloud 
  } = useLanguageContext();

  // Don't show if no options available
  if (availableLanguages.size === 0 && availableClouds.size === 0) {
    return null;
  }

  return (
    <div className="global-language-selector">
      <div className="selector-controls">
        {availableClouds.size > 0 && (
          <div className="selector-group">
            <span className="selector-group-label">Cloud provider</span>
            <div className="selector-pills" role="group" aria-label="Cloud provider">
              {Array.from(availableClouds).sort().map(cloud => (
                <button
                  key={cloud}
                  type="button"
                  className="selector-pill"
                  aria-pressed={cloud === selectedCloud}
                  onClick={() => updateCloud(cloud)}
                >
                  {displayLabel(cloud)}
                </button>
              ))}
            </div>
          </div>
        )}

        {availableLanguages.size > 0 && (
          <div className="selector-group">
            <span className="selector-group-label">Language</span>
            <div className="selector-pills" role="group" aria-label="Language">
              {Array.from(availableLanguages).sort().map(language => (
                <button
                  key={language}
                  type="button"
                  className="selector-pill"
                  aria-pressed={language === selectedLanguage}
                  onClick={() => updateLanguage(language)}
                >
                  {displayLabel(language)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple content wrapper that auto-registers its options
// FIXED: Removed the code-block wrapper that was causing formatting issues
export function CodeBlock({ cloud, language, children }) {
  const { selectedLanguage, selectedCloud, registerLanguage, registerCloud } = useLanguageContext();
  
  // Register this content's options, and unregister on unmount so switching
  // pages doesn't leave stale options (or a stale selection) behind.
  useEffect(() => {
    const unregisterLanguage = language ? registerLanguage(language) : undefined;
    const unregisterCloud = cloud ? registerCloud(cloud) : undefined;
    return () => {
      unregisterLanguage?.();
      unregisterCloud?.();
    };
  }, [language, cloud, registerLanguage, registerCloud]);
  
  const shouldShow = (!cloud || cloud === selectedCloud) && 
                    (!language || language === selectedLanguage);
  
  // Return children directly without wrapper, or use a neutral wrapper
  return shouldShow ? <>{children}</> : null;
}
