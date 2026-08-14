import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Star, Coins, ShieldAlert, Clock, CheckCircle2, AlertCircle, CalendarDays, RefreshCw, Camera, XCircle } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { proofImageUrl } from '@/lib/quest-proof';
import { cn } from '@/lib/utils';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseRecurrenceDays(routineSchedule: string | null | undefined): number[] {
  if (!routineSchedule) return [];
  try {
    const parsed = JSON.parse(routineSchedule);
    return Array.isArray(parsed?.days) ? parsed.days : [];
  } catch {
    return [];
  }
}

// Accepts either a QuestAssignment (with status) or a QuestDefinition (without status).
// Uses a loose shape so both work without casting at call sites.
export interface QuestLike {
  id: number;
  plainTitle: string;
  adventureTitle?: string | null;
  description?: string | null;
  difficulty: string;
  isLegendary?: boolean;
  questType?: string;
  requiresVerification?: boolean;
  verificationType?: string | null;
  proofPhotoPath?: string | null;
  xpReward: number;
  goldReward: number;
  partyGoldReward: number;
  status?: string;
  expiresAt?: string | null;
  timeWindowStart?: string | null;
  timeWindowEnd?: string | null;
  isRoutine?: boolean;
  routineSchedule?: string | null;
  scheduledDate?: string | null;
}

interface QuestDetailSheetProps {
  quest: QuestLike;
  onClose: () => void;
  /** For photo-verification quests, receives the chosen proof photo. */
  onComplete?: (photoFile?: File) => void;
  /** approved=false sends the quest back to the kid. */
  onVerify?: (approved: boolean) => void;
  isLeader?: boolean;
}

const difficultyColors: Record<string, string> = {
  easy:      'text-green-400 bg-green-400/10 border-green-400/30',
  normal:    'text-blue-400 bg-blue-400/10 border-blue-400/30',
  hard:      'text-orange-400 bg-orange-400/10 border-orange-400/30',
  epic:      'text-purple-400 bg-purple-400/10 border-purple-400/30',
  legendary: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
};

const questTypeLabel: Record<string, string> = {
  individual: 'ASSIGNED',
  open:       'OPEN QUEST',
  party:      'PARTY QUEST',
};

