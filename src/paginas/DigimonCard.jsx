import React from 'react';

// --- COMPONENTE DigimonCard: Elemento individual reutilizable ---
const DigimonCard = ({ digimon, onSelect, isFavorite, onToggleFavorite }) => (
  <div className="bg-white shadow-xl rounded-xl p-4 m-3 flex flex-col items-center relative transform transition-all duration-300 hover:scale-[1.02] border border-indigo-100 w-full max-w-xs sm:max-w-none">
    {/* Botón de Favoritos */}
    <button
      onClick={() => onToggleFavorite(digimon)}
      className={`absolute top-2 right-2 p-2 rounded-full transition-colors z-10 ${
        isFavorite ? 'text-red-500 hover:text-red-700' : 'text-gray-300 hover:text-red-500'
      } focus:outline-none`}
      aria-label={isFavorite ? 'Quitar de Favoritos' : 'Agregar a Favoritos'}
    >
      <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    </button>
    
    {/* Imagen del Digimon */}
    <img
      src={digimon.img || 'https://placehold.co/150x150/6366f1/ffffff?text=No+Img'}
      alt={digimon.name}
      className="w-32 h-32 object-contain mb-4 rounded-lg bg-gray-50 border border-gray-100"
      loading="lazy"
    />
    {/* Nombre y Nivel */}
    <h3 className="text-xl font-bold text-indigo-700 text-center">{digimon.name}</h3>
    <p className="text-sm text-gray-500 mt-1">Nivel: {digimon.level || 'Desconocido'}</p>
    {/* Botón de Detalles */}
    <button
      onClick={() => onSelect(digimon)}
      className="mt-4 bg-indigo-500 hover:bg-indigo-600 text-white text-sm py-1.5 px-4 rounded-full transition-colors shadow-md hover:shadow-lg"
    >
      Ver Detalles
    </button>
  </div>
);

export default DigimonCard;
