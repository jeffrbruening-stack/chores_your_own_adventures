import { useState } from 'react';
import { useListShopItems, usePurchaseItem, useGetMe, getGetMeQueryKey, getListShopItemsQueryKey, getGetInventoryQueryKey } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/auth-context';
import { useQueryClient } from '@tanstack/react-query';
import { Coins, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';

export default function Shop() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Parse category from URL if passed from character screen
  const searchParams = new URLSearchParams(window.location.search);
  const initialCategory = searchParams.get('category') || 'weapon';
  
  const [activeTab, setActiveTab] = useState(initialCategory);

  const { data: catalog, isLoading } = useListShopItems({ category: activeTab as any });
  const purchaseMutation = usePurchaseItem();

  const handlePurchase = (itemId: number) => {
    purchaseMutation.mutate({ data: { itemId } }, {
      onSuccess: (res) => {
        toast({
          title: "Item Acquired! 🎉",
          description: `You bought ${res.item.name}.`,
          className: "bg-primary text-primary-foreground border-none font-bold",
        });
        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListShopItemsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetInventoryQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Purchase Failed", description: err.message, variant: "destructive" });
      }
    });
  };

  const tabs = [
    { id: 'weapon', label: 'WEAPONS' },
    { id: 'off_hand', label: 'OFF HAND' },
    { id: 'outfit', label: 'OUTFITS' },
    { id: 'head', label: 'HEADWEAR' },
    { id: 'pet', label: 'PETS' },
  ];

  if (!currentUser) return null;

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card border-b border-border px-4 pt-4 pb-0">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-pixel text-primary">ITEM SHOP</h1>
          <div className="bg-background px-3 py-1.5 rounded-lg border border-yellow-500/50 flex items-center gap-2 text-sm font-bold text-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.1)]">
            {currentUser.personalGold} <Coins className="w-4 h-4" />
          </div>
        </div>
        
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "pb-3 text-xs font-pixel whitespace-nowrap transition-colors border-b-2",
                activeTab === tab.id 
                  ? "text-primary border-primary" 
                  : "text-muted-foreground border-transparent hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-6">
        {isLoading ? (
          <div className="text-center py-8 font-pixel animate-pulse text-muted-foreground">LOADING...</div>
        ) : (
          <>
            {/* Unlocked Items */}
            <div className="grid grid-cols-2 gap-3">
              {catalog?.unlocked.map(item => (
                <div key={item.id} className="bg-card border-2 border-border rounded-xl p-3 flex flex-col gap-2 relative">
                  <div className="aspect-square bg-background rounded-lg pixel-border flex items-center justify-center text-4xl mb-2">
                    {item.emoji || '✨'}
                  </div>
                  <h3 className="font-bold text-sm leading-tight line-clamp-2 min-h-[2.5rem]">{item.name}</h3>
                  <button 
                    onClick={() => handlePurchase(item.id)}
                    disabled={currentUser.personalGold < item.goldPrice || purchaseMutation.isPending}
                    className="w-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-bold text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:hover:bg-primary/10 disabled:hover:text-primary"
                  >
                    {item.goldPrice} <Coins className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            
            {(!catalog?.unlocked || catalog.unlocked.length === 0) && (
              <div className="text-center text-sm font-bold text-muted-foreground py-4">
                No items available in this category.
              </div>
            )}

            {/* Owned Items */}
            {catalog?.owned && catalog.owned.length > 0 && (
              <div>
                <h3 className="font-pixel text-[10px] text-muted-foreground mb-3">OWNED</h3>
                <div className="grid grid-cols-2 gap-3 opacity-70 grayscale-[0.5]">
                  {catalog.owned.map(item => (
                    <div key={item.id} className="bg-card border-2 border-border rounded-xl p-3 flex flex-col gap-2 relative">
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">OWNED</div>
                      <div className="aspect-square bg-background rounded-lg flex items-center justify-center text-4xl mb-2">
                        {item.emoji || '✨'}
                      </div>
                      <h3 className="font-bold text-sm leading-tight line-clamp-2">{item.name}</h3>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Coming Soon (Locked) */}
            {catalog?.comingSoon && catalog.comingSoon.length > 0 && (
              <div>
                <h3 className="font-pixel text-[10px] text-muted-foreground mb-3 flex items-center gap-2">
                  <Lock className="w-3 h-3" /> LOCKED
                </h3>
                <div className="grid grid-cols-2 gap-3 opacity-50 grayscale">
                  {catalog.comingSoon.map(item => (
                    <div key={item.id} className="bg-card border-2 border-border rounded-xl p-3 flex flex-col gap-2 relative">
                      <div className="aspect-square bg-background rounded-lg flex items-center justify-center text-4xl mb-2">
                        {item.emoji || '✨'}
                      </div>
                      <h3 className="font-bold text-sm leading-tight line-clamp-2">{item.name}</h3>
                      <div className="text-[10px] font-bold text-destructive flex items-center gap-1">
                        REQUIRES LVL {item.minLevel}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}