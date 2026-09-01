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
const TICK_INTERVAL_MS = 900;
const CELLS_PER_TICK = 2;
const FLASH_DURATION_MS = 550;

function randomIcon(excludeIcon) {
  if (LOCKER_ICONS.length === 1) return LOCKER_ICONS[0];
  let icon;
  do {
    icon = LOCKER_ICONS[Math.floor(Math.random() * LOCKER_ICONS.length)];
  } while (icon === excludeIcon);
  return icon;
}

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

export default function LockerWallBackground({ rows = 7, cols = 9, className = "" }) {
  const [cells, setCells] = useState(() => generateLockerCells({ rows, cols }));

  useEffect(() => {
    setCells(generateLockerCells({ rows, cols }));
  }, [rows, cols]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return undefined;

    const total = rows * cols;
    const tick = setInterval(() => {
      setCells((prev) => {
        const next = [...prev];
        for (let n = 0; n < CELLS_PER_TICK; n++) {
          const idx = Math.floor(Math.random() * total);
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
  }, [rows, cols]);

  return (
    <div
      className={`grid ${className}`}
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
      }}
      aria-hidden="true"
    >
      {cells.map(({ id, code, Icon, swapId }) => (
        <LockerCell key={id} code={code} Icon={Icon} swapId={swapId} />
      ))}
    </div>
  );
}

function LockerCell({ code, Icon, swapId }) {
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
      className={`relative flex items-center justify-center border transition-colors duration-500 ${
        isFlashing
          ? "border-[#a58cf4]/45 bg-[#a58cf4]/[0.07] shadow-[inset_0_0_20px_rgba(165,140,244,0.22)]"
          : "border-[#a58cf4]/[0.08]"
      }`}
    >
      <span
        className={`absolute left-1.5 top-1 font-mono text-[8px] transition-colors duration-500 ${
          isFlashing ? "text-[#a58cf4]/45" : "text-[#a58cf4]/15"
        }`}
      >
        {code}
      </span>

      <Icon
        size={22}
        strokeWidth={1.5}
        className={`transition-all duration-500 ${
          isFlashing ? "scale-110 text-[#a58cf4]/65" : "scale-100 text-[#a58cf4]/15"
        }`}
      />

      {isFlashing && (
        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#a58cf4] shadow-[0_0_6px_#a58cf4]" />
      )}
    </div>
  );
}