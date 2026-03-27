import { useState, useRef } from "react";
import {
  useGetAdminBuilds,
  useUpdateBuildStatus,
  useAwardBuild,
  useGetAdminUsers,
  useAdjustUserCredits,
  useGetItems,
  useCreateItem,
  useUpdateItem,
  useDeleteItem,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetAdminBuildsQueryKey,
  getGetAdminUsersQueryKey,
  getGetItemsQueryKey,
} from "@workspace/api-client-react";
import { Link } from "wouter";

const ADMIN_PASSWORD = "9897162621762";

const STATUS_COLORS: Record<string, string> = {
  unchecked: "bg-muted text-muted-foreground border-border",
  approved: "bg-primary/20 text-primary border-primary/30",
  rejected: "bg-destructive/20 text-destructive border-destructive/30",
  awarded: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};
const STATUS_LABELS: Record<string, string> = {
  unchecked: "Unchecked", approved: "Approved", rejected: "Rejected", awarded: "Awarded",
};

type Tab = "builds" | "users" | "items";

interface AwardModal { buildId: string; uploaderName: string; }
interface ItemFormState { title: string; description: string; creditPrice: string; imageFile: File | null; imagePreview: string | null; }
interface EditingItem { id: string; title: string; description: string; creditPrice: string; }

function AdminPasswordGate({ onEnter }: { onEnter: (pw: string) => void }) {
  const [pw, setPw] = useState("");
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="bg-card border border-border rounded-xl p-8 max-w-sm w-full shadow-xl">
        <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-center mb-1">Admin Panel</h1>
        <p className="text-muted-foreground text-center text-sm mb-6">Enter the admin password to continue.</p>
        <form onSubmit={(e) => { e.preventDefault(); onEnter(pw); }} className="space-y-4">
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Admin password" autoComplete="new-password"
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" />
          <button type="submit" className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-all">Enter</button>
        </form>
        <Link href="/"><button className="w-full mt-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">← Back to Home</button></Link>
      </div>
    </div>
  );
}

