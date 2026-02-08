import * as THREE from 'three';

export function exportBinaryStl(geometry, name = 'fitting.stl') {
  const pos = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const triCount = index ? index.count / 3 : pos.count / 3;
  const buffer = new ArrayBuffer(84 + triCount * 50);
  const view = new DataView(buffer);
  view.setUint32(80, triCount, true);

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  let off = 84;

  for (let t = 0; t < triCount; t++) {
    const i0 = index ? index.getX(t * 3) : t * 3;
    const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;
    a.fromBufferAttribute(pos, i0);
    b.fromBufferAttribute(pos, i1);
    c.fromBufferAttribute(pos, i2);
    n.subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b)).normalize();
    for (const v of [n, a, b, c]) {
      view.setFloat32(off, v.x, true); off += 4;
      view.setFloat32(off, v.y, true); off += 4;
      view.setFloat32(off, v.z, true); off += 4;
    }
    view.setUint16(off, 0, true); off += 2;
  }

  const blob = new Blob([buffer], { type: 'model/stl' });
  const url = URL.createObjectURL(blob);
  const aEl = document.createElement('a');
  aEl.href = url;
  aEl.download = name;
  aEl.click();
  URL.revokeObjectURL(url);
}
