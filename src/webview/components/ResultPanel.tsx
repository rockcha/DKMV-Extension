// src/webview/components/ResultPanel.tsx

import React, { useState, useEffect, useMemo } from "react";
import type { CSSProperties } from "react";
import type {
  AnalyzerResult,
  ScoreCategories,
  CategoryComment,
} from "../types";
import { getScoreLabel, normalizeReviewDetails } from "../utils/scoring";
import { Bug, Wrench, Palette, Shield, Copy, Check } from "lucide-react";

declare global {
  interface Window {
    __DKMV_NOT_FOUND__?: string;
    __DKMV_BADGES__?: Record<string, string>;
  }
}

type Props = {
  resultData: AnalyzerResult | null;
  selectedModel: string;
  isError: boolean;
  isLoading: boolean;
  resultHighlight: boolean;
  displayOverallScore: number;
  displayCategoryScores: ScoreCategories;
  logoSrc: string;
  reviewMeta?: {
    reviewId: number | null;
    model?: string | null;
    audit?: string | null;
  };
  rawResponseText?: string | null;
};

// ✅ 전체 등급 타입
type OverallGrade = "excellent" | "good" | "fair" | "needsWork" | "poor";

// ✅ 등급 순서 + 라벨
const GRADE_ORDER: OverallGrade[] = [
  "poor",
  "needsWork",
  "fair",
  "good",
  "excellent",
];

const GRADE_LABELS: Record<OverallGrade, string> = {
  poor: "Poor",
  needsWork: "Needs work",
  fair: "Fair",
  good: "Good",
  excellent: "Excellent",
};

const handleCopyText = (text: string) => {
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {
      alert("클립보드 복사에 실패했습니다.");
    });
  } else {
    const temp = document.createElement("textarea");
    temp.value = text;
    temp.style.position = "fixed";
    temp.style.left = "-9999px";
    document.body.appendChild(temp);
    temp.select();
    try {
      document.execCommand("copy");
    } catch {
      alert("클립보드 복사에 실패했습니다.");
    } finally {
      document.body.removeChild(temp);
    }
  }
};

const handleCopyJson = (data: any) => {
  if (!data) return;
  const json = JSON.stringify(data, null, 2);
  handleCopyText(json);
};

const renderJsonTree = (value: any, depth = 0): JSX.Element => {
  const indent = depth * 12;

  if (value === null) return <span style={{ color: "#6b7280" }}>null</span>;

  const type = typeof value;

  if (type === "string")
    return <span style={{ color: "#a7f3d0" }}>"{value}"</span>;
  if (type === "number" || type === "boolean")
    return <span style={{ color: "#fde68a" }}>{String(value)}</span>;

  if (Array.isArray(value)) {
    if (value.length === 0)
      return <span style={{ color: "#6b7280" }}>[ ]</span>;
    return (
      <div style={{ marginLeft: indent }}>
        {value.map((item, idx) => (
          <div key={idx} style={{ marginBottom: 2 }}>
            <span style={{ color: "#4b5563" }}>[{idx}] </span>
            {renderJsonTree(item, depth + 1)}
          </div>
        ))}
      </div>
    );
  }

  if (type === "object") {
    const entries = Object.entries(value as Record<string, any>);
    if (entries.length === 0)
      return <span style={{ color: "#6b7280" }}>{"{ }"}</span>;
    return (
      <div style={{ marginLeft: indent }}>
        {entries.map(([key, val]) => (
          <div key={key} style={{ marginBottom: 2 }}>
            <span style={{ color: "#a5b4fc", fontWeight: 500 }}>{key}</span>
            <span style={{ color: "#6b7280" }}> : </span>
            {renderJsonTree(val, depth + 1)}
          </div>
        ))}
      </div>
    );
  }

  return <span>{String(value)}</span>;
};

const LOADING_MESSAGES = [
  "코드 구조를 분석하는 중...",
  "로직 흐름을 파악하는 중...",
  "함수 및 모듈 간 의존성을 점검하는 중...",
  "복잡도가 높은 구간을 찾는 중...",
  "에러 가능성이 있는 분기들을 살펴보는 중...",
  "LLM에게 코드 컨텍스트를 전달하는 중...",
  "모델이 코드 패턴을 해석하는 중...",
  "AI 리뷰어가 제안할 수정 포인트를 정리하는 중...",
  "프롬프트와 응답 형식을 정렬하는 중...",
  "모델이 품질 점수를 계산하는 중...",
  "데이터베이스 스키마와 사용 패턴을 살펴보는 중...",
  "쿼리 사용 방식에 잠재적인 이슈가 없는지 확인하는 중...",
  "트랜잭션 및 예외 처리 흐름을 검토하는 중...",
  "API 호출과 응답 처리 방식을 점검하는 중...",
  "상태 관리와 렌더링 흐름을 분석하는 중...",
  "컴포넌트 분리와 재사용 가능성을 확인하는 중...",
  "비동기 처리와 로딩 상태 핸들링을 검토하는 중...",
  "폼 검증 및 에러 메시지 처리를 점검하는 중...",
  "UI/UX 측면에서 개선 여지를 확인하는 중...",
  "버그, 유지보수성, 스타일, 보안 관점에서 코드를 종합 평가하는 중...",
  "리뷰 코멘트를 정리하는 중...",
  "권장 리팩토링 포인트를 정돈하는 중...",
  "점수와 세부 피드백을 생성하는 중...",
];

