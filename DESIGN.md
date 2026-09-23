# Lendrop — Sistema de diseño "Locker Brutalism"

> Fuente de verdad visual del proyecto. Toda pantalla nueva o rediseñada debe derivar
> sus colores, tipografía, bordes, sombras y movimiento de este documento.
> Si algo no está aquí, se decide y se AGREGA aquí antes de implementarlo.

## 1. Idea central

Lendrop no es "otra app de alquiler": es una **red de lockers**. El lenguaje visual sale
del objeto físico: puertas de metal pintado, bordes gruesos, etiquetas estarcidas,
luces LED de estado, cinta de señalización. Encima, un toque **neo-brutalista**
(sombras duras, botones que se hunden al presionarlos) para que se sienta táctil y
cercano, no frío.

**Regla de oro:** la audacia se gasta en UN lugar: la **puerta de compartimento**
(tarjetas) y el **código de apertura** (split-flap). Todo lo demás es disciplinado,
ordenado y silencioso.

**Nunca:** gradientes decorativos, glassmorphism, blobs, sombras difuminadas, emojis
como iconos, botones píldora, ilustraciones genéricas de "gente feliz con celular".

---

## 2. Color

| Token | Hex | Rol |
|---|---|---|
| `ink` | `#0D0D0D` | Texto principal, bordes, sombras duras (Jet Black de marca) |
| `steel` | `#ECEBF2` | Fondo de la app: gris frío tipo pintura de locker |
| `panel` | `#FAFAFA` | Superficies: tarjetas, inputs, modales (Soft White de marca) |
| `violet` | `#433075` | Color primario: acciones principales, marca (Deep Purple) |
| `lilac` | `#A58CF4` | Acento: LED "disponible", rellenos, selección (Lavender) |
| `signal` | `#FFD23F` | Señalización: avisos, "en tu locker", etiquetas destacadas |
| `night` | `#17112B` | Fondo oscuro: landing hero, auth y pantalla de locker en vivo |
| `alert` | `#E5484D` | Errores, daño reportado, acciones destructivas |
| `go` | `#2FBF71` | Solo confirmaciones de éxito (pago aprobado, devuelto OK) |

Escalas derivadas (úsalas, no inventes otras):
- `violet-700` `#33245C` (hover/pressed de violet) · `violet-50` `#EEEAF8` (fondos suaves)
- `lilac-200` `#DDD2FB` (selección, fondos de chip)
- `steel-300` `#D6D4E0` (divisores, placeholders de imagen) · `steel-600` `#6B6880` (texto secundario)
- `alert-700` `#D13B40` (relleno de acciones destructivas que llevan texto `panel`; `alert` mide 3.75:1 contra `panel` y no alcanza AA, este mide 4.56:1)

### Reglas de contraste (obligatorias, WCAG AA)
- `lilac` y `signal` **NUNCA** como color de texto sobre `panel` o `steel`. Se usan como
  RELLENO con texto `ink` encima.
- Texto sobre `violet` o `night`: siempre `panel`.
- Texto secundario: `steel-600` sobre `panel`/`steel` (no más claro).
- `alert` como texto solo en tamaños ≥ 14px semibold; si no, relleno con texto `panel`.

### Semántica de estado (LED)
| Estado | LED | Significado |
|---|---|---|
| Disponible | `lilac` encendido (con halo) | Se puede reservar / compartimento libre |
| Reservado / en curso | `signal` encendido | Ocupado en esas fechas / alquiler activo |
| Listo para retirar | `go` parpadeo lento | El artículo está en el locker |
| No disponible | apagado (`steel-300` con borde `ink`) | Pausado / sin locker |
| Problema | `alert` | Disputa, daño, pago rechazado |

El LED siempre va acompañado de TEXTO del estado (nunca solo color).

---

## 3. Tipografía

