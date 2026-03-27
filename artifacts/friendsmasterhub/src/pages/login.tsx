import { useState } from "react";
import { useRegister, useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [usertag, setUsertag] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const [, navigate] = useLocation();

  const { mutate: doRegister, isPending: registering } = useRegister({
    mutation: {
      onSuccess: (data) => {
        login(data.usertag, data.token, data.credits);
        navigate("/");
      },
      onError: (err: { response?: { data?: { error?: string } } }) => {
        setError(err?.response?.data?.error ?? "Registration failed");
      },
    },
  });

  const { mutate: doLogin, isPending: loggingIn } = useLogin({
    mutation: {
      onSuccess: (data) => {
        login(data.usertag, data.token, data.credits);
        navigate("/");
      },
      onError: (err: { response?: { data?: { error?: string } } }) => {
        setError(err?.response?.data?.error ?? "Login failed");
      },
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!usertag.trim() || !password) {
      setError("All fields are required");
      return;
    }
    if (mode === "register") {
      doRegister({ data: { usertag: usertag.trim(), password } });
    } else {
      doLogin({ data: { usertag: usertag.trim(), password } });
    }
  }

  const isPending = registering || loggingIn;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="bg-card border border-border rounded-xl p-8 max-w-sm w-full shadow-xl">
        {/* Logo */}
        <div className="flex justify-center mb-5">
          <img
            src="https://i.ibb.co/4nyMLy4d/Minecraft-friends-hub-logo-design.png"
            alt="Logo"
            className="h-14 w-14 object-contain rounded-lg"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>

        <h1 className="text-2xl font-bold text-center mb-1">
          {mode === "login" ? "Welcome Back" : "Create Account"}
        </h1>
        <p className="text-muted-foreground text-sm text-center mb-6">
          {mode === "login" ? "Sign in to your FriendsMasterHub account" : "Join the FriendsMasterHub community"}
        </p>

        {/* Toggle */}
        <div className="flex bg-secondary rounded-lg p-1 mb-6">
          <button
            onClick={() => { setMode("login"); setError(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === "login" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Login
          </button>
          <button
            onClick={() => { setMode("register"); setError(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === "register" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Game Usertag</label>
            <input
              type="text"
              value={usertag}
              onChange={(e) => setUsertag(e.target.value)}
              placeholder="e.g. Steve123"
              autoComplete="username"
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-2.5 text-sm text-destructive">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
          >
            {isPending ? (mode === "login" ? "Signing in..." : "Creating account...") : (mode === "login" ? "Sign In" : "Create Account")}
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
