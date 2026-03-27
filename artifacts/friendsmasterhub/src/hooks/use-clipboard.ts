import { useState, useCallback } from "react";
import { useToast } from "./use-toast";

export function useClipboard({ timeout = 2000 } = {}) {
  const [hasCopied, setHasCopied] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = useCallback(
    (value: string, successMessage = "Copied to clipboard") => {
      if (typeof window === "undefined" || !navigator.clipboard?.writeText) {
        toast({
          title: "Copy failed",
          description: "Clipboard API not supported in this environment",
          variant: "destructive",
        });
        return;
      }

      if (!value) return;

      navigator.clipboard.writeText(value).then(() => {
        setHasCopied(true);
        toast({
          title: "Success",
          description: successMessage,
        });

        setTimeout(() => {
          setHasCopied(false);
        }, timeout);
      });
    },
    [timeout, toast]
  );

  return { copyToClipboard, hasCopied };
}
