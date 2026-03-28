import { useState } from "react";
import { useGetItems, useBuyItem } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

function RefreshBtn({ onClick, spinning }: { onClick: () => void; spinning: boolean }) {
  return (
    <button
      onClick={onClick}
      title="Refresh"
      className="p-2 rounded-lg hover:bg-secondary transition-all text-muted-foreground hover:text-foreground border border-border"
    >
      <svg className={`w-4 h-4 ${spinning ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    </button>
  );
}

export default function Shop() {
  const { user, updateCredits } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const { data, isLoading, refetch } = useGetItems({ query: { refetchInterval: 60000 } });
  const [buyMsg, setBuyMsg] = useState<{ msg: string; ok: boolean } | null>(null);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  function handleRefresh() {
    setSpinning(true);
    refetch().finally(() => setTimeout(() => setSpinning(false), 600));
  }

  const { mutate: buyItem } = useBuyItem({
    mutation: {
      onSuccess: (resp) => {
        setBuyMsg({ msg: resp.message, ok: true });
        updateCredits(resp.remainingCredits);
        setBuyingId(null);
        setTimeout(() => setBuyMsg(null), 4000);
      },
      onError: (err: { response?: { data?: { error?: string } } }) => {
        setBuyMsg({ msg: err?.response?.data?.error ?? "Purchase failed", ok: false });
        setBuyingId(null);
        setTimeout(() => setBuyMsg(null), 4000);
      },
    },
  });

  const items = data?.items ?? [];

  function handleBuy(itemId: string) {
    if (!user) return;
    setBuyingId(itemId);
    buyItem({ id: itemId, data: { usertag: user.usertag, token: user.token } });
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <Link href="/">
              <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 mb-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Credit Shop</h1>
              <RefreshBtn onClick={handleRefresh} spinning={spinning} />
            </div>
            <p className="text-muted-foreground mt-1">Spend your earned credits on rewards!</p>
          </div>

          {user ? (
            <div className="bg-card border border-border rounded-xl px-5 py-3 flex items-center gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Logged in as</p>
                <p className="font-bold text-sm">{user.usertag}</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <p className="text-xs text-muted-foreground">Credits</p>
                <p className="font-bold text-primary text-lg">{user.credits} ⭐</p>
              </div>
            </div>
          ) : (
            <Link href="/login">
              <button className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-all shadow-md shadow-primary/20">
                Login to Buy
              </button>
            </Link>
          )}
        </div>

        {buyMsg && (
          <div className={`mb-6 rounded-lg px-4 py-3 text-sm border ${buyMsg.ok ? "bg-primary/10 border-primary/30 text-primary" : "bg-destructive/10 border-destructive/30 text-destructive"}`}>
            {buyMsg.ok ? "✅" : "❌"} {buyMsg.msg}
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
                <div className="h-32 bg-muted rounded-lg mb-3" />
                <div className="h-4 bg-muted rounded w-2/3 mb-2" />
                <div className="h-3 bg-muted rounded w-full mb-4" />
                <div className="h-9 bg-muted rounded" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🛒</span>
            </div>
            <h3 className="text-lg font-semibold mb-1">Shop is empty</h3>
            <p className="text-muted-foreground text-sm">No items available yet. Check back soon!</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {items.map((item) => {
            const canAfford = user ? user.credits >= item.creditPrice : false;
            return (
              <div key={item._id} className="bg-card border border-border rounded-xl overflow-hidden shadow-md hover:shadow-xl hover:border-primary/20 transition-all flex flex-col">
                {item.imageUrl ? (
                  <div className="relative h-36 overflow-hidden">
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-card/70 to-transparent" />
                  </div>
                ) : (
                  <div className="h-24 bg-secondary flex items-center justify-center">
                    <span className="text-3xl">📦</span>
                  </div>
                )}
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-bold mb-1">{item.title}</h3>
                  {item.description && (
                    <p className="text-muted-foreground text-sm mb-3 flex-1 line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
                    <span className="font-bold text-primary text-lg">{item.creditPrice} ⭐</span>
                    {user ? (
                      <button
                        onClick={() => handleBuy(item._id)}
                        disabled={!canAfford || buyingId === item._id}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${canAfford ? "bg-primary text-primary-foreground hover:opacity-90 shadow-sm shadow-primary/20" : "bg-secondary text-muted-foreground cursor-not-allowed"}`}
                      >
                        {buyingId === item._id ? "Buying..." : canAfford ? "Buy" : "Not enough ⭐"}
                      </button>
                    ) : (
                      <Link href="/login">
                        <button className="px-4 py-2 text-sm font-semibold rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-all border border-border">
                          Login
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
