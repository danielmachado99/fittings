use serde::Deserialize;
use wasm_bindgen::prelude::*;

#[derive(Deserialize)]
struct EndSpec {
    standard: String,
    size: String,
    gender: String,
}

#[derive(Deserialize)]
struct BodySpec {
    length_mm: f32,
}

#[derive(Deserialize)]
struct Resolution {
    radial_segments: usize,
    turns_per_thread: usize,
}

#[derive(Deserialize)]
struct Params {
    #[serde(rename = "endA")]
    end_a: EndSpec,
    #[serde(rename = "endB")]
    end_b: EndSpec,
    body: BodySpec,
    wall_thickness_mm: f32,
    tolerance_mm: f32,
    resolution: Resolution,
}

#[wasm_bindgen]
pub struct MeshData {
    vertices: Vec<f32>,
    indices: Vec<u32>,
}

#[wasm_bindgen]
impl MeshData {
    #[wasm_bindgen(getter)]
    pub fn vertices(&self) -> Vec<f32> { self.vertices.clone() }
    #[wasm_bindgen(getter)]
    pub fn indices(&self) -> Vec<u32> { self.indices.clone() }
}

#[derive(Clone, Copy)]
struct Dim { major: f32, pitch: f32 }

fn bsp_dim(size: &str) -> Dim {
    match size {
        "1/4" => Dim { major: 13.157, pitch: 1.337 },
        "3/8" => Dim { major: 16.662, pitch: 1.337 },
        "1/2" => Dim { major: 20.955, pitch: 1.814 },
        "3/4" => Dim { major: 26.441, pitch: 1.814 },
        "1" => Dim { major: 33.249, pitch: 2.309 },
        _ => Dim { major: 20.955, pitch: 1.814 },
    }
}

