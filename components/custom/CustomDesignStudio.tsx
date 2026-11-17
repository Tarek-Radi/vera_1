"use client";
import Image from "next/image";
import { flushSync } from "react-dom";
import { whatsappUrl } from "../../lib/whatsapp";
import type { SavedArtwork } from "../../lib/custom/drive";
import { ZodError } from "zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { brand } from "../../config/brand";
import {
  customPriceLabel,
  printPositions,
  type PositionId,
} from "../../config/custom-design";
import { artworkFormat, artworkZip } from "../../lib/custom/artwork";
import {
  customHandoff,
  customRequestSchema,
  customMessage,
  hoodieOptions,
  type HoodieVariant,
  type CustomRequest,
} from "../../lib/custom/request";
import type { CheckoutCustomer } from "../../lib/orders/customer";

type Artwork = {
  token: string;
  file: File;
  url: string;
  extension: "png" | "jpg" | "webp";
};
type Placement = { artwork?: Artwork; note: string };
const fields = [
  ["name", "Full name", 100],
  ["phone", "Mobile number", 24],
  ["governorate", "Governorate", 80],
  ["area", "City / area", 100],
  ["address", "Full address", 350],
  ["paymentPreference", "Payment preference (optional)", 80],
  ["notes", "Order notes (optional)", 600],
] as const;
const emptyCustomer: CheckoutCustomer = {
  name: "",
  phone: "",
  governorate: "",
  area: "",
  address: "",
  paymentPreference: "",
  notes: "",
};

