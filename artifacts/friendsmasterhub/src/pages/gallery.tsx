import { useGetBuilds } from "@workspace/api-client-react";
import { Link } from "wouter";

export default function Gallery() {
  const { data, isLoading, error } = useGetBuilds({
    query: { refetchInterval: 60000 },
  });

  const builds = data?.builds ?? [];

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/">
            <button className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 mb-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Build Gallery</h1>
              <p className="text-muted-foreground mt-1">
                Approved community builds from FriendsMasterHub
              </p>
            </div>
            <Link href="/submit">
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-all shadow-md shadow-primary/20">
                + Submit Build
              </button>
            </Link>
          </div>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl overflow-hidden animate-pulse">
                <div className="h-48 bg-muted" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <p className="text-destructive">Failed to load gallery.</p>
          </div>
        )}

        {!isLoading && builds.length === 0 && !error && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-1">No builds yet</h3>
            <p className="text-muted-foreground text-sm">Be the first to submit your Minecraft build!</p>
            <Link href="/submit">
              <button className="mt-4 px-5 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-all">
                Submit Build
              </button>
            </Link>
          </div>
        )}

        {!isLoading && builds.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {builds.map((build) => (
              <div
                key={build._id}
                className="bg-card border border-border rounded-xl overflow-hidden shadow-md hover:shadow-xl hover:border-primary/30 transition-all group"
              >
                <div className="relative overflow-hidden h-48">
                  <img
                    src={build.imageUrl}
                    alt={build.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
                  {build.status === "awarded" && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-500/90 text-yellow-950">
                      ⭐ Awarded
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-base mb-1 line-clamp-1">{build.title}</h3>
                  <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{build.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="bg-secondary px-2 py-0.5 rounded-full">
                      🎮 {build.uploaderName}
                    </span>
                    <span className="ml-auto">
                      {new Date(build.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
