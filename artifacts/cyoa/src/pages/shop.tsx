import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useQueryClient } from '@tanstack/react-query';
import { Coins, Lock, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getGetInventoryQueryKey } from '@workspace/api-client-react';

interface ShopItem {
  id: number;
  name: string;
  category: string;
  description: string;
  goldPrice: number;
  minLevel: number;
  emoji: string;
  isOwned: boolean;
  isLocked: boolean;
}

const TABS = [
  { id: 'weapon',       label: 'WEAPONS'    },
  { id: 'offhand',      label: 'OFF HAND'   },
  { id: 'outfit',       label: 'OUTFITS'    },
  { id: 'head',         label: 'HEADWEAR'   },
  { id: 'pet',          label: 'PETS'       },
  { id: 'pet_accessory',label: 'PET ACC.'   },
  { id: 'background',   label: 'BACKDROPS'  },
  { id: 'effect',       label: 'EFFECTS'    },
];

// Category → equip slot mapping
const CAT_TO_SLOT: Record<string, string> = {
  weapon:        'main_hand',
  offhand:       'off_hand',
  outfit:        'outfit',
  head:          'head',
  pet:           'pet',
  pet_accessory: 'pet_accessory',
  background:    'background',
  effect:        'effect',
};

export default function Shop() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const searchParams = new URLSearchParams(window.location.search);
  const initialCategory = searchParams.get('category') || 'weapon';
  const [activeTab, setActiveTab] = useState(initialCategory);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [equipping, setEquipping] = useState<number | null>(null);

  // Fetch items when tab changes
  const fetchItems = async (category: string) => {
    setIsLoading(true);
    try {
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
      const token = localStorage.getItem('cyoa_token');
      const res = await fetch(`${BASE}/api/shop?category=${category}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch {
      toast({ title: 'Error loading shop', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Load on mount + tab change
  useEffect(() => {
    fetchItems(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    fetchItems(tabId);
  };

  const handlePurchase = async (item: ShopItem) => {
    if (!currentUser) return;
    setPurchasing(item.id);
    try {
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
      const token = localStorage.getItem('cyoa_token');
      const res = await fetch(`${BASE}/api/shop/${item.id}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Purchase failed' }));
        throw new Error(err.error ?? 'Purchase failed');
      }
      toast({
        title: 'Item Acquired! 🎉',
        description: `You bought ${item.name}.`,
        className: 'bg-primary text-primary-foreground font-bold border-none',
      });
      fetchItems(activeTab);
      queryClient.invalidateQueries({ queryKey: getGetInventoryQueryKey() });
    } catch (e: any) {
      toast({ title: 'Purchase Failed', description: e.message, variant: 'destructive' });
    } finally {
      setPurchasing(null);
    }
  };

  const handleEquip = async (item: ShopItem) => {
    setEquipping(item.id);
    try {
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
      const token = localStorage.getItem('cyoa_token');
      const slot = CAT_TO_SLOT[item.category] ?? item.category;
      const res = await fetch(`${BASE}/api/inventory/equip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ shopItemId: item.id, slot }),
      });
      if (!res.ok) throw new Error('Equip failed');
      toast({
        title: 'Equipped!',
        description: `${item.name} is now equipped.`,
        className: 'bg-green-600 text-white font-bold border-none',
      });
      queryClient.invalidateQueries({ queryKey: getGetInventoryQueryKey() });
    } catch (e: any) {
      toast({ title: 'Equip Failed', description: e.message, variant: 'destructive' });
    } finally {
      setEquipping(null);
    }
  };

  if (!currentUser) return null;

  // Split items into owned / available / locked (show up to currentLevel + 2 in locked preview)
  const userLevel = currentUser.currentLevel;
  const owned = items.filter(i => i.isOwned);
  const available = items.filter(i => !i.isOwned && !i.isLocked);
  const lockedPreview = items.filter(i => !i.isOwned && i.isLocked && i.minLevel <= userLevel + 2);
  const hidden = items.filter(i => !i.isOwned && i.isLocked && i.minLevel > userLevel + 2);

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card border-b border-border px-4 pt-4 pb-0">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-pixel text-primary">ITEM SHOP</h1>
          <div className="bg-background px-3 py-1.5 rounded-lg border border-yellow-500/50 flex items-center gap-2 text-sm font-bold text-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.15)]">
            {currentUser.personalGold} <Coins className="w-4 h-4" />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-5 overflow-x-auto no-scrollbar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'pb-3 text-[10px] font-pixel whitespace-nowrap transition-colors border-b-2 shrink-0',
                activeTab === tab.id
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-6">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-40 bg-card rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* AVAILABLE items */}
            {available.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {available.map(item => (
                  <ItemCard key={item.id} item={item}>
                    <button
                      onClick={() => handlePurchase(item)}
                      disabled={currentUser.personalGold < item.goldPrice || purchasing === item.id}
                      className={cn(
                        'w-full font-bold text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1',
                        currentUser.personalGold < item.goldPrice
                          ? 'bg-muted text-muted-foreground cursor-not-allowed'
                          : 'bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground',
                      )}
                    >
                      {purchasing === item.id ? (
                        <span className="animate-pulse">...</span>
                      ) : (
                        <>
                          {item.goldPrice === 0 ? 'FREE' : item.goldPrice}{' '}
                          {item.goldPrice > 0 && <Coins className="w-3 h-3" />}
                        </>
                      )}
                    </button>
                  </ItemCard>
                ))}
              </div>
            )}

            {/* OWNED items */}
            {owned.length > 0 && (
              <div>
                <h3 className="font-pixel text-[10px] text-green-500 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3" /> IN YOUR INVENTORY
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {owned.map(item => (
                    <ItemCard key={item.id} item={item} dimmed>
                      <div className="absolute top-2 right-2 bg-green-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
                        OWNED
                      </div>
                      <button
                        onClick={() => handleEquip(item)}
                        disabled={equipping === item.id}
                        className="w-full bg-green-600/10 text-green-500 hover:bg-green-600 hover:text-white font-bold text-xs py-2 rounded-lg transition-colors"
                      >
                        {equipping === item.id ? '...' : 'EQUIP'}
                      </button>
                    </ItemCard>
                  ))}
                </div>
              </div>
            )}

            {/* LOCKED PREVIEW (up to 2 levels ahead) */}
            {lockedPreview.length > 0 && (
              <div>
                <h3 className="font-pixel text-[10px] text-muted-foreground mb-3 flex items-center gap-2">
                  <Lock className="w-3 h-3" /> COMING SOON
                </h3>
                <div className="grid grid-cols-2 gap-3 opacity-60">
                  {lockedPreview.map(item => (
                    <ItemCard key={item.id} item={item} locked>
                      <div className="w-full bg-muted text-muted-foreground font-bold text-[10px] py-2 rounded-lg text-center flex items-center justify-center gap-1">
                        <Lock className="w-3 h-3" /> LEVEL {item.minLevel}
                      </div>
                    </ItemCard>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {available.length === 0 && owned.length === 0 && lockedPreview.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                <p className="font-pixel text-xs text-muted-foreground">NO ITEMS HERE</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {hidden.length > 0
                    ? `${hidden.length} more items unlock at higher levels.`
                    : 'Nothing available in this category yet.'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ItemCard({
  item,
  children,
  dimmed,
  locked,
}: {
  item: ShopItem;
  children: React.ReactNode;
  dimmed?: boolean;
  locked?: boolean;
}) {
  return (
    <div
      className={cn(
        'bg-card border-2 rounded-xl p-3 flex flex-col gap-2 relative',
        dimmed ? 'border-green-900/40' : locked ? 'border-dashed border-border' : 'border-border',
        locked && 'grayscale',
      )}
    >
      <div className="aspect-square bg-background rounded-lg flex items-center justify-center text-4xl mb-1">
        {item.emoji || '✨'}
      </div>
      <h3 className="font-bold text-xs leading-tight line-clamp-2 min-h-[2.25rem]">{item.name}</h3>
      {children}
    </div>
  );
}
