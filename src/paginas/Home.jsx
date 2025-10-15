import React, { useState, useEffect, useCallback, createContext, useContext, useMemo } from 'react';
// Importaciones de Firebase para persistencia de Favoritos
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc, onSnapshot, collection, query } from 'firebase/firestore';
import { Heart, Home as HomeIcon, Info, Sliders, Search, ArrowLeft, Loader2 } from 'lucide-react';

// --- 1. CONSTANTES Y UTILIDADES GLOBALES ---

// Global variables provided by the Canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// The Digimon API URL
const DIGIMON_API_URL = 'https://digimon-api.vercel.app/api/digimon';
const ITEMS_PER_PAGE = 20; // Constante de paginación integrada

// Page Constants for Navigation
const PAGES = {
  HOME: 'Home',
  DETAILS: 'Detalles',
  FAVORITES: 'Favoritos',
  INFO: 'Información',
  ORIGINAL_STATS: 'Original',
  SEARCH: 'Buscar',
};

// --- 2. HOOKS DE ESTADO Y FIREBASE ---

/**
 * Custom hook for Firebase initialization and authentication.
 */
const useFirebase = () => {
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    if (Object.keys(firebaseConfig).length === 0) {
      setIsAuthReady(true);
      return;
    }

    try {
      const app = initializeApp(firebaseConfig);
      const firestoreDb = getFirestore(app);
      const firebaseAuth = getAuth(app);

      setDb(firestoreDb);

      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (!user) {
          try {
            if (initialAuthToken) {
              await signInWithCustomToken(firebaseAuth, initialAuthToken);
            } else {
              await signInAnonymously(firebaseAuth);
            }
          } catch (e) {
            console.error("Error signing in:", e);
          }
        }
        if (firebaseAuth.currentUser) {
          setUserId(firebaseAuth.currentUser.uid);
        } else {
            setUserId(crypto.randomUUID());
        }
        setIsAuthReady(true);
      });

      return () => unsubscribe();
    } catch (e) {
      console.error("Firebase Initialization Error:", e);
      setIsAuthReady(true); 
    }
  }, []);

  return { db, userId, isAuthReady };
};

// --- 3. CONTEXTS ---

const DigimonContext = createContext();

// --- 4. HOOK PRINCIPAL DE LÓGICA DE LA APLICACIÓN ---
const useDigimonManager = (db, userId, isAuthReady) => {
  const [currentPage, setCurrentPage] = useState(PAGES.HOME);
  const [digimonList, setDigimonList] = useState([]);
  const [favorites, setFavorites] = useState({}); // { name: DigimonObject }
  const [selectedDigimon, setSelectedDigimon] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // --- API Fetching ---
  useEffect(() => {
    const fetchDigimons = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(DIGIMON_API_URL);
        if (!response.ok) throw new Error('Error al cargar Digimon');
        const data = await response.json();
        setDigimonList(data);
      } catch (error) {
        console.error("Error fetching Digimon:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDigimons();
  }, []);

  // --- Firestore Favorites Management (onSnapshot) ---
  const favoritesCollectionRef = db && userId
    ? collection(db, `artifacts/${appId}/users/${userId}/favorites`)
    : null;

  useEffect(() => {
    if (!db || !userId || !isAuthReady) return;

    const q = query(favoritesCollectionRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newFavorites = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        newFavorites[data.name] = { ...data, id: doc.id };
      });
      setFavorites(newFavorites);
    }, (error) => {
      console.error("Error fetching real-time favorites:", error);
    });

    return () => unsubscribe();
  }, [db, userId, isAuthReady, favoritesCollectionRef]);

  // Function to toggle favorite status
  const toggleFavorite = useCallback(async (digimon) => {
    if (!db || !userId) {
      console.error("Authentication not ready. Cannot save favorites.");
      return;
    }
    const isCurrentlyFavorite = !!favorites[digimon.name];

    try {
      if (isCurrentlyFavorite) {
        // Remove from favorites
        const favoriteDocId = favorites[digimon.name].name; // Usamos el nombre como ID de documento
        await deleteDoc(doc(favoritesCollectionRef, favoriteDocId));
      } else {
        // Add to favorites
        // Usamos el nombre como ID de documento para prevenir duplicados.
        await setDoc(doc(favoritesCollectionRef, digimon.name), {
          name: digimon.name,
          img: digimon.img,
          level: digimon.level,
        });
      }
    } catch (e) {
      console.error("Error toggling favorite:", e);
    }
  }, [db, userId, favorites, favoritesCollectionRef]);

  // --- Navigation & Search Handlers ---
  const navigateTo = useCallback((page, digimon = null) => {
    setCurrentPage(page);
    if (digimon) {
      setSelectedDigimon(digimon);
    } else if (page !== PAGES.DETAILS) {
      setSelectedDigimon(null);
    }
  }, []);
  
  // Lista filtrada basada en el término de búsqueda
  const filteredList = useMemo(() => {
    if (!searchTerm) return digimonList;
    const lowerTerm = searchTerm.toLowerCase();
    return digimonList.filter(d =>
      d.name.toLowerCase().includes(lowerTerm) ||
      d.level.toLowerCase().includes(lowerTerm)
    );
  }, [digimonList, searchTerm]);

  const handleSearch = (term) => {
    setSearchTerm(term);
    if (term) {
      navigateTo(PAGES.SEARCH);
    } else {
      navigateTo(PAGES.HOME);
    }
  };

  return {
    currentPage,
    digimonList,
    filteredList,
    favorites,
    selectedDigimon,
    isLoading,
    searchTerm,
    userId,
    isAuthReady,
    navigateTo,
    handleSearch,
    toggleFavorite,
  };
};


