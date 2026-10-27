import type { Family } from '../../data/enemies';
import type { ItemType } from '../../data/items';

/**
 * Disegni originali, in coordinate 0-100. Un soggetto è una pila di strati in ordine di disegno:
 * - fill: forma su carta, con contorno · shade: zona in ombra (tratteggio, solo xilografia)
 * - ink: pieno d'inchiostro · line: tratto di dettaglio · gold: dettaglio dorato · eye: occhi/fulcro che brilla
 * Lo stesso disegno diventa xilografia (carte) o linea di luce (icone): vedi `render.ts`.
 */
export type LayerKind = 'fill' | 'shade' | 'ink' | 'line' | 'gold' | 'eye';
export type Layer = [LayerKind, string];
export type Subject = Layer[];

const L = (kind: LayerKind, d: string): Layer => [kind, d];
/** Cerchio come path (centro, raggio). */
const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

const SKULL = 'M50 34C38 34 32 42 32 52C32 60 36 64 40 66V76H60V66C64 64 68 60 68 52C68 42 62 34 50 34Z';
const SKULL_EYES = 'M38 50C40 45 46 46 47 52C45 56 40 56 38 50ZM62 50C60 45 54 46 53 52C55 56 60 56 62 50Z';
const SKULL_NOSE = 'M50 57L47 63H53Z';
const SKULL_TEETH = 'M40 70H60M45 70V76M50 70V76M55 70V76';

// ---------------------------------------------------------------- oggetti

