"use client";

// Working file picker in the wireframe's upload-box look (.wf-upload, see
// UploadBox in components/ui.js): drag files onto it or click "+ Choose
// File"; the picked files are listed — a thumbnail for images, the file
// type otherwise — each with a Remove button. Controlled — the parent keeps
// `files` (File[]).
//
//   <FileDropBox id="design-jpeg" label="Upload design JPEG" extensions={[".jpg", ".jpeg"]}
//     files={jpegs} onChange={setJpegs} />
//
// Files with other extensions are skipped (the API checks again).

import { useRef, useState } from "react";
import { useFilePreviews } from "@/lib/useFilePreviews";

export default function FileDropBox({ id, label, extensions = [], multiple = true, files, onChange, disabled = false }) {
  const input = useRef(null);
  const [dragging, setDragging] = useState(false);
  const previews = useFilePreviews(files);

  function allowed(file) {
    const name = file.name.toLowerCase();
    return !extensions.length || extensions.some((ext) => name.endsWith(ext));
  }

  function add(list) {
    const picked = [...list].filter(allowed);
    if (!picked.length) return;
    onChange(multiple ? [...files, ...picked] : picked.slice(0, 1));
  }

  function remove(index) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div
      className={`wf-upload${dragging ? " dragging" : ""}${disabled ? " disabled" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) add(e.dataTransfer.files);
      }}
    >
      <div>[ drag file here or click to browse ]</div>
      <label htmlFor={id} style={{ display: "block", marginTop: 6 }}>
        {label}
      </label>
      <input
        id={id}
        ref={input}
        type="file"
        hidden
        multiple={multiple}
        accept={extensions.join(",") || undefined}
        disabled={disabled}
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />
      <button type="button" className="wf-btn ghost" onClick={() => input.current?.click()} disabled={disabled}>
        + Choose File
      </button>
      {files.length > 0 && (
        <ul className="wf-upload-files">
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`}>
              <span className="wf-upload-file">
                {previews[i] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local preview of a picked file
                  <img className="wf-upload-thumb" src={previews[i]} alt="" />
                ) : (
                  <span className="wf-upload-thumb">{file.name.split(".").pop()}</span>
                )}
                <span>{file.name}</span>
              </span>
              <button type="button" className="wf-link-btn" onClick={() => remove(i)} disabled={disabled} aria-label={`Remove ${file.name}`}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
