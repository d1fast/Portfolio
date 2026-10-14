/**
 * 3D-объект первого экрана: каркасная модель на чёрном листе. Пока это процедурная фигура,
 * позже сюда встанет модель Савелия из Meshy (GLB) с тем же каркасным материалом.
 * Загружается лениво, рендерит только когда виден, плотность пикселей не выше 1.5.
 */
export async function initHeroScene(canvas: HTMLCanvasElement, opts: { modelUrl?: string }) {
  const THREE = await import('three');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 7.2);

  const group = new THREE.Group();
  scene.add(group);
  const lime = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--lime').trim() || '#D7FF00');
  const lineMat = new THREE.LineBasicMaterial({ color: lime, transparent: true, opacity: 0.9 });
  const faintMat = new THREE.LineBasicMaterial({ color: lime, transparent: true, opacity: 0.22 });

  const addEdges = (geo: InstanceType<typeof THREE.BufferGeometry>, mat: InstanceType<typeof THREE.LineBasicMaterial>, angle = 1) => {
    const edges = new THREE.EdgesGeometry(geo, angle);
    const lines = new THREE.LineSegments(edges, mat);
    group.add(lines);
    return lines;
  };

  let model: InstanceType<typeof THREE.Object3D> | null = null;
  if (opts.modelUrl) {
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const gltf = await new GLTFLoader().loadAsync(opts.modelUrl);
      const root = gltf.scene;
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3()).length();
      const center = box.getCenter(new THREE.Vector3());
      root.position.sub(center);
      root.scale.setScalar(3.6 / size);
      root.traverse((o: any) => {
        if (o.isMesh) {
          const edges = new THREE.EdgesGeometry(o.geometry, 18);
          const seg = new THREE.LineSegments(edges, lineMat);
          seg.position.copy(o.position); seg.rotation.copy(o.rotation); seg.scale.copy(o.scale);
          o.parent?.add(seg);
          o.material = new THREE.MeshBasicMaterial({ color: 0x050505, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
        }
      });
      group.add(root);
      model = root;
    } catch { /* модели нет, остаётся процедурная фигура */ }
  }
  if (!model) {
    // Процедурная фигура: икосаэдр с внутренним октаэдром и тонкой орбитой, как объект на чертеже.
    const outer = addEdges(new THREE.IcosahedronGeometry(1.9, 1), lineMat, 10);
    const inner = addEdges(new THREE.OctahedronGeometry(1.0, 0), lineMat, 1);
    const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, 0, 2.6, 2.6, 0, Math.PI * 2, false, 0).getPoints(96)), faintMat);
    ring.rotation.x = Math.PI / 2.3;
    group.add(ring);
    const solid = new THREE.Mesh(new THREE.IcosahedronGeometry(1.88, 1), new THREE.MeshBasicMaterial({ color: 0x050505, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
    group.add(solid);
    inner.userData.spin = 1.6;
    outer.userData.spin = 1;
    (ring as any).userData.spin = -0.4;
  }

  const target = { x: 0, y: 0 };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    target.x = (e.clientX / innerWidth - 0.5) * 0.9;
    target.y = (e.clientY / innerHeight - 0.5) * 0.6;
  };
  addEventListener('pointermove', onMove, { passive: true });

  let visible = true, raf = 0, last = performance.now();
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(tick); });
  io.observe(canvas);

  const resize = () => {
    const w = canvas.clientWidth || 300, h = canvas.clientHeight || 300;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  resize();
  addEventListener('resize', resize, { passive: true });

  const assemble = { t: 0 };
  group.scale.setScalar(0.001);

  function tick(now: number) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (assemble.t < 1) { assemble.t = Math.min(1, assemble.t + dt / 1.1); const k = 1 - Math.pow(1 - assemble.t, 3); group.scale.setScalar(0.001 + k); }
    group.rotation.y += dt * 0.25;
    group.rotation.x += (target.y * 0.6 - group.rotation.x) * 0.06;
    group.rotation.z += (target.x * 0.25 - group.rotation.z) * 0.06;
    group.children.forEach((c: any) => { if (c.userData.spin) c.rotation.y += dt * 0.25 * c.userData.spin; });
    renderer.render(scene, camera);
    if (visible) raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
  return { renderer, scene, group };
}