#[wasm_bindgen]
pub fn generate_adapter_mesh(params_json: &str) -> Result<MeshData, JsValue> {
    let p: Params = serde_json::from_str(params_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid params: {e}")))?;

    let a = bsp_dim(&p.end_a.size);
    let b = bsp_dim(&p.end_b.size);
    let outer_r = (a.major.max(b.major) / 2.0) + p.wall_thickness_mm;
    let inner_r = (a.major.min(b.major) / 2.0) - 0.7 - p.tolerance_mm;
    let len = p.body.length_mm;
    let seg = p.resolution.radial_segments.max(24);

    let mut m = TriMesh::default();
    m.add_tube(outer_r, inner_r.max(0.8), len, seg);

    let thread_len = (a.pitch.max(b.pitch)) * (p.resolution.turns_per_thread as f32);
    add_end_thread(&mut m, -len / 2.0, &p.end_a, a, thread_len, seg, p.tolerance_mm);
    add_end_thread(&mut m, len / 2.0, &p.end_b, b, thread_len, seg, p.tolerance_mm);

    Ok(MeshData { vertices: m.v, indices: m.i })
}

fn add_end_thread(mesh: &mut TriMesh, z0: f32, end: &EndSpec, dim: Dim, length: f32, seg: usize, tol: f32) {
    let taper_per_mm = if end.standard == "BSPT" { 1.0 / 32.0 } else { 0.0 }; // diameter taper 1:16
    let base_r = dim.major / 2.0;
    let depth = 0.64 * dim.pitch;
    let lead = if z0 < 0.0 { 1.0 } else { -1.0 };
    let start_z = z0;
    let end_z = z0 + lead * length;
    let turns = (length / dim.pitch).max(1.0);
    let steps_z = (turns as usize * 24).max(36);

    for k in 0..steps_z {
        let t0 = k as f32 / steps_z as f32;
        let t1 = (k + 1) as f32 / steps_z as f32;
        let z_a = lerp(start_z, end_z, t0);
        let z_b = lerp(start_z, end_z, t1);
        let taper_a = (z_a - z0).abs() * taper_per_mm;
        let taper_b = (z_b - z0).abs() * taper_per_mm;

        for s in 0..seg {
            let u0 = s as f32 / seg as f32;
            let u1 = (s + 1) as f32 / seg as f32;
            let th0 = u0 * std::f32::consts::TAU;
            let th1 = u1 * std::f32::consts::TAU;

            let phase0 = th0 + lead * (z_a - z0) * std::f32::consts::TAU / dim.pitch;
            let phase1 = th1 + lead * (z_a - z0) * std::f32::consts::TAU / dim.pitch;
            let phase2 = th0 + lead * (z_b - z0) * std::f32::consts::TAU / dim.pitch;
            let phase3 = th1 + lead * (z_b - z0) * std::f32::consts::TAU / dim.pitch;

            let prof0 = tri_profile(phase0);
            let prof1 = tri_profile(phase1);
            let prof2 = tri_profile(phase2);
            let prof3 = tri_profile(phase3);

            let (ra0, ra1, rb0, rb1) = if end.gender == "male" {
                (
                    base_r + prof0 * depth - tol - taper_a,
                    base_r + prof1 * depth - tol - taper_a,
                    base_r + prof2 * depth - tol - taper_b,
                    base_r + prof3 * depth - tol - taper_b,
                )
            } else {
                (
                    (base_r - depth) + (1.0 - prof0) * depth + tol + taper_a,
                    (base_r - depth) + (1.0 - prof1) * depth + tol + taper_a,
                    (base_r - depth) + (1.0 - prof2) * depth + tol + taper_b,
                    (base_r - depth) + (1.0 - prof3) * depth + tol + taper_b,
                )
            };

            let a0 = [ra0 * th0.cos(), ra0 * th0.sin(), z_a];
            let a1 = [ra1 * th1.cos(), ra1 * th1.sin(), z_a];
            let b0 = [rb0 * th0.cos(), rb0 * th0.sin(), z_b];
            let b1 = [rb1 * th1.cos(), rb1 * th1.sin(), z_b];

            if end.gender == "male" {
                mesh.quad(a0, a1, b1, b0, true);
            } else {
                mesh.quad(a0, b0, b1, a1, true);
            }
        }
    }
}

#[derive(Default)]
struct TriMesh { v: Vec<f32>, i: Vec<u32> }

impl TriMesh {
    fn add_tube(&mut self, outer_r: f32, inner_r: f32, length: f32, seg: usize) {
        let z0 = -length / 2.0;
        let z1 = length / 2.0;
        for s in 0..seg {
            let u0 = s as f32 / seg as f32;
            let u1 = (s + 1) as f32 / seg as f32;
            let t0 = u0 * std::f32::consts::TAU;
            let t1 = u1 * std::f32::consts::TAU;
            let o00 = [outer_r * t0.cos(), outer_r * t0.sin(), z0];
            let o01 = [outer_r * t1.cos(), outer_r * t1.sin(), z0];
            let o10 = [outer_r * t0.cos(), outer_r * t0.sin(), z1];
            let o11 = [outer_r * t1.cos(), outer_r * t1.sin(), z1];
            self.quad(o00, o01, o11, o10, true);

            let i00 = [inner_r * t0.cos(), inner_r * t0.sin(), z0];
            let i01 = [inner_r * t1.cos(), inner_r * t1.sin(), z0];
            let i10 = [inner_r * t0.cos(), inner_r * t0.sin(), z1];
            let i11 = [inner_r * t1.cos(), inner_r * t1.sin(), z1];
            self.quad(i00, i10, i11, i01, true);

            self.quad(i00, o00, o01, i01, true);
            self.quad(i10, i11, o11, o10, true);
        }
    }

    fn quad(&mut self, a: [f32; 3], b: [f32; 3], c: [f32; 3], d: [f32; 3], _out: bool) {
        let base = (self.v.len() / 3) as u32;
        self.v.extend_from_slice(&a);
        self.v.extend_from_slice(&b);
        self.v.extend_from_slice(&c);
        self.v.extend_from_slice(&d);
        self.i.extend_from_slice(&[base, base + 1, base + 2, base, base + 2, base + 3]);
    }
}

fn tri_profile(angle: f32) -> f32 {
    let x = (angle / std::f32::consts::TAU).fract();
    if x < 0.5 { x * 2.0 } else { (1.0 - x) * 2.0 }
}

fn lerp(a: f32, b: f32, t: f32) -> f32 { a + (b - a) * t }
