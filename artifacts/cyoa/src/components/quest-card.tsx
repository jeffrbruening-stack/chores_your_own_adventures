import { format, isPast } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { Clock, Coins, Star, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuestLike } from '@/components/quest-detail-sheet';

interface QuestCardProps {
  quest: QuestLike;
  onComplete?: () => void;
  onVerify?: () => void;
  onBonusRequest?: () => void;
  isLeader?: boolean;
  onClick?: () => void;
}

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-500/20 text-green-500 border-green-500/50',
  normal: 'bg-blue-500/20 text-blue-500 border-blue-500/50',
  hard: 'bg-orange-500/20 text-orange-500 border-orange-500/50',
  epic: 'bg-purple-500/20 text-purple-500 border-purple-500/50',
  legendary: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50',
};

export function QuestCard({ quest, onComplete, onVerify, onBonusRequest, isLeader, onClick }: QuestCardProps) {
  const { currentUser } = useAuth();
  
  const title = currentUser?.adventureMode && quest.adventureTitle ? quest.adventureTitle : quest.plainTitle;
  const isExpired = quest.expiresAt && isPast(new Date(quest.expiresAt));

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      className={cn(
        "bg-card border-2 p-4 rounded-xl flex flex-col gap-3 relative overflow-hidden transition-all",
        quest.isLegendary ? "border-yellow-500/50" : "border-border",
        isExpired && quest.status !== 'completed' ? "opacity-75" : "",
        onClick ? "cursor-pointer active:scale-[0.98] active:brightness-90" : ""
      )}
    >
      {quest.isLegendary && (
        <div className="absolute top-0 right-0 bg-yellow-500 text-yellow-950 text-[10px] font-pixel px-2 py-1 rounded-bl-lg">
          LEGENDARY
        </div>
      )}
      
      <div className="flex justify-between items-start gap-2">
        <h3 className="font-bold text-base leading-tight pr-4">{title}</h3>
      </div>

      <div className="flex flex-wrap gap-2 items-center text-xs">
        <span className={cn("px-2 py-1 rounded-md border font-bold uppercase", difficultyColors[quest.difficulty])}>
          {quest.difficulty}
        </span>
        
        <div className="flex items-center gap-3 text-muted-foreground font-medium">
          <span className="flex items-center gap-1"><Star className="w-3 h-3 text-blue-400" /> {quest.xpReward} XP</span>
          <span className="flex items-center gap-1"><Coins className="w-3 h-3 text-yellow-400" /> {quest.goldReward}</span>
          {quest.partyGoldReward > 0 && (
            <span className="flex items-center gap-1 text-purple-400"><ShieldAlert className="w-3 h-3" /> {quest.partyGoldReward} PG</span>
          )}
        </div>
      </div>

      {(quest.timeWindowStart || quest.expiresAt) && (
        <div className="text-xs flex items-center gap-1 text-muted-foreground bg-muted w-fit px-2 py-1 rounded-md">
          <Clock className="w-3 h-3" />
          {quest.timeWindowStart && quest.timeWindowEnd ? (
            <span>{quest.timeWindowStart.substring(0,5)} - {quest.timeWindowEnd.substring(0,5)}</span>
          ) : quest.expiresAt ? (
            <span>Ends {format(new Date(quest.expiresAt), 'MMM d, h:mm a')}</span>
          ) : null}
        </div>
      )}

      {quest.status === 'active' && onComplete && (
        <button 
          onClick={e => { e.stopPropagation(); onComplete(); }}
          className="mt-2 w-full bg-primary text-primary-foreground font-pixel text-[10px] py-3 rounded-lg active:scale-95 transition-transform"
        >
          {quest.requiresVerification ? 'SUBMIT FOR REVIEW' : 'COMPLETE QUEST'}
        </button>
      )}

      {(quest.status === 'active' || quest.status === 'completed') && onBonusRequest && (
        <button
          onClick={e => { e.stopPropagation(); onBonusRequest(); }}
          className="w-full border border-yellow-500/50 text-yellow-400 font-pixel text-[10px] py-2 rounded-lg active:scale-95 transition-transform bg-yellow-500/10"
          data-testid={`button-bonus-request-${quest.id}`}
        >
          ⭐ I DID EXTRA!
        </button>
      )}

      {quest.status === 'pending_verification' && (
        <div className="mt-2 text-center text-sm font-bold text-orange-400 bg-orange-400/10 py-2 rounded-lg">
          PENDING REVIEW
        </div>
      )}

      {isLeader && quest.status === 'pending_verification' && onVerify && (
        <button 
          onClick={onVerify}
          className="mt-2 w-full bg-green-500 text-white font-pixel text-[10px] py-3 rounded-lg active:scale-95 transition-transform"
        >
          VERIFY QUEST
        </button>
      )}
    </div>
  );
}