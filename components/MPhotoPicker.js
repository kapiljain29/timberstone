"use client";

// Supervisor app photo picker: "Take Photo" opens the phone's camera,
// "Gallery" picks existing images; picked photos show as thumbnails with a
// remove (×) each. Controlled — the parent keeps `files` (File[]). Only
// images are kept (the API checks the type and size again).
//
//   <MPhotoPicker id="site-photos" label="Site Photos" files={photos} onChange={setPhotos} required error={fieldErrors.site_photos} />

import { useEffect, useMemo, useRef } from "react";
import { FieldError } from "@/components/ui";
import { MIcon } from "@/components/MobileUI";

export default function MPhotoPicker({ id, label, hint, files, onChange, multiple = true, required = false, disabled = false, error }) {
  const camera = useRef(null);
  const gallery = useRef(null);
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  function add(list) {
    const picked = [...list].filter((file) => file.type.startsWith("image/"));
    if (!picked.length) return;
    onChange(multiple ? [...files, ...picked] : picked.slice(0, 1));
  }

  const onPick = (e) => {
    add(e.target.files);
    e.target.value = "";
  };

  return (
    <div className="wf-field">
      <label htmlFor={`${id}-gallery`}>{label}</label>
      {/* Hidden pickers; `required` here gives the label its * marker. */}
      <input ref={camera} id={`${id}-camera`} type="file" accept="image/*" capture="environment" hidden disabled={disabled} onChange={onPick} />
      <input
        ref={gallery}
        id={`${id}-gallery`}
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        required={required}
        disabled={disabled}
        onChange={onPick}
      />
      {hint && <p className="wf-mhint">{hint}</p>}
      {files.length > 0 && (
        <div className="wf-mphotos">
          {files.map((file, i) => (
            <div key={`${file.name}-${file.lastModified}-${i}`} className="wf-mphoto">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview (blob URL) */}
              <img src={previews[i]} alt={file.name} />
              <button
                type="button"
                className="wf-mphoto-remove"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                disabled={disabled}
                aria-label={`Remove ${file.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="wf-mphoto-actions">
        <button type="button" className="wf-btn" onClick={() => camera.current?.click()} disabled={disabled}>
          <MIcon name="camera" size={17} /> Take Photo
        </button>
        <button type="button" className="wf-btn ghost" onClick={() => gallery.current?.click()} disabled={disabled}>
          <MIcon name="image" size={17} /> Gallery
        </button>
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}