| Rol | Fuente | Uso |
|---|---|---|
| Display | **Big Shoulders** (800–900) | Títulos de pantalla y de sección. MAYÚSCULAS, tracking `0.01em`. Con moderación. |
| Stencil | **Big Shoulders Stencil** (800) | SOLO lo que en un locker real va estarcido: tamaño de locker (S/M/L/XL), códigos de compartimento (A3), el código de apertura. |
| Texto | **Manrope** (400/500/700) | Todo el texto de interfaz, párrafos, labels, botones. Sentence case. |
| Datos | **JetBrains Mono** (500) | Precios, fechas, montos, last4, IDs de transacción, medidas en cm. |

> Verifica en Google Fonts el nombre exacto de la familia (puede figurar como
> "Big Shoulders Display" / "Big Shoulders Stencil Display"). Fallbacks:
> display → `Impact, "Arial Narrow", sans-serif`; texto → `system-ui, sans-serif`;
> mono → `ui-monospace, monospace`.

### Escala (mobile → desktop)
| Token | Tamaño | Fuente | Uso |
|---|---|---|---|
| `display-xl` | 48 → 88px / 0.92 | Big Shoulders 900 | Hero de landing |
| `display-l` | 36 → 56px / 0.95 | Big Shoulders 800 | Título de pantalla |
| `display-m` | 26 → 34px / 1.0 | Big Shoulders 800 | Título de sección (placa) |
| `title` | 18 → 20px / 1.3 | Manrope 700 | Título de tarjeta, modal |
| `body` | 16px / 1.55 | Manrope 400/500 | Texto general (mínimo 16px en inputs) |
| `small` | 14px / 1.45 | Manrope 500 | Metadatos, ayudas |
| `label` | 12px / 1.2, tracking `0.08em`, MAYÚS | JetBrains Mono 500 | Etiquetas técnicas, eyebrows |
| `data` | 15–28px | JetBrains Mono 500 | Precios y montos |

Precio canónico: `$12` en `data` grande + `/día` en `small` `steel-600`.

---

## 4. Forma: bordes, radios, sombras

- **Borde estándar:** `2px solid ink`. **Borde fuerte** (puertas, botones primarios): `3px solid ink`.
- **Radio:** `6px` en todo (puertas de locker reales tienen esquina apenas suave).
  `0` solo en divisores. Nunca píldoras (excepto el punto LED, que es círculo).
- **Sombras duras, sin blur, siempre `ink`:**
  - `shadow-sm`: `3px 3px 0 0 #0D0D0D` (inputs, chips)
  - `shadow-md`: `5px 5px 0 0 #0D0D0D` (tarjetas, botones)
  - `shadow-lg`: `8px 8px 0 0 #0D0D0D` (modales, hero)
- **Presión física (neo-brutal):** al hacer `:active`, el elemento se desplaza
  `translate(3px,3px)` y la sombra se reduce en la misma medida → se "hunde".
  Hover en desktop: sombra crece 1px y `translate(-1px,-1px)`.

---

## 5. Layout

- Base de espaciado: **8px** (tokens 4, 8, 12, 16, 24, 32, 48, 64, 96).
- **Marco de locker:** las rejillas de tarjetas tienen `gap` de 16px (móvil) / 20px (desktop)
  dejando ver el fondo `steel` entre puertas, como el marco metálico de un locker.
- Contenedor máx. `1200px`, padding lateral 16 / 24 / 32px.
- Rejilla de artículos: 2 columnas móvil · 3 tablet · 4 desktop. Todas las puertas
  del mismo alto en una fila (alineación de locker).
- **Placa de sección** (encabezado): título `display-m` + a la derecha un `label` mono
  con un dato real (ej. `12 DISPONIBLES HOY`). Un borde inferior `3px ink`.
  Sin remaches ni texturas falsas de metal.
- **Mobile first.** Navegación inferior en móvil = "panel de control" (ver 7.10).

```
MÓVIL — Explorar
┌──────────────────────────┐
│ EXPLORAR     [🔍] [filtro]│  ← display-l
│ ┌──────────┐┌──────────┐ │
│ │M      ● ││S      ● │ │  ← SizeTag stencil + LED
│ │ [foto]   ││ [foto]   │ │
│ │Cámara... ││Dron...   │ │
│ │$12 /día  ││$18 /día  │ │
│ └──────────┘└──────────┘ │
│ ┌──────────┐┌──────────┐ │
│ ...                      │
│   [ + Publicar ][ Perfil ]   │  ← panel inferior (2 celdas)
└──────────────────────────┘
```

