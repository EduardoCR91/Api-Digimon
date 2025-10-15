import React from 'react';

// Constantes integradas para eliminar la dependencia de rutas
const DIGIMON_API_URL = 'https://digimon-api.vercel.app/api/digimon';
const ITEMS_PER_PAGE = 20;

// --- COMPONENTE Information: Información de la App y desarrollador ---
const Information = ({ userId }) => (
  <div className="p-4 md:p-8 max-w-3xl mx-auto">
    <h2 className="text-3xl font-extrabold text-indigo-800 mb-6 border-b pb-2">Información de la Pokedex Digital</h2>
    
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-semibold text-indigo-700 mb-3">Acerca de la Aplicación</h3>
        <p className="text-gray-600">
          Esta aplicación es una interfaz interactiva para explorar la lista de Digimon obtenida de la API pública 
          <a href={DIGIMON_API_URL} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-600 font-medium ml-1 underline">Digimon API</a>. 
          Permite a los usuarios navegar por el catálogo con paginación, buscar criaturas específicas, ver detalles y guardar sus favoritos de forma persistente.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-semibold text-indigo-700 mb-3">Funcionalidades Clave</h3>
        <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
          <li>**Home Paginado:** Muestra {ITEMS_PER_PAGE} Digimon por página.</li>
          <li>**Favoritos Persistentes:** Utiliza **Firestore** para guardar tus favoritos bajo tu ID de usuario.</li>
          <li>**Buscador:** Filtrado en tiempo real por nombre.</li>
          <li>**Estadísticas Originales:** Distribución de Digimon por nivel.</li>
        </ul>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-semibold text-indigo-700 mb-3">Datos del Desarrollador (Simulados)</h3>
        <p className="text-gray-600">
          **Desarrollador:** Carlos Eduardo Cruz, Desarrollador Junior y analista de datos.
        </p>
        <p className="text-gray-600">
          **Contacto:** carlos.cruzr@uniagustiniana.edu.co
        </p>
        <p className="text-sm text-gray-500 mt-4">
            **ID de Usuario Actual (Firestore):** <code className="bg-gray-100 p-1 rounded text-xs break-all">{userId}</code>
        </p>
        <p className="text-xs text-red-500 mt-2">
            Este ID es usado para almacenar tus favoritos de manera privada y colaborativa.
        </p>
      </div>
    </div>
  </div>
);

export default Information;
