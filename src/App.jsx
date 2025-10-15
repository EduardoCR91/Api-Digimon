import React, { useState, useEffect, useCallback, useMemo } from 'react';
// Importaciones de Firebase (necesarias para la persistencia)
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc, onSnapshot, collection } from 'firebase/firestore';
import './App.css'

// --- CONSTANTES Y UTILIDADES (Integradas para evitar errores de importación) ---
const PAGES = {
  HOME: 'Home',
  DETAILS: 'Detalles',
  FAVORITES: 'Favoritos',
  INFO: 'Informacion',
  ORIGINAL: 'Original',
  SEARCH: 'Buscar',
};
const DIGIMON_API_URL = 'https://digimon-api.vercel.app/api/digimon';
const ITEMS_PER_PAGE = 20;
const PLACEHOLDER_IMG = 'https://placehold.co/128x128/3f51b5/ffffff?text=DIGIMON';

// --- CONFIGURACIÓN DE FIREBASE Y VARIABLES GLOBALES ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-digimon-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- ICONOS (Usando SVGs inline para evitar dependencias de Lucide) ---
const HeartIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={props.fill || "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
  </svg>
);
const SearchIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);
const ChevronLeftIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);
const ChevronRightIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

// --- COMPONENTE: DigimonCard (Tarjeta reutilizable) ---
const DigimonCard = ({ digimon, onSelect, onToggleFavorite, isFavorite }) => {
  const getLevelColor = (level) => {
    switch (level) {
      case 'Fresh': return 'bg-level-fresh';
      case 'In Training': return 'bg-level-in-training';
      case 'Rookie': return 'bg-level-rookie';
      case 'Champion': return 'bg-level-champion';
      case 'Ultimate': return 'bg-level-ultimate';
      case 'Mega': return 'bg-level-mega';
      default: return 'bg-level-default';
    }
  };

  const levelColor = getLevelColor(digimon.level);

  return (
    <div className="digimon-card" >
      <div onClick={() => onSelect(digimon)}>
        {/* Digimon Image */}
        <div className="card-image-wrapper">
          <img
            src={digimon.img || PLACEHOLDER_IMG}
            alt={digimon.name}
            onError={(e) => { e.target.onerror = null; e.target.src = PLACEHOLDER_IMG; }}
            className="card-image"
            loading="lazy"
          />
        </div>
        
        {/* Name and Level */}
        <h3 className="card-title">{digimon.name}</h3>
        <span className={`level-tag ${levelColor}`}>
          {digimon.level}
        </span>
      </div>

      {/* Favorite Button */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(digimon); }}
        className={`mt-3 p-2 rounded-full transition-colors duration-200 shadow-md ${isFavorite ? 'text-[var(--color-danger)] hover:text-[var(--color-danger)] bg-[var(--color-danger-light)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] hover:bg-gray-100'}`}
        aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      >
        <HeartIcon size={20} fill={isFavorite ? "currentColor" : "none"} />
      </button>
    </div>
  );
};