function HoodiePlacementSelector({
  selected,
  onSelect,
}: {
  selected: Partial<Record<PositionId, Placement>>;
  onSelect: (id: PositionId) => void;
}) {
  const [view, setView] = useState<"front" | "back">("front");
  const positions = printPositions.filter((p) => p.view === view);
  return (
    <section className="studio-panel">
      <h2>02 / Choose print positions</h2>
      <p>
        Black placement guides only. Your selected garment colors are listed
        above.
      </p>
      <div className="studio-tabs" aria-label="Hoodie view">
        {(["front", "back"] as const).map((v) => (
          <button
            type="button"
            key={v}
            aria-pressed={view === v}
            onClick={() => setView(v)}
          >
            {v === "front" ? "Front" : "Back"}
          </button>
        ))}
      </div>
      <div className="hoodie-guide">
        <Image
          src={`/Temple/hoodie-${view}.png`}
          width={1536}
          height={1024}
          alt={`${view} black hoodie placement guide with numbered badges`}
          sizes="(max-width: 800px) 100vw, 60vw"
        />
        {positions.map((p) => (
          <button
            type="button"
            key={p.id}
            className="placement-hotspot"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            aria-label={`Position ${p.id}: ${p.label}`}
            aria-pressed={!!selected[p.id]}
            onClick={() => onSelect(p.id)}
          />
        ))}
      </div>
      <div className="position-list">
        {positions.map((p) => (
          <button
            type="button"
            key={p.id}
            aria-pressed={!!selected[p.id]}
            onClick={() => onSelect(p.id)}
          >
            {p.id} — {p.label}
            {selected[p.id] ? " · Selected" : ""}
          </button>
        ))}
      </div>
      <p>
        Select a badge or use the position list. Select it again to remove that
        position and its artwork.
      </p>
    </section>
  );
}
function HoodieVariantFields({
  rows,
  onChange,
  errors,
}: {
  errors: Record<string, string>;
  rows: HoodieVariant[];
  onChange: (rows: HoodieVariant[]) => void;
}) {
  function update(i: number, patch: Partial<HoodieVariant>) {
    onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }
  return (
    <section className="studio-panel">
      <h2>01 / Your hoodies</h2>
      <p>The same artwork will be used for every variant below.</p>
      {rows.map((row, i) => (
        <div className="studio-variant" key={i}>
          <label>
            Color {i + 1}
            <select
              value={row.color}
              onChange={(e) => {
                const option = hoodieOptions.find(
                  (o) => o.color === e.target.value,
                )!;
                update(i, {
                  color: option.color,
                  size: option.sizes.includes(row.size)
                    ? row.size
                    : option.sizes[0] || "",
                });
              }}
            >
              {hoodieOptions.map((o) => (
                <option key={o.color} disabled={!o.sizes.length}>
                  {o.color}
                </option>
              ))}
            </select>
          </label>
          <label>
            Size {i + 1}
            <select
              value={row.size}
              onChange={(e) => update(i, { size: e.target.value })}
            >
              {hoodieOptions
                .find((o) => o.color === row.color)
                ?.sizes.map((s) => (
                  <option key={s}>{s}</option>
                ))}
            </select>
          </label>
          <label>
            Quantity {i + 1}
            <input
              type="number"
              min={1}
              max={999}
              step={1}
              required
              value={Number.isNaN(row.quantity) ? "" : row.quantity}
              onChange={(e) => update(i, { quantity: e.target.valueAsNumber })}
            />
          </label>
          {Object.entries(errors)
            .filter(
              ([key]) =>
                key === `variants.${i}` || key.startsWith(`variants.${i}.`),
            )
            .map(([key, message]) => (
              <span key={key} role="alert">
                {message}
              </span>
            ))}
          <button
            type="button"
            disabled={rows.length === 1}
            onClick={() => onChange(rows.filter((_, j) => j !== i))}
            aria-label={`Remove variant ${i + 1}`}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="button secondary"
        disabled={rows.length >= 20}
        onClick={() => onChange([...rows, { ...rows[0], quantity: 1 }])}
      >
        Add another variant
      </button>
      <p>
        <strong>
          Total quantity:{" "}
          {rows.every((r) => Number.isInteger(r.quantity) && r.quantity > 0)
            ? rows.reduce((n, r) => n + r.quantity, 0)
            : "Enter valid quantities"}
        </strong>
      </p>
    </section>
  );
}
function ArtworkUpload({
  id,
  value,
  onChange,
  onRemove,
  onError,
  onBusy,
  error,
}: {
  error?: string;
  id: PositionId;
  value: Placement;
  onChange: (p: Placement) => void;
  onRemove: () => void;
  onError: (s: string) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function upload(file?: File) {
    if (!file) return;
    setLoading(true);
    onBusy(true);
    let url = "";
    try {
      const format = await artworkFormat(file);
      if (
        file.name.length > 200 ||
        /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/.test(file.name)
      )
        throw new Error(
          "Use an artwork filename of up to 200 characters without control characters.",
        );
      url = URL.createObjectURL(new Blob([file], { type: format.mime }));
      await new Promise<void>((resolve, reject) => {
        const img = new window.Image();
        img.onload = () =>
          img.naturalWidth * img.naturalHeight <= 40_000_000
            ? resolve()
            : reject(new Error("Artwork must be at most 40 megapixels."));
        img.onerror = () =>
          reject(
            new Error(
              "This image cannot be read. Choose a valid PNG, JPEG or WebP.",
            ),
          );
        img.src = url;
      });
      if (!alive.current) {
        URL.revokeObjectURL(url);
        return;
      }
      onChange({
        ...value,
        artwork: {
          token: crypto.randomUUID(),
          file: new File([file], file.name, { type: format.mime }),
          url,
          extension: format.extension,
        },
      });
      onError("");
    } catch (error) {
      if (url) URL.revokeObjectURL(url);
      if (alive.current)
        onError(
          error instanceof Error ? error.message : "Could not read artwork.",
        );
    } finally {
      onBusy(false);
      if (alive.current) setLoading(false);
    }
  }
  return (
    <fieldset className="artwork-upload">
      <legend>
        Position {id} — {printPositions.find((p) => p.id === id)!.label}
      </legend>
      {value.artwork && (
        <div className="artwork-preview">
          <Image
            unoptimized
            src={value.artwork.url}
            width={88}
            height={88}
            alt={`Artwork for position ${id}`}
          />
          <span>
            {value.artwork.file.name}
            <br />
            Export: {id}.{value.artwork.extension}
          </span>
        </div>
      )}
      <label className="artwork-picker" htmlFor={`artwork-position-${id}`}>
        <span>{value.artwork ? "Replace" : "Upload"} artwork for position {id}</span>
        <input
          id={`artwork-position-${id}`}
          type="file"
          accept="image/*"
          disabled={loading}
          onChange={(e) => {
            void upload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      {loading && <p role="status">Checking image…</p>}
      <label>
        Placement note for position {id} (optional)
        <input
          maxLength={200}
          value={value.note}
          onChange={(e) => onChange({ ...value, note: e.target.value })}
        />
      </label>
      <button type="button" onClick={onRemove}>
        Remove position {id}
      </button>
    </fieldset>
  );
}
export default function CustomDesignStudio() {
  const [rows, setRows] = useState<HoodieVariant[]>([
    { color: "Black", size: hoodieOptions[0].sizes[0] || "", quantity: 1 },
  ]);
  const [placements, setPlacements] = useState<
    Partial<Record<PositionId, Placement>>
  >({});
  const [customer, setCustomer] = useState(emptyCustomer);
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, SavedArtwork>>({});
  const [uploads, setUploads] = useState(0);
  const [prepared, setPrepared] = useState<{
    message: string;
    whatsappUrl: string;
    requiresCopy: boolean;
  } | null>(null);
  const [shareSupported, setShareSupported] = useState(false);
  const urls = useRef(new Set<string>());
  const submitting = useRef(false);
  const mounted = useRef(true);
  const summaryRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    mounted.current = true;
    setReference(`VERA-CUSTOM-${crypto.randomUUID()}`);
    setShareSupported(
      typeof navigator.share === "function" &&
        typeof navigator.canShare === "function",
    );
    const activeUrls = urls.current;
    return () => {
      mounted.current = false;
      activeUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);
  function invalidate() {
    setPrepared(null);
    setFieldErrors({});
    setError("");
    setNotice("");
  }
  function placement(id: PositionId, next?: Placement) {
    const old = placements[id]?.artwork?.url;
    if (old && old !== next?.artwork?.url) {
      URL.revokeObjectURL(old);
      urls.current.delete(old);
    }
    if (next?.artwork) urls.current.add(next.artwork.url);
    setPlacements((p) => {
      const copy = { ...p };
      if (next) copy[id] = next;
      else delete copy[id];
      return copy;
    });
    invalidate();
  }
  function prepare(destinationRequired = true, uploaded = saved) {
    const selected = printPositions.filter((p) => placements[p.id]);
    if (selected.some((p) => !placements[p.id]?.artwork))
      throw new Error(
        "Upload valid artwork for every selected position, or remove unused positions.",
      );
    const request = {
      reference,
      variants: rows,
      customer,
      artwork: selected.map((p) => {
        const v = placements[p.id]!;
        return {
          position: p.id,
          filename: v.artwork!.file.name,
          extension: v.artwork!.extension,
          note: v.note,
        };
      }),
    } satisfies CustomRequest;
    let message = customMessage(request);
    if (
      selected.length &&
      selected.every((p) => uploaded[placements[p.id]!.artwork!.token])
    ) {
      message = message.replace(
        "Artwork files will be attached separately.",
        "Artwork is accessible to authorized store staff through Drive links; images are not attached automatically to WhatsApp.",
      );
      for (const p of selected) {
        const artwork = placements[p.id]!.artwork!;
        const file = uploaded[artwork.token];
        message = message.replace(
          `${artwork.file.name} → ${p.id}.${artwork.extension}`,
          `${file.code} — ${file.filename}`,
        );
      }
      message +=
        "\n\n" +
        selected
          .map((p) => {
            const a = uploaded[placements[p.id]!.artwork!.token];
            return `Position ${p.id}: ${a.code} — ${a.url}`;
          })
          .join("\n") +
        "\nRequest folder: " +
        uploaded[placements[selected[0].id]!.artwork!.token].folderUrl;
    }
    try {
      return { message, ...customHandoff(brand.whatsapp, message) };
    } catch (error) {
      const fallback = { message, whatsappUrl: "", requiresCopy: true };
      if (destinationRequired) {
        throw error;
      }
      return fallback;
    }
  }
  const numberedFiles = useMemo(
    () =>
      printPositions.flatMap((p) => {
        const a = placements[p.id]?.artwork;
        return a
          ? [
              new File([a.file], `${p.id}.${a.extension}`, {
                type: a.file.type,
              }),
            ]
          : [];
      }),
    [placements],
  );
  function showError(e: unknown) {
    setError(
      e instanceof Error
        ? e instanceof ZodError
          ? e.issues.map((issue) => issue.message).join(" ")
          : e.message
        : "Please try again. Your design has been kept.",
    );
  }
  function validateFields() {
    const selected = printPositions.filter((p) => placements[p.id]);
    const parsed = customRequestSchema.safeParse({
      reference,
      variants: rows,
      customer,
      artwork: selected.map((p) => ({
        position: p.id,
        filename: placements[p.id]?.artwork?.file.name || "",
        extension: placements[p.id]?.artwork?.extension || "png",
        note: placements[p.id]?.note || "",
      })),
    });
    const errors: Record<string, string> = {};
    if (!parsed.success)
      for (const issue of parsed.error.issues) {
        const path = issue.path;
        const key =
          path[0] === "artwork" && typeof path[1] === "number"
            ? `artwork.${selected[path[1]].id}`
            : path.join(".");
        errors[key] =
          path[0] === "artwork" && path[2] === "filename"
            ? "Choose valid artwork for this position."
            : issue.message;
      }
    if (
      selected.reduce(
        (n, p) => n + (placements[p.id]?.artwork?.file.size || 0),
        0,
      ) >
      2 * 1024 * 1024
    )
      errors.artwork =
        "Combined artwork must be at most 2 MB. Reduce image sizes.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError("Please correct the highlighted fields.");
      return false;
    }
    return true;
  }
  async function openWhatsApp() {
    if (submitting.current || uploads > 0) return;
    if (!validateFields()) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    setPrepared(null);
    setNotice("");
    try {
      prepare();
      const selected = printPositions.filter((p) => placements[p.id]?.artwork);
      const uploaded = { ...saved };
      for (let index = 0; index < selected.length; index++) {
        const position = selected[index].id,
          artwork = placements[position]!.artwork!;
        if (uploaded[artwork.token]) continue;
        setProgress(`Uploading image ${index + 1} of ${selected.length}`);
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(",")[1]);
          reader.onerror = () =>
            reject(
              new Error(
                `Could not read artwork for position ${position}. Reselect it and retry.`,
              ),
            );
          reader.readAsDataURL(artwork.file);
        });
        const response = await fetch("/api/custom-artwork", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reference,
            artwork: [{ position, token: artwork.token, data }],
          }),
          signal: AbortSignal.timeout(65000),
        });
        const result = await response.json().catch(() => ({
          error: "Upload service returned an invalid response. Please retry.",
        }));
        if (!response.ok || result.error)
          throw new Error(
            result.error || `Image ${index + 1} upload failed. Please retry.`,
          );
        const item = result.files?.[0];
        if (
          result.files?.length !== 1 ||
          !item ||
          item.token !== artwork.token ||
          item.position !== position ||
          !/^[-\w]+$/.test(item.id) ||
          !new RegExp(
            `^VERA-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-${position}$`,
          ).test(item.code) ||
          item.filename !== `${item.code}.${artwork.extension}` ||
          item.url !== `https://drive.google.com/file/d/${item.id}/view` ||
          !/^https:\/\/drive\.google\.com\/drive\/folders\/[\w-]+$/.test(
            item.folderUrl,
          )
        )
          throw new Error(
            "Upload was not confirmed. Please retry; saved files will be reused.",
          );
        uploaded[artwork.token] = item;
        setSaved({ ...uploaded });
        if (!mounted.current) return;
      }
      if (!selected.every((p) => uploaded[placements[p.id]!.artwork!.token]))
        throw new Error("Some artwork is not saved. Please retry.");
      const preparedResult = prepare(true, uploaded);
      const result = {
        ...preparedResult,
        whatsappUrl: whatsappUrl(brand.whatsapp, preparedResult.message),
        requiresCopy: false,
      };
      flushSync(() => {
        setPrepared(result);
        setNotice(
          "All artwork uploaded. Press Send inside WhatsApp; opening it does not send or confirm your request.",
        );
        setBusy(false);
      });
      window.location.assign(result.whatsappUrl);
    } catch (e) {
      showError(
        e instanceof DOMException && e.name === "TimeoutError"
          ? new Error(
              "Upload timed out. Retry; your files and successful uploads are kept.",
            )
          : e,
      );
    } finally {
      submitting.current = false;
      setBusy(false);
      setProgress("");
    }
  }
  async function download() {
    setBusy(true);
    try {
      const result = prepare(false);
      const blob = await artworkZip(reference, numberedFiles, result.message);
      const url = URL.createObjectURL(blob);
      urls.current.add(url);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reference}.zip`;
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        urls.current.delete(url);
      }, 30000);
      setNotice(
        "ZIP prepared locally as a backup. Use Send Custom Request to upload artwork before opening WhatsApp.",
      );
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  }
  function share() {
    try {
      prepare(false);
      const files = numberedFiles;
      if (
        typeof navigator.share !== "function" ||
        !navigator.canShare?.({ files })
      ) {
        setNotice(
          "File sharing is unavailable here. Download the artwork ZIP or individual images below for manual attachment.",
        );
        return;
      }
      void navigator
        .share({ files })
        .then(() =>
          setNotice(
            "Sharing closed. VERA cannot verify delivery. Keep the store chat and artwork available.",
          ),
        )
        .catch((error: unknown) =>
          setNotice(
            error instanceof DOMException && error.name === "AbortError"
              ? "Sharing cancelled. Your design is still here."
              : "File sharing failed. Download the artwork ZIP or individual images below for manual attachment.",
          ),
        );
    } catch (e) {
      showError(e);
    }
  }
  async function copy() {
    if (!prepared) return;
    try {
      await navigator.clipboard.writeText(prepared.message);
      setNotice("Summary copied. Paste it in the store chat and press Send.");
    } catch {
      summaryRef.current?.focus();
      summaryRef.current?.select();
      setNotice("Copy the selected summary manually.");
    }
  }
  return (
    <div className="studio">
      <header className="studio-heading">
        <p className="eyebrow">VERA STUDIO</p>
        <h1>Custom Your Design</h1>
        <p>Your hoodie. Your artwork. Made personal.</p>
      </header>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void openWhatsApp();
        }}
      >
        <fieldset className="studio-fields" disabled={busy || uploads > 0}>
          <div className="studio-layout">
            <div>
              <HoodieVariantFields
                rows={rows}
                errors={fieldErrors}
                onChange={(r) => {
                  setRows(r);
                  invalidate();
                }}
              />
              <HoodiePlacementSelector
                selected={placements}
                onSelect={(id) =>
                  placement(id, placements[id] ? undefined : { note: "" })
                }
              />
              <section className="studio-panel">
                <h2>03 / Add your artwork</h2>
                <p>
                  PNG, JPEG or WebP. Combined artwork must be at most 2 MB.
                  Drive uploads allow 1 MB per image by default (up to 2 MB if
                  configured), and 40 megapixels. Artwork is uploaded privately
                  to VERA’s Google Drive when you send your custom request.
                </p>
                {fieldErrors.artwork && (
                  <p role="alert">{fieldErrors.artwork}</p>
                )}
                {!Object.keys(placements).length && (
                  <p>Select one or more positions above to begin.</p>
                )}
                {printPositions
                  .filter((p) => placements[p.id])
                  .map((p) => (
                    <ArtworkUpload
                      key={p.id}
                      id={p.id}
                      value={placements[p.id]!}
                      onChange={(v) => placement(p.id, v)}
                      onRemove={() => placement(p.id)}
                      error={fieldErrors[`artwork.${p.id}`]}
                      onError={(message) =>
                        setFieldErrors((prev) => ({
                          ...prev,
                          [`artwork.${p.id}`]: message,
                        }))
                      }
                      onBusy={(b) => setUploads((n) => n + (b ? 1 : -1))}
                    />
                  ))}
              </section>
            </div>
            <div>
              <section className="studio-panel">
                <h2>04 / Your details</h2>
                {fields.map(([name, label, max]) => (
                  <label key={name}>
                    {label}
                    <input
                      name={name}
                      value={customer[name]}
                      required={
                        name !== "notes" && name !== "paymentPreference"
                      }
                      type={name === "phone" ? "tel" : "text"}
                      maxLength={max}
                      onChange={(e) => {
                        setCustomer((c) => ({ ...c, [name]: e.target.value }));
                        invalidate();
                      }}
                    />
                    {fieldErrors[`customer.${name}`] && (
                      <span role="alert">
                        {fieldErrors[`customer.${name}`]}
                      </span>
                    )}
                  </label>
                ))}
              </section>
              <section className="studio-panel studio-summary">
                <h2>Your custom request</h2>
                <p className="studio-reference">
                  {reference || "Preparing request reference…"}
                </p>
                <p>
                  This reference labels your files. No order is stored or
                  confirmed.
                </p>
                {rows.map((r, i) => (
                  <p key={i}>
                    {r.color} / {r.size} ×{" "}
                    {Number.isNaN(r.quantity) ? "?" : r.quantity}
                  </p>
                ))}
                <p>
                  <strong>
                    Total quantity:{" "}
                    {rows.every(
                      (r) => Number.isInteger(r.quantity) && r.quantity > 0,
                    )
                      ? rows.reduce((n, r) => n + r.quantity, 0)
                      : "Check quantities"}
                  </strong>
                </p>
                {printPositions
                  .filter((p) => placements[p.id])
                  .map((p) => (
                    <p key={p.id}>
                      Position {p.id}:{" "}
                      {placements[p.id]?.artwork?.file.name || "Artwork needed"}
                    </p>
                  ))}
                <strong>{customPriceLabel}</strong>
                <p>
                  Shipping to be confirmed. Coupons do not apply to custom
                  requests.
                </p>
                <button className="button" type="submit" disabled={!reference}>
                  {busy ? (
                    <>
                      <span className="studio-spinner" aria-hidden="true" />
                      Waiting… Uploading your artwork
                    </>
                  ) : (
                    "Send Custom Request via WhatsApp"
                  )}
                </button>

                {busy && (
                  <div role="status">
                    <p>{progress}</p>
                    <p>Please keep this page open until the upload finishes.</p>
                  </div>
                )}
                {printPositions.map((p) => {
                  const a = placements[p.id]?.artwork;
                  const file = a && saved[a.token];
                  return file ? (
                    <p key={p.id}>
                      Position {p.id}:{" "}
                      <a href={file.url} target="_blank" rel="noreferrer">
                        {file.code}
                      </a>
                    </p>
                  ) : null;
                })}
                <div className="studio-actions">
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => void download()}
                  >
                    {busy ? "Preparing ZIP…" : "Download Artwork ZIP"}
                  </button>
                  <button
                    className="button secondary"
                    type="button"
                    onClick={share}
                  >
                    Share Artwork
                  </button>
                </div>
                <div
                  className="studio-actions"
                  aria-label="Individual artwork downloads"
                >
                  {printPositions.map((p) => {
                    const artwork = placements[p.id]?.artwork;
                    return artwork ? (
                      <a
                        key={p.id}
                        className="button secondary"
                        href={artwork.url}
                        download={`${p.id}.${artwork.extension}`}
                      >
                        Download {p.id}.{artwork.extension}
                      </a>
                    ) : null;
                  })}
                </div>
                {!shareSupported && (
                  <p>
                    Native file sharing may be unavailable. Download the ZIP
                    instead.
                  </p>
                )}
                <p>
                  After uploads succeed, press Send in WhatsApp. Artwork is
                  available to authorized store staff through Drive links;
                  images are not attached automatically.
                </p>
                <p>
                  WhatsApp opens in this tab only after every image is saved.
                  You must press Send yourself. Native sharing lets you choose
                  an app and recipient; it cannot guarantee the store chat.
                </p>
                <p>
                  Keep this page open. Refreshing or leaving this page requires
                  re-entering details and reselecting files. Nothing is cleared
                  when you open WhatsApp or cancel sharing.
                </p>
              </section>
            </div>
          </div>
        </fieldset>
        {error && (
          <p className="studio-feedback" role="alert">
            {error}
            <button
              type="button"
              className="button secondary"
              disabled={busy || uploads > 0}
              onClick={() => void openWhatsApp()}
            >
              Retry
            </button>
          </p>
        )}
        {notice && (
          <p className="studio-feedback" role="status">
            {notice}
          </p>
        )}
        {prepared && (
          <section className="studio-panel">
            <h2>Prepared message</h2>
            <p>
              Opening WhatsApp does not mean your request was sent, paid or
              confirmed.
            </p>
            <div className="studio-actions">
              {prepared.whatsappUrl && (
                <a className="button" href={prepared.whatsappUrl}>
                  Open WhatsApp
                </a>
              )}
              <button
                className="button secondary"
                type="button"
                onClick={() => void copy()}
              >
                Copy message
              </button>
            </div>
            {prepared.requiresCopy && (
              <p>Copy this complete message and paste it into WhatsApp.</p>
            )}
            <textarea
              ref={summaryRef}
              aria-label="Custom request message"
              readOnly
              value={prepared.message}
              rows={16}
            />
          </section>
        )}
      </form>
    </div>
  );
}
