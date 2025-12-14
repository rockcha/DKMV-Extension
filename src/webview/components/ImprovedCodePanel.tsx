// src/webview/components/ImprovedCodePanel.tsx

import React, { useMemo, useState, useEffect } from "react";
import { Sparkles, Copy, Check } from "lucide-react";

type Props = {
  canGenerateImprovedCode: boolean;
  isImproving: boolean;

  originalCode: string;
  improvedCode: string | null;

  onGenerate: () => void;

  // ✅ ResultPanel처럼 로고로 로딩 돌리기 위한 이미지
  logoSrc: string;
};

function normalizeNewlines(text: string) {
  return text.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
}

export default function ImprovedCodePanel({
  canGenerateImprovedCode,
  isImproving,
  originalCode,
  improvedCode,
  onGenerate,
  logoSrc,
}: Props) {
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

  // ✅ Copy UX 상태: 텍스트 없이 아이콘만
  const [copied, setCopied] = useState(false);

  // ✅ 반응형: 좁아지면 세로 스택
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsNarrow(window.innerWidth < 900);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ✅ 복사 성공 시 1.2초 후 원복
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1200);
    return () => clearTimeout(t);
  }, [copied]);

  const onCopyImproved = async () => {
    if (!canCopyImproved || copied) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(normalizedImproved!);
      } else {
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
      setCopied(false);
    }
  };

  return (
    <>
      {/* ✅ ResultPanel과 동일한 링 스피너 keyframes */}
      <style>
        {`
          @keyframes dkmv-spinner-ring {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      <section
        style={{
          fontFamily: "var(--font-kr)",
          position: "relative",
          borderRadius: 10,
          border: "none",
          background:
            "radial-gradient(circle at top, rgba(30,64,175,0.18), transparent 60%), #020617",

          overflow: "hidden",
          height: "100%",
          minHeight: "calc(100vh - 170px)",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* 내부 컨테이너 */}
        <div
          style={{
            flex: 1,
            borderRadius: 8,
            border: "1px solid rgba(55,65,81,0.9)",
            backgroundColor: "#020617",
            padding: 10,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* 실제 내용 (로딩 시 blur) */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              filter: isImproving ? "blur(3px)" : "none",
              opacity: isImproving ? 0.7 : 1,
              transition: "filter 0.2s ease-out, opacity 0.2s ease-out",
              minHeight: 0,
            }}
          >
            {/* Header (멘트/아이콘 제거, 제목만) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "4px 2px",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 950, color: "#fff" }}>
                개선코드
              </span>
            </div>

            {/* Split panels */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: "grid",
                gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr",
                gap: 10,
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
                  minHeight: 0,
                }}
              >
                <div
                  style={{
                    padding: "8px 10px",
                    fontSize: 11,
                    fontWeight: 900,
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
                    minHeight: 0,
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
                    ? "1px solid rgba(34,197,94,0.55)"
                    : "1px solid rgba(196,181,253,0.28)",
                  background: copied
                    ? "rgba(34,197,94,0.10)"
                    : "rgba(15,23,42,0.55)",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  minWidth: 0,
                  minHeight: 0,
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
                      fontWeight: 950,
                      color: "rgba(255,255,255,0.80)",
                    }}
                  >
                    개선 코드
                  </span>

                  {/* ✅ 아이콘만: Copy -> Check */}
                  <button
                    type="button"
                    disabled={!canCopyImproved || copied}
                    onClick={onCopyImproved}
                    className="dkmv-icon-btn"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 34,
                      height: 30,
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
                      cursor:
                        !canCopyImproved || copied ? "not-allowed" : "pointer",
                      opacity: !canCopyImproved ? 0.6 : 1,
                      transition:
                        "transform 120ms ease, border-color 180ms ease, background 180ms ease",
                      transform: copied ? "scale(1.03)" : "scale(1)",
                      fontFamily: "inherit",
                    }}
                    title={
                      !canCopyImproved
                        ? "개선코드가 없어서 복사할 수 없습니다."
                        : copied
                        ? "복사 완료"
                        : "복사"
                    }
                    aria-label={copied ? "복사 완료" : "복사"}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>

                <pre
                  style={{
                    margin: 0,
                    padding: 10,
                    flex: 1,
                    minHeight: 0,
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
                  fontFamily: "inherit",
                }}
                title={
                  !canGenerateImprovedCode
                    ? "분석 완료 후 생성 가능"
                    : undefined
                }
              >
                {isImproving ? (
                  <span>생성 중...</span>
                ) : (
                  <>
                    <Sparkles size={15} />
                    <span>개선코드 생성</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ✅ 로딩 오버레이 - 로고 + 링 스피너 */}
          {isImproving && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "radial-gradient(circle at center, rgba(15,23,42,0.9), rgba(15,23,42,0.96))",
                pointerEvents: "none",
                gap: 14,
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: 104,
                  height: 104,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 999,
                    border: "2px solid rgba(148,163,184,0.2)",
                    borderTopColor: "#a855f7",
                    borderRightColor: "#38bdf8",
                    animation: "dkmv-spinner-ring 1.0s linear infinite",
                  }}
                />
                <img
                  src={logoSrc}
                  alt="Loading..."
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 18,
                    objectFit: "contain",
                  }}
                />
              </div>

              <span
                style={{
                  fontSize: 14,
                  color: "#e5e7eb",
                  fontWeight: 600,
                }}
              >
                개선코드를 생성하는 중...
              </span>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
