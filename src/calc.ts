// Tile quantity estimator. Areas in m², tile dimensions in mm. Pure functions.

export interface Inputs {
  mode: 'area' | 'room';
  areaM2: number; // area mode
  lengthM: number; // room mode
  widthM: number; // room mode
  openingsM2: number; // doors / fixtures to subtract (room mode)
  tileW: number; // mm
  tileH: number; // mm
  groutMm: number; // grout joint width
  wastagePct: number;
  tilesPerBox: number; // 0 = don't compute boxes
  pricePerBox: number; // 0 = hide cost
}

export const DEFAULTS: Inputs = {
  mode: 'area',
  areaM2: 12,
  lengthM: 4,
  widthM: 3,
  openingsM2: 0,
  tileW: 600,
  tileH: 600,
  groutMm: 3,
  wastagePct: 10,
  tilesPerBox: 4,
  pricePerBox: 0,
};

export interface Result {
  netAreaM2: number;
  tileAreaM2: number; // effective area of one tile incl. grout joint
  tilesExact: number;
  tilesWithWastage: number; // rounded up
  boxes: number;
  tilesPurchased: number;
  leftoverTiles: number;
  adhesiveBags: number; // 20 kg bags, ~4 m²/bag at 6mm notch
  groutKg: number;
  cost: number | null;
}

// Grout consumption per m² of tiling.
// Joint volume per m² (litres) = jointWidth(mm) · jointDepth(mm) · (L+W)/(L·W)
// (1 L = 1e6 mm³, and the mm-unit factors already cancel to give L per m²).
// × density (kg/L) × a 1.35 real-world waste/overfill factor.
function groutKgPerM2(tileW: number, tileH: number, jointMm: number): number {
  const jointDepth = 10; // mm — roughly the tile thickness for larger formats
  const density = 1.8; // kg/L, mixed cement grout
  const waste = 1.35;
  const litresPerM2 = jointMm * jointDepth * ((tileW + tileH) / (tileW * tileH));
  return litresPerM2 * density * waste;
}

export function calculate(i: Inputs): Result {
  const gross =
    i.mode === 'room' ? Math.max(0, i.lengthM) * Math.max(0, i.widthM) : Math.max(0, i.areaM2);
  const netAreaM2 = Math.max(0, gross - (i.mode === 'room' ? Math.max(0, i.openingsM2) : 0));

  const effW = (i.tileW + i.groutMm) / 1000; // m
  const effH = (i.tileH + i.groutMm) / 1000;
  const tileAreaM2 = effW * effH;

  const tilesExact = tileAreaM2 > 0 ? netAreaM2 / tileAreaM2 : 0;
  const tilesWithWastage = Math.ceil(tilesExact * (1 + Math.max(0, i.wastagePct) / 100));

  const boxes = i.tilesPerBox > 0 ? Math.max(netAreaM2 > 0 ? 1 : 0, Math.ceil(tilesWithWastage / i.tilesPerBox)) : 0;
  const tilesPurchased = boxes > 0 ? boxes * i.tilesPerBox : tilesWithWastage;
  const leftoverTiles = tilesPurchased - tilesWithWastage;

  const adhesiveBags = Math.ceil(netAreaM2 / 4); // ~4 m² per 20kg bag at 6mm notch
  const groutKg = Math.ceil(netAreaM2 * groutKgPerM2(i.tileW, i.tileH, i.groutMm) * 10) / 10;

  const cost = i.pricePerBox > 0 && boxes > 0 ? boxes * i.pricePerBox : null;

  return {
    netAreaM2,
    tileAreaM2,
    tilesExact,
    tilesWithWastage,
    boxes,
    tilesPurchased,
    leftoverTiles,
    adhesiveBags: netAreaM2 > 0 ? Math.max(1, adhesiveBags) : 0,
    groutKg,
    cost,
  };
}

export const TILE_PRESETS: { label: string; w: number; h: number }[] = [
  { label: '600 × 600', w: 600, h: 600 },
  { label: '300 × 600', w: 300, h: 600 },
  { label: '300 × 300', w: 300, h: 300 },
  { label: '200 × 200', w: 200, h: 200 },
  { label: '150 × 150', w: 150, h: 150 },
  { label: '100 × 300 (subway)', w: 100, h: 300 },
  { label: '450 × 450', w: 450, h: 450 },
  { label: '800 × 800', w: 800, h: 800 },
];

export const n1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString('en-AU');
export const money = (n: number) =>
  n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
