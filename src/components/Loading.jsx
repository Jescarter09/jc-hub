import './Loading.css';
import logo from '../assets/jc-hub-logo.svg';

export default function Loading() {
  return (
    <div className="minimal-loading" role="status" aria-live="polite" aria-label="Chargement de JC Hub">
      <div className="minimal-loading-orb minimal-loading-orb-one" aria-hidden="true" />
      <div className="minimal-loading-orb minimal-loading-orb-two" aria-hidden="true" />

      <div className="minimal-content">
        <div className="minimal-logo-wrap" aria-hidden="true">
          <img src={logo} alt="" className="minimal-logo" decoding="async" />
        </div>

        <div className="minimal-copy">
          <p className="minimal-kicker">JC Hub</p>
          <p className="minimal-loading-text">Chargement...</p>
        </div>

        <div className="minimal-loader" aria-hidden="true">
          <span className="dot dot-1"></span>
          <span className="dot dot-2"></span>
          <span className="dot dot-3"></span>
        </div>
      </div>
    </div>
  );
}