export const ITEM_ART: Record<ItemType, Subject> = {
  arma: [
    L('fill', 'M74 10L90 10L90 26L42 74L26 58Z'),
    L('shade', 'M86 14L90 10L90 26L42 74L36 68Z'),
    L('line', 'M86 14L34 66'),
    L('ink', 'M33 67L37 71L22 86L18 82Z'),
    L('gold', 'M20 56L24 52L48 76L44 80Z'),
    L('gold', circle(16, 85, 5)),
  ],
  secondaria: [
    L('fill', 'M50 8L86 18C86 52 72 78 50 92C28 78 14 52 14 18Z'),
    L('shade', 'M50 8L86 18C86 52 72 78 50 92Z'),
    L('line', 'M50 16L78 24C78 52 66 72 50 84C34 72 22 52 22 24Z'),
    L('gold', 'M46 28h8v14h12v8h-12v20h-8v-20h-12v-8h12Z'),
  ],
  elmo: [
    L('fill', 'M24 86V44C24 22 36 10 50 10C64 10 76 22 76 44V86Z'),
    L('shade', 'M50 10C64 10 76 22 76 44V86H50Z'),
    L('line', 'M50 10V40M50 56V86M24 70H76'),
    L('ink', 'M30 44H70V51H30Z'),
    L('ink', 'M56 60h12v3h-12zM56 66h12v3h-12z'),
    L('gold', 'M44 12C44 2 56 2 56 12Z'),
  ],
  armatura: [
    L('fill', 'M30 14L42 20H58L70 14L86 26L78 44V84C66 90 34 90 22 84V44L14 26Z'),
    L('shade', 'M50 20H58L70 14L86 26L78 44V84C70 88 60 89 50 89Z'),
    L('line', 'M50 22V86M28 48C40 55 60 55 72 48M28 66C40 73 60 73 72 66'),
    L('gold', 'M42 20C44 28 56 28 58 20Z'),
  ],
  guanti: [
    L('fill', 'M28 90V58L22 44C20 38 26 34 30 38L36 46V22C36 16 44 16 44 22V40V16C44 10 52 10 52 16V40V20C52 14 60 14 60 20V42V26C60 20 68 20 68 26V60L64 90Z'),
    L('shade', 'M60 26C60 20 68 20 68 26V60L64 90H52V44L60 42Z'),
    L('line', 'M36 40V50M44 40V50M52 40V50M60 42V50M31 66H67M30 74H66'),
    L('gold', 'M28 84H65V92H28Z'),
  ],
  stivali: [
    L('fill', 'M30 10H56V56L84 66C90 68 90 82 84 84H26V60Z'),
    L('shade', 'M46 16H56V56L84 66C88 67 89 72 89 76H46Z'),
    L('line', 'M30 24H56M30 32H56M56 56C50 61 40 61 30 58'),
    L('ink', 'M24 84H88V91H24Z'),
    L('gold', 'M28 8H58V16H28Z'),
  ],
  cintura: [
    L('fill', 'M6 40C30 33 70 33 94 40V58C70 51 30 51 6 58Z'),
    L('shade', 'M6 50C30 43 70 43 94 50V58C70 51 30 51 6 58Z'),
    L('line', `${circle(76, 46, 1.8)}${circle(85, 47, 1.8)}`),
    L('gold', 'M37 31H63V65H37ZM44 38V58H56V38Z'),
    L('line', 'M50 38V58'),
  ],
  mantello: [
    L('fill', 'M38 10H62L70 30L88 90C70 84 60 92 50 86C40 92 30 84 12 90L30 30Z'),
    L('shade', 'M50 14H62L70 30L88 90C70 84 60 92 50 86Z'),
    L('line', 'M44 22L34 86M56 22L66 86M50 22V86'),
    L('ink', 'M41 11C43 22 57 22 59 11Z'),
    L('gold', circle(50, 14, 4.5)),
  ],
  anello: [
    L('fill', 'M50 38C66 38 78 50 78 64C78 78 66 90 50 90C34 90 22 78 22 64C22 50 34 38 50 38ZM50 46C38 46 30 54 30 64C30 74 38 82 50 82C62 82 70 74 70 64C70 54 62 46 50 46Z'),
    L('shade', 'M50 38C66 38 78 50 78 64C78 78 66 90 50 90V82C62 82 70 74 70 64C70 54 62 46 50 46Z'),
    L('gold', 'M38 30L50 12L62 30L50 42Z'),
    L('line', 'M44 21L50 30L56 21M38 30H62'),
  ],
  amuleto: [
    L('line', 'M22 6C28 30 40 40 50 44M78 6C72 30 60 40 50 44'),
    L('fill', 'M50 44L72 66L50 94L28 66Z'),
    L('shade', 'M50 44L72 66L50 94Z'),
    L('gold', 'M50 56L61 67L50 81L39 67Z'),
    L('eye', circle(50, 67, 3)),
  ],
  reliquia: [
    L('line', 'M50 2V9M34 5L39 11M66 5L61 11'),
    L('fill', 'M24 14H76C76 40 66 52 50 54C34 52 24 40 24 14Z'),
    L('shade', 'M50 14H76C76 40 66 52 50 54Z'),
    L('fill', 'M46 54H54V74H46Z'),
    L('fill', 'M28 88C28 78 40 74 50 74C60 74 72 78 72 88Z'),
    L('gold', 'M22 12H78V19H22Z'),
    L('gold', 'M47 24h6v8h8v6h-8v12h-6v-12h-8v-6h8Z'),
  ],
};

// ---------------------------------------------------------------- famiglie (nemici normali e campioni)

