import Modal from '../ui/Modal';
import Icon from '../ui/Icon';
import { SkylineMark } from '../ui/Logo';

/** The brand documents the app serves (see apps/web/vite.config.ts). */
export const BRAND_DOCS = [
  { href: '/brand/skyline.html', title: 'Skyline: the BizzNex logo', tag: 'Adopted', body: 'The logo BizzNex uses, developed from the original reference: construction, wordmark, colour, clear space, sizes and real uses.' },
  { href: '/brand/identity.html', title: 'Identity proposal: Lift, Ledger, Bloom', tag: 'Exploration', body: 'Three earlier directions, each with its idea, construction and applications.' },
  { href: '/brand/logo-options.html', title: 'Logo picker', tag: 'Exploration', body: 'The first interactive picker: eight marks, five wordmarks, four colours.' },
  { href: '/case-study.html', title: 'Case study', tag: 'Design', body: 'How BizzNex was designed: the Aurora system, Studio windows, onboarding and the build.' },
] as const;

/** "Brand & logo" sheet, opened from the Help (?) menu. */
export default function BrandGuide({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Brand & logo" onClose={onClose} wide>
      <div className="modal-body bg">
        <div className="bg-hero">
          <span className="bg-mark"><SkylineMark /></span>
          <p>BizzNex’s logo is <b>Skyline</b>: three towers on one baseline, with one lit window, the light that says the business is open. These pages document it, and the explorations that led to it.</p>
        </div>
        <div className="bg-list">
          {BRAND_DOCS.map((d) => (
            <a key={d.href} className="bg-item" href={d.href} target="_blank" rel="noopener">
              <span className="bg-t">{d.title}<span className={d.tag === 'Adopted' ? 'tag solid' : 'tag'}>{d.tag}</span></span>
              <span className="bg-b">{d.body}</span>
              <span className="bg-go"><Icon name="external" size={14} /> Open</span>
            </a>
          ))}
        </div>
      </div>
    </Modal>
  );
}
