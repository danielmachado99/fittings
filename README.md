# Parametric 3D-Printable Plumbing Fitting Generator (v1)

Client-side web app for generating **straight BSPP/BSPT adapters** as downloadable STL.

## Safety and scope
- 3D-print prototype / low-pressure use only.
- No pressure rating, certification, or code-compliance claims.
- v1 only supports straight adapters, BSPP/BSPT, and End A/End B with male/female options.

## Tech stack
- UI + preview: JavaScript + Three.js
- Geometry engine: Rust compiled to WebAssembly (`wasm-bindgen`)
- STL export: browser-side binary STL writer

## Parameter schema
```json
{
  "endA": { "standard": "BSPP", "size": "1/2", "gender": "female" },
  "endB": { "standard": "BSPT", "size": "3/4", "gender": "male" },
  "body": { "type": "straight", "length_mm": 40 },
  "wall_thickness_mm": 3,
  "tolerance_mm": 0.15,
  "resolution": { "radial_segments": 64, "turns_per_thread": 5 }
}
```

## Build and run
1. Build the WASM package into `wasm/pkg`:
   ```bash
   cd wasm
   wasm-pack build --target web --out-dir pkg
   cd ..
   ```
2. Install dependencies and run app:
   ```bash
   npm install
   npm run dev
   ```
3. Open `http://localhost:5173`.


## Windows setup (PowerShell)
1. Install prerequisites:
   ```powershell
   winget install OpenJS.NodeJS.LTS
   winget install Rustlang.Rustup
   cargo install wasm-pack
   ```
2. Build WASM + run app:
   ```powershell
   cd wasm
   wasm-pack build --target web --out-dir pkg
   cd ..
   npm install
   npm run dev
   ```

## Troubleshooting
- **Error:** `Cannot read properties of undefined (reading 'byteLength')` when loading WASM.
  - Rebuild package to ensure glue JS and `.wasm` match:
    ```powershell
    cd wasm
    wasm-pack build --target web --out-dir pkg
    cd ..
    ```
  - Ensure app is run with Vite (`npm run dev`) instead of opening `index.html` directly from disk.
  - This project now loads the `.wasm` file via an explicit Vite URL import to avoid ambiguous runtime resolution.

## Geometry assumptions and limits
- All dimensions are in millimeters.
- BSP size table is explicit and local (no inferred dimensions).
- Threads are generated parametrically as helical triangular profiles.
- BSPT taper is approximated as diameter taper 1:16.
- Internal (female) threads are generated as parametric internal helical surfaces (not post-edit mesh booleans).
- Mesh facet resolution is user-configurable for printable balance.

## Project structure
- `src/main.js` - Three.js scene, controls, interaction, regeneration flow.
- `src/params.js` - parameter model, validation, and UI controls.
- `src/standards.js` - explicit BSP lookup table.
- `src/stl.js` - binary STL export with normals.
- `wasm/src/lib.rs` - WebAssembly geometry engine.
- `index.html`, `src/styles.css` - app shell and styling.
