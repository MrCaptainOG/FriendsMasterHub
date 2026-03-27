import { useState } from "react";
import {
  useGetAdminBuilds,
  useUpdateBuildStatus,
  useAwardBuild,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetAdminBuildsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  unchecked: "bg-muted text-muted-foreground border-border",
  approved: "bg-primary/20 text-primary border-primary/30",
  rejected: "bg-destructive/20 text-destructive border-destructive/30",
  awarded: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  unchecked: "Unchecked",
  approved: "Approved",
  rejected: "Rejected",
  awarded: "Awarded",
};

interface AwardModal {
  buildId: string;
  uploaderName: string;
}

export default function Admin() {
  const [password, setPassword] = useState("");
  const [enteredPassword, setEnteredPassword] = useState("");
  const [awardModal, setAwardModal] = useState<AwardModal | null>(null);
  const [awardItem, setAwardItem] = useState("golden_apple");
  const [awardQty, setAwardQty] = useState(1);
  const [awardMsg, setAwardMsg] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data, isLoading, error, refetch } = useGetAdminBuilds(
    { password: enteredPassword },
    {
      query: {
        enabled: !!enteredPassword,
        retry: false,
      },
    }
  );

  const { mutate: updateStatus } = useUpdateBuildStatus({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetAdminBuildsQueryKey({ password: enteredPassword }) });
        refetch();
      },
    },
  });

  const { mutate: awardBuild, isPending: awarding } = useAwardBuild({
    mutation: {
      onSuccess: (resp) => {
        setAwardMsg(resp.message ?? "Award queued!");
        setAwardModal(null);
        refetch();
        setTimeout(() => setAwardMsg(null), 4000);
      },
    },
  });

  const builds = data?.builds ?? [];
  const isAuthError = error && (error as { status?: number }).status === 401;

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setEnteredPassword(password);
  }

  function doUpdateStatus(id: string, status: string) {
    updateStatus({
      id,
      params: { password: enteredPassword },
      data: { status: status as "unchecked" | "approved" | "rejected" | "awarded" },
    });
  }

  function doAward() {
    if (!awardModal) return;
    awardBuild({
      id: awardModal.buildId,
      params: { password: enteredPassword },
      data: { item: awardItem, quantity: awardQty },
    });
  }

  if (!enteredPassword || isAuthError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="bg-card border border-border rounded-xl p-8 max-w-sm w-full shadow-xl">
          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-center mb-1">Admin Panel</h1>
          <p className="text-muted-foreground text-center text-sm mb-6">
            Enter the admin password to access the build review center.
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
            {isAuthError && (
              <p className="text-destructive text-sm text-center">
                Wrong password. Try again.
              </p>
            )}
            <button
              type="submit"
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-all"
            >
              Enter
            </button>
          </form>
          <Link href="/">
            <button className="w-full mt-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Back to Home
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/">
              <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 mb-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            </Link>
            <h1 className="text-3xl font-bold">Build Review Center</h1>
            <p className="text-muted-foreground mt-1">
              {builds.length} total submissions
            </p>
          </div>
          <button
            onClick={() => { setEnteredPassword(""); setPassword(""); }}
            className="text-sm text-muted-foreground hover:text-destructive transition-colors border border-border px-3 py-1.5 rounded-lg"
          >
            Logout
          </button>
        </div>

        {awardMsg && (
          <div className="mb-4 bg-primary/10 border border-primary/30 text-primary rounded-lg px-4 py-3 text-sm">
            ✅ {awardMsg}
          </div>
        )}

        {isLoading && (
          <div className="text-center py-20 text-muted-foreground">Loading builds...</div>
        )}

        {!isLoading && builds.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">No submissions yet.</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {builds.map((build) => {
            const isRejected = build.status === "rejected";
            const rejectedAt = build.rejectedAt ? new Date(build.rejectedAt) : null;
            const deleteAt = rejectedAt ? new Date(rejectedAt.getTime() + 24 * 60 * 60 * 1000) : null;

            return (
              <div
                key={build._id}
                className="bg-card border border-border rounded-xl overflow-hidden shadow-md flex flex-col"
              >
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={build.imageUrl}
                    alt={build.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold border ${STATUS_COLORS[build.status] ?? STATUS_COLORS.unchecked}`}
                    >
                      {STATUS_LABELS[build.status] ?? build.status}
                    </span>
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-bold mb-1 line-clamp-1">{build.title}</h3>
                  <p className="text-muted-foreground text-sm mb-2 line-clamp-2">{build.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <span className="bg-secondary px-2 py-0.5 rounded-full">
                      🎮 {build.uploaderName}
                    </span>
                    <span className="ml-auto">{new Date(build.createdAt).toLocaleDateString()}</span>
                  </div>

                  {isRejected && deleteAt && (
                    <p className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-1.5 mb-3">
                      ⚠️ Will be deleted by {deleteAt.toLocaleString()}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 mt-auto">
                    {build.status !== "approved" && (
                      <button
                        onClick={() => doUpdateStatus(build._id, "approved")}
                        className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-all"
                      >
                        ✓ Approve
                      </button>
                    )}
                    {build.status !== "rejected" && (
                      <button
                        onClick={() => doUpdateStatus(build._id, "rejected")}
                        className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20 transition-all"
                      >
                        ✗ Reject
                      </button>
                    )}
                    {build.status !== "awarded" && (
                      <button
                        onClick={() =>
                          setAwardModal({ buildId: build._id, uploaderName: build.uploaderName })
                        }
                        className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20 transition-all"
                      >
                        ⭐ Award
                      </button>
                    )}
                    {build.status === "awarded" && (
                      <span className="w-full text-center text-xs py-1.5 text-yellow-400 font-semibold">
                        ⭐ Already Awarded
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Award Modal */}
      {awardModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h2 className="text-xl font-bold mb-1">Award Build</h2>
            <p className="text-muted-foreground text-sm mb-5">
              Giving reward to <strong className="text-primary">{awardModal.uploaderName}</strong>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Item ID</label>
                <input
                  type="text"
                  value={awardItem}
                  onChange={(e) => setAwardItem(e.target.value)}
                  placeholder="e.g. golden_apple"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={awardQty}
                  onChange={(e) => setAwardQty(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>

              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                Bot will run: <code className="text-primary">/give {awardModal.uploaderName} {awardItem} {awardQty}</code>
                <br />
                The bot will wait until the player is online.
              </p>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setAwardModal(null)}
                className="flex-1 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-secondary transition-all"
              >
                Cancel
              </button>
              <button
                onClick={doAward}
                disabled={awarding || !awardItem}
                className="flex-1 py-2.5 bg-yellow-500 text-yellow-950 rounded-lg text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50"
              >
                {awarding ? "Awarding..." : "Give Reward"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
