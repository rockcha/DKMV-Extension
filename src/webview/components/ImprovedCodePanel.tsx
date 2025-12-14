// src/webview/components/ImprovedCodePanel.tsx

import React, { useMemo, useState, useEffect } from "react";
import { Sparkles, Loader2, ClipboardCopy, Wand2, Check } from "lucide-react";
import type { ReviewUIState } from "../ui/reviewState";
import { getStateBadge } from "../ui/reviewState";

type Props = {
  improveState: ReviewUIState;

  canGenerateImprovedCode: boolean;
  isImproving: boolean;

  originalCode: string;

  improvedCode: string | null;
  improvedMessage: string;

  onGenerate: () => void;
};

function normalizeNewlines(text: string) {
  return text.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
}

/** ✅ Webview에서도 확실히 도는 스피너 (Tailwind 의존 X) */
function Spinner({ size = 15 }: { size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        width: size,
        height: size,
        animation: "dkmvSpin 0.8s linear infinite",
      }}
    >
      <Loader2 size={size} />
      <style>
        {`
          @keyframes dkmvSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </span>
  );
}

export default function ImprovedCodePanel({
  improveState,
  canGenerateImprovedCode,
  isImproving,
  originalCode,
  improvedCode,
  improvedMessage,
  onGenerate,
}: Props) {
  const badge = useMemo(() => getStateBadge(improveState), [improveState]);

  const disabled = !canGenerateImprovedCode || isImproving;

  const normalizedOriginal = useMemo(
    () => normalizeNewlines(originalCode || ""),
    [originalCode]
  );

  const normalizedImproved = useMemo(() => {
    if (!improvedCode) return null;
    return normalizeNewlines(improvedCode);
  }, [improvedCode]);

  const canCopyImproved =
    !!normalizedImproved && normalizedImproved.trim().length > 0;

  // ✅ Copy UX 상태
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  // ✅ 복사 성공 시 1.2초 후 원복
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1200);
    return () => clearTimeout(t);
  }, [copied]);

  const onCopyImproved = async () => {
    if (!canCopyImproved) return;

    setCopyError(null);

    try {
      // VSCode webview에서도 clipboard API가 막히는 경우가 있어서 fallback까지
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(normalizedImproved!);
      } else {
        // fallback: execCommand
        const ta = document.createElement("textarea");
        ta.value = normalizedImproved!;
        ta.style.position = "fixed";
        ta.style.top = "-9999px";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }

      setCopied(true);
    } catch (e: any) {
      console.warn("[DKMV] clipboard copy failed:", e);
      setCopyError("복사에 실패했습니다. 다시 시도해 주세요.");
      setCopied(false);
    }
  };

  const copyBtnLabel = copied ? "복사됨!" : "복사";

  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid rgba(148,163,184,0.22)",
        background: "rgba(2,6,23,0.55)",
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minHeight: 320,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Wand2 size={16} color="#c084fc" />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>
              개선코드 생성
            </span>
          </div>
        </div>

        <div
          style={{
            fontSize: 11,
            color: "#0b1220",
            padding: "4px 10px",
            borderRadius: 999,
            border: `1px solid ${badge.border}`,
            backgroundColor: badge.color,
            whiteSpace: "nowrap",
            fontWeight: 900,
          }}
          title={!canGenerateImprovedCode ? "분석 완료 후 가능" : undefined}
        >
          {badge.text}
        </div>
      </div>

      {/* Message */}
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.78)" }}>
        {improvedMessage}
      </div>

      {/* ✅ Copy error small text */}
      {copyError && (
        <div style={{ fontSize: 11, color: "rgba(248,113,113,0.95)" }}>
          {copyError}
        </div>
      )}

      {/* Split panels */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          height: 280,
          minHeight: 280,
        }}
      >
        {/* Left: Original */}
        <div
          style={{
            borderRadius: 12,
            border: "1px solid rgba(148,163,184,0.20)",
            background: "rgba(15,23,42,0.55)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          <div
            style={{
              padding: "8px 10px",
              fontSize: 11,
              fontWeight: 800,
              color: "rgba(255,255,255,0.75)",
              borderBottom: "1px solid rgba(148,163,184,0.16)",
            }}
          >
            원문 코드
          </div>

          <pre
            style={{
              margin: 0,
              padding: 10,
              flex: 1,
              overflow: "auto",
              whiteSpace: "pre",
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
              fontSize: 11,
              lineHeight: 1.5,
              color: "rgba(255,255,255,0.82)",
            }}
          >
            {normalizedOriginal.trim().length > 0
              ? normalizedOriginal
              : "원문 코드가 없습니다."}
          </pre>
        </div>

        {/* Right: Improved */}
        <div
          style={{
            borderRadius: 12,
            border: copied
              ? "1px solid rgba(34,197,94,0.55)" // ✅ 복사 성공 시 살짝 초록 하이라이트
              : "1px solid rgba(196,181,253,0.28)",
            background: copied ? "rgba(34,197,94,0.10)" : "rgba(15,23,42,0.55)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            transition: "border-color 180ms ease, background 180ms ease",
          }}
        >
          <div
            style={{
              padding: "8px 10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              borderBottom: "1px solid rgba(148,163,184,0.16)",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 900,
                color: "rgba(255,255,255,0.80)",
              }}
            >
              개선 코드
            </span>

            <button
              type="button"
              disabled={!canCopyImproved || copied}
              onClick={onCopyImproved}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 10px",
                borderRadius: 10,
                border: copied
                  ? "1px solid rgba(34,197,94,0.60)"
                  : "1px solid rgba(148,163,184,0.30)",
                background: !canCopyImproved
                  ? "rgba(148,163,184,0.10)"
                  : copied
                  ? "rgba(34,197,94,0.22)"
                  : "rgba(2,6,23,0.45)",
                color: "#fff",
                fontWeight: 900,
                fontSize: 11,
                cursor: !canCopyImproved || copied ? "not-allowed" : "pointer",
                opacity: !canCopyImproved ? 0.6 : 1,
                transition:
                  "transform 120ms ease, border-color 180ms ease, background 180ms ease",
                transform: copied ? "scale(1.02)" : "scale(1)",
              }}
              title={
                !canCopyImproved
                  ? "개선코드가 없어서 복사할 수 없습니다."
                  : copied
                  ? "복사 완료!"
                  : "개선코드 복사"
              }
            >
              {copied ? <Check size={14} /> : <ClipboardCopy size={14} />}
              <span>{copyBtnLabel}</span>
            </button>
          </div>

          <pre
            style={{
              margin: 0,
              padding: 10,
              flex: 1,
              overflow: "auto",
              whiteSpace: "pre",
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
              fontSize: 11,
              lineHeight: 1.5,
              color: "rgba(255,255,255,0.90)",
            }}
          >
            {normalizedImproved
              ? normalizedImproved
              : isImproving
              ? "개선코드를 생성 중입니다..."
              : "아직 생성된 개선코드가 없습니다."}
          </pre>
        </div>
      </div>

      {/* Bottom actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          marginTop: 2,
        }}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={onGenerate}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(192,132,252,0.55)",
            background: disabled
              ? "rgba(148,163,184,0.18)"
              : "linear-gradient(135deg, rgba(126,34,206,0.95), rgba(192,132,252,0.75))",
            color: "#fff",
            fontWeight: 950,
            fontSize: 12,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.6 : 1,
            boxShadow: disabled ? "none" : "0 12px 26px rgba(0,0,0,0.28)",
          }}
          title={
            !canGenerateImprovedCode ? "분석 완료 후 생성 가능" : undefined
          }
        >
          {isImproving ? (
            <>
              {/* ✅ 확실히 도는 스피너 */}
              <Spinner size={15} />
              <span>생성 중...</span>
            </>
          ) : (
            <>
              <Sparkles size={15} />
              <span>개선코드 생성</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
