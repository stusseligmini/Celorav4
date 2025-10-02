'use client';

import { useState, useEffect } from 'react';
import { useLanguagePreference } from '@/lib/userPreferencesClient';

interface LanguageSwitcherProps {
  className?: string;
  onLanguageChange?: (lang: string) => void;
  minimalist?: boolean; // If true, show only icons without labels
}

interface Language {
  code: string;
  name: string;
  flag: string;
}

const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'nb', name: 'Norsk', flag: '🇳🇴' },
  // Add more languages as needed
];

/**
 * Language Switcher Component
 * Allows users to switch between supported languages
 */
const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  className = '', 
  onLanguageChange,
  minimalist = false
}) => {
  const [language, setLanguage] = useLanguagePreference();
  const [isOpen, setIsOpen] = useState(false);
  
  // Find current language object
  const currentLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === language) || SUPPORTED_LANGUAGES[0];
  
  // Handle language selection
  const handleSelectLanguage = async (langCode: string) => {
    await setLanguage(langCode);
    setIsOpen(false);
    
    if (onLanguageChange) {
      onLanguageChange(langCode);
    }
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setIsOpen(false);
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);
  
  if (minimalist) {
    return (
      <div className={`relative ${className}`}>
        <button 
          onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} 
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-800/50 transition-colors"
          aria-label="Change language"
        >
          <span className="text-xl">{currentLanguage.flag}</span>
        </button>
        
        {isOpen && (
          <div className="absolute top-full right-0 mt-1 bg-gray-900 border border-gray-700 rounded-md shadow-lg z-50 py-1">
            {SUPPORTED_LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={(e) => { e.stopPropagation(); handleSelectLanguage(lang.code); }}
                className={`w-full text-left px-4 py-2 flex items-center hover:bg-gray-800 transition-colors
                  ${lang.code === language ? 'bg-gray-800' : ''}`}
              >
                <span className="mr-2 text-xl">{lang.flag}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className={`relative ${className}`}>
      <button 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} 
        className="flex items-center justify-center px-3 py-2 rounded-md hover:bg-gray-800/50 transition-colors"
        aria-label="Change language"
      >
        <span className="mr-2 text-xl">{currentLanguage.flag}</span>
        <span className="text-sm font-medium">{currentLanguage.name}</span>
        <svg 
          className={`ml-1 w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-gray-900 border border-gray-700 rounded-md shadow-lg z-50 py-1 min-w-[160px]">
          {SUPPORTED_LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={(e) => { e.stopPropagation(); handleSelectLanguage(lang.code); }}
              className={`w-full text-left px-4 py-2 flex items-center hover:bg-gray-800 transition-colors
                ${lang.code === language ? 'bg-gray-800' : ''}`}
            >
              <span className="mr-2 text-xl">{lang.flag}</span>
              <span className="text-sm">{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