// --- COMPONENTE: Navbar (Navegación) ---
const Navbar = ({ currentPage, onNavigate }) => {
  const navItems = [PAGES.HOME, PAGES.FAVORITES, PAGES.SEARCH, PAGES.ORIGINAL, PAGES.INFO];

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div>
            <span className="text-xl font-bold cursor-pointer text-white" onClick={() => onNavigate(PAGES.HOME)}>
              DigiPokedex
            </span>
        </div>
        <div>
            {navItems.map((page) => (
              <button
                key={page}
                onClick={() => onNavigate(page)}
                className={`nav-button ${currentPage === page ? 'active' : ''}`}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
    </nav>
  );
};


// --- PÁGINA: Home ---
const Home = ({ digimons, favorites, onSelectDigimon, onToggleFavorite }) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Lógica de Paginación
  const totalDigimons = digimons.length;
  const totalPages = Math.ceil(totalDigimons / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentDigimons = digimons.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const isFavorite = useCallback((digimon) => 
    favorites.some(f => f.name === digimon.name)
  , [favorites]);

  const renderPaginationControls = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (endPage - startPage + 1 < 5) {
        if (startPage > 1) startPage = Math.max(1, endPage - 4);
        if (endPage < totalPages) endPage = Math.min(totalPages, startPage + 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
    }

    const PageButton = ({ page, children, isActive = false, isDisabled = false, onClick }) => (
        <button
            onClick={onClick}
            disabled={isDisabled}
            className={`page-button ${isActive ? 'active' : ''}`}
        >
            {children || page}
        </button>
    );

    return (
        <div className="pagination-controls">
            <PageButton isDisabled={currentPage === 1} onClick={() => goToPage(1)}>Inicio</PageButton>
            <PageButton isDisabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)}>
                <ChevronLeftIcon className="w-4 h-4" />
            </PageButton>

            {startPage > 1 && <span className="text-gray-500">...</span>}

            {pageNumbers.map(page => (
                <PageButton key={page} page={page} isActive={page === currentPage} onClick={() => goToPage(page)} />
            ))}

            {endPage < totalPages && <span className="text-gray-500">...</span>}

            <PageButton isDisabled={currentPage === totalPages} onClick={() => goToPage(currentPage + 1)}>
                <ChevronRightIcon className="w-4 h-4" />
            </PageButton>
            <PageButton isDisabled={currentPage === totalPages} onClick={() => goToPage(totalPages)}>Fin</PageButton>
        </div>
    );
  };

  return (
    <div className="p-4 md:p-8">
      <h2 className="page-title">Catálogo de Digimon (Página {currentPage})</h2>
      
      <p className="page-subtitle">
        Mostrando {startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, totalDigimons)} de {totalDigimons} Digimon.
      </p>

      <div className="digimon-grid">
        {currentDigimons.map((digimon) => (
          <DigimonCard
            key={digimon.name}
            digimon={digimon}
            onSelect={onSelectDigimon}
            isFavorite={isFavorite(digimon)}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
      
      {renderPaginationControls()}
    </div>
  );
};

// --- PÁGINA: Details (Detalles) ---
const Details = ({ digimon, onGoHome }) => {
  if (!digimon) {
    return (
      <div className="details-card text-center">
        <p className="text-xl text-[var(--color-danger)] mb-4">No se ha seleccionado ningún Digimon.</p>
        <button onClick={onGoHome} className="page-button">
          Volver al Home
        </button>
      </div>
    );
  }

  const getLevelColor = (level) => {
    switch (level) {
      case 'Fresh': return 'details-level-fresh';
      case 'In Training': return 'details-level-in-training';
      case 'Rookie': return 'details-level-rookie';
      case 'Champion': return 'details-level-champion';
      case 'Ultimate': return 'details-level-ultimate';
      case 'Mega': return 'details-level-mega';
      default: return 'details-level-default';
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <button 
        onClick={onGoHome} 
        className="mb-6 flex items-center text-[var(--color-accent)] hover:text-[var(--color-accent-dark)] transition font-medium"
      >
        <ChevronLeftIcon className="w-5 h-5 mr-1" /> Volver al Catálogo
      </button>

      <div className="details-card">
        
        {/* Imagen */}
        <div className="md:w-1/3 flex-shrink-0">
          <div className="w-48 h-48 md:w-full md:h-64 mx-auto bg-[var(--color-bg)] rounded-full overflow-hidden border-4 border-[var(--color-accent-light)] shadow-xl">
            <img
              src={digimon.img || PLACEHOLDER_IMG}
              alt={digimon.name}
              className="card-image p-4"
              onError={(e) => { e.target.onerror = null; e.target.src = PLACEHOLDER_IMG; }}
            />
          </div>
        </div>

        {/* Detalles */}
        <div className="md:w-2/3 text-center md:text-left">
          <h2 className="text-4xl font-black text-[var(--color-text-primary)] mb-4">{digimon.name}</h2>
          
          <div className={`inline-block px-4 py-1 text-lg font-bold rounded-full shadow-md ${getLevelColor(digimon.level)} capitalize mb-4`}>
            Nivel: {digimon.level}
          </div>

          <p className="text-[var(--color-text-secondary)] text-base leading-relaxed mt-4">
            Este es un Digimon de nivel **{digimon.level}**. Aunque la API no proporciona una descripción detallada, sabemos que cada Digimon es único en el Mundo Digital, poseyendo habilidades y formas que evolucionan a través de la batalla y el vínculo con su Tamer.
          </p>
          
          <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
            <p className="text-sm text-[var(--color-text-secondary)] italic">
              **Nota:** Los datos adicionales (tipo, atributo, etc.) no están disponibles en esta versión de la API.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- PÁGINA: Favorites (Favoritos) ---
const Favorites = ({ favorites, onSelectDigimon, onToggleFavorite }) => {
  const isFavorite = useCallback((digimon) => 
    favorites.some(f => f.name === digimon.name)
  , [favorites]);

  return (
    <div className="p-4 md:p-8">
      <h2 className="page-title flex items-center">
        <HeartIcon className="w-7 h-7 mr-3 text-[var(--color-danger)] fill-[var(--color-danger)]" /> Mis Digimon Favoritos ({favorites.length})
      </h2>
      
      {favorites.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-lg text-center text-[var(--color-text-secondary)]">
          <p className="text-xl font-medium text-[var(--color-text-primary)]">¡Parece que aún no tienes favoritos!</p>
          <p className="mt-2">Añade Digimon a tus favoritos desde la página Home o Búsqueda.</p>
        </div>
      ) : (
        <div className="digimon-grid">
          {favorites.map((digimon) => (
            <DigimonCard
              key={digimon.name}
              digimon={digimon}
              onSelect={onSelectDigimon}
              isFavorite={isFavorite(digimon)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// --- PÁGINA: Information (Información) ---
const Information = ({ userId }) => {
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <h2 className="page-title">Información de la Pokedex Digital</h2>
      
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold text-[var(--color-accent-dark)] mb-3">Acerca de la Aplicación</h3>
          <p className="text-[var(--color-text-secondary)]">
            Esta aplicación es una interfaz interactiva para explorar la lista de Digimon obtenida de la API pública 
            <a href={DIGIMON_API_URL} target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent)] hover:text-[var(--color-accent-dark)] font-medium ml-1 underline">Digimon API</a>. 
            Permite navegar, buscar y guardar favoritos de forma persistente.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold text-[var(--color-accent-dark)] mb-3">Datos del Desarrollador</h3>
          <p className="text-[var(--color-text-secondary)]">
            **Desarrollador:** Gemini, el Modelo de Lenguaje Grande.
          </p>
          <p className="text-[var(--color-text-secondary)]">
            **Contacto:** contact@codespace-apps.com
          </p>
          <p className="text-sm text-[var(--color-text-secondary)] mt-4">
              **ID de Usuario (Firestore):** <code className="bg-[var(--color-bg)] p-1 rounded text-xs break-all">{userId || 'Cargando...'}</code>
          </p>
          <p className="text-xs text-[var(--color-danger)] mt-2">
              Este ID se usa para almacenar tus favoritos en Firestore.
          </p>
        </div>
      </div>
    </div>
  );
};

// --- PÁGINA: OriginalStats (Función Novedosa: Estadísticas por Nivel) ---
const OriginalStats = ({ digimons }) => {
  // 1. Calcular la distribución de Digimon por nivel
  const levelDistribution = useMemo(() => {
    const distribution = digimons.reduce((acc, digimon) => {
      const level = digimon.level || 'Unknown';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {});
    
    // Convertir a array de objetos y ordenar (opcional)
    return Object.entries(distribution)
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => b.count - a.count);
  }, [digimons]);

  // 2. Encontrar el conteo máximo para el cálculo de la barra de porcentaje
  const maxCount = levelDistribution.length > 0 ? Math.max(...levelDistribution.map(d => d.count)) : 0;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h2 className="page-title">Distribución de Digimon por Nivel</h2>
      
      <p className="page-subtitle">
        Esta sección original muestra la cantidad de Digimon que pertenecen a cada nivel de evolución disponible en la API.
      </p>

      <div className="bg-white p-6 rounded-xl shadow-2xl space-y-4">
        {levelDistribution.map(({ level, count }) => {
          const width = maxCount > 0 ? (count / maxCount) * 100 : 0;
          
          const getColor = (lvl) => {
            switch (lvl) {
              case 'Fresh': return 'bg-level-fresh';
              case 'In Training': return 'bg-level-in-training';
              case 'Rookie': return 'bg-level-rookie';
              case 'Champion': return 'bg-level-champion';
              case 'Ultimate': return 'bg-level-ultimate';
              case 'Mega': return 'bg-level-mega';
              default: return 'bg-level-default';
            }
          };
          
          return (
            <div key={level} className="stats-bar-item">
              <span className="w-32 font-semibold text-[var(--color-text-secondary)] capitalize">{level}</span>
              <div className="stats-bar-track">
                <div 
                  className={`stats-bar-fill ${getColor(level)}`}
                  style={{ width: `${width}%` }}
                >
                  <span className="text-sm font-bold text-[var(--color-white)]">{count}</span>
                </div>
              </div>
              <span className="w-10 text-right font-bold text-[var(--color-accent-dark)]">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- PÁGINA: Search (Buscador) ---
const Search = ({ digimons, favorites, onSelectDigimon, onToggleFavorite }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDigimons = useMemo(() => {
    if (!searchTerm) return [];
    const lowerCaseSearch = searchTerm.toLowerCase();
    
    // Limitar resultados a un máximo de 50 para rendimiento
    return digimons.filter(digimon => 
      digimon.name.toLowerCase().includes(lowerCaseSearch) ||
      digimon.level.toLowerCase().includes(lowerCaseSearch)
    ).slice(0, 50); 
  }, [digimons, searchTerm]);

  const isFavorite = useCallback((digimon) => 
    favorites.some(f => f.name === digimon.name)
  , [favorites]);

  return (
    <div className="p-4 md:p-8">
      <h2 className="page-title flex items-center">
        <SearchIcon className="mr-3" size={28} /> Buscar Digimon
      </h2>
      
      <input
        type="text"
        placeholder="Escribe el nombre o nivel del Digimon (ej: Agumon, Mega)..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full p-3 border-2 border-[var(--color-border)] rounded-lg focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] transition-all text-lg mb-8 shadow-sm"
      />

      {searchTerm && filteredDigimons.length > 0 && (
        <p className="page-subtitle text-lg">
          Resultados encontrados: <span className="font-bold text-[var(--color-accent-dark)]">{filteredDigimons.length}</span>
        </p>
      )}

      {searchTerm && filteredDigimons.length === 0 ? (
        <div className="p-12 bg-white rounded-xl shadow-lg text-center">
          <p className="text-xl text-[var(--color-danger)]">No se encontraron Digimon con el término "{searchTerm}".</p>
          <p className="text-[var(--color-text-secondary)] mt-2">Intenta buscar por nombre completo o nivel de evolución.</p>
        </div>
      ) : (
        <div className="digimon-grid justify-items-center">
          {filteredDigimons.map((digimon) => (
            <DigimonCard
              key={digimon.name}
              digimon={digimon}
              onSelect={onSelectDigimon}
              isFavorite={isFavorite(digimon)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
};


// --- COMPONENTE PRINCIPAL: App (Contiene toda la lógica y el "Router") ---
export default function App() {
  // Estado de Navegación y Datos
  const [currentPage, setCurrentPage] = useState(PAGES.HOME);
  const [digimons, setDigimons] = useState([]);
  const [selectedDigimon, setSelectedDigimon] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estado de Firebase/Auth
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  // Estado de Favoritos (sincronizado con Firestore)
  const [favorites, setFavorites] = useState([]);

  // --- LÓGICA DE NAVEGACIÓN Y SELECCIÓN ---
  const handleNavigate = (page) => {
    setCurrentPage(page);
    setSelectedDigimon(null); // Limpiar detalles al cambiar de página
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectDigimon = (digimon) => {
    setSelectedDigimon(digimon);
    setCurrentPage(PAGES.DETAILS);
  };

  // --- 1. GESTIÓN DE LA API DE DIGIMON ---
  useEffect(() => {
    const fetchDigimons = async () => {
      try {
        const response = await fetch(DIGIMON_API_URL);
        if (!response.ok) throw new Error('Error al cargar Digimon');
        const data = await response.json();
        setDigimons(data);
      } catch (error) {
        console.error("Error fetching Digimon:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDigimons();
  }, []);

  // --- 2. CONFIGURACIÓN Y AUTENTICACIÓN DE FIREBASE ---
  useEffect(() => {
    if (!firebaseConfig) {
      setIsAuthReady(true);
      return;
    }

    try {
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const authInstance = getAuth(app);
      
      setDb(firestore);

      const unsubscribe = onAuthStateChanged(authInstance, (user) => {
        if (user) {
          // Si el usuario ya está autenticado (o se acaba de autenticar), usamos su UID.
          setUserId(user.uid);
          setIsAuthReady(true);
        } else {
          // Si no hay usuario, intentamos iniciar sesión anónimamente.
          // onAuthStateChanged se volverá a disparar una vez que el inicio de sesión sea exitoso.
          const authPromise = initialAuthToken 
            ? signInWithCustomToken(authInstance, initialAuthToken)
            : signInAnonymously(authInstance);
          authPromise.catch(e => {
            console.error("Firebase sign-in failed:", e);
            setIsAuthReady(true); // Marcar como listo incluso si falla para no bloquear la UI.
          });
        }
      });

      return () => unsubscribe();
    } catch (e) {
      console.error("Error setting up Firebase:", e);
      setIsAuthReady(true); 
    }
  }, []);

  // --- 3. GESTIÓN DE FAVORITOS CON FIRESTORE (onSnapshot) ---
  useEffect(() => {
    if (!db || !userId || !isAuthReady) return;

    // Ruta de la colección: /artifacts/{appId}/users/{userId}/digimonFavorites
    const favsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/digimonFavorites`);
    
    // Escuchar cambios en tiempo real
    const unsubscribe = onSnapshot(favsCollectionRef, (snapshot) => {
      const favsList = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      setFavorites(favsList);
    }, (error) => {
      console.error("Error listening to favorites:", error);
    });

    return () => unsubscribe();
  }, [db, userId, isAuthReady]);

  // --- 4. LÓGICA PARA AGREGAR/QUITAR FAVORITOS ---
  const toggleFavorite = useCallback(async (digimon) => {
    if (!db || !userId) {
      // Simular alerta con console.error ya que alert() está prohibido
      console.error("Favoritos no disponible: La autenticación no está lista o falló.");
      return;
    }

    // Usamos el nombre del Digimon como ID del documento para facilitar la búsqueda
    const docRef = doc(db, `artifacts/${appId}/users/${userId}/digimonFavorites`, digimon.name);
    const isCurrentlyFavorite = favorites.some(f => f.name === digimon.name);

    try {
      if (isCurrentlyFavorite) {
        await deleteDoc(docRef);
      } else {
        await setDoc(docRef, {
          name: digimon.name,
          img: digimon.img,
          level: digimon.level,
          addedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error toggling favorite status:", error);
    }
  }, [db, userId, favorites]);


  // --- FUNCIÓN CENTRAL DE RENDERIZADO (El "Router") ---
  const renderContent = () => {
    if (isLoading || !isAuthReady) {
      return (
        <div className="text-center p-20 text-[var(--color-accent-dark)]">
          <svg className="animate-spin h-10 w-10 mx-auto mb-4" viewBox="0 0 24 24">
             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-xl">Cargando datos y autenticando...</p>
        </div>
      );
    }

    // Llama al componente de página correspondiente
    const pageProps = { digimons, favorites, onSelectDigimon: handleSelectDigimon, onToggleFavorite: toggleFavorite };

    switch (currentPage) {
      case PAGES.HOME:
        return <Home {...pageProps} />;
      case PAGES.DETAILS:
        return <Details digimon={selectedDigimon} onGoHome={() => handleNavigate(PAGES.HOME)} />;
      case PAGES.FAVORITES:
        return <Favorites {...pageProps} />;
      case PAGES.INFO:
        return <Information userId={userId} />;
      case PAGES.ORIGINAL:
        return <OriginalStats digimons={digimons} />;
      case PAGES.SEARCH:
        return <Search {...pageProps} />;
      default:
        return <div className="p-8 text-center text-[var(--color-danger)]">Página no encontrada.</div>;
    }
  };

  return (
    <div className="min-h-screen font-sans">
      <Navbar currentPage={currentPage} onNavigate={handleNavigate} />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {renderContent()}
      </main>

      <footer className="bg-[#343a40] text-white text-center p-4 mt-10">
        <p>DigiPokedex React App - Desarrollado con Tailwind CSS y Firebase Firestore.</p>
      </footer>
    </div>
  );
}
