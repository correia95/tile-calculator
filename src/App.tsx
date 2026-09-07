import { useEffect, useMemo, useState } from 'react';
import { DEFAULTS, type Inputs, TILE_PRESETS, calculate, money, n1 } from './calc';

const KEYS: (keyof Inputs)[] = [
  'areaM2', 'lengthM', 'widthM', 'openingsM2', 'tileW', 'tileH', 'groutMm', 'wastagePct', 'tilesPerBox', 'pricePerBox',
];

function readUrl(): Inputs {
  const out = { ...DEFAULTS };
  try {
    const p = new URLSearchParams(window.location.search);
    for (const k of KEYS) {
      const v = p.get(k);
      if (v != null && v !== '' && Number.isFinite(Number(v))) (out[k] as number) = Number(v);
    }
    if (p.get('m') === 'room') out.mode = 'room';
  } catch {
    /* ignore */
  }
  return out;
}

function Num({
  label, suffix, value, onChange, step,
}: {
  label: string; suffix?: string; value: number; onChange: (n: number) => void; step?: number;
}) {
  return (
    <label className="f">
      <span>{label}</span>
      <div className="ibox">
        <input
          type="number"
          inputMode="decimal"
          step={step ?? 1}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        />
        {suffix && <i>{suffix}</i>}
      </div>
    </label>
  );
}