// --- 5. COMPONENTES DE UI ---

/**
 * COMPONENTE Navbar
 */
const Navbar = () => {
  const { navigateTo, currentPage, handleSearch, searchTerm } = useContext(DigimonContext);

  const navItems = [
    { name: PAGES.HOME, icon: HomeIcon, page: PAGES.HOME },
    { name: PAGES.FAVORITES, icon: Heart, page: PAGES.FAVORITES },
    { name: PAGES.ORIGINAL_STATS, icon: Sliders, page: PAGES.ORIGINAL_STATS },
    { name: PAGES.INFO, icon: Info, page: PAGES.INFO },
  ];

  return (
    <nav className="bg-indigo-700 p-4 shadow-lg sticky top-0 z-10">
      <div className="flex flex-col sm:flex-row justify-between items-center max-w-7xl mx-auto">
        {/* Logo/Title */}
        <div className="text-white text-3xl font-extrabold mb-3 sm:mb-0 cursor-pointer" onClick={() => navigateTo(PAGES.HOME)}>
          Digi<span className="text-yellow-400">Pokedex</span>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-1/3 mr-0 sm:mr-4 mb-3 sm:mb-0">
          <input
            type="text"
            placeholder="Buscar por nombre o nivel..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full p-2 pl-10 rounded-full text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-shadow"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        </div>

        {/* Navigation Links */}
        <div className="flex space-x-2 sm:space-x-4">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => navigateTo(item.page)}
              className={`flex items-center text-sm font-medium py-2 px-3 rounded-full transition duration-150 ${currentPage === item.page
                ? 'bg-indigo-500 text-white shadow-md'
                : 'text-indigo-200 hover:bg-indigo-600 hover:text-white'
                }`}
            >
              <item.icon size={18} className="mr-1 hidden sm:inline" />
              {item.name}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

/**
 * COMPONENTE DigimonCard
 */
const DigimonCard = ({ digimon, navigateTo, toggleFavorite, isFavorite }) => (
  <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl p-4 flex flex-col items-center hover:shadow-2xl transition-shadow duration-300 transform hover:scale-[1.02] cursor-pointer border-t-4 border-indigo-500/80">
    <div className="relative w-full h-32 mb-3" onClick={() => navigateTo(PAGES.DETAILS, digimon)}>
      <img
        src={digimon.img || 'https://placehold.co/128x128/3f51b5/ffffff?text=No+Img'}
        alt={digimon.name}
        className="w-full h-full object-contain rounded-lg"
      />
    </div>
    <div className="text-center w-full">
      <h3 className="font-extrabold text-lg text-indigo-800 truncate">{digimon.name}</h3>
      <p className="text-sm text-gray-600 capitalize font-medium">{digimon.level}</p>
    </div>
    <button
      onClick={(e) => { e.stopPropagation(); toggleFavorite(digimon); }}
      className={`mt-2 p-2 rounded-full transition-colors duration-200 ${isFavorite ? 'text-red-500 hover:text-red-700 bg-red-100' : 'text-gray-400 hover:text-red-500 hover:bg-gray-100'}`}
      aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
    >
      <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
    </button>
  </div>
);

/**
 * COMPONENTE de Paginación para Home
 */
const Paginator = ({ currentPage, totalPages, goToPage }) => (
    <div className="flex justify-center items-center mt-8 space-x-2">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 border border-indigo-300 rounded-full bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
        >
          <ArrowLeft size={20} className="text-indigo-600" />
        </button>
        
        <span className="text-gray-700 font-medium">Página {currentPage} de {totalPages}</span>

        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 border border-indigo-300 rounded-full bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
        >
          <ArrowLeft size={20} className="text-indigo-600 transform rotate-180" />
        </button>
      </div>
);

// --- 6. COMPONENTES DE PÁGINA (Vistas) ---

/**
 * PÁGINA Home: Catálogo principal con paginación.
 */
const Home = () => {
  const { digimonList, favorites, navigateTo, toggleFavorite, isLoading } = useContext(DigimonContext);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(digimonList.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentDigimons = digimonList.slice(startIndex, endIndex);

  const favoriteNames = new Set(Object.keys(favorites));

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(totalPages, page)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  if (isLoading) {
    return <div className="text-center p-20 text-indigo-500 font-semibold"><Loader2 className="animate-spin inline mr-2" /> Cargando índice Digimon...</div>;
  }

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-3xl font-bold text-indigo-700 mb-6 border-b-2 border-indigo-200 pb-2">Catálogo Principal</h2>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {currentDigimons.map((digimon) => (
          <DigimonCard
            key={digimon.name}
            digimon={digimon}
            navigateTo={navigateTo}
            toggleFavorite={toggleFavorite}
            isFavorite={favoriteNames.has(digimon.name)}
          />
        ))}
      </div>

      <Paginator currentPage={currentPage} totalPages={totalPages} goToPage={goToPage} />
    </div>
  );
};

