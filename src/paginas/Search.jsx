import React, { useState, useMemo } from 'react';
import DigimonCard from '../components/DigimonCard';
import { ITEMS_PER_PAGE } from '../utils/Constants';

// --- COMPONENTE Search: Buscador de Digimon ---
const Search = ({ digimons, favorites, onSelectDigimon, onToggleFavorite }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar los Digimon en base al término de búsqueda
  const filteredDigimons = useMemo(() => {
    if (!searchTerm) return [];
    const lowerCaseSearch = searchTerm.toLowerCase();
    return digimons.filter(digimon => 
      digimon.name.toLowerCase().includes(lowerCaseSearch)
    ).slice(0, ITEMS_PER_PAGE * 2); // Limitar resultados para no sobrecargar (máx 40)
  }, [digimons, searchTerm]);

  const favoriteNames = new Set(favorites.map(f => f.name));

  return (
    <div className="p-4 md:p-8">
      <h2 className="text-3xl font-extrabold text-indigo-800 mb-6 border-b pb-2">Buscar Digimon</h2>
      
      <input
        type="text"
        placeholder="Escribe el nombre del Digimon..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full p-3 border-2 border-indigo-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-lg mb-8 shadow-sm"
      />

      {searchTerm && filteredDigimons.length > 0 && (
        <p className="text-lg text-gray-600 mb-4">
          Resultados encontrados: <span className="font-bold text-indigo-600">{filteredDigimons.length}</span> (mostrando hasta 40)
        </p>
      )}

      {searchTerm && filteredDigimons.length === 0 ? (
        <p className="text-xl text-red-500 text-center p-12 bg-white rounded-xl shadow-lg">
          No se encontraron Digimon con el nombre "{searchTerm}".
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 justify-items-center">
          {filteredDigimons.map((digimon) => (
            <DigimonCard
              key={digimon.name}
              digimon={digimon}
              onSelect={onSelectDigimon}
              isFavorite={favoriteNames.has(digimon.name)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Search;
