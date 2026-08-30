

import { useState } from "react";
import "./Explore.css";
function HangerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a2 2 0 1 1 2 2c-.5 0-1-.2-1.4-.6" />
      <path d="M12 5v2" />
      <path d="M12 7 3 15c-.7.6-.3 1.8.7 1.8h16.6c1 0 1.4-1.2.7-1.8L12 7Z" />
      <path d="M4 20h16" />
    </svg>
  );
}

function BallIcon() {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6.5 15.5 9l-1.3 4.1H9.8L8.5 9Z" strokeLinejoin="round" />
      <path d="M12 6.5V3.3" />
      <path d="M15.5 9l3.2-1" />
      <path d="M14.2 13.1l2 2.7" />
      <path d="M9.8 13.1l-2 2.7" />
      <path d="M8.5 9l-3.2-1" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}

function ToolboxIcon() {
  return (
    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="8" width="20" height="12" rx="2" />
      <path d="M9 8V6a3 3 0 0 1 3-3v0a3 3 0 0 1 3 3v2" />
      <path d="M2 13h20" />
      <path d="M12 11v4" />
    </svg>
  );
}

function ComputerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="12" rx="1" />
      <path d="M8 20h8" />
      <path d="M12 16v4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

const categoryList = [
  { name: "Ropa", Icon: HangerIcon },
  { name: "Deportes", Icon: BallIcon },
  { name: "Herramientas", Icon: ToolboxIcon },
  { name: "Tecnología", Icon: ComputerIcon },
  { name: "Otros", Icon: PlusIcon, isPlus: true },
];

const allProducts = [
  {
    letter: "E",
    user: "User000001",
    category: "Ropa",
    image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500",
    price: "$50.00",
    description: "Traje de gala color azul",
  },
  {
    letter: "L",
    user: "User000005",
    category: "Ropa",
    image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500",
    price: "$30.00",
    description: "Vestido de gala color rojo",
  },
  {
    letter: "P",
    user: "User000006",
    category: "Ropa",
    image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500",
    price: "$20.00",
    description: "Chaqueta de cuero marron",
  },
  {
    letter: "A",
    user: "User000007",
    category: "Ropa",
    image: "https://images.unsplash.com/photo-1591561954557-26941169b49e?w=500",
    price: "$15.00",
    description: "Bolso de mano",
  },
  {
    letter: "Q",
    user: "User000019",
    category: "Ropa",
    image: "https://images.unsplash.com/photo-1520975916090-3105956dac38?w=500",
    price: "$25.00",
    description: "Chaqueta negra talla M",
  },
  {
    letter: "Y",
    user: "User000020",
    category: "Ropa",
    image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500",
    price: "$18.00",
    description: "Abrigo de invierno talla L",
  },
  {
    letter: "Z",
    user: "User000021",
    category: "Ropa",
    image: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=500",
    price: "$12.00",
    description: "zapatillas deportivas talla 42",
  },
  {
    letter: "V",
    user: "User000022",
    category: "Ropa",
    image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=500",
    price: "$10.00",
    description: "Outfit casual para verano talla M",
  },
  {
    letter: "M",
    user: "User000003",
    category: "Deportes",
    image: "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=500",
    price: "$100.00",
    description: "Equipo de Golf profesional",
  },
  {
    letter: "R",
    user: "User000008",
    category: "Deportes",
    image: "https://images.unsplash.com/photo-1697423878282-0c4bbc3f821a?w=500",
    price: "$40.00",
    description: "Bicicleta de montaña rodado 27",
  },
  {
    letter: "C",
    user: "User000010",
    category: "Deportes",
    image: "https://images.unsplash.com/photo-1603077492579-39ff927823db?w=500",
    price: "$25.00",
    description: "Set de pesas ajustables",
  },
  {
    letter: "I",
    user: "User000025",
    category: "Deportes",
    image: "https://images.unsplash.com/photo-1691109839715-b0170a8aa985?w=500",
    price: "$30.00",
    description: "Patines de línea talla 40",
  },
  {
    letter: "U",
    user: "User000026",
    category: "Deportes",
    image: "https://images.unsplash.com/photo-1542144582-1ba00456b5e3?w=500",
    price: "$45.00",
    description: "Raqueta de tenis profesional",
  },
  {
    letter: "D",
    user: "User000011",
    category: "Herramientas",
    image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=500",
    price: "$45.00",
    description: "Taladro inalámbrico profesional",
  },
  {
    letter: "F",
    user: "User000012",
    category: "Herramientas",
    image: "https://images.unsplash.com/photo-1530088528371-105e6f3b2336?w=500",
    price: "$60.00",
    description: "Set completo de llaves y herramientas",
  },
  {
    letter: "G",
    user: "User000013",
    category: "Herramientas",
    image: "https://images.unsplash.com/photo-1549030782-4935f80baeb6?w=500",
    price: "$20.00",
    description: "Escalera plegable 6 pies",
  },
  {
    letter: "Ñ",
    user: "User000027",
    category: "Herramientas",
    image: "https://images.unsplash.com/photo-1505855796860-aa05646cbf1f?w=500",
    price: "$30.00",
    description: "Sierra circular eléctrica",
  },
  {
    letter: "B2",
    user: "User000028",
    category: "Herramientas",
    image: "https://images.unsplash.com/photo-1542486500-db3f713278bc?w=500",
    price: "$50.00",
    description: "Compresor de aire portátil",
  },
  {
    letter: "W",
    user: "User000004",
    category: "Tecnología",
    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500",
    price: "$25.00",
    description: "Cámara lente profesional, resolución 4k",
  },
  {
    letter: "H",
    user: "User000014",
    category: "Tecnología",
    image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=500",
    price: "$30.00",
    description: "Proyector portátil HD",
  },
  {
    letter: "S",
    user: "User000015",
    category: "Tecnología",
    image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500",
    price: "$18.00",
    description: "Laptop para programación y diseño gráfico",
  },
  {
    letter: "K",
    user: "User000016",
    category: "Tecnología",
    image: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=500",
    price: "$22.00",
    description: "Auriculares inalámbricos con cancelación de ruido",
  },
  {
    letter: "T2",
    user: "User000030",
    category: "Tecnología",
    image: "https://images.unsplash.com/photo-1600861194942-f883de0dfe96?w=500",
    price: "$15.00",
    description: "Consola de videojuegos de un control",
  },
  {
    letter: "V2",
    user: "User000032",
    category: "Tecnología",
    image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500",
    price: "$28.00",
    description: "Apple Watch",
  },
  {
    letter: "J",
    user: "User000002",
    category: "Otros",
    image: "https://images.unsplash.com/photo-1504851149312-7a075b496cc7?w=500",
    price: "$100.00",
    description: "Equipo de acampar color celeste y gris",
  },
  {
    letter: "B",
    user: "User000017",
    category: "Otros",
    image: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=500",
    price: "$40.00",
    description: "Set de mesa y sillas para eventos",
  },
  {
    letter: "T",
    user: "User000018",
    category: "Otros",
    image: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=500",
    price: "$15.00",
    description: "Bocina portátil para fiestas",
  },
  {
    letter: "W2",
    user: "User000033",
    category: "Otros",
    image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=500",
    price: "$35.00",
    description: "Decoración temática para fiestas infantiles",
  },
];

