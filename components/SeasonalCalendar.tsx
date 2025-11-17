import React, { useState, useEffect, useRef } from 'react';
import { getSeasonalProduce } from '../services/geminiService';
import { Card } from './common/Card';
import { Loader } from './common/Loader';
import { Icon } from './common/Icon';
import { countries, Country } from '../data/countries';
import type { SeasonalProduce } from '../types';


const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
] as const;
type Month = typeof months[number];

const initialProduceState: SeasonalProduce = {
    Fruits: [],
    Vegetables: [],
    Proteins: [],
};

const SeasonalCalendar: React.FC = () => {
    const [selectedMonth, setSelectedMonth] = useState<Month>(() => 
        new Date().toLocaleString('default', { month: 'long' }) as Month
    );
    const [selectedCountry, setSelectedCountry] = useState<Country>(
        countries.find(c => c.name === 'United Kingdom') || countries[0]
    );
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    const [produce, setProduce] = useState<SeasonalProduce>(initialProduceState);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsDropdownOpen(false);
        }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchProduce = async (month: Month, country: Country) => {
        setIsLoading(true);
        setError('');
        setProduce(initialProduceState);
        try {
            const result = await getSeasonalProduce(month, country.name);
            setProduce(result);
        } catch (err) {
            setError(`Failed to load produce for ${month} in ${country.name}. Please try again.`);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProduce(selectedMonth, selectedCountry);
    }, [selectedMonth, selectedCountry]);

    const renderProduceList = (title: keyof SeasonalProduce, items: string[]) => (
        <div key={title}>
            <h3 className="text-lg font-semibold text-dark mb-3 border-b border-medium pb-2">{title}</h3>
            {items.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                    {items.map((item, index) => (
                        <li key={index} className="bg-light text-dark text-sm font-medium px-3 py-1.5 rounded-full border border-medium">
                            {item}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-muted">No {title.toLowerCase()} listed for this month.</p>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-dark mb-1 flex items-center">
                            <Icon name="leaf" className="h-6 w-6 mr-2 text-primary" />
                            Seasonal Produce Calendar
                        </h2>
                        <p className="text-muted">Discover prime ingredients for any month, anywhere in the world.</p>
                    </div>
                     {/* Country Selector */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="bg-light h-12 w-full md:w-56 flex items-center justify-between px-3 rounded-lg border border-medium"
                        >
                        <span className="text-2xl mr-2">{selectedCountry.flag}</span>
                        <span className="font-semibold text-dark flex-grow text-left">{selectedCountry.name}</span>
                        <span className="ml-2 text-xs text-muted">&#9662;</span>
                        </button>
                        {isDropdownOpen && (
                        <div className="absolute top-full mt-2 w-full md:w-72 max-h-60 overflow-y-auto bg-white rounded-lg shadow-lg border z-10">
                            {countries.map(country => (
                            <button
                                type="button"
                                key={country.name}
                                onClick={() => {
                                setSelectedCountry(country);
                                setIsDropdownOpen(false);
                                }}
                                className="flex items-center w-full px-4 py-2 text-left hover:bg-light"
                            >
                                <span className="text-xl mr-3">{country.flag}</span>
                                <span className="flex-grow text-dark">{country.name}</span>
                            </button>
                            ))}
                        </div>
                        )}
                    </div>
                </div>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {months.map(month => (
                        <button
                            key={month}
                            onClick={() => setSelectedMonth(month)}
                            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-black ${
                                selectedMonth === month 
                                ? "bg-black text-white shadow" 
                                : "bg-light text-dark hover:bg-medium border border-medium"
                            }`}
                        >
                            {month}
                        </button>
                    ))}
                </div>
                 {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
            </Card>

            <Card>
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center p-8 min-h-[300px]">
                        <Loader />
                        <p className="mt-4 text-muted">Harvesting data for {selectedMonth} in {selectedCountry.name}...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 min-h-[300px]">
                        {renderProduceList('Fruits', produce.Fruits)}
                        {renderProduceList('Vegetables', produce.Vegetables)}
                        {renderProduceList('Proteins', produce.Proteins)}
                    </div>
                )}
            </Card>
        </div>
    );
};

export default SeasonalCalendar;