export const FAMILY_ART: Record<Family, Subject> = {
  // Lich: teschio incoronato nel cappuccio
  nonmorti: [
    L('fill', 'M14 98C14 50 28 14 50 12C72 14 86 50 86 98Z'),
    L('shade', 'M50 12C72 14 86 50 86 98H72C72 60 64 30 50 28Z'),
    L('ink', 'M28 98C28 60 36 30 50 28C64 30 72 60 72 98Z'),
    L('fill', SKULL),
    L('shade', 'M58 36C64 40 68 46 68 52C68 60 64 64 60 66V76H56C60 64 61 46 58 36Z'),
    L('ink', SKULL_NOSE),
    L('line', SKULL_TEETH),
    L('gold', 'M35 36L37 22L43 30L50 17L57 30L63 22L65 36Z'),
    L('eye', SKULL_EYES),
    L('line', 'M40 84L50 92L60 84M44 90L50 96L56 90'),
  ],
  // lupo, di fronte
  bestie: [
    L('fill', 'M18 10L34 34H66L82 10L84 44L74 66L50 92L26 66L16 44Z'),
    L('shade', 'M50 34H66L82 10L84 44L74 66L50 92Z'),
    L('ink', 'M22 18L32 34H26ZM78 18L68 34H74Z'),
    L('line', 'M50 34V76M22 44L36 47M78 44L64 47M38 68L44 78M62 68L56 78M44 84L46 90M56 84L54 90'),
    L('ink', 'M43 78H57L50 87Z'),
    L('eye', 'M31 50L44 54L33 58ZM69 50L56 54L67 58Z'),
  ],
  // incappucciato con la falce dell'Eclissi
  culto: [
    L('fill', 'M50 8C68 8 76 30 76 46L90 98H10L24 46C24 30 32 8 50 8Z'),
    L('shade', 'M50 8C68 8 76 30 76 46L90 98H50V88C56 84 58 80 58 76C58 70 54 66 50 64Z'),
    L('ink', 'M50 22C60 22 64 32 64 42C64 52 58 58 50 58C42 58 36 52 36 42C36 32 40 22 50 22Z'),
    L('line', 'M36 58L26 98M64 58L74 98'),
    L('gold', 'M50 62C59 62 64 69 64 76C64 83 59 90 50 90C56 86 58 81 58 76C58 71 56 66 50 62Z'),
    L('eye', 'M41 41h6v3h-6zM53 41h6v3h-6z'),
  ],
  // teschio cornuto tra le fiamme
  demoni: [
    L('fill', 'M33 33C21 28 15 17 18 6C23 17 31 22 40 25ZM67 33C79 28 85 17 82 6C77 17 69 22 60 25Z'),
    L('fill', 'M50 20C30 20 22 35 22 50C22 60 27 66 32 70V80H68V70C73 66 78 60 78 50C78 35 70 20 50 20Z'),
    L('shade', 'M58 21C71 25 78 37 78 50C78 60 73 66 68 70V80H60C66 62 66 38 58 21Z'),
    L('line', 'M50 22V34M30 40C36 35 42 34 46 36M70 40C64 35 58 34 54 36'),
    L('ink', 'M50 58L45.5 66.5H54.5Z'),
    L('line', 'M32 72.5H68M40 72.5V80M45 72.5V80M50 72.5V80M55 72.5V80M60 72.5V80'),
    L('eye', 'M33 49C35 43 44 44 47 51C44 57 35 56 33 49ZM67 49C65 43 56 44 53 51C56 57 65 56 67 49Z'),
    L('line', 'M30 96C34 90 29 87 34 82M50 98C55 90 47 88 52 83M70 96C66 90 71 87 66 82'),
  ],
  // occhio senza palpebre con tentacoli
  vuoto: [
    L('fill', 'M30 64C26 80 34 86 24 98C38 92 42 80 39 66ZM62 66C60 80 66 90 78 98C68 86 74 78 71 64ZM45 68C45 82 52 88 47 99C59 89 57 79 55 68Z'),
    L('fill', 'M6 50C26 22 74 22 94 50C74 78 26 78 6 50Z'),
    L('shade', 'M6 50H94C74 78 26 78 6 50Z'),
    L('ink', circle(50, 50, 16)),
    L('line', 'M20 35L13 26M34 27L30 16M50 24V12M66 27L70 16M80 35L87 26'),
    L('eye', 'M50 37C54 42 54 58 50 63C46 58 46 42 50 37Z'),
  ],
};

// ---------------------------------------------------------------- boss di zona (per id del modello)

