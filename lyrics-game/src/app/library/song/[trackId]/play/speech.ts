"use client";

/**
 * The browser's speech recognition (Chrome and Edge), which isn't in
 * TypeScript's own types, and the microphone checks Sing mode needs.
 */

export interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}

export interface RecognitionEvent {
  resultIndex: number;
  results: { length: number; [i: number]: RecognitionResult };
}

export interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  abort(): void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
}

type RecognitionClass = new () => Recognition;

export function recognitionClass(): RecognitionClass | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, RecognitionClass | undefined>;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function canRecognizeSpeech(): boolean {
  return recognitionClass() !== null;
}

/** What the browser listens for, per song language. Latin American Spanish did best in step 0. */
export const LISTEN_LANG = { en: "en-US", es: "es-US" } as const;

export type MicAccess = "granted" | "denied" | "prompt";

/** Whether the microphone is already allowed, refused, or not asked yet. */
export async function micAccess(): Promise<MicAccess> {
  try {
    const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
    return status.state;
  } catch {
    return "prompt"; // Browsers that can't say: asking will tell.
  }
}

/** Asks for the microphone (the browser's prompt) and lets it go straight away. */
export async function askForMic(): Promise<"granted" | "denied" | "no_mic"> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return "granted";
  } catch (error) {
    const name = (error as DOMException).name;
    return name === "NotFoundError" || name === "OverconstrainedError" ? "no_mic" : "denied";
  }
}
