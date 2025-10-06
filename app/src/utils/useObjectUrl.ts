import { useEffect, useState } from "react";

export function useObjectUrl(blob: Blob | null) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(blob);

    setUrl(objectUrl);

    return () => {
      setUrl(null);
      URL.revokeObjectURL(objectUrl);
    };
  }, [blob, setUrl]);

  return url;
}
