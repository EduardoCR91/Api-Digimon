import React from 'react';

// --- COMPONENTE Details: Muestra información específica de un Digimon ---
const Details = ({ digimon, onGoHome }) => {
  if (!digimon) {
    return (
      <div className="p-8 text-center">
        <p className="text-xl text-red-500">No se ha seleccionado ningún Digimon.</p>
        <button onClick={onGoHome} className="mt-4 bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-6 rounded-lg transition-colors">Volver al Home</button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 flex flex-col items-center">
      <h2 className="text-4xl font-extrabold text-indigo-800 mb-6">{digimon.name}</h2>
      
      <div className="bg-white shadow-2xl rounded-2xl p-6 w-full max-w-lg flex flex-col md:flex-row items-center">
        <img
          src={digimon.img || 'https://placehold.co/200x200/6366f1/ffffff?text=No+Img'}
          alt={digimon.name}
          className="w-48 h-48 object-contain mb-6 md:mb-0 md:mr-6 rounded-lg bg-gray-50 border border-gray-100 p-2"
        />
        <div className="text-left w-full">
          <p className="text-lg font-semibold text-gray-700">
            <span className="text-indigo-600">Nivel:</span> {digimon.level || 'Desconocido'}
          </p>
          <p className="text-sm text-gray-500 mt-2 italic">
            "Este Digimon es un ser digital con características y habilidades únicas. Proviene del Mundo Digital."
          </p>
          <ul className="mt-4 space-y-2 text-sm text-gray-600">
            <li><span className="font-semibold text-indigo-500">Tipo:</span> Digital Monster</li>
            <li><span className="font-semibold text-indigo-500">Etimología:</span> (Información no disponible en la API actual)</li>
          </ul>
          <button onClick={onGoHome} className="mt-6 bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-6 rounded-lg transition-colors w-full md:w-auto">
            Volver
          </button>
        </div>
      </div>
    </div>
  );
};

export default Details;
