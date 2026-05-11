import { useEffect, useState } from 'react';
import Lottie from 'lottie-react';

let cachedAnim = null;
let cachedPromise = null;

function loadAnim() {
  if (cachedAnim) return Promise.resolve(cachedAnim);
  if (cachedPromise) return cachedPromise;
  cachedPromise = fetch('/paperplane.json')
    .then(r => r.json())
    .then(data => { cachedAnim = data; return data; })
    .catch(() => null);
  return cachedPromise;
}

export default function PaperPlaneLoader({ message = 'Loading…', size = 220 }) {
  const [anim, setAnim] = useState(cachedAnim);

  useEffect(() => {
    let cancelled = false;
    if (!cachedAnim) loadAnim().then(d => { if (!cancelled) setAnim(d); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div style={{ width: size, height: size }}>
        {anim ? (
          <Lottie animationData={anim} loop autoplay style={{ width: '100%', height: '100%' }} />
        ) : (
          /* Fallback CSS paper plane while JSON loads (or if blocked) */
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border-[3px] border-teal-100 border-t-teal-600 animate-spin" />
          </div>
        )}
      </div>
      {message && (
        <p className="text-sm font-semibold text-slate-600" style={{ fontFamily: 'Manrope, sans-serif' }}>
          {message}
        </p>
      )}
    </div>
  );
}
