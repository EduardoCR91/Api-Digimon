import React from 'react';
import DigimonCard from '../components/DigimonCard';

// --- COMPONENTE Favorites: Lista de Digimon guardados ---
const Favorites = ({ favorites, onSelectDigimon, onToggleFavorite }) => {
  const favoriteNames = new Set(favorites.map(f => f.name));

  return (
    <div className="p-4 md:p-8">
      <h2 className="text-3xl font-extrabold text-indigo-800 mb-6 border-b pb-2">Mis Digimon Favoritos ({favorites.length})</h2>
      
      {favorites.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-xl shadow-lg">
          <p className="text-xl text-gray-500 mb-4">Aún no tienes Digimon favoritos.</p>
          <p className="text-md text-gray-400">Agrégalos desde la página principal.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 justify-items-center">
          {favorites.map((digimon) => (
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

export default Favorites;
