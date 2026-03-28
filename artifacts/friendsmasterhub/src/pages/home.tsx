import { useState } from "react";
import { useGetServerStatus } from "@workspace/api-client-react";
import { useGetBotStatus } from "@workspace/api-client-react";
import { Link } from "wouter";

function copyToClipboard(text: string, setCopied: (v: boolean) => void) {
  navigator.clipboard.writeText(text).then(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  });
}

export default function Home() {
  const [copied, setCopied] = useState(false);
  const { data: serverStatus, isLoading: serverLoading } = useGetServerStatus({
    query: { refetchInterval: 30000 },
  });
  const { data: botStatus } = useGetBotStatus({
    query: { refetchInterval: 10000 },
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 px-4 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto">
          <img
            src="https://i.ibb.co/4nyMLy4d/Minecraft-friends-hub-logo-design.png"
            alt="FriendsMasterHub Logo"
            className="mx-auto mb-6 h-32 w-auto object-contain drop-shadow-2xl"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <h1 className="text-5xl font-bold mb-4 text-foreground">
            Friends<span className="text-primary">Master</span>Hub
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
            A Minecraft Java community server where friends build, explore, and create together.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/submit">
              <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/30">
                Submit Your Build
              </button>
            </Link>
            <Link href="/gallery">
              <button className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:opacity-90 transition-all border border-border">
                View Gallery
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Server Status + Info */}
      <section className="max-w-5xl mx-auto px-4 pb-12 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold mb-4">Server Status</h2>

          {/* Two status badges */}
          <div className="flex flex-wrap gap-2 mb-5">
            {/* Connection badge */}
            {serverLoading ? (
              <span className="px-3 py-1.5 rounded-full text-xs bg-muted text-muted-foreground animate-pulse border border-border font-semibold">
                ⏳ Querying...
              </span>
            ) : (serverStatus as { success?: boolean } | undefined)?.success ? (
              <span className="px-3 py-1.5 rounded-full text-xs bg-primary/15 text-primary border border-primary/30 font-semibold flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Connection Successful
              </span>
            ) : (
              <span className="px-3 py-1.5 rounded-full text-xs bg-muted text-muted-foreground border border-border font-semibold flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                Connection Failed
              </span>
            )}

            {/* Online badge */}
            {!serverLoading && (
              serverStatus?.online ? (
                <span className="px-3 py-1.5 rounded-full text-xs bg-green-500/15 text-green-400 border border-green-500/30 font-semibold flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Online
                </span>
              ) : (
                <span className="px-3 py-1.5 rounded-full text-xs bg-destructive/15 text-destructive border border-destructive/30 font-semibold flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-destructive" />
                  Offline
                </span>
              )
            )}
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Players</span>
              <span className="font-medium">
                {serverStatus?.players?.online ?? 0} / {serverStatus?.players?.max ?? 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span className="font-medium">{serverStatus?.version ?? "1.21.1"}</span>
            </div>
            {serverStatus?.motd && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">MOTD</span>
                <span className="font-medium text-right max-w-[200px]">{serverStatus.motd}</span>
              </div>
            )}
          </div>
        </div>

        {/* Connection Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold mb-4">Connect to Server</h2>
          <div className="space-y-3 text-sm mb-5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Address</span>
              <span className="font-mono font-medium">FriendsMasterHub.aternos.me</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Port</span>
              <span className="font-mono font-medium">19276</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Edition</span>
              <span className="font-medium">Java</span>
            </div>
          </div>

          <button
            onClick={() => copyToClipboard("FriendsMasterHub.aternos.me:19276", setCopied)}
            className="w-full py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2"
            style={{
              background: copied
                ? "hsl(142 70% 45% / 0.2)"
                : "hsl(142 70% 45% / 0.1)",
              border: "1px solid hsl(142 70% 45% / 0.4)",
              color: copied ? "hsl(142 70% 45%)" : "hsl(0 0% 98%)",
            }}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy IP:Port
              </>
            )}
          </button>
        </div>
      </section>

      {/* Bot Status */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Bot Status</h2>
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1.5 ${
                botStatus?.connected
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-muted text-muted-foreground border border-border"
              }`}
            >
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  botStatus?.connected ? "bg-primary animate-pulse" : "bg-muted-foreground"
                }`}
              />
              {botStatus?.connected ? "Connected" : "Disconnected"}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
            <div className="bg-background/50 rounded-lg p-3">
              <p className="text-muted-foreground text-xs mb-1">Username</p>
              <p className="font-mono font-medium">{botStatus?.username ?? "FMH_Bot"}</p>
            </div>
            {botStatus?.health != null && (
              <div className="bg-background/50 rounded-lg p-3">
                <p className="text-muted-foreground text-xs mb-1">Health</p>
                <p className="font-medium">{botStatus.health} ❤️</p>
              </div>
            )}
            {botStatus?.position && (
              <div className="bg-background/50 rounded-lg p-3 col-span-2">
                <p className="text-muted-foreground text-xs mb-1">Position</p>
                <p className="font-mono text-xs">
                  X:{botStatus.position.x} Y:{botStatus.position.y} Z:{botStatus.position.z}
                </p>
              </div>
            )}
            {botStatus?.uptime != null && (
              <div className="bg-background/50 rounded-lg p-3">
                <p className="text-muted-foreground text-xs mb-1">Uptime</p>
                <p className="font-medium">
                  {Math.floor(botStatus.uptime / 60)}m {botStatus.uptime % 60}s
                </p>
              </div>
            )}
          </div>

          {botStatus?.activityLog && botStatus.activityLog.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2 text-muted-foreground">Activity Log</p>
              <div className="bg-background rounded-lg p-3 h-40 overflow-y-auto font-mono text-xs space-y-1">
                {botStatus.activityLog.map((log, i) => (
                  <div key={i} className="text-muted-foreground">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
