import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Laptop,
  Wrench,
  Bike,
  Dumbbell,
  Luggage,
  Headphones,
  Tent,
  Drama,
  Gamepad2,
} from "lucide-react";

/**
 * Íconos que representan las categorías de artículos que se guardan
 * en los lockers de Lendrop (ropa/disfraces, herramientas, electrónica,
 * deporte, camping, etc). Agregar/quitar aquí no requiere tocar el resto
 * del componente.
 */
const LOCKER_ICONS = [
  Camera,
  Laptop,
  Wrench,
  Bike,
  Dumbbell,
  Luggage,
  Headphones,
  Tent,
  Drama,
  Gamepad2,
];

const ROW_LETTERS = "ABCDEF";
const CELL_SIZE_PX = 72;
const ACTIVE_RATIO = 0.015;
const TICK_INTERVAL_MS = 1200;
const FLASH_DURATION_MS = 1100;
const TRANSITION_MS = 700;

/**
 * Morado tenue y cálido, propio de este fondo (RGB, sin "rgb()" para poder
 * componer distintas opacidades). Deliberadamente NO es el mismo `lavender`
 * que usan botones/inputs en el resto de la app — es un acento de mood para
 * esta pieza decorativa, así que cambiarlo aquí no afecta nada más.
 */
const DEFAULT_ACCENT_RGB = "173, 122, 176";

function randomIcon(excludeIcon) {
  if (LOCKER_ICONS.length === 1) return LOCKER_ICONS[0];
  let icon;
  do {
    icon = LOCKER_ICONS[Math.floor(Math.random() * LOCKER_ICONS.length)];
  } while (icon === excludeIcon);
  return icon;
}

/** Genera la data inicial de cada celda: ícono aleatorio y código estilo "B4". */
function generateLockerCells({ rows, cols }) {
  const total = rows * cols;
  return Array.from({ length: total }, (_, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    return {
      id: i,
      code: `${ROW_LETTERS[row % ROW_LETTERS.length]}${col + 1}`,
      Icon: LOCKER_ICONS[Math.floor(Math.random() * LOCKER_ICONS.length)],
      swapId: 0,
    };
  });
}

/**
 * Mide el contenedor con ResizeObserver y calcula cuántas columnas/filas
 * de locker caben a un tamaño de celda fijo, para que el patrón se vea
 * consistente sin importar la altura del viewport.
 */
function useGridDimensions(containerRef, cellSize) {
  const [dimensions, setDimensions] = useState({ rows: 0, cols: 0 });

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;

    const measure = () => {
      const { width, height } = node.getBoundingClientRect();
      setDimensions({
        cols: Math.max(1, Math.ceil(width / cellSize)),
        rows: Math.max(1, Math.ceil(height / cellSize)),
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [containerRef, cellSize]);

  return dimensions;
}

/**
 * Fondo decorativo tipo "pared de lockers inteligentes" para pantallas de
 * autenticación. Cada cierto tiempo, un pequeño porcentaje de celdas al
 * azar "cambian de contenido" con un destello suave y lento — como si un
 * artículo acabara de entrar o salir del locker. Puramente presentacional:
 * se posiciona absolute detrás del contenido real, así que va aria-hidden.
 *
 * Respeta prefers-reduced-motion: si el usuario lo tiene activado, el
 * grid se queda estático (mismo look, sin el ciclo de íconos).
 *
 * Va UNA vez dentro de AuthLayout, no repetido en cada página.
 *
 * Uso:
 *   <LockerWallBg className="pointer-events-none absolute inset-0" />
 *
 * Para cambiar el tono sin tocar el archivo:
 *   <LockerWallBg accentColor="150, 110, 160" ... />
 */
export default function LockerWallBg({
  cellSize = CELL_SIZE_PX,
  activeRatio = ACTIVE_RATIO,
  accentColor = DEFAULT_ACCENT_RGB,
  className = "",
}) {
  const containerRef = useRef(null);
  const { rows, cols } = useGridDimensions(containerRef, cellSize);
  const total = rows * cols;

  const [cells, setCells] = useState([]);

  useEffect(() => {
    if (total === 0) return;
    setCells(generateLockerCells({ rows, cols }));
  }, [rows, cols, total]);

  useEffect(() => {
    if (total === 0) return undefined;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return undefined;

    const cellsPerTick = Math.max(1, Math.round(total * activeRatio));

    const tick = setInterval(() => {
      setCells((prev) => {
        if (prev.length === 0) return prev;
        const next = [...prev];
        for (let n = 0; n < cellsPerTick; n++) {
          const idx = Math.floor(Math.random() * next.length);
          const current = next[idx];
          next[idx] = {
            ...current,
            Icon: randomIcon(current.Icon),
            swapId: current.swapId + 1,
          };
        }
        return next;
      });
    }, TICK_INTERVAL_MS);

    return () => clearInterval(tick);
  }, [total, activeRatio]);

  return (
    <div
      ref={containerRef}
      className={`grid ${className}`}
      style={{
        gridTemplateColumns: `repeat(${cols || 1}, 1fr)`,
        gridTemplateRows: `repeat(${rows || 1}, 1fr)`,
      }}
      aria-hidden="true"
    >
      {cells.map(({ id, code, Icon, swapId }) => (
        <LockerCell
          key={id}
          code={code}
          Icon={Icon}
          swapId={swapId}
          accentColor={accentColor}
        />
      ))}
    </div>
  );
}

function LockerCell({ code, Icon, swapId, accentColor }) {
  const [isFlashing, setIsFlashing] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return undefined;
    }
    setIsFlashing(true);
    const timeout = setTimeout(() => setIsFlashing(false), FLASH_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [swapId]);

  return (
    <div
      className="relative flex items-center justify-center border"
      style={{
        transitionProperty: "background-color, box-shadow, border-color",
        transitionDuration: `${TRANSITION_MS}ms`,
        borderColor: `rgba(${accentColor}, ${isFlashing ? 0.45 : 0.08})`,
        backgroundColor: isFlashing ? `rgba(${accentColor}, 0.07)` : "transparent",
        boxShadow: isFlashing
          ? `inset 0 0 20px rgba(${accentColor}, 0.22)`
          : "none",
      }}
    >
      <span
        className="absolute left-1.5 top-1 font-mono text-[8px]"
        style={{
          transitionProperty: "color",
          transitionDuration: `${TRANSITION_MS}ms`,
          color: `rgba(${accentColor}, ${isFlashing ? 0.45 : 0.15})`,
        }}
      >
        {code}
      </span>

      <Icon
        size={22}
        strokeWidth={1.5}
        className={`transition-transform ${isFlashing ? "scale-110" : "scale-100"}`}
        style={{
          transitionProperty: "transform, color",
          transitionDuration: `${TRANSITION_MS}ms`,
          color: `rgba(${accentColor}, ${isFlashing ? 0.65 : 0.15})`,
        }}
      />

      {isFlashing && (
        <span
          className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full"
          style={{
            backgroundColor: `rgb(${accentColor})`,
            boxShadow: `0 0 6px rgba(${accentColor}, 0.8)`,
          }}
        />
      )}
    </div>
  );
}