---

## 6. Firma visual

### 6.1 Puerta de compartimento (`DoorCard`)
La tarjeta de artículo ES una puerta de locker:
- Fondo `panel`, borde `3px ink`, radio 6px, `shadow-md`.
- **Esquina superior izquierda:** `SizeTag`, el tamaño de locker REAL del artículo
  (`required_locker_size` → S/M/L/XL) en Big Shoulders Stencil, sobre relleno `signal`
  si es XL, `lilac-200` en el resto. Si `dimensions_source = 'category_default'`, agrega
  un asterisco y tooltip "Tamaño estimado".
- **Esquina superior derecha:** `LedStatus` con su texto (visible en desktop, `sr-only`
  en móvil pero con `title`).
- **Ranura de manija:** una barra vertical `4×28px` `ink` con radio 2px en el borde
  derecho, a media altura de la foto. Es el ÚNICO adorno permitido.
- Foto con proporción 4:3, borde inferior `2px ink`, `object-fit: cover`.
- Presionar → se hunde (sección 4). Foco teclado → outline `3px lilac` + offset 3px.

### 6.2 Código de apertura (`SplitFlapCode`)
Cuando una reserva se confirma y cuando el usuario abre "Tu locker":
- El código de compartimento (`B4`) y el locker se revelan con animación **split-flap**
  (tablero de estación): cada carácter rota por 3–6 caracteres aleatorios antes de fijarse,
  con 60ms de escalonado entre caracteres. Duración total ≤ 900ms.
- Caracteres en Big Shoulders Stencil 900, 56–72px, celdas `night` con texto `panel`,
  línea divisoria horizontal `ink` a la mitad de cada celda.
- Es el ÚNICO momento orquestado de la app. No repetir este efecto en otro lado.
- `prefers-reduced-motion`: aparece directo, sin rotación.

---

## 7. Componentes

### 7.1 Button
| Variante | Estilo |
|---|---|
| `primary` | Relleno `violet`, texto `panel`, borde `3px ink`, `shadow-md`, Manrope 700 |
| `secondary` | Relleno `panel`, texto `ink`, borde `2px ink`, `shadow-sm` |
| `signal` | Relleno `signal`, texto `ink`, borde `3px ink`: solo UNA vez por pantalla, para la acción física ("Abrir locker", "Confirmar depósito") |
| `danger` | Relleno `alert-700`, texto `panel`, borde `3px ink` |
| `ghost` | Sin borde ni sombra, texto `violet`, subrayado al hover |

Alto mínimo 48px (táctil). Radio 6px. Estado carga: spinner cuadrado (4 celdas que se
encienden en secuencia, como compartimentos) + texto "Procesando…". Deshabilitado:
relleno `steel-300`, texto `steel-600`, sin sombra, sin presión.

### 7.2 Input / Select / Textarea
Fondo `panel`, borde `2px ink`, `shadow-sm`, radio 6px, alto 48px, texto 16px.
Label arriba en `small` 700. Ayuda debajo en `small` `steel-600`.
Foco: borde `violet` + outline `3px lilac`. Error: borde `alert`, mensaje debajo con
icono y texto que dice qué pasó y cómo arreglarlo.
Inputs de medidas y dinero en JetBrains Mono, `inputmode="decimal"`, sufijo (`cm`, `kg`, `$`)
dentro del campo.

### 7.3 LedStatus
Círculo 10px con borde `1.5px ink`; encendido = relleno de color + halo
`0 0 0 3px` del color al 35%. "Listo para retirar" parpadea lento (2s, opacidad 1→0.45).
Siempre acompañado de texto `label`.

### 7.4 SizeTag
Big Shoulders Stencil 800, 22px, caja 36×36px, borde `2px ink`, radio 4px.
En pantallas de publicación y detalle, versión grande (72px) con medidas interiores
debajo en `label`.

### 7.5 PriceSticker
Precio sobre relleno `signal`, borde `2px ink`, rotado `-2deg`, `shadow-sm`.
Solo en el detalle del artículo y el hero. No en cada tarjeta (ahí el precio va plano).

