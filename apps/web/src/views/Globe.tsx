import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useGetContactsQuery, useGetCompaniesQuery, useGetDealsQuery } from '../services/api';
import { useAppSelector } from '../store';
import CountUp from '../ui/CountUp';

/**
 * Relationship Globe — a live 3D map of the CRM. Nodes are companies/contacts,
 * arcs are deals/relationships, travelling pulses are recent activity, and
 * "won" deals glow green. Pure three.js. Counts come from the CRM (capped so the
 * scene stays readable); positions on the sphere are layout only and carry no meaning.
 */
export default function Globe() {
  const mount = useRef<HTMLDivElement>(null);
  const handle = useRef<{ recolor: () => void; dispose: () => void } | null>(null);
  const theme = useAppSelector((s) => s.ui.theme);

  const { data: contacts = [] } = useGetContactsQuery();
  const { data: companies = [] } = useGetCompaniesQuery();
  const { data: deals = [] } = useGetDealsQuery();

  const nodeCount = Math.min(28, contacts.length + companies.length);
  const arcCount = nodeCount > 1 ? Math.min(nodeCount * 2, deals.length) : 0;
  const wonCount = Math.min(nodeCount, deals.filter((d) => d.stage === 'Won').length);
  const empty = nodeCount === 0;

  const openDeals = deals.filter((d) => d.stage !== 'Won' && d.stage !== 'Lost');
  const pipeline = openDeals.reduce((s, d) => s + d.value, 0);
  const newThisWeek = deals.filter((d) => Date.now() - new Date(d.createdAt).getTime() < 7 * 864e5).length;
  const kmoney = (n: number) => (n >= 1000 ? '$' + (n / 1000).toFixed(1) + 'k' : '$' + Math.round(n).toLocaleString('en-US'));

  useEffect(() => {
    const el = mount.current;
    if (!el) return;

    const cssVar = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    let accent = new THREE.Color(cssVar('--accent'));
    let ok = new THREE.Color(cssVar('--ok'));
    const accentMats: THREE.Material[] = [];
    const okMats: THREE.Material[] = [];

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.5, 5.9);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.enablePan = false; controls.minDistance = 4; controls.maxDistance = 16;

    const group = new THREE.Group(); scene.add(group);
    const R = 3;

    // soft radial glow texture (tinted per material color)
    const gcv = document.createElement('canvas'); gcv.width = gcv.height = 64;
    const gctx = gcv.getContext('2d')!;
    const grd = gctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.4, 'rgba(255,255,255,0.55)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    gctx.fillStyle = grd; gctx.fillRect(0, 0, 64, 64);
    const GLOW = new THREE.CanvasTexture(gcv);

    // globe of faint points
    const GP = 1400, gpos = new Float32Array(GP * 3);
    for (let i = 0; i < GP; i++) {
      const y = 1 - (i / (GP - 1)) * 2;
      const rr = Math.sqrt(1 - y * y);
      const th = i * 2.399963229;
      gpos[i * 3] = Math.cos(th) * rr * R;
      gpos[i * 3 + 1] = y * R;
      gpos[i * 3 + 2] = Math.sin(th) * rr * R;
    }
    const gGeo = new THREE.BufferGeometry();
    gGeo.setAttribute('position', new THREE.BufferAttribute(gpos, 3));
    const gMat = new THREE.PointsMaterial({ color: accent, size: 0.045, transparent: true, opacity: 0.45, depthWrite: false });
    accentMats.push(gMat);
    group.add(new THREE.Points(gGeo, gMat));

    const wire = new THREE.Mesh(
      new THREE.SphereGeometry(R * 0.995, 24, 18),
      new THREE.MeshBasicMaterial({ color: accent, wireframe: true, transparent: true, opacity: 0.06 }),
    );
    accentMats.push(wire.material as THREE.Material);
    group.add(wire);

    const randSurface = () =>
      new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(R * 1.004);

    const nodes: THREE.Vector3[] = [];
    for (let i = 0; i < nodeCount; i++) {
      const pos = randSurface();
      const won = i < wonCount;
      const col = (won ? ok : accent).clone();
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), new THREE.MeshBasicMaterial({ color: col }));
      core.position.copy(pos); group.add(core);
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      spr.position.copy(pos); spr.scale.setScalar(0.55); group.add(spr);
      (won ? okMats : accentMats).push(core.material as THREE.Material, spr.material as THREE.Material);
      nodes.push(pos);
    }

    const arcs: THREE.QuadraticBezierCurve3[] = [];
    const addArc = (a: THREE.Vector3, b: THREE.Vector3) => {
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const d = a.distanceTo(b);
      const ctrl = mid.setLength(R + d * 0.55 + 0.3);
      const curve = new THREE.QuadraticBezierCurve3(a.clone(), ctrl, b.clone());
      const geo = new THREE.TubeGeometry(curve, 44, 0.012, 6, false);
      const mat = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.5 });
      accentMats.push(mat);
      group.add(new THREE.Mesh(geo, mat));
      arcs.push(curve);
    };
    for (let i = 0; i < nodeCount && arcs.length < arcCount; i++) {
      addArc(nodes[i], nodes[(i + 3) % nodeCount]);
      if (arcs.length < arcCount && i % 2 === 0) addArc(nodes[i], nodes[(i + 7) % nodeCount]);
    }

    const pulses: { curve: THREE.QuadraticBezierCurve3; spr: THREE.Sprite; t: number; speed: number }[] = [];
    for (let i = 0; i < Math.min(8, arcs.length); i++) {
      const mat = new THREE.SpriteMaterial({ map: GLOW, color: accent, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
      accentMats.push(mat);
      const spr = new THREE.Sprite(mat); spr.scale.setScalar(0.28); group.add(spr);
      pulses.push({ curve: arcs[Math.floor(Math.random() * arcs.length)], spr, t: Math.random(), speed: 0.0035 + Math.random() * 0.004 });
    }

    const size = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(size); ro.observe(el); size();

    let raf = 0, t = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      t += 0.016;
      group.rotation.y += 0.0016;
      group.rotation.x = Math.sin(t * 0.1) * 0.06;
      pulses.forEach((p) => {
        p.t = (p.t + p.speed) % 1;
        p.spr.position.copy(p.curve.getPointAt(p.t));
        p.spr.scale.setScalar(0.22 + Math.sin(p.t * Math.PI) * 0.14);
      });
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    handle.current = {
      recolor() {
        accent = new THREE.Color(cssVar('--accent'));
        ok = new THREE.Color(cssVar('--ok'));
        accentMats.forEach((m) => (m as THREE.MeshBasicMaterial).color.copy(accent));
        okMats.forEach((m) => (m as THREE.MeshBasicMaterial).color.copy(ok));
      },
      dispose() {
        cancelAnimationFrame(raf);
        ro.disconnect();
        controls.dispose();
        scene.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          const mat = (mesh as any).material;
          if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((mm: THREE.Material) => mm.dispose());
        });
        GLOW.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      },
    };

    return () => { handle.current?.dispose(); handle.current = null; };
  }, [nodeCount, arcCount, wonCount]);

  useEffect(() => { handle.current?.recolor(); }, [theme]);

  return (
    <div className="globe-hero mt-5">
      <div ref={mount} style={{ position: 'absolute', inset: 0 }} />
      <div className="g-overlay">
        <p className="spec"><span className="k">§ Pipeline</span><span>Open deals · live</span></p>
        <div className="g-big num"><CountUp value={pipeline} format={kmoney} /></div>
        <div className="g-delta">{newThisWeek ? `▲ ${newThisWeek} new this week` : 'No new deals this week'}</div>
        {empty && <p className="g-empty">Add contacts and companies to place them on the globe.</p>}
      </div>
      <div className="g-legend">
        <span><i className="d-accent" />Company / contact</span>
        <span><i className="d-ok" />Won deal</span>
        <span><i className="d-faint" />Relationship / deal</span>
      </div>
      <div className="g-kpis">
        <div><div className="l">Contacts</div><div className="v num">{contacts.length}</div></div>
        <div><div className="l">Companies</div><div className="v num">{companies.length}</div></div>
        <div><div className="l">Open deals</div><div className="v num">{openDeals.length}</div></div>
      </div>
      <span className="g-hint">drag to orbit · scroll to zoom</span>
    </div>
  );
}
