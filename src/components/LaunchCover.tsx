import { useEffect, useRef, useState } from "react";
import { ArrowRight, Orbit } from "lucide-react";

type LaunchCoverProps = { onEnter: () => void };

type Ripple = { id: number; x: number; y: number; startedAt: number };

function WallpaperCanvas({ ripples }: { ripples: Ripple[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ripplesRef = useRef(ripples);

  useEffect(() => { ripplesRef.current = ripples; }, [ripples]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const context = canvas?.getContext("2d");
    if (!canvas || !host || !context) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let width = 0;
    let height = 0;
    let particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number; hue: number }> = [];
    const wallpaper = new Image();
    let wallpaperReady = false;

    const resize = () => {
      const bounds = host.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.6);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = width < 700 ? 38 : 76;
      particles = Array.from({ length: count }, (_, index) => ({
        x: Math.random() * width, y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18,
        size: 0.6 + Math.random() * 1.8, alpha: 0.18 + Math.random() * 0.5,
        hue: index % 3 === 0 ? 44 : index % 3 === 1 ? 170 : 190,
      }));
    };

    const drawRipple = (ripple: Ripple, time: number) => {
      const progress = (time - ripple.startedAt) / 1150;
      if (progress < 0 || progress > 1) return;
      const radius = Math.max(width, height) * progress * 0.42;
      const band = Math.max(18, Math.max(width, height) * 0.028 * (1 - progress * 0.35));
      const distortion = 0.026 * Math.sin(progress * Math.PI) * (1 - progress * 0.22);
      for (const offset of [-band * 1.7, 0, band * 1.7]) {
        const ringRadius = radius + offset;
        if (ringRadius < 0) continue;
        context.save();
        context.beginPath();
        context.arc(ripple.x, ripple.y, ringRadius + band * 0.72, 0, Math.PI * 2);
        context.arc(ripple.x, ripple.y, Math.max(0, ringRadius - band * 0.72), 0, Math.PI * 2, true);
        context.clip("evenodd");
        context.translate(ripple.x, ripple.y);
        context.scale(1 + distortion * (offset === 0 ? 1 : 0.58), 1 + distortion * (offset === 0 ? 1 : 0.58));
        context.translate(-ripple.x, -ripple.y);
        context.drawImage(wallpaper, 0, 0, width, height);
        context.restore();
      }
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      if (wallpaperReady) context.drawImage(wallpaper, 0, 0, width, height);
      if (wallpaperReady && !reducedMotion) {
        ripplesRef.current.forEach((ripple) => drawRipple(ripple, time));
      }
      for (const particle of particles) {
        if (!reducedMotion) {
          particle.x += particle.vx + Math.sin(time * 0.00025 + particle.y) * 0.06;
          particle.y += particle.vy;
          if (particle.x < -10) particle.x = width + 10;
          if (particle.x > width + 10) particle.x = -10;
          if (particle.y < -10) particle.y = height + 10;
          if (particle.y > height + 10) particle.y = -10;
        }
        context.beginPath();
        context.fillStyle = `hsla(${particle.hue}, 75%, 72%, ${particle.alpha})`;
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
      }
      if (!reducedMotion) frame = window.requestAnimationFrame(draw);
    };

    wallpaper.onload = () => { wallpaperReady = true; if (reducedMotion) draw(0); };
    wallpaper.src = window.matchMedia("(max-width: 720px)").matches ? "/俭启未来-9x16海报.png" : "/jianqi-cover.png";
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    if (!reducedMotion) frame = window.requestAnimationFrame(draw);
    return () => { observer.disconnect(); window.cancelAnimationFrame(frame); };
  }, []);

  return <canvas ref={canvasRef} className="launch-cover-canvas" aria-hidden="true" />;
}

export default function LaunchCover({ onEnter }: LaunchCoverProps) {
  const [leaving, setLeaving] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleId = useRef(0);

  useEffect(() => {
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
    };
  }, []);

  const createRipple = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || leaving || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const ripple = { id: ++rippleId.current, x: event.clientX - bounds.left, y: event.clientY - bounds.top, startedAt: performance.now() };
    setRipples((current) => [...current.slice(-4), ripple]);
    window.setTimeout(() => setRipples((current) => current.filter((item) => item.id !== ripple.id)), 1300);
  };

  const enter = () => {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(onEnter, 680);
  };

  return (
    <section className={`launch-cover ${leaving ? "is-leaving" : ""}`} aria-label="俭启未来项目开场" onPointerDown={createRipple}>
      <div className="launch-cover-image" aria-hidden="true" />
      <div className="launch-cover-vignette" aria-hidden="true" />
      <WallpaperCanvas ripples={ripples} />
      <div className="launch-meteor-shower" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => <i key={index}><b /><span /><span /><span /></i>)}
      </div>
      <div className="launch-cover-content">
        <button type="button" className="launch-cover-enter" onClick={enter} disabled={leaving}>
          <Orbit size={24} /><span>开启时光机</span><ArrowRight size={25} />
        </button>
      </div>
      <div className="launch-cover-scanline" aria-hidden="true" />
      <span className="launch-cover-corner launch-cover-corner-left" aria-hidden="true" />
      <span className="launch-cover-corner launch-cover-corner-right" aria-hidden="true" />
    </section>
  );
}
