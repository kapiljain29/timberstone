"use client";

import { useEffect, useMemo } from "react";

/**
 * Object URLs to preview picked files (File[]) — one per file, in order;
 * null for files that aren't images. Revoked when the files change or the
 * component unmounts. Used by the file pickers (FileDropBox, MPhotoPicker).
 */
export function useFilePreviews(files) {
  const previews = useMemo(() => files.map((file) => (file.type.startsWith("image/") ? URL.createObjectURL(file) : null)), [files]);
  useEffect(() => () => previews.forEach((url) => url && URL.revokeObjectURL(url)), [previews]);
  return previews;
}
