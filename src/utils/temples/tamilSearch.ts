export type TamilSearchNormalized = {
  original: string;
  normalized: string;
};

const TAMIL_VARIANT_MAP: Array<[RegExp, string]> = [
  [/கந்தா/gu, "கந்தன்"],
  [/கந்த/gu, "கந்தன்"],
  [/முருகா/gu, "முருகன்"],
  [/முருக/gu, "முருகன்"],
  [/சுப்பிரமணிய/gu, "முருகன்"],
  [/சுப்ரமணிய/gu, "முருகன்"],
  [/சுப்பிரமண்ய/gu, "முருகன்"],
];

export function normalizeTamilSearch(input: string): TamilSearchNormalized {
  const original = input || "";
  const trimmed = original.trim();
  if (!trimmed) {
    return { original, normalized: "" };
  }

  let normalized = trimmed.normalize("NFC");
  normalized = normalized.toLowerCase();
  normalized = normalized.replace(/[\u200B-\u200D\uFEFF]/g, "");
  normalized = normalized.replace(/[\s\-_,.()\[\]{}:;!?'"|/\\]+/g, " ");

  for (const [re, replacement] of TAMIL_VARIANT_MAP) {
    normalized = normalized.replace(re, replacement);
  }

  normalized = normalized.replace(/\s+/g, " ").trim();
  return { original, normalized };
}

export function buildTempleSearchKey(params: {
  templeNameTa: string;
  templeNameEn?: string | null;
  place: string;
}): string {
  const parts = [params.templeNameTa || "", params.templeNameEn || "", params.place || ""]
    .join(" ")
    .trim();
  return normalizeTamilSearch(parts).normalized;
}
