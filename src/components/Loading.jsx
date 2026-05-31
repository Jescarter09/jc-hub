import './Loading.css';

export default function Loading() {
  return (
    <div className="minimal-loading" role="status" aria-live="polite" aria-label="Chargement de JC Hub">
      <div className="minimal-content">
        <div className="minimal-mark" aria-hidden="true">
          <span lang="he" dir="rtl">י</span>
        </div>
      </div>
    </div>
  );
}
