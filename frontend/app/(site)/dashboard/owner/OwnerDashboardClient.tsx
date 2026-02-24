"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { FileImage, Film, Send, UploadCloud } from "lucide-react";

import { submitOwnerSubmission } from "@/lib/api/backend";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";

type SubmissionForm = {
  owner_name: string;
  phone: string;
  email: string;
  slot_name: string;
  location: string;
  price_per_hour: string;
  maps_link: string;
  availability: string;
  notes: string;
};

type OwnerSubmission = {
  id: string;
  owner_name: string;
  phone: string;
  email: string;
  slot_name: string;
  location: string;
  price_per_hour: number;
  maps_link: string;
  availability: string;
  notes: string;
  image_names: string[];
  video_name: string | null;
  created_at: string;
};

const OWNER_SUBMISSION_STORAGE_KEY = "zlot_owner_submissions";

const EMPTY_FORM: SubmissionForm = {
  owner_name: "",
  phone: "",
  email: "",
  slot_name: "",
  location: "",
  price_per_hour: "",
  maps_link: "",
  availability: "Weekdays",
  notes: "",
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export default function OwnerDashboardClient() {
  const [storageKey, setStorageKey] = useState(OWNER_SUBMISSION_STORAGE_KEY);
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState<SubmissionForm>(EMPTY_FORM);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadInputKey, setUploadInputKey] = useState(0);
  const [submissions, setSubmissions] = useState<OwnerSubmission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    const resolveUser = async () => {
      if (!hasSupabaseEnv()) {
        if (active) {
          setReady(true);
        }
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!active) {
          return;
        }

        if (user?.id) {
          setStorageKey(`${OWNER_SUBMISSION_STORAGE_KEY}:${user.id}`);
        }
      } finally {
        if (active) {
          setReady(true);
        }
      }
    };

    void resolveUser();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setSubmissions([]);
        return;
      }

      const parsed = JSON.parse(raw) as OwnerSubmission[];
      setSubmissions(Array.isArray(parsed) ? parsed : []);
    } catch {
      setSubmissions([]);
    }
  }, [ready, storageKey]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    localStorage.setItem(storageKey, JSON.stringify(submissions));
  }, [ready, storageKey, submissions]);

  const imagePreviews = useMemo(
    () =>
      imageFiles.map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
      })),
    [imageFiles]
  );

  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [imagePreviews]);

  const videoPreviewUrl = useMemo(
    () => (videoFile ? URL.createObjectURL(videoFile) : null),
    [videoFile]
  );

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  const onImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setError(null);
    setMessage(null);

    if (files.length === 0) {
      setImageFiles([]);
      return;
    }

    if (files.length > 8) {
      setError("Upload up to 8 images only.");
      return;
    }

    const invalidType = files.find((file) => !file.type.startsWith("image/"));
    if (invalidType) {
      setError("Only image files are allowed in the image upload.");
      return;
    }

    setImageFiles(files);
  };

  const onVideoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setError(null);
    setMessage(null);

    if (!file) {
      setVideoFile(null);
      return;
    }

    if (!file.type.startsWith("video/")) {
      setError("Please upload a valid video file.");
      return;
    }

    setVideoFile(file);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const ownerName = form.owner_name.trim();
    const phone = form.phone.trim();
    const email = form.email.trim();
    const slotName = form.slot_name.trim();
    const location = form.location.trim();
    const price = Number(form.price_per_hour);

    if (!ownerName || !phone || !email || !slotName || !location) {
      setError("Fill all required details.");
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      setError("Enter a valid hourly price.");
      return;
    }

    if (imageFiles.length === 0) {
      setError("Upload at least one image of the parking space.");
      return;
    }

    if (!hasSupabaseEnv()) {
      setError("Supabase environment is not configured.");
      return;
    }

    setSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      if (sessionError || !authToken) {
        setError("Your login session expired. Please login again.");
        return;
      }

      const imageNames = imageFiles.map((file) => file.name);
      const videoName = videoFile?.name ?? null;
      const imagePayload = await Promise.all(
        imageFiles.map(async (file) => ({
          name: file.name,
          content_type: file.type || "application/octet-stream",
          data_base64: await fileToBase64(file),
        }))
      );
      const videoPayload = videoFile
        ? {
            name: videoFile.name,
            content_type: videoFile.type || "application/octet-stream",
            data_base64: await fileToBase64(videoFile),
          }
        : null;

      await submitOwnerSubmission(authToken, {
        owner_name: ownerName,
        phone,
        email,
        slot_name: slotName,
        location,
        price_per_hour: Math.round(price),
        maps_link: form.maps_link.trim(),
        availability: form.availability.trim(),
        notes: form.notes.trim(),
        image_names: imageNames,
        video_name: videoName,
        images_base64: imagePayload,
        video_base64: videoPayload,
      });

      const nextSubmission: OwnerSubmission = {
        id: crypto.randomUUID(),
        owner_name: ownerName,
        phone,
        email,
        slot_name: slotName,
        location,
        price_per_hour: Math.round(price),
        maps_link: form.maps_link.trim(),
        availability: form.availability.trim(),
        notes: form.notes.trim(),
        image_names: imageNames,
        video_name: videoName,
        created_at: new Date().toISOString(),
      };

      setSubmissions((prev) => [nextSubmission, ...prev]);
      setForm(EMPTY_FORM);
      setImageFiles([]);
      setVideoFile(null);
      setUploadInputKey((prev) => prev + 1);
      setMessage("Details submitted and emailed to zlotparking@gmail.com.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to submit details."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="glass-card rounded-3xl p-7 shadow-sm sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
          Space Provider Submission
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Submit your space details with images and video.
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
          Fill your property details and upload media proof. This page is only for
          submitting listing information to the ZLOT team.
        </p>
      </section>

      <form onSubmit={onSubmit} className="glass-card rounded-3xl p-6 shadow-sm sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Owner Name *
            </span>
            <input
              required
              value={form.owner_name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, owner_name: event.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              placeholder="Full name"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Phone Number *
            </span>
            <input
              required
              value={form.phone}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, phone: event.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              placeholder="+91XXXXXXXXXX"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Email *
            </span>
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, email: event.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              placeholder="name@example.com"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Space Name *
            </span>
            <input
              required
              value={form.slot_name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, slot_name: event.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              placeholder="Indiranagar Slot A"
            />
          </label>

          <label className="space-y-2 sm:col-span-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Address / Location *
            </span>
            <textarea
              required
              rows={2}
              value={form.location}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, location: event.target.value }))
              }
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              placeholder="Full address with landmark"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Price / Hour (INR) *
            </span>
            <input
              required
              type="number"
              min={1}
              value={form.price_per_hour}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, price_per_hour: event.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              placeholder="60"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Availability
            </span>
            <select
              value={form.availability}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, availability: event.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="Weekdays">Weekdays</option>
              <option value="Weekends">Weekends</option>
              <option value="All Days">All Days</option>
              <option value="Night Only">Night Only</option>
            </select>
          </label>

          <label className="space-y-2 sm:col-span-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Google Maps Link
            </span>
            <input
              value={form.maps_link}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, maps_link: event.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              placeholder="https://maps.google.com/..."
            />
          </label>

          <label className="space-y-2 sm:col-span-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Additional Notes
            </span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, notes: event.target.value }))
              }
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              placeholder="Entry instructions, security, camera, gate timings..."
            />
          </label>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2">
            <UploadCloud className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <p className="text-sm font-bold text-slate-900 dark:text-white">Media Upload</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                <FileImage className="h-4 w-4" />
                Images * (up to 8)
              </span>
              <input
                key={`images-${uploadInputKey}`}
                type="file"
                accept="image/*"
                multiple
                onChange={onImageChange}
                className="block w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:file:bg-indigo-500"
              />
            </label>

            <label className="space-y-2">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                <Film className="h-4 w-4" />
                Video (optional)
              </span>
              <input
                key={`video-${uploadInputKey}`}
                type="file"
                accept="video/*"
                onChange={onVideoChange}
                className="block w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:file:bg-indigo-500"
              />
            </label>
          </div>

          {imagePreviews.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {imagePreviews.map((preview) => (
                <div key={preview.url} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                  <Image
                    src={preview.url}
                    alt={preview.name}
                    width={320}
                    height={160}
                    unoptimized
                    className="h-24 w-full object-cover sm:h-28"
                  />
                </div>
              ))}
            </div>
          )}

          {videoPreviewUrl && (
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <video src={videoPreviewUrl} controls className="w-full" />
            </div>
          )}
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        )}

        {message && (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-5 inline-flex items-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          {submitting ? "Submitting..." : "Submit Details"}
          <Send className="ml-2 h-4 w-4" />
        </button>
      </form>

      <section className="glass-card rounded-3xl p-6 shadow-sm sm:p-7">
        <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
          Recent Submissions
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Last submitted details from this account.
        </p>

        {submissions.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            No submissions yet.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {submissions.slice(0, 5).map((submission) => (
              <article
                key={submission.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900"
              >
                <p className="text-base font-black text-slate-900 dark:text-white">
                  {submission.slot_name}
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {submission.location}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {submission.owner_name} | {submission.phone} | {submission.email}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Images: {submission.image_names.length}
                  {submission.video_name ? " | Video: 1" : " | Video: 0"} | {formatDateTime(submission.created_at)}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
