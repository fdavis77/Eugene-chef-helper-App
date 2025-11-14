import React, { useState, useEffect } from 'react';
import { getSeasonalProduce } from '../services/geminiService';
import { Card } from './common/Card';
import { Loader } from './common/Loader';
import { Icon } from './common/Icon';


const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'] as const;
type Season = typeof seasons[number];

const SeasonalCalendar: React.FC = () => {
    const [selectedSeason, setSelectedSeason] = useState<Season>('Spring');
    const [produce, setProduce] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchProduce = async (season: Season) => {
        setIsLoading(true);
        setError('');
        setProduce('');
        try {
            const result = await getSeasonalProduce(season);
            setProduce(result);
        } catch (err) {
            setError(`Failed to load produce for ${season}. Please try again.`);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProduce(selectedSeason);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSeason]);

    return (
        <div className="space-y-6">
            <Card>
                <h2 className="text-xl font-semibold text-blue-400 mb-4 flex items-center">
                    <Icon name="leaf" className="h-6 w-6 mr-2" />
                    Seasonal Produce Calendar
                </h2>
                <p className="text-gray-400 mb-4">Select a season to discover prime fruits, vegetables, and proteins.</p>
                <div className="flex justify-center space-x-2 p-1 bg-gray-800 rounded-lg">
                    {seasons.map(season => (
                        <button
                            key={season}
                            onClick={() => setSelectedSeason(season)}
                            className={`px-4 py-2 text-sm sm:px-6 sm:py-2 font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-gray-800 focus:ring-blue-500 ${
                                selectedSeason === season 
                                ? "bg-blue-500 text-white shadow-md" 
                                : "text-gray-300 hover:bg-gray-600"
                            }`}
                        >
                            {season}
                        </button>
                    ))}
                </div>
                 {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
            </Card>

            <Card>
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center p-8 min-h-[300px]">
                        <Loader />
                        <p className="mt-4 text-gray-400">Harvesting data for {selectedSeason}...</p>
                    </div>
                ) : (
                    produce && <pre className="whitespace-pre-wrap font-sans bg-gray-800 p-4 rounded-md text-gray-300 min-h-[300px]">{produce}</pre>
                )}
            </Card>
        </div>
    );
};

export default SeasonalCalendar;