import { useRef, useState } from 'react';

export default function FileUpload({ onFile, accept = '*', label = 'Drop your file here', hint = 'or browse to upload' }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div
      className={`dropzone${dragging ? ' hover' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <div className="dropzone-icon">
        <svg viewBox="0 0 24 24">
          <path d="M12 3v14"/><path d="m5 10 7-7 7 7"/>
          <rect x="4" y="17" width="16" height="4" rx="1"/>
        </svg>
      </div>
      <h3>{label}</h3>
      <p><b>{hint}</b></p>
      <p style={{ marginTop: 8, fontSize: 11, color: 'var(--fg-4)', fontFamily: 'var(--font-mono)' }}>
        {accept.replace(/,/g, ' · ')} · max 20 MB
      </p>
      <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }} onChange={handleChange} />
    </div>
  );
}
