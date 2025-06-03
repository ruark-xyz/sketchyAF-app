import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { Country } from '../../types';
import { countries } from '../../data/mockCountries';

interface CountrySelectProps {
  value?: Country;
  onChange: (country: Country) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

const CountrySelect: React.FC<CountrySelectProps> = ({
  value,
  onChange,
  label = "Country",
  placeholder = "Select a country",
  error,
  disabled = false,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCountries, setFilteredCountries] = useState(countries);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Filter countries when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCountries(countries);
    } else {
      const normalizedTerm = searchTerm.toLowerCase();
      setFilteredCountries(
        countries.filter(country => 
          country.name.toLowerCase().includes(normalizedTerm) ||
          country.code.toLowerCase().includes(normalizedTerm)
        )
      );
    }
  }, [searchTerm]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen]);

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (isOpen) {
        setSearchTerm('');
      }
    }
  };

  const handleSelectCountry = (country: Country) => {
    onChange(country);
    setIsOpen(false);
    setSearchTerm('');
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined as unknown as Country);
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block mb-1 font-heading font-bold text-dark">
          {label}
        </label>
      )}
      
      <div ref={dropdownRef} className="relative">
        {/* Selected country display or placeholder */}
        <div
          onClick={toggleDropdown}
          className={`flex items-center justify-between w-full px-4 py-3 bg-white border ${
            error ? 'border-red bg-red-50' : 'border-dark'
          } ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          } rounded-md font-body transition-colors duration-200 hand-drawn`}
        >
          <div className="flex items-center truncate">
            {value ? (
              <>
                <span className="text-2xl mr-2">{value.flag}</span>
                <span>{value.name}</span>
              </>
            ) : (
              <span className="text-medium-gray">{placeholder}</span>
            )}
          </div>
          
          <div className="flex items-center">
            {value && (
              <button 
                onClick={clearSelection} 
                className="mr-2 text-medium-gray hover:text-dark transition-colors"
                aria-label="Clear selection"
              >
                <X size={16} />
              </button>
            )}
            <ChevronDown size={16} className={`transition-transform duration-300 ${isOpen ? 'transform rotate-180' : ''}`} />
          </div>
        </div>
        
        {/* Dropdown menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute z-50 w-full mt-1 bg-white border border-dark rounded-md shadow-lg max-h-80 overflow-auto"
            >
              {/* Search input */}
              <div className="sticky top-0 p-2 bg-white border-b border-light-gray">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-medium-gray" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search countries..."
                    className="w-full pl-10 pr-4 py-2 border border-light-gray rounded-md text-sm"
                  />
                </div>
              </div>
              
              {/* Country list */}
              <div className="py-1">
                {filteredCountries.length > 0 ? (
                  filteredCountries.map((country) => (
                    <div
                      key={country.code}
                      onClick={() => handleSelectCountry(country)}
                      className={`flex items-center px-4 py-2 hover:bg-primary/10 cursor-pointer ${
                        value?.code === country.code ? 'bg-primary/10' : ''
                      }`}
                    >
                      <span className="text-2xl mr-2">{country.flag}</span>
                      <span className="flex-grow">{country.name}</span>
                      {value?.code === country.code && (
                        <Check size={16} className="text-primary" />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-2 text-center text-medium-gray">
                    No countries found
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Error message */}
        {error && (
          <p className="mt-1 text-sm text-red font-body">{error}</p>
        )}
      </div>
    </div>
  );
};

export default CountrySelect;