export const BOSS_ART: Record<string, Subject> = {
  // lapide con la croce e la mano che risale
  custodeTombe: [
    L('fill', 'M28 92V34C28 18 38 10 52 10C66 10 78 18 78 34V92Z'),
    L('shade', 'M54 10C66 11 78 18 78 34V92H54Z'),
    L('ink', 'M50 22h6v12h10v6h-10v18h-6v-18h-10v-6h10Z'),
    L('line', 'M60 66L66 72L62 80M36 74L42 70'),
    L('fill', 'M14 94V74L9 64C8 60 12 58 15 62L18 68V52C18 49 22 49 22 52V66V48C22 45 26 45 26 48V66V50C26 47 30 47 30 50V70L28 94Z'),
    L('line', 'M6 94H94'),
    L('eye', `${circle(44, 84, 2.2)}${circle(54, 84, 2.2)}`),
  ],
  // lupa che ulula alla luna, di profilo col muso al cielo
  madreLupi: [
    L('gold', 'M22 4C32 4 40 12 40 22C40 32 32 40 22 40C28 34 30 28 30 22C30 16 28 10 22 4Z'),
    L('fill', 'M20 98L26 70C24 56 30 44 40 38L44 20L51 30L56 24L59 34C67 31 75 24 84 12L88 18C84 30 78 38 68 44C71 51 68 58 61 62C56 74 52 86 54 98Z'),
    L('shade', 'M59 34C67 31 75 24 84 12L88 18C84 30 78 38 68 44C71 51 68 58 61 62C56 74 52 86 54 98H42C48 80 54 62 52 46Z'),
    L('ink', 'M68 44C76 38 82 30 87 19C81 28 74 35 65 40Z'),
    L('line', 'M30 74L38 68M28 86L36 80M40 56L46 52M46 22L48 30'),
    L('eye', 'M52 39L58 37L55 42Z'),
  ],
  // mitra con l'occhio, bastone
  gerofante: [
    L('ink', 'M82 14H87V98H82Z'),
    L('gold', circle(84.5, 9, 6)),
    L('fill', 'M30 42H70L80 98H20Z'),
    L('shade', 'M50 42H70L80 98H50Z'),
    L('line', 'M50 60V98M40 64L34 98M60 64L66 98'),
    L('fill', 'M36 42L40 10L50 3L60 10L64 42Z'),
    L('ink', 'M39 42C39 58 61 58 61 42Z'),
    L('gold', 'M41 24C45 17 55 17 59 24C55 31 45 31 41 24Z'),
    L('eye', 'M44 45h4v2.5h-4zM52 45h4v2.5h-4z'),
  ],
  // incudine, martello e catene
  forgiatore: [
    L('ink', 'M52 6H84V22H52Z'),
    L('fill', 'M66 22H71V46H66Z'),
    L('fill', 'M12 46H80C80 54 72 58 64 58L68 70H76V80H24V70H32L36 58C24 58 12 54 12 46Z'),
    L('shade', 'M50 46H80C80 54 72 58 64 58L68 70H76V80H50Z'),
    L('line', 'M8 86c0-3 10-3 10 0s-10 3-10 0M18 90c0-3 10-3 10 0s-10 3-10 0M28 86c0-3 10-3 10 0s-10 3-10 0M64 86c0-3 10-3 10 0s-10 3-10 0M74 90c0-3 10-3 10 0s-10 3-10 0'),
    L('gold', 'M38 40L43 28L45 40ZM28 42L24 32L32 39ZM50 40L56 30L55 41Z'),
  ],
  // la Soglia: arco con l'occhio
  guardiano: [
    L('fill', 'M12 98V40C12 18 30 4 50 4C70 4 88 18 88 40V98H72V44C72 30 62 22 50 22C38 22 28 30 28 44V98Z'),
    L('shade', 'M72 22C82 26 88 32 88 40V98H72Z'),
    L('ink', 'M28 98V44C28 30 38 22 50 22C62 22 72 30 72 44V98Z'),
    L('line', 'M12 60H28M72 60H88M12 80H28M72 80H88M22 26L30 34M78 26L70 34M50 4V22'),
    L('eye', 'M34 58C41 46 59 46 66 58C59 70 41 70 34 58ZM50 52C52 55 52 61 50 64C48 61 48 55 50 52Z'),
  ],
  // teschio incoronato sul trono d'ossa
  reOssa: [
    L('fill', 'M14 98V30L25 20L36 30L50 13L64 30L75 20L86 30V98Z'),
    L('shade', 'M50 13L64 30L75 20L86 30V98H68V40L50 32Z'),
    L('ink', 'M24 98V40H76V98Z'),
    L('fill', SKULL),
    L('ink', SKULL_NOSE),
    L('line', SKULL_TEETH),
    L('gold', 'M33 37L35 22L42 30L50 16L58 30L65 22L67 37Z'),
    L('eye', SKULL_EYES),
    L('fill', 'M18 92L80 80L82 85L20 97ZM18 80L80 92L78 97L16 85Z'),
  ],
  // idra a tre teste dalla palude
  idra: [
    L('fill', 'M18 96C18 72 28 56 24 38L34 34C40 54 34 74 36 96ZM44 96C46 70 50 46 46 26L56 24C60 46 56 72 58 96ZM66 96C66 72 70 56 74 38L84 42C80 58 80 76 80 96Z'),
    L('line', 'M22 62L32 64M22 74L34 76M48 54L56 56M48 68L58 70M70 66L80 64M70 80L80 78'),
    L('fill', 'M14 38L22 22C26 16 36 16 38 24L36 36L26 34L18 42ZM40 26L46 8C50 2 60 4 60 12L58 26L50 22L44 30ZM70 40L74 24C78 18 88 20 88 28L88 40L80 36L74 44Z'),
    L('ink', 'M18 42L26 34L36 36L30 40ZM44 30L50 22L58 26L52 29ZM74 44L80 36L88 40L82 43Z'),
    L('line', 'M22 38l1 4M30 36l-1 4M48 26l0 4M54 25l-1 4M78 40l0 4M84 39l-1 4'),
    L('ink', 'M2 92C20 85 30 99 50 92C70 85 80 99 98 92V100H2Z'),
    L('eye', `${circle(30, 24, 2.2)}${circle(53, 11, 2.2)}${circle(81, 28, 2.2)}`),
  ],
  // profeta davanti al sole nero
  profeta: [
    L('gold', 'M50 2C71 2 86 17 86 38C86 59 71 74 50 74C29 74 14 59 14 38C14 17 29 2 50 2ZM50 9C66 9 79 22 79 38C79 54 66 67 50 67C34 67 21 54 21 38C21 22 34 9 50 9Z'),
    L('ink', 'M50 9C66 9 79 22 79 38C79 54 66 67 50 67C34 67 21 54 21 38C21 22 34 9 50 9Z'),
    L('fill', 'M50 24C58 24 62 32 62 40C62 46 60 50 58 52L78 98H22L42 52C40 50 38 46 38 40C38 32 42 24 50 24Z'),
    L('shade', 'M50 24C58 24 62 32 62 40C62 46 60 50 58 52L78 98H50Z'),
    L('line', 'M50 56V98M44 60L34 98M56 60L66 98'),
    L('eye', 'M43 39h5v2.5h-5zM52 39h5v2.5h-5z'),
  ],
  // arcidemone alato
  arcidemone: [
    L('fill', 'M50 40L8 18C13 40 4 54 11 72L30 61L50 72ZM50 40L92 18C87 40 96 54 89 72L70 61L50 72Z'),
    L('line', 'M48 44L13 25M48 51L8 46M48 57L13 65M52 44L87 25M52 51L92 46M52 57L87 65'),
    L('fill', 'M42 30C36 24 34 16 38 7C40 16 44 22 47 26ZM58 30C64 24 66 16 62 7C60 16 56 22 53 26Z'),
    L('fill', 'M50 25C58 25 62 31 62 39L67 96H33L38 39C38 31 42 25 50 25Z'),
    L('shade', 'M50 25C58 25 62 31 62 39L67 96H50Z'),
    L('line', 'M44 56H56M43 66H57M42 76H58'),
    L('ink', 'M18 100C22 90 18 86 24 79C28 87 32 85 32 79C38 87 36 92 42 100ZM58 100C64 92 62 88 68 79C70 85 74 87 76 79C82 86 78 90 82 100Z'),
    L('eye', 'M43 35L48 37L44 39ZM57 35L52 37L56 39Z'),
  ],
  // il Sole prigioniero dell'Eclissi
  eclissi: [
    L('line', 'M50 1V13M50 87V99M1 50H13M87 50H99M15 15L24 24M85 85L76 76M85 15L76 24M15 85L24 76'),
    L('gold', 'M50 13C70 13 87 30 87 50C87 70 70 87 50 87C30 87 13 70 13 50C13 30 30 13 50 13Z'),
    L('ink', 'M55 17C73 17 85 32 85 50C85 68 73 83 55 83C37 83 25 68 25 50C25 32 37 17 55 17Z'),
    L('line', 'M6 38L94 62M6 62L94 38'),
    L('eye', 'M44 45C44 39 52 39 52 45C52 39 60 39 60 45C60 53 52 57 52 62C52 57 44 53 44 45Z'),
  ],
  // regina incoronata con i capelli sciolti nell'acqua nera
  reginaAnnegata: [
    L('fill', 'M30 40C18 52 26 66 16 80C12 88 20 94 14 100H86C80 94 88 88 84 80C74 66 82 52 70 40Z'),
    L('shade', 'M50 40H70C82 52 74 66 84 80C88 88 80 94 86 100H50Z'),
    L('fill', 'M50 22C61 22 66 31 66 42C66 54 60 62 50 62C40 62 34 54 34 42C34 31 39 22 50 22Z'),
    L('shade', 'M56 23C62 26 66 33 66 42C66 54 60 62 52 62C58 54 59 36 56 23Z'),
    L('gold', 'M35 26L37 12L43 20L50 8L57 20L63 12L65 26Z'),
    L('line', 'M45 54C48 56 52 56 55 54M24 70C30 66 34 74 40 70M60 74C66 70 70 78 76 74M20 86C28 82 34 90 42 86M58 90C66 86 72 94 80 90'),
    L('ink', 'M0 92C16 86 26 98 50 92C74 86 84 98 100 92V100H0Z'),
    L('eye', 'M41 41h6v2.5h-6zM53 41h6v2.5h-6z'),
  ],
  // verme ad anelli che emerge con la bocca di zanne
  verme: [
    L('fill', 'M28 100C26 80 30 64 40 52C30 42 30 24 42 14C54 4 76 8 82 24C88 40 78 54 64 56C58 68 58 84 62 100Z'),
    L('shade', 'M64 56C58 68 58 84 62 100H46C44 84 46 68 54 56Z'),
    L('line', 'M30 88C38 90 52 90 60 88M31 76C40 78 52 78 59 76M35 64C42 66 52 66 58 64'),
    L('ink', circle(62, 30, 15)),
    L('fill', 'M52 20L56 26L50 25ZM62 15L64 22L58 20ZM72 19L70 26L66 21ZM76 30L70 32L72 26ZM72 41L66 37L72 35ZM62 45L60 38L66 40ZM52 40L56 34L58 40ZM48 30L54 28L52 34Z'),
    L('eye', circle(62, 30, 3)),
    L('ink', 'M0 96C20 90 80 90 100 96V100H0Z'),
  ],
  // libro aperto con l'occhio e la candela
  archivista: [
    L('fill', 'M6 46C22 40 38 42 50 50C62 42 78 40 94 46V90C78 84 62 86 50 94C38 86 22 84 6 90Z'),
    L('shade', 'M50 50C62 42 78 40 94 46V90C78 84 62 86 50 94Z'),
    L('line', 'M50 50V94M14 56C24 53 34 54 42 58M14 64C24 61 34 62 42 66M14 72C24 69 34 70 42 74M14 80C24 77 34 78 42 82'),
    L('eye', 'M58 66C64 58 80 58 86 66C80 74 64 74 58 66Z'),
    L('ink', circle(72, 66, 3.4)),
    L('fill', 'M22 20H30V42H22Z'),
    L('gold', 'M26 4C30 10 32 14 26 18C20 14 22 10 26 4Z'),
    L('line', 'M26 18V20M18 42H34'),
  ],
  // cavaliere coperto di cenere con lo stendardo bruciato
  cavaliereCenere: [
    L('ink', 'M70 4H74V98H70Z'),
    L('fill', 'M74 6H94L88 16L94 26H74Z'),
    L('line', 'M78 12L86 20M80 22L84 18'),
    L('fill', 'M30 18C30 10 38 6 46 6C54 6 62 10 62 18V44H30Z'),
    L('shade', 'M46 6C54 6 62 10 62 18V44H46Z'),
    L('ink', 'M34 24H58V29H34Z'),
    L('line', 'M46 6V22M46 31V44'),
    L('gold', 'M44 6C42 0 50 0 48 6Z'),
    L('fill', 'M18 98C18 66 28 50 46 48C64 50 72 66 72 98Z'),
    L('shade', 'M46 48C64 50 72 66 72 98H52C54 76 52 60 46 48Z'),
    L('line', 'M30 64L40 74L30 84M62 64L52 74L62 84'),
    L('line', 'M8 40l2 4M14 30l-2 4M84 48l2 4M12 60l2 3M90 70l-2 3'),
    L('eye', 'M39 25h4v2.5h-4zM49 25h4v2.5h-4z'),
  ],
  // ragnatela tra le stelle spente con l'occhio al centro
  tessitrice: [
    L('line', 'M50 0V100M0 50H100M8 8L92 92M92 8L8 92'),
    L('line', 'M50 18L72 28L82 50L72 72L50 82L28 72L18 50L28 28Z'),
    L('line', 'M50 6L81 19L94 50L81 81L50 94L19 81L6 50L19 19Z'),
    L('fill', 'M50 32C62 32 68 40 68 50C68 60 62 68 50 68C38 68 32 60 32 50C32 40 38 32 50 32Z'),
    L('shade', 'M50 32C62 32 68 40 68 50C68 60 62 68 50 68Z'),
    L('fill', 'M34 42L20 34L12 40M34 50L16 50L8 58M66 42L80 34L88 40M66 50L84 50L92 58M38 62L28 74L28 86M62 62L72 74L72 86'),
    L('eye', 'M42 46C46 42 54 42 58 46C54 50 46 50 42 46Z'),
    L('ink', circle(50, 46, 2)),
    L('gold', `${circle(14, 14, 2.6)}${circle(86, 86, 2.6)}${circle(88, 16, 2)}${circle(12, 84, 2)}`),
  ],
  // elmo vuoto senza volto davanti agli stendardi incrociati
  generale: [
    L('line', 'M10 10L60 96M90 10L40 96'),
    L('fill', 'M10 10L28 10L24 22L30 30L14 34ZM90 10L72 10L76 22L70 30L86 34Z'),
    L('fill', 'M28 90C28 46 36 22 50 20C64 22 72 46 72 90Z'),
    L('shade', 'M50 20C64 22 72 46 72 90H54C56 60 56 36 50 20Z'),
    L('ink', 'M38 44C38 36 44 32 50 32C56 32 62 36 62 44V64C58 70 42 70 38 64Z'),
    L('line', 'M50 20V32M30 76H70M32 84H68'),
    L('gold', 'M44 20C44 10 50 2 50 2C50 2 56 10 56 20Z'),
    L('eye', 'M43 48h5v2h-5zM52 48h5v2h-5z'),
  ],
  // arpia con le ali aperte e gli artigli
  arpia: [
    L('fill', 'M46 40L4 16C10 36 2 52 10 66L28 56L46 62ZM54 40L96 16C90 36 98 52 90 66L72 56L54 62Z'),
    L('line', 'M44 44L12 26M44 50L8 44M44 56L12 60M56 44L88 26M56 50L92 44M56 56L88 60'),
    L('fill', 'M50 18C58 18 62 24 62 32C62 38 58 42 56 44L62 76H38L44 44C42 42 38 38 38 32C38 24 42 18 50 18Z'),
    L('shade', 'M50 18C58 18 62 24 62 32C62 38 58 42 56 44L62 76H50Z'),
    L('line', 'M42 52H58M41 60H59M40 68H60'),
    L('ink', 'M38 14C42 8 58 8 62 14L60 22C56 18 44 18 40 22Z'),
    L('line', 'M40 76L36 92M36 92L30 96M36 92L36 98M36 92L42 96M60 76L64 92M64 92L58 96M64 92L64 98M64 92L70 96'),
    L('eye', 'M43 30L48 32L44 34ZM57 30L52 32L56 34Z'),
  ],
  // astrologo bendato col cannocchiale e la luna
  astrologo: [
    L('gold', 'M74 6C84 6 92 14 92 24C92 34 84 42 74 42C80 36 82 30 82 24C82 18 80 12 74 6Z'),
    L('gold', `${circle(14, 10, 2)}${circle(28, 22, 1.6)}${circle(58, 8, 1.8)}${circle(8, 32, 1.4)}`),
    L('fill', 'M50 30C60 30 64 38 64 46C64 52 62 56 60 58L80 98H20L40 58C38 56 36 52 36 46C36 38 40 30 50 30Z'),
    L('shade', 'M50 30C60 30 64 38 64 46C64 52 62 56 60 58L80 98H50Z'),
    L('ink', 'M36 42H64V48H36Z'),
    L('line', 'M50 62V98M44 66L34 98M56 66L66 98'),
    L('fill', 'M56 70L86 50L90 56L60 76Z'),
    L('ink', 'M84 48L92 44L96 52L90 56Z'),
    L('line', 'M40 20L50 30L60 20'),
  ],
  // principe cornuto con la corona fusa, tra le fiamme
  principe: [
    L('ink', 'M6 100C10 82 4 74 14 60C16 72 22 74 22 66C30 78 26 88 30 100ZM70 100C74 88 70 78 78 66C78 74 84 72 86 60C96 74 90 82 94 100Z'),
    L('fill', 'M36 30C26 26 20 16 22 4C27 14 34 18 42 20ZM64 30C74 26 80 16 78 4C73 14 66 18 58 20Z'),
    L('fill', 'M50 20C62 20 68 30 68 42C68 52 62 58 58 60L74 98H26L42 60C38 58 32 52 32 42C32 30 38 20 50 20Z'),
    L('shade', 'M50 20C62 20 68 30 68 42C68 52 62 58 58 60L74 98H50Z'),
    L('gold', 'M34 30L36 20L42 26L50 16L58 26L64 20L66 30C60 34 40 34 34 30Z'),
    L('line', 'M38 34C40 38 42 42 41 46M62 34C60 38 58 42 59 46M42 52C46 55 54 55 58 52'),
    L('line', 'M50 64V98M42 70L36 98M58 70L64 98'),
    L('eye', 'M40 40L47 42L41 45ZM60 40L53 42L59 45Z'),
  ],
  // ombra nera che stringe il sole liberato
  ombraSole: [
    L('gold', 'M50 4C60 4 68 12 68 22C68 32 60 40 50 40C40 40 32 32 32 22C32 12 40 4 50 4Z'),
    L('line', 'M50 44V48M26 22H22M78 22H74M33 5L30 2M67 5L70 2M33 39L30 42M67 39L70 42'),
    L('ink', 'M50 46C64 46 72 56 74 70L96 64C90 76 84 82 76 84L80 100H20L24 84C16 82 10 76 4 64L26 70C28 56 36 46 50 46Z'),
    L('ink', 'M26 70L14 44L22 46L18 30L30 40L32 30C34 34 34 40 32 44M74 70L86 44L78 46L82 30L70 40L68 30C66 34 66 40 68 44'),
    L('eye', 'M40 60L47 62L41 65ZM60 60L53 62L59 65Z'),
  ],
};

/** Il guerriero della Luce: elmo, spada alzata e alone (solo in linea di luce). */
export const HERO_ART: Subject = [
  L('line', `${circle(50, 32, 26)}M50 0V4M22 8L25 11M78 8L75 11M10 32H14M86 32H90`),
  L('fill', 'M18 98C18 74 32 62 50 62C68 62 82 74 82 98'),
  L('fill', 'M36 58V36C36 24 42 18 50 18C58 18 64 24 64 36V58Z'),
  L('ink', 'M40 36H60V41H40Z'),
  L('line', 'M50 18V32M50 46V58'),
  L('gold', 'M50 48V99M41 72H59'),
  L('eye', 'M44 38h4v1.5h-4zM52 38h4v1.5h-4z'),
];
