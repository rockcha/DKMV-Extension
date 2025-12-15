// src/webview/components/ImprovedCodePanel.tsx
import { useMemo, useState, useEffect } from "react";
import { Copy, Check, Scissors, FileCheck2 } from "lucide-react";

type Props = {
  isImproving: boolean;

  originalCode: string;
  improvedCode: string | null;

  onApplyToSelection?: () => void;
  onApplyToFile?: () => void;

  logoSrc: string;
};

function normalizeNewlines(text: string) {
  return text.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
}

function sanitizeLLMCode(raw: string): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "";

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === "string") return parsed;
    } catch {}

    const inner = trimmed.slice(1, -1);
    return inner
      .replace(/\\"/g, '"')
      .replace(/\\n/g, "\n")
      .replace(/\r\n/g, "\n");
  }

  return trimmed;
}

export default function ImprovedCodePanel({
  isImproving,
  originalCode,
  improvedCode,
  onApplyToSelection,
  onApplyToFile,
  logoSrc,
}: Props) {
  const normalizedOriginal = useMemo(
    () => normalizeNewlines(originalCode || ""),
    [originalCode]
  );

  const normalizedImproved = useMemo(() => {
    if (!improvedCode) return null;
    const cleaned = sanitizeLLMCode(improvedCode);
    return normalizeNewlines(cleaned);
  }, [improvedCode]);

  const canCopyImproved =
    !!normalizedImproved && normalizedImproved.trim().length > 0;

  const canApply = canCopyImproved && !isImproving;

  const [copied, setCopied] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsNarrow(window.innerWidth < 900);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
      <style>
        {`
          @keyframes dkmv-spinner-ring {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .dkmv-apply-btn{
            display:inline-flex;
            align-items:center;
            gap:8px;
            padding:10px 12px;
            border-radius:12px;
            border: 1px solid rgba(196,181,253,0.45);
            background: linear-gradient(90deg, rgba(124,58,237,0.95), rgba(168,85,247,0.95));
            color:#fff;
            font-weight:900;
            font-size:12px;
            cursor:pointer;
            transition: transform 120ms ease, filter 160ms ease, opacity 160ms ease;
            font-family: inherit;
          }
          .dkmv-apply-btn:hover{
            filter: brightness(1.06);
            transform: translateY(-1px);
          }
          .dkmv-apply-btn:disabled{
            opacity:0.50;
            cursor:not-allowed;
            transform:none;
            filter:none;
            background: rgba(148,163,184,0.10);
            border: 1px solid rgba(148,163,184,0.24);
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
          minHeight: "calc(100vh - 160px)",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
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
            {/* 원문/개선 2패널 */}
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
                {/* ✅ 헤더 + 우상단 복사 버튼 */}
                <div
                  style={{
                    padding: "8px 10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    borderBottom: "1px solid rgba(148,163,184,0.16)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 950,
                      color: "rgba(255,255,255,0.80)",
                    }}
                  >
                    개선 코드
                  </div>

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
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={onApplyToSelection}
                disabled={!canApply || !onApplyToSelection}
                className="dkmv-apply-btn"
                title={
                  !canCopyImproved
                    ? "개선코드가 있어야 적용할 수 있습니다."
                    : "지금 에디터에서 드래그한 선택영역(또는 마지막 스냅샷)에 적용합니다."
                }
              >
                <Scissors size={15} />
                <span>선택 영역에 적용</span>
              </button>

              <button
                type="button"
                onClick={onApplyToFile}
                disabled={!canApply || !onApplyToFile}
                className="dkmv-apply-btn"
                title={
                  !canCopyImproved
                    ? "개선코드가 있어야 적용할 수 있습니다."
                    : "파일을 선택한 뒤, 파일 전체를 개선코드로 교체합니다."
                }
              >
                <FileCheck2 size={15} />
                <span>파일에 적용</span>
              </button>
            </div>
          </div>

          {/* 로딩 오버레이 */}
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

              <span style={{ fontSize: 14, color: "#e5e7eb", fontWeight: 600 }}>
                개선코드를 생성하는 중...
              </span>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
