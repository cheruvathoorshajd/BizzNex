import { NAV } from '../nav';
import type { ViewId } from '../types';
import { useT } from '../i18n/useT';
import Modal from '../ui/Modal';
import Icon from '../ui/Icon';
import { isToolId } from '../views/tools/registry';
import { INTROS } from './content';

interface Props {
  onClose: () => void;
  onNavigate: (v: ViewId) => void;
}

/** Every page in BizzNex on one sheet, grouped like the sidebar, each with a jump link. */
export default function FeatureGuide({ onClose, onNavigate }: Props) {
  const t = useT();
  return (
    <Modal title="Feature guide" onClose={onClose} wide>
      <div className="modal-body fg">
        <p className="fg-lede">Everything you can do in BizzNex. Choose a page to go to it. Tools marked “window” can also be right-clicked in the sidebar to open in a floating window.</p>
        {NAV.map((section) => (
          <section key={section.group} className="fg-sec">
            <div className="sublab" style={{ margin: '0 0 10px' }}>§ {t(section.group)}</div>
            <div className="fg-grid">
              {section.items.map((item) => (
                <button key={item.id} type="button" className="fg-item" onClick={() => { onNavigate(item.id); onClose(); }}>
                  <span className="fg-ic"><Icon name={item.icon} /></span>
                  <span className="fg-txt">
                    <span className="fg-t">{t(item.labelKey)}{isToolId(item.id) && <span className="tag fg-tag">window</span>}</span>
                    <span className="fg-b">{INTROS[item.id].lede}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Modal>
  );
}
