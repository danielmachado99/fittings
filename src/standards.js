// Explicit BSP lookup tables (major diameter and pitch from ISO 228/7 commonly used values, in mm)
// v1 scope supports a small but practical subset.
export const BSP_TABLE = {
  '1/4': { major_d_mm: 13.157, pitch_mm: 1.337, tpi: 19 },
  '3/8': { major_d_mm: 16.662, pitch_mm: 1.337, tpi: 19 },
  '1/2': { major_d_mm: 20.955, pitch_mm: 1.814, tpi: 14 },
  '3/4': { major_d_mm: 26.441, pitch_mm: 1.814, tpi: 14 },
  '1': { major_d_mm: 33.249, pitch_mm: 2.309, tpi: 11 },
};

export const STANDARDS = ['BSPP', 'BSPT'];
export const GENDERS = ['male', 'female'];
export const SIZES = Object.keys(BSP_TABLE);