export default function Admin() {
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("builds");
  const qc = useQueryClient();

  // ── Build state ───────────────────────────────────────────────────────────
  const [awardModal, setAwardModal] = useState<AwardModal | null>(null);
  const [awardCredits, setAwardCredits] = useState(50);
  const [buildMsg, setBuildMsg] = useState<string | null>(null);

  // ── User state ────────────────────────────────────────────────────────────
  const [userMsg, setUserMsg] = useState<string | null>(null);
  const [creditEdit, setCreditEdit] = useState<{ id: string; amount: string } | null>(null);

  // ── Item state ────────────────────────────────────────────────────────────
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormState>({ title: "", description: "", creditPrice: "", imageFile: null, imagePreview: null });
  const [itemMsg, setItemMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Queries ───────────────────────────────────────────────────────────────
  const buildsQ = useGetAdminBuilds({ password }, { query: { enabled: !!password, retry: false } });
  const usersQ = useGetAdminUsers({ password }, { query: { enabled: !!password && activeTab === "users", retry: false } });
  const itemsQ = useGetItems({ query: { enabled: !!password } });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const { mutate: updateBuildStatus } = useUpdateBuildStatus({ mutation: { onSuccess: () => { buildsQ.refetch(); } } });
  const { mutate: awardBuild, isPending: awarding } = useAwardBuild({
    mutation: {
      onSuccess: (r) => { setBuildMsg(r.message); setAwardModal(null); buildsQ.refetch(); setTimeout(() => setBuildMsg(null), 5000); },
    },
  });
  const { mutate: adjustCredits, isPending: adjusting } = useAdjustUserCredits({
    mutation: {
      onSuccess: (u) => {
        setUserMsg(`${u.usertag} now has ${u.credits} credits`);
        setCreditEdit(null);
        qc.invalidateQueries({ queryKey: getGetAdminUsersQueryKey({ password }) });
        usersQ.refetch();
        setTimeout(() => setUserMsg(null), 4000);
      },
    },
  });
  const { mutate: createItem, isPending: creating } = useCreateItem({
    mutation: {
      onSuccess: () => { setShowAddItem(false); resetItemForm(); qc.invalidateQueries({ queryKey: getGetItemsQueryKey() }); itemsQ.refetch(); setItemMsg("Item added!"); setTimeout(() => setItemMsg(null), 3000); },
    },
  });
  const { mutate: updateItem, isPending: updatingItem } = useUpdateItem({
    mutation: {
      onSuccess: () => { setEditingItem(null); qc.invalidateQueries({ queryKey: getGetItemsQueryKey() }); itemsQ.refetch(); setItemMsg("Item updated!"); setTimeout(() => setItemMsg(null), 3000); },
    },
  });
  const { mutate: deleteItem } = useDeleteItem({
    mutation: {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetItemsQueryKey() }); itemsQ.refetch(); setItemMsg("Item deleted."); setTimeout(() => setItemMsg(null), 3000); },
    },
  });

  function resetItemForm() {
    setItemForm({ title: "", description: "", creditPrice: "", imageFile: null, imagePreview: null });
  }

  // ── Auth check ────────────────────────────────────────────────────────────
  if (!password) return <AdminPasswordGate onEnter={(pw) => { if (pw === ADMIN_PASSWORD) { setPassword(pw); setAuthError(false); } else { setAuthError(true); } }} />;
  if (authError) return <AdminPasswordGate onEnter={(pw) => { if (pw === ADMIN_PASSWORD) { setPassword(pw); setAuthError(false); } else { setAuthError(true); } }} />;

  // ── Image helper ──────────────────────────────────────────────────────────
  function readImage(file: File, cb: (b64: string, preview: string) => void) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      cb(result, result);
    };
    reader.readAsDataURL(file);
  }

  function handleItemImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    readImage(file, (_, preview) => {
      setItemForm(f => ({ ...f, imageFile: file, imagePreview: preview }));
    });
  }

  async function submitItemForm(forEdit?: string) {
    const base64 = itemForm.imageFile
      ? await new Promise<string>((res) => {
          const fr = new FileReader();
          fr.onload = (e) => res(e.target?.result as string);
          fr.readAsDataURL(itemForm.imageFile!);
        })
      : undefined;

    const payload = {
      title: itemForm.title,
      description: itemForm.description,
      creditPrice: Number(itemForm.creditPrice),
      ...(base64 ? { imageBase64: base64 } : {}),
    };

    if (forEdit) {
      updateItem({ id: forEdit, params: { password }, data: payload });
    } else {
      createItem({ params: { password }, data: payload });
    }
  }

  async function submitEditItem() {
    if (!editingItem) return;
    const base64 = itemForm.imageFile
      ? await new Promise<string>((res) => {
          const fr = new FileReader();
          fr.onload = (e) => res(e.target?.result as string);
          fr.readAsDataURL(itemForm.imageFile!);
        })
      : undefined;

    updateItem({
      id: editingItem.id,
      params: { password },
      data: {
        title: editingItem.title,
        description: editingItem.description,
        creditPrice: Number(editingItem.creditPrice),
        ...(base64 ? { imageBase64: base64 } : {}),
      },
    });
  }

  const builds = buildsQ.data?.builds ?? [];
  const users = usersQ.data?.users ?? [];
  const items = itemsQ.data?.items ?? [];

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "builds", label: "Build Reviews", icon: "🏗️" },
    { id: "users", label: "Users", icon: "👥" },
    { id: "items", label: "Shop Items", icon: "🛒" },
  ];

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/"><button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 mb-2">← Back</button></Link>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
          </div>
          <button onClick={() => { setPassword(""); }} className="text-sm text-muted-foreground hover:text-destructive border border-border px-3 py-1.5 rounded-lg transition-colors">
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-card border border-border rounded-xl p-1.5">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* ── Builds Tab ─────────────────────────────────────────────────────── */}
        {activeTab === "builds" && (
          <>
            {buildMsg && <div className="mb-4 bg-primary/10 border border-primary/30 text-primary rounded-lg px-4 py-3 text-sm">✅ {buildMsg}</div>}
            {buildsQ.isLoading && <div className="text-center py-20 text-muted-foreground">Loading...</div>}
            {!buildsQ.isLoading && builds.length === 0 && <div className="text-center py-20 text-muted-foreground">No submissions yet.</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {builds.map((build) => {
                const rejectedAt = build.rejectedAt ? new Date(build.rejectedAt) : null;
                const deleteAt = rejectedAt ? new Date(rejectedAt.getTime() + 24 * 60 * 60 * 1000) : null;
                return (
                  <div key={build._id} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
                    <div className="relative h-44 overflow-hidden">
                      <img src={build.imageUrl} alt={build.title} className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${STATUS_COLORS[build.status] ?? STATUS_COLORS.unchecked}`}>
                          {STATUS_LABELS[build.status] ?? build.status}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-bold mb-1 line-clamp-1">{build.title}</h3>
                      <p className="text-muted-foreground text-sm mb-2 line-clamp-2">{build.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                        <span className="bg-secondary px-2 py-0.5 rounded-full">🎮 {build.uploaderName}</span>
                        <span className="ml-auto">{new Date(build.createdAt).toLocaleDateString()}</span>
                      </div>
                      {build.status === "rejected" && deleteAt && (
                        <p className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-1.5 mb-3">⚠️ Deletes {deleteAt.toLocaleString()}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-auto">
                        {build.status !== "approved" && (
                          <button onClick={() => updateBuildStatus({ id: build._id, params: { password }, data: { status: "approved" } })}
                            className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-all">✓ Approve</button>
                        )}
                        {build.status !== "rejected" && (
                          <button onClick={() => updateBuildStatus({ id: build._id, params: { password }, data: { status: "rejected" } })}
                            className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20 transition-all">✗ Reject</button>
                        )}
                        {build.status !== "awarded" && (
                          <button onClick={() => setAwardModal({ buildId: build._id, uploaderName: build.uploaderName })}
                            className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20 transition-all">⭐ Award Credits</button>
                        )}
                        {build.status === "awarded" && <span className="w-full text-center text-xs py-1.5 text-yellow-400 font-semibold">⭐ Already Awarded</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── Users Tab ──────────────────────────────────────────────────────── */}
        {activeTab === "users" && (
          <>
            {userMsg && <div className="mb-4 bg-primary/10 border border-primary/30 text-primary rounded-lg px-4 py-3 text-sm">✅ {userMsg}</div>}
            {usersQ.isLoading && <div className="text-center py-20 text-muted-foreground">Loading users...</div>}
            {!usersQ.isLoading && users.length === 0 && <div className="text-center py-20 text-muted-foreground">No users registered yet.</div>}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {users.length > 0 && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Usertag</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Password</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Credits</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Joined</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, i) => (
                      <tr key={user._id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-secondary/20"}`}>
                        <td className="px-4 py-3 font-mono font-bold">{user.usertag}</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">{user.password}</td>
                        <td className="px-4 py-3 text-right">
                          {creditEdit?.id === user._id ? (
                            <div className="flex items-center gap-2 justify-end">
                              <input
                                type="number"
                                value={creditEdit.amount}
                                onChange={e => setCreditEdit(ce => ce ? { ...ce, amount: e.target.value } : null)}
                                placeholder="+10 or -5"
                                className="w-24 px-2 py-1 rounded border border-border bg-background text-foreground text-right focus:outline-none focus:ring-1 focus:ring-primary/40"
                              />
                              <button
                                disabled={adjusting}
                                onClick={() => adjustCredits({ id: user._id, params: { password }, data: { amount: Number(creditEdit.amount) } })}
                                className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs font-bold disabled:opacity-50">Save</button>
                              <button onClick={() => setCreditEdit(null)} className="px-2 py-1 bg-secondary text-muted-foreground rounded text-xs">✕</button>
                            </div>
                          ) : (
                            <span className="font-bold text-primary">{user.credits} ⭐</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right">
                          {creditEdit?.id !== user._id && (
                            <button
                              onClick={() => setCreditEdit({ id: user._id, amount: "" })}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-secondary border border-border hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
                            >Adjust Credits</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ── Items Tab ──────────────────────────────────────────────────────── */}
        {activeTab === "items" && (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-muted-foreground text-sm">{items.length} items in shop</p>
              <button onClick={() => { setShowAddItem(true); resetItemForm(); }}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-all shadow-md shadow-primary/20">
                + Add Item
              </button>
            </div>

            {itemMsg && <div className="mb-4 bg-primary/10 border border-primary/30 text-primary rounded-lg px-4 py-3 text-sm">{itemMsg}</div>}

            {items.length === 0 && !showAddItem && (
              <div className="text-center py-20 text-muted-foreground">No shop items yet. Add one!</div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map(item => (
                <div key={item._id} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
                  {item.imageUrl ? (
                    <div className="h-32 overflow-hidden">
                      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-20 bg-secondary flex items-center justify-center"><span className="text-2xl">📦</span></div>
                  )}
                  <div className="p-4 flex flex-col flex-1">
                    {editingItem?.id === item._id ? (
                      <div className="space-y-2">
                        <input value={editingItem.title} onChange={e => setEditingItem(ei => ei ? { ...ei, title: e.target.value } : null)}
                          className="w-full px-2 py-1.5 text-sm rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" placeholder="Title" />
                        <input value={editingItem.description} onChange={e => setEditingItem(ei => ei ? { ...ei, description: e.target.value } : null)}
                          className="w-full px-2 py-1.5 text-sm rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" placeholder="Description" />
                        <input type="number" value={editingItem.creditPrice} onChange={e => setEditingItem(ei => ei ? { ...ei, creditPrice: e.target.value } : null)}
                          className="w-full px-2 py-1.5 text-sm rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" placeholder="Credit price" />
                        <div>
                          <button onClick={() => fileRef.current?.click()} className="text-xs text-muted-foreground hover:text-primary transition-colors">📷 Change image</button>
                          {itemForm.imagePreview && <img src={itemForm.imagePreview} alt="" className="mt-1 h-12 rounded object-cover" />}
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button onClick={submitEditItem} disabled={updatingItem}
                            className="flex-1 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded disabled:opacity-50">Save</button>
                          <button onClick={() => { setEditingItem(null); resetItemForm(); }}
                            className="flex-1 py-1.5 bg-secondary text-muted-foreground text-xs rounded border border-border">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 className="font-bold mb-1">{item.title}</h3>
                        {item.description && <p className="text-muted-foreground text-xs mb-2 flex-1 line-clamp-2">{item.description}</p>}
                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
                          <span className="font-bold text-primary">{item.creditPrice} ⭐</span>
                          <div className="flex gap-1.5">
                            <button onClick={() => { setEditingItem({ id: item._id, title: item.title, description: item.description ?? "", creditPrice: String(item.creditPrice) }); resetItemForm(); }}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-secondary border border-border hover:border-primary/30 hover:text-primary transition-all">Edit</button>
                            <button onClick={() => { if (confirm(`Delete "${item.title}"?`)) deleteItem({ id: item._id, params: { password } }); }}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20 transition-all">Del</button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Item Form */}
            {showAddItem && (
              <div className="mt-6 bg-card border border-primary/30 rounded-xl p-6 shadow-xl">
                <h3 className="text-lg font-bold mb-4">Add New Shop Item</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Title <span className="text-destructive">*</span></label>
                    <input value={itemForm.title} onChange={e => setItemForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Diamond Sword"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Credit Price <span className="text-destructive">*</span></label>
                    <input type="number" value={itemForm.creditPrice} onChange={e => setItemForm(f => ({ ...f, creditPrice: e.target.value }))} placeholder="e.g. 100"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Description</label>
                    <input value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Item Image (optional)</label>
                    <div onClick={() => fileRef.current?.click()}
                      className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all">
                      {itemForm.imagePreview
                        ? <img src={itemForm.imagePreview} alt="Preview" className="max-h-28 mx-auto rounded object-contain" />
                        : <><span className="text-2xl block mb-1">📷</span><p className="text-sm text-muted-foreground">Click to upload image</p></>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={() => { setShowAddItem(false); resetItemForm(); }} className="flex-1 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-secondary transition-all">Cancel</button>
                  <button onClick={() => submitItemForm()} disabled={creating || !itemForm.title || !itemForm.creditPrice}
                    className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50">
                    {creating ? "Adding..." : "Add Item"}
                  </button>
                </div>
              </div>
            )}

            {/* Shared hidden file input */}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleItemImageChange} className="hidden" />
          </>
        )}
      </div>

      {/* Award Credits Modal */}
      {awardModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h2 className="text-xl font-bold mb-1">Award Credits</h2>
            <p className="text-muted-foreground text-sm mb-5">
              Awarding credits to <strong className="text-primary">{awardModal.uploaderName}</strong>
            </p>
            <div>
              <label className="block text-sm font-medium mb-1.5">Credits to award</label>
              <input type="number" min={1} value={awardCredits} onChange={e => setAwardCredits(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" />
            </div>
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 mt-3">
              Credits will be added to <strong>{awardModal.uploaderName}</strong>'s account if they have registered.
            </p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setAwardModal(null)} className="flex-1 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-secondary">Cancel</button>
              <button onClick={() => awardBuild({ id: awardModal.buildId, params: { password }, data: { credits: awardCredits } })}
                disabled={awarding || awardCredits < 1}
                className="flex-1 py-2.5 bg-yellow-500 text-yellow-950 rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-50">
                {awarding ? "Awarding..." : `Award ${awardCredits} ⭐`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
