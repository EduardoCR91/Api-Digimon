import React from 'react';
// IMPORTACIÓN DE CONSTANTES ELIMINADA para evitar el error de resolución de módulos.

// Definición local de las páginas para que el componente sea autocontenido.
const PAGES = {
  HOME: 'Home',
  DETAILS: 'Detalles',
  FAVORITES: 'Favoritos',
  INFO: 'Información',
  ORIGINAL: 'Original',
  SEARCH: 'Buscar',
};

// --- COMPONENTE Navbar: Navegación de la aplicación ---
const Navbar = ({ currentPage, onNavigate }) => {
  return (
    <nav className="bg-indigo-700 shadow-xl sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <span className="text-white text-2xl font-black tracking-wider">
              Digi<span className="text-yellow-400">Pokedex</span>
            </span>
          </div>
          {/* Menú de Navegación */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {Object.values(PAGES).map((page) => (
                <button
                  key={page}
                  onClick={() => onNavigate(page)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-indigo-800 text-white shadow-lg'
                      : 'text-indigo-200 hover:bg-indigo-600 hover:text-white'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
