import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Stat {
  value: string;       // raw display value for special cases ('0', '∞')
  countTo?: number;    // if set, number counts up to this from 0
  suffix?: string;     // e.g. '%'
  label: string;
}

const STATS: Stat[] = [
  { value: '65', countTo: 65, suffix: '%', label: 'Royalties to Authors' },
  { value: '0',                            label: 'Gatekeepers' },
  { value: '∞',                            label: 'Stories Waiting to Be Told' },
];

// ─── Single animated number ───────────────────────────────────────────────────
function CountUp({ to, suffix = '', duration = 1600 }: { to: number; suffix?: string; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  useEffect(() => {
    if (!inView) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * to));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, to, duration]);

  return (
    <span ref={ref}>
      {display}{suffix}
    </span>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider({ orientation }: { orientation: 'vertical' | 'horizontal' }) {
  if (orientation === 'vertical') {
    return (
      <div
        className="hidden sm:block self-center flex-shrink-0"
        style={{ width: 1, height: 60, background: '#2a2a2a' }}
      />
    );
  }
  return (
    <div
      className="block sm:hidden mx-auto"
      style={{ height: 1, width: 60, background: '#2a2a2a' }}
    />
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const StatRow = () => {
  return (
    <section
      style={{ background: '#0a0a0a', paddingTop: 80, paddingBottom: 80 }}
    >
      <div
        className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-center"
        style={{ gap: 0 }}
      >
        {STATS.map((stat, i) => (
          <div key={stat.label} className="flex flex-col sm:flex-row items-center w-full sm:w-auto">
            {/* Horizontal divider on mobile between items (not before first) */}
            {i > 0 && <Divider orientation="horizontal" />}

            {/* Vertical divider on desktop between items (not before first) */}
            {i > 0 && <Divider orientation="vertical" />}

            {/* Stat cell */}
            <motion.div
              className="flex flex-col items-center text-center flex-1 px-10 py-8 sm:py-0"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Number */}
              <span
                style={{
                  fontSize: 'clamp(48px, 8vw, 72px)',
                  lineHeight: 1,
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  color: '#c84b2f',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                }}
              >
                {stat.countTo !== undefined ? (
                  <CountUp to={stat.countTo} suffix={stat.suffix} />
                ) : stat.value === '∞' ? (
                  <motion.span
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, delay: i * 0.12 }}
                  >
                    {stat.value}
                  </motion.span>
                ) : (
                  stat.value
                )}
              </span>

              {/* Label */}
              <span
                style={{
                  fontSize: 13,
                  color: '#888888',
                  fontFamily: 'inherit',
                  fontWeight: 500,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginTop: 12,
                  lineHeight: 1.4,
                  maxWidth: 160,
                }}
              >
                {stat.label}
              </span>
            </motion.div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default StatRow;
