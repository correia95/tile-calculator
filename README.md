# tile-calculator

How many tiles for a floor or wall. Area or room-size mode (minus doorway/fixture
allowance), tile size (8 presets + custom), grout gap, wastage %, tiles-per-box
and price → tile count with grout joints + wastage, rounded to whole boxes, plus
rough adhesive (20 kg bags @ ~4 m²) and grout (kg) quantities. Inputs in the URL.

**Live:** https://tile-calculator.correia95.workers.dev/

## Stack

- React 18 + TypeScript + Vite, no runtime deps beyond React
- Static-assets Cloudflare Worker

## Engine

[`src/calc.ts`](src/calc.ts): effective tile area = (w + gap)(h + gap); tiles =
net area ÷ that, × (1 + wastage%), `Math.ceil`; boxes = ceil(tiles ÷ per-box).
Grout kg/m² = jointW · jointDepth · (w+h)/(w·h) · density · 1.35 waste factor
(litres → kg), which lands near manufacturer economy figures and rises correctly
for small tiles.

Verified in Node: 12 m² / 600×600 / 3 mm / 10% → 37 tiles / 10 boxes of 4 / 3
adhesive bags / 3 kg grout; subway 100×300 uses more grout/m²; 800×800 uses less.

## Develop / deploy

```bash
npm install
npm run dev
npm run deploy
```