const baseCardStyle: CSSProperties = {
  borderRadius: 8,
  border: "1px solid rgba(31,41,55,0.95)",
  background: "linear-gradient(135deg, rgba(15,23,42,1), rgba(15,23,42,0.98))",
  padding: 10,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const ResultPanel: React.FC<Props> = ({
  resultData,
  selectedModel,
  isError,
  isLoading,
  resultHighlight,
  displayOverallScore,
  displayCategoryScores,
  logoSrc,
  rawResponseText,
}) => {
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [isNarrow, setIsNarrow] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  const [copiedTarget, setCopiedTarget] = useState<
    "summary" | "comments" | "json" | null
  >(null);

  const triggerCopied = (target: "summary" | "comments" | "json") => {
    setCopiedTarget(target);
    window.setTimeout(() => {
      setCopiedTarget((prev) => (prev === target ? null : prev));
    }, 1500);
  };

  const overallLabel = getScoreLabel(displayOverallScore);

  const reviewText: string | null = useMemo(() => {
    if (!resultData) return null;
    const v = (resultData as any).review_summary ?? (resultData as any).summary;
    if (!v) return null;
    if (typeof v === "string") return v;
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  }, [resultData]);

  const { categoryComments }: { categoryComments: CategoryComment[] } =
    normalizeReviewDetails(resultData as AnalyzerResult | null);

  const clampedOverall = Math.max(0, Math.min(100, displayOverallScore));

  const overallGrade: OverallGrade =
    clampedOverall >= 90
      ? "excellent"
      : clampedOverall >= 75
      ? "good"
      : clampedOverall >= 60
      ? "fair"
      : clampedOverall >= 40
      ? "needsWork"
      : "poor";

  const badgeMap = window.__DKMV_BADGES__ ?? {};
  const notFoundImageSrc = window.__DKMV_NOT_FOUND__ ?? "/not_found.png";

  const gradeImages = GRADE_ORDER.map((key) => ({
    key,
    label: GRADE_LABELS[key],
    src: badgeMap[key] ?? null,
  })).filter((g) => g.src);

  useEffect(() => {
    if (!isLoading) return;
    setLoadingTextIndex(0);
    const id = window.setInterval(() => {
      setLoadingTextIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, [isLoading]);

  useEffect(() => {
    const handleResize = () => setIsNarrow(window.innerWidth < 900);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => setHasMounted(true), []);

  const scoreColorByKey: Record<keyof ScoreCategories, string> = {
    bug: "#fb923c",
    maintainability: "#22c55e",
    style: "#38bdf8",
    security: "#facc15",
  };

  const scoreBgByKey: Record<keyof ScoreCategories, string> = {
    bug: "rgba(251,146,60,0.16)",
    maintainability: "rgba(34,197,94,0.16)",
    style: "rgba(56,189,248,0.16)",
    security: "rgba(250,204,21,0.16)",
  };

  const categoryConfig = [
    { key: "bug" as const, label: "Bug", icon: Bug },
    { key: "maintainability" as const, label: "Maintainability", icon: Wrench },
    { key: "style" as const, label: "Style", icon: Palette },
    { key: "security" as const, label: "Security", icon: Shield },
  ];

  const hasAnyComment = categoryComments.some(
    (c) => c.text && c.text.trim().length > 0
  );
  const showEmptyState = !resultData && !isLoading;

  const combinedCommentsText = useMemo(() => {
    if (!hasAnyComment) return "";
    return categoryComments
      .filter((c) => c.text && c.text.trim().length > 0)
      .map((c) => `[#${c.label}] ${c.text.trim()}`)
      .join("\n\n");
  }, [categoryComments, hasAnyComment]);

  // ✅ CodePanel처럼: 섹션 헤더(보라색 점 + 타이틀) 공통화
  const statusDotColor = (() => {
    if (isError) return "#fca5a5";
    if (isLoading) return "#c4b5fd";
    if (resultHighlight) return "#a855f7";
    return "#a855f7";
  })();

  const titleRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    padding: "2px 2px 8px 2px",
    userSelect: "none",
  };

  const titleLeftStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  };

  const dotStyle: React.CSSProperties = {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: statusDotColor,
    boxShadow: "0 0 0 3px rgba(168,85,247,0.12)",
    flex: "0 0 auto",
  };

  const titleTextStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 800,
    color: "#e5e7eb",
    letterSpacing: "-0.01em",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const renderTitleRow = (label: string, right?: React.ReactNode) => {
    return (
      <div style={titleRowStyle}>
        <div style={titleLeftStyle}>
          <span style={dotStyle} />
          <div style={titleTextStyle} title={label}>
            {label}
          </div>
        </div>
        {right ? <div style={{ flex: "0 0 auto" }}>{right}</div> : null}
      </div>
    );
  };

  const iconBtnStyle: React.CSSProperties = {
    width: 22,
    height: 22,
    borderRadius: 999,
    border: "1px solid rgba(55,65,81,0.9)",
    backgroundColor: "rgba(15,23,42,0.9)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
    transition:
      "background-color 0.15s ease-out, border-color 0.15s ease-out, transform 0.1s ease-out",
  };

  return (
    <>
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
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          borderRadius: 10,
          border: "none",
          background: "transparent",
          position: "relative",
          overflow: "hidden",
          height: "100%",
          minHeight: "calc(100vh - 160px)",

          boxSizing: "border-box",
          opacity: hasMounted ? 1 : 0,
          transform: hasMounted ? "translateY(0)" : "translateY(6px)",
          transition: "opacity 0.25s ease-out, transform 0.25s ease-out",
        }}
      >
        <div
          style={{
            flex: 1,
            borderRadius: 8,
            border: isError
              ? "1px solid rgba(239,68,68,0.9)"
              : resultHighlight
              ? "1px solid rgba(168,85,247,0.95)"
              : "1px solid rgba(55,65,81,0.9)",
            backgroundColor: "#020617",
            padding: 10,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            position: "relative",
            overflow: "hidden",
            transition: "border-color 0.18s ease-out",
          }}
        >
          {selectedModel && (
            <div
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                fontSize: 11,
                color: "#e5e7eb",
                opacity: 0.9,
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid rgba(55,65,81,0.9)",
                backgroundColor: "rgba(15,23,42,0.96)",
                maxWidth: 260,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={selectedModel}
            >
              모델: {selectedModel}
            </div>
          )}

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              filter: isLoading ? "blur(3px)" : "none",
              opacity: isLoading ? 0.7 : 1,
              transition: "filter 0.2s ease-out, opacity 0.2s ease-out",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: isNarrow ? "column" : "row",
                gap: 12,
                alignItems: "stretch",
                minHeight: 0,
                height: "100%",
              }}
            >
              {showEmptyState ? (
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      ...baseCardStyle,
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 12,
                      width: "100%",
                      height: "calc(100vh - 200px)",
                    }}
                  >
                    <img
                      src={notFoundImageSrc}
                      alt="분석 결과 없음"
                      style={{
                        maxWidth: "70%",
                        maxHeight: 180,
                        objectFit: "contain",
                        opacity: 0.95,
                      }}
                    />
                    <div
                      style={{
                        fontSize: 13,
                        color: "#e5e7eb",
                        fontWeight: 600,
                        textAlign: "center",
                      }}
                    >
                      아직 분석 결과가 없어요
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* 좌측: 점수 / 요약 / 유형별 점수 */}
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      minWidth: 0,
                      minHeight: 0,
                    }}
                  >
                    {/* 전체 점수 + 등급 이미지 스케일 */}
                    <div style={baseCardStyle}>
                      {renderTitleRow(
                        "전체 품질 점수",
                        resultData ? (
                          <span
                            style={{
                              fontSize: 10,
                              padding: "3px 10px",
                              borderRadius: 999,
                              border: `1px solid ${overallLabel.color}`,
                              backgroundColor: "rgba(15,23,42,0.96)",
                              color: overallLabel.color,
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {overallLabel.label}
                          </span>
                        ) : null
                      )}

                      {resultData ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              fontFamily:
                                "ui-monospace, SFMono-Regular, Menlo, Monaco",
                              fontSize: 30,
                              fontWeight: 800,
                              transition:
                                "transform 0.18s ease-out, color 0.18s ease-out",
                            }}
                          >
                            {clampedOverall}
                          </span>
                          <span style={{ fontSize: 13, color: "#9ca3af" }}>
                            /100
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: "#6b7280" }}>
                          아직 분석 결과가 없습니다. 코드를 분석하면 여기에서
                          점수를 확인할 수 있어요.
                        </span>
                      )}

                      {resultData && gradeImages.length > 0 && (
                        <div
                          style={{
                            marginTop: 10,
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 10,
                            justifyContent: "center",
                          }}
                        >
                          {gradeImages.map((grade) => {
                            const isActive = grade.key === overallGrade;
                            return (
                              <div
                                key={grade.key}
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  gap: 4,
                                  flex: "0 1 auto",
                                  minWidth: 60,
                                }}
                              >
                                <div
                                  style={{
                                    width: 52,
                                    height: 52,
                                    borderRadius: 999,
                                    padding: 4,
                                    boxSizing: "border-box",
                                    border: isActive
                                      ? "1px solid rgba(248,250,252,0.9)"
                                      : "1px solid rgba(31,41,55,0.9)",
                                    background: isActive
                                      ? "radial-gradient(circle at 30% 20%, rgba(248,250,252,0.22), rgba(15,23,42,1))"
                                      : "rgba(15,23,42,1)",
                                    boxShadow: isActive
                                      ? "0 0 0 1px rgba(129,140,248,0.75), 0 8px 18px rgba(15,23,42,0.9)"
                                      : "0 4px 10px rgba(15,23,42,0.9)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    transition:
                                      "box-shadow 0.18s ease-out, transform 0.18s ease-out, border-color 0.18s ease-out, background 0.18s ease-out",
                                    transform: isActive
                                      ? "translateY(-1px)"
                                      : "translateY(0)",
                                  }}
                                >
                                  <img
                                    src={grade.src!}
                                    alt={grade.label}
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "contain",
                                      filter: isActive
                                        ? "none"
                                        : "grayscale(100%)",
                                      opacity: isActive ? 1 : 0.5,
                                      transition:
                                        "filter 0.18s ease-out, opacity 0.18s ease-out",
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* 리뷰 요약 */}
                    <div
                      style={{
                        ...baseCardStyle,
                        backgroundColor: "rgba(15,23,42,0.98)",
                      }}
                    >
                      {renderTitleRow(
                        "리뷰 요약",
                        reviewText ? (
                          <button
                            type="button"
                            onClick={() => {
                              handleCopyText(reviewText);
                              triggerCopied("summary");
                            }}
                            style={iconBtnStyle}
                            title="리뷰 요약 복사"
                          >
                            {copiedTarget === "summary" ? (
                              <Check size={12} color="#22c55e" />
                            ) : (
                              <Copy size={12} color="#9ca3af" />
                            )}
                          </button>
                        ) : null
                      )}

                      <div
                        style={{
                          fontSize: 11,
                          color: "#d1d5db",
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.5,
                          minHeight: 60,
                          maxHeight: 200,
                          overflowY: "auto",
                        }}
                      >
                        {reviewText
                          ? reviewText
                          : resultData
                          ? "리뷰 요약이 응답에 포함되어 있지 않습니다."
                          : "아직 분석 결과가 없습니다. 코드를 분석하면 이곳에 리뷰가 표시됩니다."}
                      </div>
                    </div>

                    {/* 유형별 점수 */}
                    {resultData && (
                      <div
                        style={{
                          ...baseCardStyle,
                          background:
                            "linear-gradient(145deg, rgba(15,23,42,1), rgba(30,64,175,0.35))",
                        }}
                      >
                        {renderTitleRow("유형별 점수")}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(120px, 1fr))",
                            gap: 8,
                          }}
                        >
                          {categoryConfig.map(({ key, label, icon: Icon }) => {
                            const value =
                              displayCategoryScores[
                                key as keyof ScoreCategories
                              ] ?? 0;
                            const scoreColor =
                              scoreColorByKey[key as keyof ScoreCategories];
                            const scoreBg =
                              scoreBgByKey[key as keyof ScoreCategories];

                            return (
                              <div
                                key={key}
                                style={{
                                  borderRadius: 10,
                                  border: "1px solid rgba(148,163,184,0.6)",
                                  background:
                                    "radial-gradient(circle at top, rgba(15,23,42,0.98), rgba(15,23,42,1))",
                                  padding: 8,
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 4,
                                  boxShadow:
                                    "0 6px 14px rgba(15,23,42,0.9), inset 0 0 0 1px rgba(15,23,42,0.8)",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 6,
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 6,
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: 26,
                                        height: 26,
                                        borderRadius: 999,
                                        backgroundColor: scoreBg,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                      }}
                                    >
                                      <Icon size={16} color={scoreColor} />
                                    </div>
                                    <span
                                      style={{ fontSize: 11, color: "#e5e7eb" }}
                                    >
                                      {label}
                                    </span>
                                  </div>
                                </div>

                                <div
                                  style={{
                                    marginTop: 4,
                                    display: "flex",
                                    alignItems: "baseline",
                                    gap: 4,
                                    fontFamily:
                                      "ui-monospace, SFMono-Regular, Menlo, Monaco",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: 18,
                                      fontWeight: 800,
                                      color: scoreColor,
                                    }}
                                  >
                                    {Math.max(0, Math.min(100, value))}
                                  </span>
                                  <span
                                    style={{ fontSize: 10, color: "#9ca3af" }}
                                  >
                                    /100
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 우측: 유형별 코멘트 / JSON */}
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      minWidth: 0,
                      minHeight: 0,
                    }}
                  >
                    {/* 유형별 코멘트 */}
                    {resultData && hasAnyComment && (
                      <div
                        style={{
                          ...baseCardStyle,
                          backgroundColor: "rgba(15,23,42,0.98)",
                        }}
                      >
                        {renderTitleRow(
                          "유형별 코멘트",
                          combinedCommentsText ? (
                            <button
                              type="button"
                              onClick={() => {
                                handleCopyText(combinedCommentsText);
                                triggerCopied("comments");
                              }}
                              style={iconBtnStyle}
                              title="유형별 코멘트 전체 복사"
                            >
                              {copiedTarget === "comments" ? (
                                <Check size={12} color="#22c55e" />
                              ) : (
                                <Copy size={12} color="#9ca3af" />
                              )}
                            </button>
                          ) : null
                        )}

                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            maxHeight: 260,
                            overflowY: "auto",
                          }}
                        >
                          {categoryConfig.map(({ key, label, icon: Icon }) => {
                            const commentObj = categoryComments.find(
                              (c) => c.key === key
                            );
                            const commentText = commentObj?.text?.trim();
                            if (!commentText) return null;

                            const scoreColor =
                              scoreColorByKey[key as keyof ScoreCategories];
                            const scoreBg =
                              scoreBgByKey[key as keyof ScoreCategories];

                            return (
                              <div
                                key={key}
                                style={{
                                  borderRadius: 8,
                                  border: "1px solid rgba(31,41,55,0.95)",
                                  background:
                                    "linear-gradient(135deg, rgba(15,23,42,1), rgba(15,23,42,0.98))",
                                  padding: 8,
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 6,
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 8,
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8,
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: 26,
                                        height: 26,
                                        borderRadius: 999,
                                        backgroundColor: scoreBg,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                      }}
                                    >
                                      <Icon size={16} color={scoreColor} />
                                    </div>
                                    <span
                                      style={{
                                        fontSize: 11,
                                        color: "#e5e7eb",
                                        fontWeight: 500,
                                      }}
                                    >
                                      {label}
                                    </span>
                                  </div>
                                </div>

                                <p
                                  style={{
                                    fontSize: 11,
                                    color: "#d4d4d8",
                                    lineHeight: 1.5,
                                    whiteSpace: "pre-wrap",
                                  }}
                                >
                                  {commentText}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 파싱된 JSON */}
                    {resultData && (
                      <div
                        style={{
                          ...baseCardStyle,
                          backgroundColor: "rgba(15,23,42,0.98)",
                        }}
                      >
                        {renderTitleRow(
                          "파싱된 JSON",
                          <button
                            type="button"
                            onClick={() => {
                              if (rawResponseText)
                                handleCopyText(rawResponseText);
                              else handleCopyJson(resultData);
                              triggerCopied("json");
                            }}
                            style={iconBtnStyle}
                            title="JSON 복사"
                          >
                            {copiedTarget === "json" ? (
                              <Check size={12} color="#22c55e" />
                            ) : (
                              <Copy size={12} color="#9ca3af" />
                            )}
                          </button>
                        )}

                        <div
                          style={{
                            flex: 1,
                            fontFamily:
                              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                            fontSize: 11,
                            color: "#d1d5db",
                            overflow: "auto",
                            whiteSpace: "pre-wrap",
                            borderRadius: 8,
                            border: "1px solid rgba(55,65,81,0.9)",
                            padding: 8,
                            backgroundColor: "#020617",
                            maxHeight: 200,
                          }}
                        >
                          {renderJsonTree(resultData)}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 로딩 오버레이 */}
          {isLoading && (
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
                {LOADING_MESSAGES[loadingTextIndex]}
              </span>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default ResultPanel;
