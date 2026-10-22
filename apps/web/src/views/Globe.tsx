import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useGetContactsQuery, useGetCompaniesQuery, useGetDealsQuery } from '../services/api';
import { useAppSelector } from '../store';
import CountUp from '../ui/CountUp';
import LoadError from '../ui/LoadError';
import { reducedMotion } from '../ui/motion';

type NodeState = 'won' | 'open' | 'none';
interface Graph {
  nodes: { id: string; state: NodeState }[];
  /** Index pairs into `nodes`. `deal` = a deal between this contact and company; otherwise "works at". */
  links: { a: number; b: number; deal: boolean; open: boolean }[];
}

const MAX_NODES = 28;

/**
 * Relationship Globe — a 3D map of the CRM. Nodes are companies and contacts, coloured by
 * their deals (green = has a won deal, accent = has an open deal, muted = no deals). Arcs are
 * real relationships: a contact who works at a company, and a deal linking a contact and a
 * company. Pulses travel along open-deal arcs as decoration. Positions on the sphere are
 * layout only (the CRM stores no locations) and capped so the scene stays readable.
 */
export default function Globe() {
  const mount = useRef<HTMLDivElement>(null);
  const handle = useRef<{ recolor: () => void; dispose: () => void } | null>(null);
  const theme = useAppSelector((s) => s.ui.theme);
  const [noWebGL, setNoWebGL] = useState(false);

  const contactsQ = useGetContactsQuery();
  const companiesQ = useGetCompaniesQuery();
  const dealsQ = useGetDealsQuery();
  const contacts = contactsQ.data ?? [];
  const companies = companiesQ.data ?? [];
  const deals = dealsQ.data ?? [];
  const loading = contactsQ.isLoading || companiesQ.isLoading || dealsQ.isLoading;
  const failed = [contactsQ, companiesQ, dealsQ].find((q) => q.isError);
  const empty = !loading && !failed && contacts.length + companies.length === 0;

  const openDeals = deals.filter((d) => d.stage !== 'Won' && d.stage !== 'Lost');
  const pipeline = openDeals.reduce((s, d) => s + d.value, 0);
  const newThisWeek = deals.filter((d) => Date.now() - new Date(d.createdAt).getTime() < 7 * 864e5).length;
  const kmoney = (n: number) => (n >= 1000 ? '$' + (n / 1000).toFixed(1) + 'k' : '$' + Math.round(n).toLocaleString('en-US'));

  const graph = useMemo<Graph>(() => {
    const stateOf = (id: string, key: 'contactId' | 'companyId'): NodeState => {
      const mine = deals.filter((d) => d[key] === id);
      return mine.some((d) => d.stage === 'Won') ? 'won' : mine.some((d) => d.stage !== 'Lost') ? 'open' : 'none';
    };
    // companies first, then contacts grouped by company, so related nodes are placed near each other
    const picked = [
      ...companies.map((c) => ({ id: c.id, state: stateOf(c.id, 'companyId') })),
      ...[...contacts].sort((a, b) => (a.companyId ?? '').localeCompare(b.companyId ?? ''))
        .map((c) => ({ id: c.id, state: stateOf(c.id, 'contactId') })),
    ].slice(0, MAX_NODES);
    const at = new Map(picked.map((n, i) => [n.id, i]));
    const links: Graph['links'] = [];
    const seen = new Set<string>();
    const link = (x: string | null, y: string | null, deal: boolean, open: boolean) => {
      const a = x ? at.get(x) : undefined, b = y ? at.get(y) : undefined;
      if (a === undefined || b === undefined || a === b) return;
      const k = `${a}-${b}-${deal}`;
      if (seen.has(k)) return;
      seen.add(k);
      links.push({ a, b, deal, open });
    };
    contacts.forEach((c) => link(c.id, c.companyId, false, false));
    deals.forEach((d) => link(d.contactId, d.companyId, true, d.stage !== 'Won' && d.stage !== 'Lost'));
    return { nodes: picked, links };
  }, [contacts, companies, deals]);
  const graphKey = JSON.stringify(graph);
  const graphRef = useRef(graph);
  graphRef.current = graph;

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    const { nodes: gNodes, links } = graphRef.current;
    const still = reducedMotion();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setNoWebGL(true);
      return;
    }
    setNoWebGL(false);

    const cssVar = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    let accent = new THREE.Color(cssVar('--accent'));
    let ok = new THREE.Color(cssVar('--ok'));
    let muted = new THREE.Color(cssVar('--muted'));
    const accentMats: THREE.Material[] = [];
    const okMats: THREE.Material[] = [];
    const mutedMats: THREE.Material[] = [];

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

    // evenly spread points on the sphere (Fibonacci lattice)
    const lattice = (i: number, n: number, r: number) => {
      const y = n > 1 ? 1 - (i / (n - 1)) * 2 : 0;
      const rr = Math.sqrt(1 - y * y);
      const th = i * 2.399963229;
      return new THREE.Vector3(Math.cos(th) * rr * r, y * r, Math.sin(th) * rr * r);
    };

    // globe of faint points
    const GP = 1400, gpos = new Float32Array(GP * 3);
    for (let i = 0; i < GP; i++) lattice(i, GP, R).toArray(gpos, i * 3);
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

    const nodes: THREE.Vector3[] = [];
    gNodes.forEach((n, i) => {
      const pos = lattice(i, gNodes.length, R * 1.004);
      const [col, mats] = n.state === 'won' ? [ok, okMats] : n.state === 'open' ? [accent, accentMats] : [muted, mutedMats];
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), new THREE.MeshBasicMaterial({ color: col.clone() }));
      core.position.copy(pos); group.add(core);
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: col.clone(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      spr.position.copy(pos); spr.scale.setScalar(n.state === 'none' ? 0.35 : 0.55); group.add(spr);
      mats.push(core.material as THREE.Material, spr.material as THREE.Material);
      nodes.push(pos);
    });

    const openArcs: THREE.QuadraticBezierCurve3[] = [];
    links.forEach(({ a, b, deal, open }) => {
      const pa = nodes[a], pb = nodes[b];
      const mid = pa.clone().add(pb).multiplyScalar(0.5);
      const d = pa.distanceTo(pb);
      const ctrl = mid.setLength(R + d * 0.55 + 0.3);
      const curve = new THREE.QuadraticBezierCurve3(pa.clone(), ctrl, pb.clone());
      const geo = new THREE.TubeGeometry(curve, 44, deal ? 0.014 : 0.008, 6, false);
      const mat = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: deal ? 0.55 : 0.25 });
      accentMats.push(mat);
      group.add(new THREE.Mesh(geo, mat));
      if (open) openArcs.push(curve);
    });

    const pulses: { curve: THREE.QuadraticBezierCurve3; spr: THREE.Sprite; t: number; speed: number }[] = [];
    if (!still) {
      for (let i = 0; i < Math.min(8, openArcs.length); i++) {
        const mat = new THREE.SpriteMaterial({ map: GLOW, color: accent, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
        accentMats.push(mat);
        const spr = new THREE.Sprite(mat); spr.scale.setScalar(0.28); group.add(spr);
        pulses.push({ curve: openArcs[i], spr, t: Math.random(), speed: 0.0035 + Math.random() * 0.004 });
      }
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
      if (!still) {
        // reduced motion: no auto-rotation or pulses; it only moves when dragged
        t += 0.016;
        group.rotation.y += 0.0016;
        group.rotation.x = Math.sin(t * 0.1) * 0.06;
        pulses.forEach((p) => {
          p.t = (p.t + p.speed) % 1;
          p.spr.position.copy(p.curve.getPointAt(p.t));
          p.spr.scale.setScalar(0.22 + Math.sin(p.t * Math.PI) * 0.14);
        });
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    handle.current = {
      recolor() {
        accent = new THREE.Color(cssVar('--accent'));
        ok = new THREE.Color(cssVar('--ok'));
        muted = new THREE.Color(cssVar('--muted'));
        accentMats.forEach((m) => (m as THREE.MeshBasicMaterial).color.copy(accent));
        okMats.forEach((m) => (m as THREE.MeshBasicMaterial).color.copy(ok));
        mutedMats.forEach((m) => (m as THREE.MeshBasicMaterial).color.copy(muted));
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
  }, [graphKey]);

  useEffect(() => { handle.current?.recolor(); }, [theme]);

  const won = graph.nodes.filter((n) => n.state === 'won').length;
  const open = graph.nodes.filter((n) => n.state === 'open').length;
  const description =
    `Relationship globe: ${graph.nodes.length} companies and contacts` +
    (contacts.length + companies.length > graph.nodes.length ? ` (of ${contacts.length + companies.length})` : '') +
    `, ${won} with a won deal, ${open} with an open deal, and ${graph.links.length} relationships between them.`;

  return (
    <div className="globe-hero mt-5">
      <div ref={mount} style={{ position: 'absolute', inset: 0 }} role="img" aria-label={description} />
      <div className="g-overlay">
        <p className="spec"><span className="k">§ Pipeline</span><span>Open deals · live</span></p>
        <div className="g-big num"><CountUp value={pipeline} format={kmoney} /></div>
        <div className="g-delta">{newThisWeek ? `▲ ${newThisWeek} new this week` : 'No new deals this week'}</div>
        {failed && <LoadError what="your CRM" error={failed.error} onRetry={() => { contactsQ.refetch(); companiesQ.refetch(); dealsQ.refetch(); }} />}
        {loading && <p className="g-empty loading">Loading…</p>}
        {empty && <p className="g-empty">Add contacts and companies to place them on the globe.</p>}
        {noWebGL && <p className="g-empty">The 3D globe needs WebGL, which this browser has turned off. Your numbers are still below.</p>}
      </div>
      <div className="g-legend">
        <span><i className="d-ok" />Has a won deal</span>
        <span><i className="d-accent" />Has an open deal</span>
        <span><i style={{ background: 'var(--muted)' }} />No deals</span>
        <span><i className="d-faint" />Works at / deal</span>
      </div>
      <div className="g-kpis">
        <div><div className="l">Contacts</div><div className="v num">{contacts.length}</div></div>
        <div><div className="l">Companies</div><div className="v num">{companies.length}</div></div>
        <div><div className="l">Open deals</div><div className="v num">{openDeals.length}</div></div>
      </div>
      {!noWebGL && <span className="g-hint">drag to orbit · scroll to zoom</span>}
    </div>
  );
}
