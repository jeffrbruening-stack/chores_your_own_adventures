import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { X, Download, Printer, Star, Coins, Zap, Trophy } from 'lucide-react';
import { format } from 'date-fns';

export interface CertificateData {
  kidName: string;
  periodLabel: string;
  completedCount: number;
  xpEarned: number;
  goldEarned: number;
  levelUps: number;
  currentLevel?: number | null;
  completionRate: number;
}

interface RewardCertificateProps {
  data: CertificateData;
  onClose: () => void;
}

const STAR_POSITIONS = [
  { top: '8%', left: '6%' }, { top: '12%', left: '91%' },
  { top: '85%', left: '8%' }, { top: '80%', left: '92%' },
  { top: '50%', left: '3%' }, { top: '50%', left: '94%' },
  { top: '25%', left: '2%' }, { top: '30%', left: '95%' },
  { top: '70%', left: '3%' }, { top: '65%', left: '94%' },
];

export function RewardCertificate({ data, onClose }: RewardCertificateProps) {
  const certRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const todayStr = format(new Date(), 'MMMM d, yyyy');

  async function handleDownload() {
    if (!certRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(certRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        // Force load the pixel font by embedding it
        fontEmbedCSS: undefined,
      });
      const link = document.createElement('a');
      link.download = `${data.kidName.replace(/\s+/g, '-')}-certificate.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Certificate download failed', err);
    } finally {
      setDownloading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-start overflow-y-auto bg-black/80 backdrop-blur-sm p-4 pt-6 pb-10 print:bg-white print:p-0"
      data-testid="certificate-overlay"
    >
      {/* Action bar — hidden when printing */}
      <div className="print:hidden flex items-center gap-3 mb-4 w-full max-w-lg">
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-card border border-border hover:bg-muted transition-colors"
          data-testid="button-certificate-close"
        >
          <X className="w-4 h-4" />
        </button>
        <span className="font-pixel text-[10px] text-muted-foreground flex-1">CERTIFICATE OF ADVENTURE</span>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border hover:bg-muted transition-colors text-xs font-bold"
          data-testid="button-certificate-print"
        >
          <Printer className="w-3.5 h-3.5" />
          Print
        </button>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-bold disabled:opacity-60"
          data-testid="button-certificate-download"
        >
          <Download className="w-3.5 h-3.5" />
          {downloading ? 'Saving…' : 'Save Image'}
        </button>
      </div>

      {/* The certificate itself */}
      <div
        ref={certRef}
        data-testid="certificate-card"
        style={{
          background: 'linear-gradient(160deg, #0a0f2c 0%, #12195e 60%, #0a0f2c 100%)',
          border: '6px solid #c8a92b',
          borderRadius: '16px',
          boxShadow: 'inset 0 0 0 3px #7a6012, 0 0 40px #c8a92b40',
          width: '100%',
          maxWidth: '480px',
          padding: '40px 32px 36px',
          position: 'relative',
          fontFamily: '"Press Start 2P", monospace',
          color: '#f5e6a3',
          userSelect: 'none',
        }}
      >
        {/* Corner stars */}
        {STAR_POSITIONS.map((pos, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              top: pos.top,
              left: pos.left,
              fontSize: i % 3 === 0 ? '18px' : '12px',
              opacity: 0.55,
              color: '#c8a92b',
              pointerEvents: 'none',
            }}
          >
            ★
          </span>
        ))}

        {/* Inner border frame */}
        <div style={{
          position: 'absolute',
          inset: '14px',
          border: '2px solid #c8a92b44',
          borderRadius: '8px',
          pointerEvents: 'none',
        }} />

        {/* Title banner */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            fontSize: '10px',
            letterSpacing: '4px',
            color: '#c8a92b',
            marginBottom: '10px',
            textTransform: 'uppercase',
          }}>
            ✦ Certificate of Adventure ✦
          </div>
          <div style={{
            fontSize: '8px',
            color: '#a0aec0',
            letterSpacing: '2px',
          }}>
            THIS CERTIFIES THAT
          </div>
        </div>

        {/* Kid name */}
        <div style={{
          textAlign: 'center',
          margin: '0 0 6px',
        }}>
          <div style={{
            fontSize: '20px',
            color: '#fde68a',
            textShadow: '0 0 16px #c8a92b80, 2px 2px 0px #7a6012',
            letterSpacing: '1px',
            lineHeight: 1.3,
            wordBreak: 'break-word',
          }}>
            {data.kidName}
          </div>
        </div>

        {/* Tagline */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '7px', color: '#94a3b8', letterSpacing: '2px' }}>
            HERO OF THE REALM
          </div>
        </div>

        {/* Divider */}
        <div style={{
          height: '2px',
          background: 'linear-gradient(to right, transparent, #c8a92b, transparent)',
          marginBottom: '22px',
          opacity: 0.7,
        }} />

        {/* Period */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div style={{ fontSize: '7px', color: '#94a3b8', letterSpacing: '2px', marginBottom: '6px' }}>
            PERIOD OF GLORY
          </div>
          <div style={{ fontSize: '9px', color: '#c8a92b', letterSpacing: '1px' }}>
            {data.periodLabel}
          </div>
        </div>

        {/* Stats grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          marginBottom: '18px',
        }}>
          <StatBox
            icon="🏆"
            label="Quests Done"
            value={String(data.completedCount)}
            color="#fde68a"
          />
          <StatBox
            icon="📜"
            label="Completion"
            value={`${data.completionRate}%`}
            color="#93c5fd"
          />
          <StatBox
            icon="⭐"
            label="XP Earned"
            value={String(data.xpEarned)}
            color="#c4b5fd"
          />
          <StatBox
            icon="🪙"
            label="Gold Earned"
            value={String(data.goldEarned)}
            color="#fbbf24"
          />
        </div>

        {/* Level-up callout */}
        {data.levelUps > 0 && (
          <div style={{
            background: '#1e293b',
            border: '2px solid #fbbf24',
            borderRadius: '10px',
            padding: '12px 14px',
            textAlign: 'center',
            marginBottom: '18px',
            boxShadow: '0 0 12px #fbbf2430',
          }}>
            <div style={{ fontSize: '9px', color: '#fde68a', letterSpacing: '1px' }}>
              ⚡ LEVEL UP! ⚡
            </div>
            <div style={{ fontSize: '7px', color: '#94a3b8', marginTop: '6px', letterSpacing: '1px' }}>
              {data.levelUps > 1
                ? `${data.levelUps} levels gained!`
                : '1 level gained!'}
              {data.currentLevel != null && ` Now Level ${data.currentLevel}!`}
            </div>
          </div>
        )}

        {/* Divider */}
        <div style={{
          height: '2px',
          background: 'linear-gradient(to right, transparent, #c8a92b, transparent)',
          marginBottom: '16px',
          opacity: 0.5,
        }} />

        {/* Footer */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '7px', color: '#64748b', letterSpacing: '2px' }}>
            AWARDED ON {todayStr.toUpperCase()}
          </div>
          <div style={{ fontSize: '9px', color: '#c8a92b', marginTop: '8px', letterSpacing: '1px' }}>
            ✦ Chores Your Own Adventure ✦
          </div>
        </div>
      </div>

      <p className="print:hidden text-[10px] text-muted-foreground mt-4 text-center">
        Tip: Use &quot;Save Image&quot; to download, or &quot;Print&quot; to print as a certificate.
      </p>
    </div>
  );
}

function StatBox({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div style={{
      background: '#1e293b',
      border: '2px solid #334155',
      borderRadius: '10px',
      padding: '10px 8px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '18px', marginBottom: '6px', lineHeight: 1 }}>{icon}</div>
      <div style={{ fontSize: '13px', color, fontFamily: '"Press Start 2P", monospace', marginBottom: '5px' }}>
        {value}
      </div>
      <div style={{ fontSize: '6px', color: '#64748b', letterSpacing: '1px', fontFamily: '"Press Start 2P", monospace' }}>
        {label.toUpperCase()}
      </div>
    </div>
  );
}
