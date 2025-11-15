import React, { useState, useEffect } from 'react';
import { getSeasonalProduce } from '../services/geminiService';
import { Card } from './common/Card';
import { Loader } from './common/Loader';
import { Icon } from './common/Icon';
import type { SeasonalProduce } from '../types';


const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
] as const;
type Month = typeof months[number];

const regions = ['North America', 'South America', 'Europe', 'Africa', 'Asia', 'Australia'] as const;
type Region = typeof regions[number];


const initialProduceState: SeasonalProduce = {
    Fruits: [],
    Vegetables: [],
    Proteins: [],
};

const SeasonalCalendar: React.FC = () => {
    const [selectedMonth, setSelectedMonth] = useState<Month>(() =>
        new Date().toLocaleString('default', { month: 'long' }) as Month
    );
    const [selectedRegion, setSelectedRegion] = useState<Region>('North America');
    const [produce, setProduce] = useState<SeasonalProduce>(initialProduceState);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchProduce = async (month: Month, region: Region) => {
        setIsLoading(true);
        setError('');
        setProduce(initialProduceState);
        try {
            const result = await getSeasonalProduce(month, region);
            setProduce(result);
        } catch (err) {
            setError(`Failed to load produce for ${month} in ${region}. Please try again.`);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProduce(selectedMonth, selectedRegion);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMonth, selectedRegion]);

    const renderProduceList = (title: keyof SeasonalProduce, items: string[]) => (
        <div key={title}>
            <h3 className="text-lg font-semibold text-dark mb-3 border-b border-medium pb-2">{title}</h3>
            {items.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                    {items.map((item, index) => (
                        <li key={index} className="bg-light text-dark text-sm font-medium px-3 py-1 rounded-full">
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
        <Card>
            <h2 className="text-xl font-bold text-dark mb-4 flex items-center">
                <Icon name="leaf" className="h-6 w-6 mr-2 text-primary" />
                Seasonal Produce
            </h2>
            <p className="text-muted mb-4">Select a month and region to discover prime fruits, vegetables, and proteins.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                 <div>
                    <label htmlFor="region-select" className="block text-sm font-medium text-muted mb-1">Region</label>
                    <select
                        id="region-select"
                        value={selectedRegion}
                        onChange={(e) => setSelectedRegion(e.target.value as Region)}
                        className="w-full bg-light border border-medium rounded-md p-2 focus:ring-2 focus:ring-black focus:outline-none transition"
                    >
                        {regions.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mb-6">
                {months.map(month => (
                    <button
                        key={month}
                        onClick={() => setSelectedMonth(month)}
                        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-black ${
                            selectedMonth === month
                            ? "bg-black text-white shadow-md"
                            : "bg-light text-dark hover:bg-medium"
                        }`}
                    >
                        {month.substring(0,3)}
                    </button>
                ))}
            </div>
            {error && <p className="text-red-500 mt-4 text-center">{error}</p>}

            {isLoading ? (
                <div className="flex flex-col items-center justify-center p-8 min-h-[200px]">
                    <Loader />
                    <p className="mt-4 text-muted">Harvesting data for {selectedMonth} in {selectedRegion}...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 min-h-[200px]">
                    {renderProduceList('Fruits', produce.Fruits)}
                    {renderProduceList('Vegetables', produce.Vegetables)}
                    {renderProduceList('Proteins', produce.Proteins)}
                </div>
            )}
        </Card>
    );
};

export default SeasonalCalendar;