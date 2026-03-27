import { useState, useRef } from "react";
import { useSubmitBuild } from "@workspace/api-client-react";
import { Link } from "wouter";

export default function Submit() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    uploaderName: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { mutate: submitBuild, isPending } = useSubmitBuild({
    mutation: {
      onSuccess: () => {
        setSuccess(true);
        setForm({ title: "", description: "", uploaderName: "" });
        setImageFile(null);
        setPreview(null);
        setError(null);
      },
      onError: () => {
        setError("Failed to submit build. Please try again.");
      },
    },
  });

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!imageFile) {
      setError("Please select an image.");
      return;
    }
    if (!form.title || !form.description || !form.uploaderName) {
      setError("Please fill in all fields.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      submitBuild({
        data: {
          title: form.title,
          description: form.description,
          uploaderName: form.uploaderName,
          imageBase64: base64,
        },
      });
    };
    reader.readAsDataURL(imageFile);
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="bg-card border border-border rounded-xl p-10 max-w-md w-full text-center shadow-xl">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Build Submitted!</h2>
          <p className="text-muted-foreground mb-6">
            Your build has been submitted for review. The admins will check it soon!
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setSuccess(false)}
              className="px-5 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:opacity-90 transition-all border border-border"
            >
              Submit Another
            </button>
            <Link href="/gallery">
              <button className="px-5 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-all">
                View Gallery
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-xl mx-auto">
        <div className="mb-8">
          <Link href="/">
            <button className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 mb-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </button>
          </Link>
          <h1 className="text-3xl font-bold">Submit Your Build</h1>
          <p className="text-muted-foreground mt-1">
            Share your Minecraft creation with the community!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 shadow-lg space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Your Minecraft Username <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={form.uploaderName}
              onChange={(e) => setForm((f) => ({ ...f, uploaderName: e.target.value }))}
              placeholder="e.g. Steve123"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Build Title <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Epic Castle"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Description <span className="text-destructive">*</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Tell us about your build..."
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Build Screenshot <span className="text-destructive">*</span>
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all"
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-48 mx-auto rounded-lg object-contain"
                />
              ) : (
                <>
                  <svg className="w-10 h-10 text-muted-foreground mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-muted-foreground">Click to upload image</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, JPEG supported</p>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            {imageFile && (
              <p className="text-xs text-muted-foreground mt-1.5">{imageFile.name}</p>
            )}
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
          >
            {isPending ? "Uploading..." : "Submit Build"}
          </button>
        </form>
      </div>
    </div>
  );
}