export default function Explore() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const conditions = ["Como nuevo", "Buen estado"];
  const productsWithMeta = allProducts.map((p, i) => ({
    ...p,
    condition: conditions[i % conditions.length],
    uses: ((i * 3 + 2) % 12) + 1,
  }));

  const handleCategoryClick = (name) => {
    setSearchTerm("");
    setSelectedCategory((prev) => (prev === name ? null : name));
  };

  const handleSearchChange = (e) => {
    setSelectedCategory(null);
    setSearchTerm(e.target.value);
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredProducts = normalizedSearch
    ? productsWithMeta.filter(
        (p) =>
          p.description.toLowerCase().includes(normalizedSearch) ||
          p.category.toLowerCase().includes(normalizedSearch)
      )
    : selectedCategory
    ? productsWithMeta.filter((p) => p.category === selectedCategory)
    : categoryList.map((cat) =>
        productsWithMeta.find((p) => p.category === cat.name)
      );

  return (
    <div className="app">
      <header className="app-navbar">
        <img src="/logo-lendrop.png" alt="LENDROOP" className="logo-img" />
        <nav>
          <a href="#">Inicio</a>
          <a href="#">Explorar Artículos</a>
          <a href="#" className="profile-link" aria-label="Perfil">
            <ProfileIcon />
          </a>
        </nav>
      </header>

      <section className="app-hero">
        <h1>
          Alquila lo que<br />
          necesitas,<br />
          cuando lo necesitas.
        </h1>
        <div className="search-bar">
          <span>⌕</span>
          <input
            type="text"
            placeholder="Buscar"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
      </section>

      <section className="categories">
        {categoryList.map((cat) => (
          <div
            className="category"
            key={cat.name}
            onClick={() => handleCategoryClick(cat.name)}
            style={{ cursor: "pointer" }}
          >
            <div
              className={`category-circle ${
                selectedCategory === cat.name ? "active" : ""
              }`}
            >
              <cat.Icon />
            </div>
            <strong>{cat.name}</strong>
          </div>
        ))}
        <div className="next">›</div>
      </section>

      {(selectedCategory || normalizedSearch) && (
        <div className="filter-banner">
          {normalizedSearch ? (
            <>
              Resultados para: <strong>"{searchTerm}"</strong>
            </>
          ) : (
            <>
              Mostrando: <strong>{selectedCategory}</strong>
            </>
          )}
          <button
            onClick={() => {
              setSelectedCategory(null);
              setSearchTerm("");
            }}
          >
            Ver todos ✕
          </button>
        </div>
      )}

      <section className="products-section">
        <div className="products">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((p) => <Product key={p.user} {...p} />)
          ) : (
            <p className="no-results">
              {normalizedSearch
                ? `No encontramos artículos para "${searchTerm}".`
                : "No hay artículos en esta categoría todavía."}
            </p>
          )}
        </div>
      </section>

      <footer className="app-footer">
        <a href="#">Ayuda</a>
      </footer>
    </div>
  );
}

function Product({ letter, user, category, image, price, description }) {
  return (
    <article className="product-card">
      <div className="product-user">
        <div className="avatar">{letter}</div>
        <div>
          <b>{user}</b>
          <small>{category}</small>
        </div>
      </div>
      <img src={image} alt={description} />
      <div className="product-info">
        <span className="price">{price}</span>
        <p>{description}</p>
        <button>Alquilar</button>
      </div>
    </article>
  );
}