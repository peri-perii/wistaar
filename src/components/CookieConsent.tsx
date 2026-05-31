import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, ShieldCheck, Settings, ArrowLeft, Info, BarChart2, Sparkles, Sliders } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useCookieConsent } from '@/hooks/useCookieConsent';
import type { CustomCategories } from '@/hooks/useCookieConsent';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  card:   '#1a1a1a',
  border: '#2a2a2a',
  icon:   '#2a2a2a',
  accent: '#c84b2f',
  text:   '#ffffff',
  muted:  '#888888',
  row:    '#111111',
} as const;

// ─── Tiny button ─────────────────────────────────────────────────────────────
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'outline' | 'filled';
}
function Btn({ variant = 'outline', children, style, ...rest }: BtnProps) {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', transition: 'opacity .15s', fontFamily: 'inherit',
    border: `1px solid ${C.border}`, position: 'relative', zIndex: 1,
    pointerEvents: 'all', ...style,
  };
  return (
    <button
      style={{
        ...base,
        ...(variant === 'filled'
          ? { background: C.accent, color: C.text, border: 'none' }
          : { background: 'transparent', color: C.text }),
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.82'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
      {...rest}
    >
      {children}
    </button>
  );
}

// ─── Toggle row ───────────────────────────────────────────────────────────────
interface ToggleRowProps {
  icon:        React.ReactNode;
  label:       string;
  description: string;
  checked:     boolean;
  onChange?:   (v: boolean) => void;
  locked?:     boolean;
}
function ToggleRow({ icon, label, description, checked, onChange, locked }: ToggleRowProps) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      gap: 12, padding: '11px 13px', borderRadius: 10,
      background: C.row, border: `1px solid ${C.border}`,
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1 }}>
        <div style={{ marginTop: 1, color: C.muted, flexShrink: 0 }}>{icon}</div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</span>
            {locked && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: C.accent,
                background: 'rgba(200,75,47,0.12)',
                padding: '1px 6px', borderRadius: 999,
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Always on
              </span>
            )}
          </div>
          <p style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.55, margin: 0 }}>
            {description}
          </p>
        </div>
      </div>
      <div style={{ flexShrink: 0, paddingTop: 2 }}>
        {locked ? (
          <div style={{
            width: 36, height: 20, borderRadius: 999,
            background: 'rgba(200,75,47,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            padding: '2px 3px', opacity: 0.7,
          }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: C.accent }} />
          </div>
        ) : (
          <Switch checked={checked} onCheckedChange={onChange} aria-label={`Toggle ${label}`} />
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CookieConsent() {
  const {
    consent,
    showBanner,
    acceptAll,
    acceptEssential,
    saveCustom,
  } = useCookieConsent();

  const [open, setOpen]               = useState(false);
  const [customizeMode, setCustomize] = useState(false);

  // Custom category toggles
  const [functional,      setFunctional]      = useState(consent.functional);
  const [analytics,       setAnalytics]       = useState(consent.analytics);
  const [personalization, setPersonalization] = useState(consent.personalization);

  // Sync when consent changes externally
  useEffect(() => {
    setFunctional(consent.functional);
    setAnalytics(consent.analytics);
    setPersonalization(consent.personalization);
  }, [consent]);

  // Show banner when hook says so
  useEffect(() => { if (showBanner) setOpen(true); }, [showBanner]);

  // Allow "Cookie Preferences" footer link to reopen
  useEffect(() => {
    const handler = () => { setOpen(true); setCustomize(true); };
    window.addEventListener('wistaar-open-cookie-preferences', handler);
    return () => window.removeEventListener('wistaar-open-cookie-preferences', handler);
  }, []);

  // ── Critical: render NOTHING when closed ──────────────────────────────────
  if (!open) return null;

  const dismiss = () => setOpen(false);

  const handleAcceptAll = () => { acceptAll();        dismiss(); };
  const handleReject    = () => { acceptEssential();  dismiss(); };
  const handleSave      = () => {
    saveCustom({ functional, analytics, personalization } satisfies CustomCategories);
    setCustomize(false);
    dismiss();
  };

  return (
    // Outer shell: zero size, zero pointer events — pure stacking context
    <div style={{ position: 'fixed', inset: 0, zIndex: 99990, pointerEvents: 'none' }}>

      {/* Mobile backdrop — dims but NEVER intercepts clicks */}
      <div
        className="md:hidden"
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          pointerEvents: 'none',
        }}
      />

      {/* Card */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="cookie-card"
            initial={{ y: 64, opacity: 0, scale: 0.97 }}
            animate={{ y: 0,  opacity: 1, scale: 1 }}
            exit={{   y: 64, opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            style={{
              position: 'absolute',
              bottom: 24, right: 24,
              width: 'calc(100% - 32px)',
              maxWidth: 440,
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 22,
              display: 'flex', flexDirection: 'column', gap: 16,
              boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
              pointerEvents: 'auto', // ← only element that gets clicks
              zIndex: 9,
            }}
            className="md:!right-6 md:!max-w-[28rem]"
          >
            {!customizeMode ? (
              /* ── Default view ─────────────────────────────────── */
              <>
                {/* Header */}
                <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: C.icon, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Cookie style={{ width: 22, height: 22, color: C.text }} />
                  </div>
                  <div>
                    <h3 style={{
                      fontSize: 17, fontWeight: 700, color: C.text,
                      fontFamily: 'Georgia,"Times New Roman",serif',
                      marginBottom: 5, lineHeight: 1.2,
                    }}>
                      Cookie Preferences
                    </h3>
                    <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, margin: 0 }}>
                      We use cookies to personalize your reading experience, analyze site usage,
                      and assist in our marketing efforts.
                    </p>
                  </div>
                </div>

                {/* Privacy link */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <ShieldCheck style={{ width: 14, height: 14, color: '#22c55e', flexShrink: 0 }} />
                  <span style={{ fontSize: 11.5, color: C.muted }}>
                    Read our{' '}
                    <a href="/privacy" style={{ color: C.text, textDecoration: 'underline', fontWeight: 600 }}>
                      Privacy Policy
                    </a>
                    {' '}for more details.
                  </span>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <Btn onClick={() => setCustomize(true)} style={{ flex: '1 1 auto' }}>
                    <Sliders style={{ width: 13, height: 13 }} />
                    Customize
                  </Btn>
                  <Btn onClick={handleReject} style={{ flex: '1 1 auto', color: C.muted }}>
                    Reject
                  </Btn>
                  <Btn variant="filled" onClick={handleAcceptAll} style={{ flex: '1 1 auto' }}>
                    Accept All
                  </Btn>
                </div>
              </>
            ) : (
              /* ── Customize view ───────────────────────────────── */
              <>
                {/* Back header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  paddingBottom: 13, borderBottom: `1px solid ${C.border}`,
                }}>
                  <button
                    onClick={() => setCustomize(false)}
                    style={{
                      width: 30, height: 30, borderRadius: 7,
                      border: `1px solid ${C.border}`,
                      background: 'transparent', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, pointerEvents: 'auto',
                    }}
                  >
                    <ArrowLeft style={{ width: 14, height: 14, color: C.text }} />
                  </button>
                  <div>
                    <h3 style={{
                      fontSize: 14, fontWeight: 700, color: C.text,
                      fontFamily: 'Georgia,"Times New Roman",serif', margin: 0,
                    }}>
                      Cookie Settings
                    </h3>
                    <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                      Choose which cookies you allow
                    </p>
                  </div>
                </div>

                {/* 4 toggles */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <ToggleRow
                    icon={<ShieldCheck style={{ width: 14, height: 14 }} />}
                    label="Essential"
                    description="Login, security, and session cookies. Cannot be disabled."
                    checked={true}
                    locked
                  />
                  <ToggleRow
                    icon={<Settings style={{ width: 14, height: 14 }} />}
                    label="Functional"
                    description="Remember your theme, font preferences, and last visited page."
                    checked={functional}
                    onChange={setFunctional}
                  />
                  <ToggleRow
                    icon={<BarChart2 style={{ width: 14, height: 14 }} />}
                    label="Analytics"
                    description="Understand how readers use Wistaar — page views, search queries, time spent reading. Anonymous until you log in."
                    checked={analytics}
                    onChange={setAnalytics}
                  />
                  <ToggleRow
                    icon={<Sparkles style={{ width: 14, height: 14 }} />}
                    label="Personalization"
                    description="Power your 'Recommended for you' feed. We learn from genres you browse, books you finish, and authors you follow — like Netflix for books."
                    checked={personalization}
                    onChange={setPersonalization}
                  />
                </div>

                {/* Footer */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  paddingTop: 13, borderTop: `1px solid ${C.border}`,
                }}>
                  <span style={{ fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Info style={{ width: 11, height: 11 }} />
                    Your choice is respected
                  </span>
                  <Btn variant="filled" onClick={handleSave}>
                    Save Preferences
                  </Btn>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