### 7.6 Placa de sección (`Plate`)
Ver sección 5. Estructura: `<h2>` display-m + `label` con dato real + borde inferior 3px.

### 7.7 RentalTrack (línea de tiempo del alquiler)
El alquiler ES una secuencia real, así que aquí sí van pasos numerados:
`01 PAGADO → 02 EN LOCKER → 03 RETIRADO → 04 DEVUELTO → 05 CERRADO`.
Cada paso es una celda cuadrada tipo compartimento: completado = relleno `lilac`,
actual = relleno `signal` con LED, pendiente = `panel` con borde punteado.
Horizontal en desktop, vertical en móvil.

### 7.8 Modal / BottomSheet
Móvil: bottom sheet que sube como puerta corrediza (translateY, 240ms), borde superior
`3px ink`, asa de arrastre. Desktop: modal centrado `shadow-lg`. Fondo del overlay
`night` al 60%. Cierra con Esc, foco atrapado, devuelve el foco al disparador.

### 7.9 Toast
Esquina inferior (encima del panel en móvil). Relleno `panel`, borde `3px ink`, `shadow-md`,
franja izquierda de 8px con el color de estado. Mismo verbo que la acción:
botón "Publicar" → toast "Publicado".

### 7.10 Panel de control (navegación inferior móvil)
Fondo `night`, **2 celdas iguales**: **Publicar** (relleno `signal`, borde `ink`,
sobresale 8px) · Perfil. Todo lo demás vive en el menú lateral, sin duplicarse.
Activa: icono + texto `lilac`, LED encendido encima. Iconos: lucide-react, trazo 2px.
Desktop: header horizontal.

> **Corregido en la Fase 2.** Este apartado decía 5 celdas (Explorar · Mapa · Publicar ·
> Mi locker · Perfil), pero la app ya tenía una barra de 2 por decisión deliberada, con
> el resto en el drawer lateral. Cambiar eso es navegación, no piel, así que se
> actualizó el documento para que coincida con la app — decisión de Diego. Tampoco
> existe pantalla de Mapa a la que apuntaría esa celda.

### 7.11 Estados vacíos
Una rejilla de 6 compartimentos vacíos dibujados (bordes punteados `steel-600`) con
UNO iluminado en `lilac` que contiene el CTA. Texto que invita a actuar:
"Todavía no publicas nada. Publica tu primer artículo y empieza a ganar." + botón.

### 7.12 Skeletons
Formas de las puertas con relleno `steel-300` y un barrido lento (1.6s).
Reduced motion: estático.

---

## 8. Movimiento

| Qué | Cómo | Duración |
|---|---|---|
| Presión de botones/puertas | translate + sombra | 90ms ease-out |
| Hover desktop | translate(-1,-1) + sombra +1 | 120ms |
| Bottom sheet / modal | translateY / scale 0.98→1 | 240ms `cubic-bezier(.2,.8,.2,1)` |
| Split-flap (firma) | ver 6.2 | ≤ 900ms |
| Cambio de LED | color + halo | 200ms |

- Nada se anima al hacer scroll en pantallas de la app (solo en la landing, un revelado
  simple por sección).
- Ninguna animación bloquea la interacción ni retrasa la navegación.
- `@media (prefers-reduced-motion: reduce)`: transiciones ≤ 1ms, sin parpadeo de LED,
  sin split-flap.

---

## 9. Escritura (UI en inglés)

> **Decidido en la Fase 1 del rediseño:** el texto de interfaz va en INGLÉS, no en
> español. Reemplaza el enunciado original de esta sección. Las reglas de tono de
> abajo siguen vigentes; sus ejemplos están pendientes de reescribirse en inglés.
> Vocabulario fijo en inglés: *locker* (la estación), *compartment* (la puerta),
> *opening code*, *security deposit*, *host* / *renter*.

- Sentence case, verbos directos, sin relleno. Tuteo.
- Botones = lo que pasa: "Reservar", "Pagar $45.20", "Abrir locker", "Confirmar devolución".
  No "Enviar" ni "Continuar" genéricos cuando hay un verbo mejor.