export default function App() {
  const [inp, setInp] = useState<Inputs>(readUrl);
  const [copied, setCopied] = useState(false);
  const set = (patch: Partial<Inputs>) => setInp((p) => ({ ...p, ...patch }));

  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      for (const k of KEYS) u.searchParams.set(k, String(inp[k]));
      u.searchParams.set('m', inp.mode);
      window.history.replaceState(null, '', u.toString());
    } catch {
      /* ignore */
    }
  }, [inp]);

  const r = useMemo(() => calculate(inp), [inp]);
  const activePreset = TILE_PRESETS.find((p) => p.w === inp.tileW && p.h === inp.tileH);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="app">
      <header>
        <h1>Tile Calculator</h1>
        <p className="tag">
          How many tiles you need for a floor or wall — with grout gaps and a wastage allowance
          factored in, rounded up to whole boxes, plus rough adhesive and grout quantities.
        </p>
      </header>

      <div className="cols">
        <form className="panel form" onSubmit={(e) => e.preventDefault()}>
          <div className="seg">
            <button type="button" className={inp.mode === 'area' ? 'on' : ''} onClick={() => set({ mode: 'area' })}>
              By area
            </button>
            <button type="button" className={inp.mode === 'room' ? 'on' : ''} onClick={() => set({ mode: 'room' })}>
              By room size
            </button>
          </div>

          {inp.mode === 'area' ? (
            <Num label="Area to tile" suffix="m²" value={inp.areaM2} onChange={(n) => set({ areaM2: n })} step={0.5} />
          ) : (
            <>
              <div className="two">
                <Num label="Length" suffix="m" value={inp.lengthM} onChange={(n) => set({ lengthM: n })} step={0.1} />
                <Num label="Width" suffix="m" value={inp.widthM} onChange={(n) => set({ widthM: n })} step={0.1} />
              </div>
              <Num label="Subtract for doorways / fixtures" suffix="m²" value={inp.openingsM2} onChange={(n) => set({ openingsM2: n })} step={0.1} />
            </>
          )}

          <h2>Tile</h2>
          <div className="presets">
            {TILE_PRESETS.map((p) => (
              <button
                type="button"
                key={p.label}
                className={activePreset?.label === p.label ? 'on' : ''}
                onClick={() => set({ tileW: p.w, tileH: p.h })}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="two">
            <Num label="Tile width" suffix="mm" value={inp.tileW} onChange={(n) => set({ tileW: n })} step={10} />
            <Num label="Tile height" suffix="mm" value={inp.tileH} onChange={(n) => set({ tileH: n })} step={10} />
          </div>
          <div className="two">
            <Num label="Grout gap" suffix="mm" value={inp.groutMm} onChange={(n) => set({ groutMm: n })} step={0.5} />
            <Num label="Wastage" suffix="%" value={inp.wastagePct} onChange={(n) => set({ wastagePct: n })} step={1} />
          </div>

          <h2>Buying</h2>
          <div className="two">
            <Num label="Tiles per box" value={inp.tilesPerBox} onChange={(n) => set({ tilesPerBox: n })} />
            <Num label="Price per box" suffix="$" value={inp.pricePerBox} onChange={(n) => set({ pricePerBox: n })} step={5} />
          </div>
          <p className="note">
            10% wastage suits a simple layout; use 15% for a diagonal lay, lots of cuts, or a large-format
            tile. Nothing is uploaded.
          </p>
        </form>

        <div className="panel result">
          <div className="headline">
            <span>You need</span>
            <strong>{r.tilesWithWastage.toLocaleString()} tiles</strong>
            <span>
              for {n1(r.netAreaM2)} m²
              {r.boxes > 0 ? ` · ${r.boxes} box${r.boxes === 1 ? '' : 'es'}` : ''}
              {r.cost != null ? ` · ${money(r.cost)}` : ''}
            </span>
          </div>

          <table className="bd">
            <tbody>
              <tr><th>Area to cover</th><td>{n1(r.netAreaM2)} m²</td></tr>
              <tr><th>Tile footprint (with {inp.groutMm} mm grout)</th><td>{(r.tileAreaM2 * 10000).toFixed(0)} cm²</td></tr>
              <tr><th>Tiles to cover the area</th><td>{Math.ceil(r.tilesExact)}</td></tr>
              <tr><th>+ {inp.wastagePct}% wastage</th><td>{r.tilesWithWastage}</td></tr>
              {r.boxes > 0 && (
                <>
                  <tr className="sub"><th>Buy {r.boxes} box{r.boxes === 1 ? '' : 'es'} of {inp.tilesPerBox}</th><td>{r.tilesPurchased} tiles</td></tr>
                  <tr><th>Left over</th><td>{r.leftoverTiles} tiles</td></tr>
                </>
              )}
              <tr><th>Tile adhesive (20 kg bags)</th><td>≈ {r.adhesiveBags}</td></tr>
              <tr><th>Grout</th><td>≈ {r.groutKg} kg</td></tr>
            </tbody>
          </table>

          <button className="share" onClick={share}>{copied ? 'Link copied' : 'Copy shareable link'}</button>
        </div>
      </div>

      <p className="disclaimer">
        An estimate. Adhesive coverage depends on the trowel notch and how flat the surface is; grout
        use depends on the tile depth and grout type. Layout, pattern, feature strips and out-of-square
        rooms all change the tile count. Always buy from a single batch and keep spares.
      </p>

      <section className="explainer">
        <h2>How the tile count works</h2>
        <p>
          Each tile effectively covers its own size <em>plus one grout joint</em> on two sides — a
          600&nbsp;mm tile with a 3&nbsp;mm gap tiles as if it were 603&nbsp;mm. Divide the area you
          are covering by that effective tile size to get the bare number of tiles, then add a
          wastage percentage for cuts, breakages and future repairs, and round up to whole boxes.
        </p>
        <h3>How much wastage should I allow?</h3>
        <table>
          <tbody>
            <tr><td>10%</td><td>Straight lay, square room, standard tile</td></tr>
            <tr><td>15%</td><td>Diagonal lay, lots of cuts, or large-format tiles</td></tr>
            <tr><td>20%+</td><td>Herringbone or other complex patterns, or a very irregular room</td></tr>
          </tbody>
        </table>
        <p>
          Whatever the layout, keep at least a few spare tiles from the same batch — colours shift
          between production runs and a replacement years later rarely matches.
        </p>
        <h3>Adhesive and grout</h3>
        <p>
          The adhesive figure assumes roughly 4&nbsp;m² per 20&nbsp;kg bag, which is typical for a
          6&nbsp;mm notched trowel on a flat surface; a bigger notch or an uneven floor uses more.
          Grout use rises sharply as tiles get smaller — a mosaic uses several times the grout per
          square metre that a 600&nbsp;mm tile does — and the estimate here already includes an
          allowance for mixing waste.
        </p>
        <h3>Wall vs floor</h3>
        <p>
          The maths is the same for walls; just enter the wall area (height × length) and subtract
          windows and any area behind a vanity or bath that will not be tiled. Wall tiles are usually
          thinner and lighter, so check the tiles-per-box figure on the actual product.
        </p>
        <h3>Is anything sent to a server?</h3>
        <p>No. It is all arithmetic in your browser; your inputs are only stored in the page link.</p>
        <footer>Tile Calculator · metric · estimate only · runs in your browser · no sign-up</footer>
      </section>
    </div>
  );
}