export function QuestDetailSheet({
  quest,
  onClose,
  onComplete,
  onVerify,
  isLeader,
}: QuestDetailSheetProps) {
  const { currentUser } = useAuth();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const needsPhoto = quest.requiresVerification && quest.verificationType === 'photo';

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const title =
    currentUser?.adventureMode && quest.adventureTitle
      ? quest.adventureTitle
      : quest.plainTitle;
  const isExpired =
    quest.expiresAt &&
    quest.status !== 'completed' &&
    isPast(new Date(quest.expiresAt));

  return createPortal(
    // `contents` makes this wrapper box-less so it doesn't affect layout,
    // but CSS custom properties (--card, --border, etc.) still cascade to
    // children — required because the portal lives outside .game-theme.
    <div className="contents dark game-theme">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t-2 border-border rounded-t-2xl max-h-[90dvh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-200">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-2 pb-4 border-b border-border gap-3">
          <div className="flex-1 min-w-0">
            {quest.isLegendary && (
              <span className="text-[10px] font-pixel text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-2 py-0.5 rounded-md mb-2 inline-block">
                ★ LEGENDARY
              </span>
            )}
            <h2 className="font-bold text-lg leading-tight">{title}</h2>
            {quest.adventureTitle && title !== quest.plainTitle && (
              <p className="text-xs text-muted-foreground mt-1 truncate">{quest.plainTitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors mt-0.5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-4 pb-10">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span
              className={cn(
                'text-xs font-bold uppercase px-3 py-1 rounded-full border',
                difficultyColors[quest.difficulty] ?? difficultyColors.normal,
              )}
            >
              {quest.difficulty}
            </span>
            {quest.questType && (
              <span className="text-xs font-bold uppercase px-3 py-1 rounded-full border border-border text-muted-foreground">
                {questTypeLabel[quest.questType] ?? quest.questType}
              </span>
            )}
            {quest.status && (
              <span
                className={cn(
                  'text-xs font-bold uppercase px-3 py-1 rounded-full border',
                  quest.status === 'completed'
                    ? 'text-green-400 bg-green-400/10 border-green-400/30'
                    : quest.status === 'pending_verification' || quest.status === 'submitted'
                    ? 'text-orange-400 bg-orange-400/10 border-orange-400/30'
                    : 'text-blue-400 bg-blue-400/10 border-blue-400/30',
                )}
              >
                {quest.status === 'pending_verification' || quest.status === 'submitted'
                  ? 'PENDING REVIEW'
                  : quest.status.toUpperCase()}
              </span>
            )}
          </div>

          {/* Rewards */}
          <div className="bg-background rounded-xl border border-border p-4 flex justify-around items-center">
            <div className="text-center">
              <div className="flex items-center gap-1 text-blue-400 font-bold text-xl justify-center">
                <Star className="w-4 h-4" />
                {quest.xpReward}
              </div>
              <div className="text-[10px] text-muted-foreground font-bold mt-0.5">XP</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <div className="flex items-center gap-1 text-yellow-400 font-bold text-xl justify-center">
                <Coins className="w-4 h-4" />
                {quest.goldReward}
              </div>
              <div className="text-[10px] text-muted-foreground font-bold mt-0.5">GOLD</div>
            </div>
            {quest.partyGoldReward > 0 && (
              <>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                  <div className="flex items-center gap-1 text-purple-400 font-bold text-xl justify-center">
                    <ShieldAlert className="w-4 h-4" />
                    {quest.partyGoldReward}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-bold mt-0.5">PARTY GOLD</div>
                </div>
              </>
            )}
          </div>

          {/* Recurring schedule */}
          {quest.isRoutine && (() => {
            const days = parseRecurrenceDays(quest.routineSchedule);
            return (
              <div className="flex items-start gap-2 text-sm px-4 py-3 rounded-xl border border-border bg-background text-muted-foreground">
                <RefreshCw className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                <div className="space-y-0.5">
                  <span className="font-bold text-foreground text-xs uppercase tracking-wide">Recurring</span>
                  {days.length > 0 && (
                    <p>{days.map(d => DAYS[d]).join(', ')}</p>
                  )}
                  {quest.timeWindowStart && quest.timeWindowEnd && (
                    <p className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {quest.timeWindowStart.substring(0, 5)} – {quest.timeWindowEnd.substring(0, 5)}
                    </p>
                  )}
                </div>
              </div>
            );
          })()}

          {/* One-time deadline */}
          {!quest.isRoutine && quest.scheduledDate && (
            <div
              className={cn(
                'flex items-center gap-2 text-sm px-4 py-3 rounded-xl border',
                isPast(new Date(quest.scheduledDate)) && quest.status !== 'completed'
                  ? 'border-red-500/30 bg-red-500/10 text-red-400'
                  : 'border-border bg-background text-muted-foreground',
              )}
            >
              <CalendarDays className="w-4 h-4 shrink-0" />
              <span>
                {isPast(new Date(quest.scheduledDate)) && quest.status !== 'completed'
                  ? 'Overdue — was due '
                  : 'Due '}
                {format(new Date(quest.scheduledDate), 'MMM d')}
                {quest.scheduledDate.includes('T23:59')
                  ? ' (end of day)'
                  : ` at ${format(new Date(quest.scheduledDate), 'h:mm a')}`}
              </span>
            </div>
          )}

          {/* Time window only (no full recurring schedule) */}
          {!quest.isRoutine && !quest.scheduledDate && (quest.timeWindowStart || quest.expiresAt) && (
            <div
              className={cn(
                'flex items-center gap-2 text-sm px-4 py-3 rounded-xl border',
                isExpired
                  ? 'border-red-500/30 bg-red-500/10 text-red-400'
                  : 'border-border bg-background text-muted-foreground',
              )}
            >
              <Clock className="w-4 h-4 shrink-0" />
              {quest.timeWindowStart && quest.timeWindowEnd ? (
                <span>
                  Available {quest.timeWindowStart.substring(0, 5)} –{' '}
                  {quest.timeWindowEnd.substring(0, 5)}
                </span>
              ) : quest.expiresAt ? (
                <span>
                  {isExpired ? 'Expired' : 'Ends'}{' '}
                  {format(new Date(quest.expiresAt), 'MMM d, h:mm a')}
                </span>
              ) : null}
            </div>
          )}

          {/* Description */}
          {quest.description && (
            <div className="space-y-1.5">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Description
              </h3>
              <p className="text-sm text-foreground/80 leading-relaxed">{quest.description}</p>
            </div>
          )}

          {/* Verification warning */}
          {quest.requiresVerification && quest.status !== 'completed' && (
            <div className="flex items-start gap-2 text-sm text-orange-400 bg-orange-400/10 px-4 py-3 rounded-xl border border-orange-400/20">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                {needsPhoto
                  ? 'Snap a photo of the finished chore — a grown-up will check it before rewards are paid.'
                  : 'A grown-up will inspect this in person before rewards are paid.'}
              </span>
            </div>
          )}

          {/* Photo proof picker (kid, photo-verification quests) */}
          {needsPhoto && quest.status === 'active' && onComplete && (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoChange}
                data-testid="input-proof-photo"
              />
              {photoPreview ? (
                <div className="relative rounded-xl overflow-hidden border-2 border-primary">
                  <img src={photoPreview} alt="Proof" className="w-full max-h-64 object-cover" />
                  <button
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1.5"
                    data-testid="button-remove-photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-xl py-8 flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
                  data-testid="button-take-photo"
                >
                  <Camera className="w-8 h-8" />
                  <span className="text-sm font-bold">TAKE A PHOTO</span>
                </button>
              )}
            </div>
          )}

          {/* Proof photo (leader reviewing a submitted photo quest) */}
          {isLeader &&
            (quest.status === 'pending_verification' || quest.status === 'submitted') &&
            quest.proofPhotoPath && (
              <div className="space-y-1.5">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Photo Proof
                </h3>
                <img
                  src={proofImageUrl(quest.id)}
                  alt="Proof of completed quest"
                  className="w-full max-h-72 object-contain rounded-xl border border-border bg-background"
                  data-testid="img-proof-photo"
                />
              </div>
            )}

          {/* Action: complete */}
          {quest.status === 'active' && onComplete && (
            <button
              onClick={() => { onComplete(photoFile ?? undefined); onClose(); }}
              disabled={needsPhoto && !photoFile}
              className="w-full bg-primary text-primary-foreground font-pixel py-4 rounded-xl pixel-corners border-b-4 border-r-4 border-black active:border-b-0 active:border-r-0 active:translate-y-1 active:translate-x-1 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              data-testid="button-complete-quest"
            >
              <CheckCircle2 className="w-5 h-5" />
              {quest.requiresVerification ? 'SUBMIT FOR REVIEW' : 'COMPLETE QUEST'}
            </button>
          )}

          {/* Status: pending review (non-leader) */}
          {(quest.status === 'pending_verification' || quest.status === 'submitted') &&
            !isLeader && (
              <div className="text-center text-sm font-bold text-orange-400 bg-orange-400/10 py-4 rounded-xl border border-orange-400/20">
                AWAITING LEADER REVIEW
              </div>
            )}

          {/* Action: verify (leader) */}
          {isLeader &&
            (quest.status === 'pending_verification' || quest.status === 'submitted') &&
            onVerify && (
              <div className="space-y-2">
                <button
                  onClick={() => { onVerify(true); onClose(); }}
                  className="w-full bg-green-500 text-white font-pixel py-4 rounded-xl pixel-corners border-b-4 border-r-4 border-green-900 active:border-b-0 active:border-r-0 active:translate-y-1 active:translate-x-1 transition-all text-sm flex items-center justify-center gap-2"
                  data-testid="button-approve-quest"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  APPROVE & AWARD REWARDS
                </button>
                <button
                  onClick={() => { onVerify(false); onClose(); }}
                  className="w-full bg-card text-red-400 font-pixel py-3.5 rounded-xl border-2 border-red-500/40 active:translate-y-0.5 transition-all text-xs flex items-center justify-center gap-2"
                  data-testid="button-reject-quest"
                >
                  <XCircle className="w-4 h-4" />
                  SEND BACK — NOT DONE YET
                </button>
              </div>
            )}

          {/* Status: completed */}
          {quest.status === 'completed' && (
            <div className="text-center text-sm font-bold text-green-400 bg-green-400/10 py-4 rounded-xl border border-green-400/20 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> QUEST COMPLETED
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