- Mismo verbo en todo el flujo: "Publicar" → "Publicando…" → "Publicado".
- Errores: qué pasó + cómo arreglarlo, sin disculpas ni culpas.
  ✅ "No hay lockers de tamaño L libres esas fechas. Prueba con otras fechas."
  ❌ "¡Ups! Algo salió mal 😢"
- Vocabulario fijo: *locker* (la estación), *compartimento* (la puerta), *código de apertura*,
  *depósito de garantía*, *dueño* / *arrendatario* (en UI: "quien publica" / "quien alquila"
  solo si hace falta claridad).
- Lo simulado se dice: badge `MODO PRUEBA` (label mono sobre `signal`) en checkout y locker.

---

## 10. Accesibilidad y calidad (no negociable)

- Contraste AA en todo (ver 2). Revisar cada combinación nueva.
- Foco visible en todo elemento interactivo: outline `3px lilac`, offset 3px.
- Objetivos táctiles ≥ 44×44px.
- Estados nunca solo por color (LED + texto; errores con icono + texto).
- `aria-live="polite"` en resultados de pago, estimación de tamaño y toasts.
- Imágenes con `alt` descriptivo; iconos decorativos `aria-hidden`.
- Responsive probado a 360px, 768px, 1280px. Sin scroll horizontal del body.
- Rendimiento: fuentes con `display=swap` y solo los pesos listados; imágenes con
  `loading="lazy"` y tamaño reservado (sin saltos de layout).

---

## 11. Tokens para Tailwind v4 (`src/index.css`)

```css
@import "tailwindcss";

@theme {
  /* Color */
  --color-ink: #0d0d0d;
  --color-steel: #ecebf2;
  --color-steel-300: #d6d4e0;
  --color-steel-600: #6b6880;
  --color-panel: #fafafa;
  --color-violet: #433075;
  --color-violet-700: #33245c;
  --color-violet-50: #eeeaf8;
  --color-lilac: #a58cf4;
  --color-lilac-200: #ddd2fb;
  --color-signal: #ffd23f;
  --color-night: #17112b;
  --color-alert: #e5484d;
  --color-go: #2fbf71;

  /* Tipografía */
  --font-display: "Big Shoulders", Impact, "Arial Narrow", sans-serif;
  --font-stencil: "Big Shoulders Stencil", Impact, sans-serif;
  --font-sans: "Manrope", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  /* Forma */
  --radius-door: 6px;
  --shadow-hard-sm: 3px 3px 0 0 var(--color-ink);
  --shadow-hard-md: 5px 5px 0 0 var(--color-ink);
  --shadow-hard-lg: 8px 8px 0 0 var(--color-ink);

  /* Movimiento */
  --ease-door: cubic-bezier(.2, .8, .2, 1);
}
```

### Añadido en la Fase 1 — escala tipográfica

La sección 3 define la escala pero el bloque de tokens no la exponía, así que cada
pantalla habría inventado sus propios tamaños. Se tokeniza con `clamp()` interpolando
entre 360px y 1280px (los dos extremos del rango de prueba):

```css
@theme {
  --text-display-xl: clamp(3rem, 2.022rem + 4.348vw, 5.5rem);      /* 48 → 88 */
  --text-display-l:  clamp(2.25rem, 1.761rem + 2.174vw, 3.5rem);   /* 36 → 56 */
  --text-display-m:  clamp(1.625rem, 1.429rem + 0.87vw, 2.125rem); /* 26 → 34 */
  --text-title:      clamp(1.125rem, 1.076rem + 0.217vw, 1.25rem); /* 18 → 20 */
  --text-body:  1rem;      /* 16 */
  --text-small: 0.875rem;  /* 14 */
  --text-label: 0.75rem;   /* 12 */
  --text-data:    0.9375rem; /* 15 — extremo bajo del rango de la sección 3 */
  --text-data-lg: 1.75rem;   /* 28 — extremo alto */
}
```

