import { BSP_TABLE, GENDERS, SIZES, STANDARDS } from './standards.js';

export const defaultParams = {
  endA: { standard: 'BSPP', size: '1/2', gender: 'female' },
  endB: { standard: 'BSPT', size: '3/4', gender: 'male' },
  body: { type: 'straight', length_mm: 40 },
  wall_thickness_mm: 3,
  tolerance_mm: 0.15,
  resolution: { radial_segments: 64, turns_per_thread: 5 },
};

export function sanitizeParams(raw) {
  const p = structuredClone(raw);
  for (const end of ['endA', 'endB']) {
    if (!STANDARDS.includes(p[end].standard)) p[end].standard = 'BSPP';
    if (!SIZES.includes(p[end].size)) p[end].size = '1/2';
    if (!GENDERS.includes(p[end].gender)) p[end].gender = 'male';
  }
  p.body.type = 'straight';
  p.body.length_mm = clamp(Number(p.body.length_mm) || 40, 20, 120);
  p.wall_thickness_mm = clamp(Number(p.wall_thickness_mm) || 3, 1.2, 8);
  p.tolerance_mm = clamp(Number(p.tolerance_mm) || 0.15, 0, 0.4);
  p.resolution.radial_segments = Math.round(clamp(Number(p.resolution.radial_segments) || 64, 24, 160));
  p.resolution.turns_per_thread = Math.round(clamp(Number(p.resolution.turns_per_thread) || 5, 3, 10));

  const maxMinor = Math.min(...['endA', 'endB'].map((end) => BSP_TABLE[p[end].size].major_d_mm)) - 2.4;
  const maxWall = Math.max(1.2, maxMinor / 2 - 0.6);
  p.wall_thickness_mm = clamp(p.wall_thickness_mm, 1.2, maxWall);
  return p;
}

export function buildControls(container, params, onChange) {
  container.innerHTML = '';
  const rows = [];

  rows.push(section('End A', [
    selectControl('Standard', params.endA.standard, STANDARDS, (v) => (params.endA.standard = v)),
    selectControl('Size', params.endA.size, SIZES, (v) => (params.endA.size = v)),
    selectControl('Gender', params.endA.gender, GENDERS, (v) => (params.endA.gender = v)),
  ]));

  rows.push(section('End B', [
    selectControl('Standard', params.endB.standard, STANDARDS, (v) => (params.endB.standard = v)),
    selectControl('Size', params.endB.size, SIZES, (v) => (params.endB.size = v)),
    selectControl('Gender', params.endB.gender, GENDERS, (v) => (params.endB.gender = v)),
  ]));

  rows.push(section('Body', [
    rangeControl('Length (mm)', params.body.length_mm, 20, 120, 1, (v) => (params.body.length_mm = Number(v))),
    rangeControl('Wall thickness (mm)', params.wall_thickness_mm, 1.2, 8, 0.1, (v) => (params.wall_thickness_mm = Number(v))),
    rangeControl('Tolerance (mm)', params.tolerance_mm, 0, 0.4, 0.01, (v) => (params.tolerance_mm = Number(v))),
    rangeControl('Facet radial segments', params.resolution.radial_segments, 24, 160, 4, (v) => (params.resolution.radial_segments = Number(v))),
  ]));

  rows.forEach((r) => {
    container.appendChild(r);
    r.querySelectorAll('input,select').forEach((el) => el.addEventListener('input', () => onChange()));
  });
}

function section(title, controls) {
  const div = document.createElement('section');
  div.className = 'section';
  const h = document.createElement('h2');
  h.textContent = title;
  div.appendChild(h);
  controls.forEach((c) => div.appendChild(c));
  return div;
}

function selectControl(label, current, values, set) {
  const row = rowBase(label);
  const select = document.createElement('select');
  values.forEach((v) => {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = v;
    if (v === current) o.selected = true;
    select.appendChild(o);
  });
  select.addEventListener('input', () => set(select.value));
  row.appendChild(select);
  return row;
}

function rangeControl(label, current, min, max, step, set) {
  const row = rowBase(label);
  const wrap = document.createElement('div');
  wrap.className = 'range-wrap';
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(current);
  const out = document.createElement('output');
  out.textContent = String(current);
  input.addEventListener('input', () => {
    out.textContent = input.value;
    set(input.value);
  });
  wrap.append(input, out);
  row.appendChild(wrap);
  return row;
}

function rowBase(label) {
  const row = document.createElement('label');
  row.className = 'row';
  const span = document.createElement('span');
  span.textContent = label;
  row.appendChild(span);
  return row;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
