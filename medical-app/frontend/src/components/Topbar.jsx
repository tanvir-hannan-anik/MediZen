export default function Topbar({ eyebrow, title, children }) {
  return (
    <header className="topbar">
      <div className="topbar-title">
        {eyebrow && <div className="topbar-eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
      </div>
      {children && <div className="topbar-actions">{children}</div>}
    </header>
  );
}