/**
 * PÁGINA Details: Muestra información de un Digimon.
 */
const Details = () => {
  const { selectedDigimon, navigateTo, favorites, toggleFavorite } = useContext(DigimonContext);

  if (!selectedDigimon) {
    return (
      <div className="text-center p-12">
        <p className="text-gray-600 mb-4">No se ha seleccionado ningún Digimon.</p>
        <button
          onClick={() => navigateTo(PAGES.HOME)}
          className="bg-indigo-500 text-white py-2 px-4 rounded-lg shadow-md hover:bg-indigo-600 transition duration-150 flex items-center mx-auto"
        >
          <ArrowLeft size={20} className="mr-2" /> Volver al Home
        </button>
      </div>
    );
  }

  const isFavorite = !!favorites[selectedDigimon.name];

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <button
        onClick={() => navigateTo(PAGES.HOME)}
        className="text-indigo-600 hover:text-indigo-800 flex items-center mb-6 font-medium transition duration-150"
      >
        <ArrowLeft size={18} className="mr-1" /> Volver al Home
      </button>

      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border-t-8 border-indigo-500">
        <div className="md:flex">
          <div className="md:w-1/2 p-6 flex flex-col items-center justify-center bg-indigo-50/50">
            <img
              src={selectedDigimon.img || 'https://placehold.co/300x300/3f51b5/ffffff?text=No+Img'}
              alt={selectedDigimon.name}
              className="max-w-full h-auto max-h-80 object-contain rounded-lg shadow-lg"
            />
            <h1 className="text-4xl font-extrabold text-indigo-800 mt-4">{selectedDigimon.name}</h1>
            <p className="text-xl text-gray-700 capitalize font-semibold mt-1">Nivel: {selectedDigimon.level}</p>

            <button
              onClick={() => toggleFavorite(selectedDigimon)}
              className={`mt-4 py-2 px-4 rounded-full text-lg font-semibold transition-colors duration-300 flex items-center shadow-md ${isFavorite ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              <Heart size={20} className="mr-2" fill={isFavorite ? "currentColor" : "none"} /> 
              {isFavorite ? 'Quitar de Favoritos' : 'Agregar a Favoritos'}
            </button>
          </div>

          <div className="md:w-1/2 p-6 md:p-8">
            <h2 className="text-2xl font-bold text-indigo-700 mb-4 border-b pb-2">Detalles del Digimon</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-medium text-gray-600">Nivel de Evolución:</span>
                <span className="font-semibold text-indigo-600 capitalize">{selectedDigimon.level}</span>
              </div>
              <p className="text-gray-700 pt-2 italic">
                (Información adicional no disponible en la API actual: Stats, Tipo, Evoluciones.)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * PÁGINA Favorites: Lista de Digimon favoritos.
 */
const Favorites = () => {
  const { favorites, navigateTo, toggleFavorite, isLoading } = useContext(DigimonContext);
  const favoriteList = Object.values(favorites);
  const favoriteNames = new Set(Object.keys(favorites));

  if (isLoading) {
    return <div className="text-center p-20 text-indigo-500 font-semibold"><Loader2 className="animate-spin inline mr-2" /> Cargando favoritos...</div>;
  }
  
  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-3xl font-bold text-red-600 mb-6 border-b-2 border-red-300 pb-2 flex items-center">
        <Heart fill="currentColor" className="mr-3" /> Mis Digimon Favoritos ({favoriteList.length})
      </h2>
      
      {favoriteList.length === 0 ? (
        <div className="text-center p-12 bg-red-50 rounded-xl border border-red-200 text-red-700 text-lg font-medium">
          ¡Aún no tienes Digimon favoritos! Agrégalos desde la página Home.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {favoriteList.map((digimon) => (
            <DigimonCard
              key={digimon.name}
              digimon={digimon}
              navigateTo={navigateTo}
              toggleFavorite={toggleFavorite}
              isFavorite={favoriteNames.has(digimon.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * PÁGINA Information: Datos de la app y desarrollador.
 */
const Information = () => {
  const { userId } = useContext(DigimonContext);
  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto bg-white rounded-xl shadow-xl mt-8">
      <h2 className="text-3xl font-bold text-indigo-700 mb-4 border-b pb-2 flex items-center">
        <Info className="mr-3" /> Información de la Aplicación
      </h2>
      
      <div className="space-y-4">
        <p className="text-gray-700">
          Esta Pokedex digital ha sido creada utilizando **React** y **Firebase Firestore** para la persistencia de datos. Utiliza la API pública de Digimon para obtener el catálogo completo.
        </p>
        <h3 className="text-xl font-semibold text-indigo-600 pt-2">Datos de Desarrollo:</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
          <li>**Desarrollador:** Gemini (Modelo de IA)</li>
          <li>**Fuente de Datos:** <a href={DIGIMON_API_URL} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">Digimon API</a></li>
          <li>**Persistencia:** Firebase Firestore (Favoritos)</li>
        </ul>
        <div className="mt-6 p-4 bg-gray-100 rounded-lg border border-gray-300">
          <p className="font-medium text-gray-800">ID de Usuario Actual (para Firestore):</p>
          <code className="block break-all text-sm text-indigo-800 mt-1">{userId || 'Autenticando...'}</code>
        </div>
      </div>
    </div>
  );
};

/**
 * PÁGINA Original: Función novedosa (Estadísticas de Nivel).
 */
const OriginalStats = () => {
  const { digimonList } = useContext(DigimonContext);

  // Calcular la distribución de niveles
  const levelCounts = useMemo(() => {
    return digimonList.reduce((acc, digimon) => {
      const level = digimon.level || 'Desconocido';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {});
  }, [digimonList]);

  // Ordenar por cantidad descendente y determinar el máximo
  const levels = Object.entries(levelCounts).sort(([, a], [, b]) => b - a);
  const maxCount = levels.length > 0 ? levels[0][1] : 1;
  const totalDigimons = digimonList.length;

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto bg-white rounded-xl shadow-xl mt-8">
      <h2 className="text-3xl font-bold text-indigo-700 mb-4 border-b pb-2 flex items-center">
        <Sliders className="mr-3" /> Original: Distribución de Digimon por Nivel
      </h2>
      
      <p className="text-lg text-gray-600 mb-6">
        Análisis de los {totalDigimons} Digimon:
      </p>

      <div className="space-y-4">
        {levels.map(([level, count]) => {
          const percentage = ((count / maxCount) * 100).toFixed(1);
          const overallPercentage = ((count / totalDigimons) * 100).toFixed(1);

          return (
            <div key={level} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-indigo-600">{level}</span>
                <span className="text-sm text-gray-700">{count} Digimon ({overallPercentage}%)</span>
              </div>
              {/* Barra de Progreso relativa al nivel más común */}
              <div className="w-full bg-indigo-200 rounded-full h-3">
                <div
                  className="bg-indigo-500 h-3 rounded-full transition-all duration-500 ease-out shadow-md"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * PÁGINA Search: Buscador de Digimon.
 */
const SearchPage = () => {
  const { filteredList, searchTerm, navigateTo, favorites, toggleFavorite, isLoading } = useContext(DigimonContext);
  const favoriteNames = new Set(Object.keys(favorites));
  
  if (isLoading) {
    return <div className="text-center p-20 text-indigo-500 font-semibold"><Loader2 className="animate-spin inline mr-2" /> Cargando índice Digimon...</div>;
  }

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-3xl font-bold text-indigo-700 mb-6 border-b-2 border-indigo-200 pb-2">Resultados de Búsqueda</h2>
      
      {searchTerm && filteredList.length > 0 && (
        <p className="text-lg text-gray-600 mb-4">
          Mostrando {filteredList.length} resultados para "<span className="font-bold text-indigo-600">{searchTerm}</span>".
        </p>
      )}

      {searchTerm && filteredList.length === 0 ? (
        <div className="text-xl text-red-500 text-center p-12 bg-white rounded-xl shadow-lg border border-red-300">
          No se encontraron Digimon con el término de búsqueda.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredList.map((digimon) => (
            <DigimonCard
              key={digimon.name}
              digimon={digimon}
              navigateTo={navigateTo}
              toggleFavorite={toggleFavorite}
              isFavorite={favoriteNames.has(digimon.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * RENDERIZADOR DE PÁGINA (Simula el router)
 */
const PageRenderer = () => {
  const { currentPage } = useContext(DigimonContext);

  switch (currentPage) {
    case PAGES.HOME:
      return <Home />;
    case PAGES.DETAILS:
      return <Details />;
    case PAGES.FAVORITES:
      return <Favorites />;
    case PAGES.INFO:
      return <Information />;
    case PAGES.ORIGINAL_STATS:
      return <OriginalStats />;
    case PAGES.SEARCH:
      return <SearchPage />;
    default:
      return <Home />;
  }
};

// --- 7. COMPONENTE PRINCIPAL (App) ---

const AppContent = () => {
  const { db, userId, isAuthReady } = useFirebase();
  const digimonManager = useDigimonManager(db, userId, isAuthReady);

  return (
    <DigimonContext.Provider value={digimonManager}>
      <div className="min-h-screen bg-gray-100 font-sans">
        <Navbar />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <PageRenderer />
        </main>
        <footer className="bg-gray-800 text-white text-center p-4 mt-10">
          <p className="text-sm">DigiPokedex App - Desarrollado con React y Firestore.</p>
          <p className="text-xs mt-1 text-gray-400">ID de Sesión: {digimonManager.userId || 'Cargando...'}</p>
        </footer>
      </div>
    </DigimonContext.Provider>
  );
};

export default function App() {
  // Carga de Tailwind y fuente Inter para el entorno de un solo archivo
  return (
    <>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap');
          body { font-family: 'Inter', sans-serif; }
        `}
      </style>
      <AppContent />
    </>
  );
};