Cada uno lleva sus `--line-height`, `--letter-spacing` y `--font-weight` emparejados,
que es como Tailwind v4 los aplica junto con el tamaño. `data` figuraba en la sección 3
como RANGO (15–28px), no como un valor: se resuelve en sus dos extremos — `text-data`
para el precio en línea y `text-data-lg` para el monto protagonista.

### Añadido en la Fase 1 — pesos de migración

La sección 3 pide cargar solo Manrope 400/500/700 y JetBrains Mono 500. El código
anterior al rediseño tiene 238 usos de `font-semibold` (600) y 81 de `font-mono` que
asumen 400; cargar solo los pesos listados los dejaría con negrita sintética durante
todo el rediseño. Manrope 600 y JetBrains Mono 400 se cargan como pesos TEMPORALES de
migración y se eliminan en la Fase 5 junto con los alias.

### Añadido en la Fase 1 — utilidades compartidas

- `.press-sm` / `.press-md` / `.press-lg`: sombra dura + presión física de la sección 4.
  Una clase por tamaño porque la reducción de sombra es absoluta (3px), no proporcional.
  El hover de escritorio va dentro de `@media (hover: hover)` para que en táctil no se
  quede "levantado" después de tocar.
- Foco visible global sobre todo control interactivo, con `:where()` para especificidad 0.
- `scroll-padding` arriba y abajo, para que el panel inferior fijo y los encabezados
  pegajosos no tapen el elemento enfocado al navegar con teclado (WCAG 2.2 AA).
- Regla global de `prefers-reduced-motion` al final del archivo, donde gana a todo lo
  anterior. Las transiciones bajan a 1ms (no a 0) para que `transitionend` siga
  disparando y ningún manejador que lo espere se quede colgado.

### Añadido en la Fase 2 — componentes base

- `--radius-tag: 4px`. La sección 4 fija radio 6px en todo, pero la 7.4 le da 4px al
  `SizeTag`. Se tokeniza la excepción en vez de dejar un valor suelto.
- Cuatro keyframes que Tailwind no puede expresar, en `src/index.css`: `.anim-cell`
  (spinner de 4 compartimentos, 7.1), `.anim-led` (parpadeo lento de 2s, 7.3),
  `.anim-sweep` (barrido de skeleton de 1.6s, 7.12) y `.anim-sheet` (entrada del bottom
  sheet, 240ms sobre `--ease-door`, secciones 7.8 y 8). Las cuatro las anula la regla
  global de `prefers-reduced-motion`.
- El halo del LED se hace con `ring-3 ring-<color>/35`, no con una sombra escrita a
  mano: así el color sale del token y no se duplica el literal.

### Resuelto — el botón `danger` y el contraste AA

La sección 7.1 definía `danger` como relleno `alert` (#E5484D) con texto `panel`, que
mide **3.75:1**; la sección 10 exige AA, o sea 4.5:1 para una etiqueta de 16px en
negrita. Las dos reglas se contradecían.

**Decisión (Diego):** gana la accesibilidad. Se añade `--color-alert-700: #D13B40`
(**4.56:1**) y es el relleno de `danger`. `alert` no cambia: sigue siendo el color de
bordes, iconos y texto de error sobre `panel`, donde mide 4.52:1 y sí cumple.

> Si ya existen tokens con los nombres anteriores (`deep-purple`, `lavender`,
> `soft-white`, `jet-black`), mantenlos como ALIAS de los nuevos durante la migración
> y elimínalos cuando ninguna pantalla los use.

---

## 12. Checklist antes de dar una pantalla por terminada

- [ ] Todos los colores, fuentes, sombras y radios vienen de los tokens (cero hex sueltos).
- [ ] Hay como máximo UN botón `signal` y como máximo UN elemento "audaz" en la pantalla.
- [ ] Contraste AA verificado; foco visible; navegable con teclado.
- [ ] Probada a 360 / 768 / 1280px con capturas.
- [ ] Estados cubiertos: carga (skeleton), vacío, error y éxito.
- [ ] Copy en español, verbos consistentes, errores accionables.
- [ ] `prefers-reduced-motion` respetado.
- [ ] Quitaste un adorno antes de terminar (si no puedes quitar ninguno, está bien).
