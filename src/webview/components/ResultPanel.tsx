// src/webview/components/ResultPanel.tsx

import React from "react";
import SectionHeader from "./SectionHeader";
import type {
  AnalyzerResult,
  ScoreCategories,
  ReviewIssue,
  CategoryComment,
} from "../types";
import {
  extractScoresByCategory,
  getScoreLabel,
  getSeverityStyle,
  normalizeReviewDetails,
} from "../utils/scoring";
import { Bug, Wrench, Palette, Shield } from "lucide-react";

type Props = {
  resultData: AnalyzerResult | null;
  isError: boolean;
  isLoading: boolean;
  resultHighlight: boolean;
  displayOverallScore: number;
  displayCategoryScores: ScoreCategories;
  logoSrc: string;
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

  if (value === null) {
    return <span style={{ color: "#6b7280" }}>null</span>;
  }

  const type = typeof value;

  if (type === "string") {
    return <span style={{ color: "#a7f3d0" }}>"{value}"</span>;
  }

  if (type === "number" || type === "boolean") {
    return <span style={{ color: "#fde68a" }}>{String(value)}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span style={{ color: "#6b7280" }}>[ ]</span>;
    }
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
    if (entries.length === 0) {
      return <span style={{ color: "#6b7280" }}>{"{ }"}</span>;
    }
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

const ResultPanel: React.FC<Props> = ({
  resultData,
  isError,
  isLoading,
  resultHighlight,
  displayOverallScore,
  displayCategoryScores,
  logoSrc,
}) => {
  const overallLabel = getScoreLabel(displayOverallScore);

  const reviewText: string | null = (() => {
    if (!resultData) return null;
    const v = resultData.review_summary;
    if (!v) return null;
    if (typeof v === "string") return v;
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  })();

  const {
    categoryComments,
    issueDetails,
  }: {
    categoryComments: CategoryComment[];
    issueDetails: ReviewIssue[];
  } = normalizeReviewDetails(resultData as AnalyzerResult | null);

  const radius = 28;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const clampedOverall = Math.max(0, Math.min(100, displayOverallScore));
  const offsetOverall = circumference * (1 - clampedOverall / 100);

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        borderRadius: 10,
        border: "none",
        background:
          "radial-gradient(circle at top, rgba(147,51,234,0.22), transparent 60%), #020617",
        padding: 10,
        position: "relative",
        overflow: "hidden",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          flex: 1,
          borderRadius: 6,
          border: isError
            ? "1px solid rgba(239,68,68,0.9)"
            : resultHighlight
            ? "1px solid rgba(168,85,247,0.95)"
            : "1px solid rgba(75,85,99,0.9)",
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
        {/* 실제 내용 (로딩 시 blur) */}
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
          {/* 총점 섹션 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <SectionHeader label="총점" />
              {resultData && (
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 8px",
                    borderRadius: 999,
                    border: "1px solid rgba(55,65,81,0.9)",
                    color: overallLabel.color,
                    backgroundColor: "rgba(15,23,42,0.9)",
                  }}
                >
                  {overallLabel.label}
                </span>
              )}
            </div>

            {resultData && (
              <>
                <div
                  style={{
                    marginTop: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  {/* 총점 도넛 */}
                  <div
                    style={{
                      position: "relative",
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      background:
                        "radial-gradient(circle at 30% 20%, rgba(233,213,255,0.2), transparent 55%), rgba(15,23,42,0.95)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow:
                        "0 0 0 1px rgba(88,28,135,0.6), 0 10px 25px rgba(15,23,42,0.85)",
                    }}
                  >
                    <svg width={70} height={70} viewBox="0 0 70 70">
                      <circle
                        cx="35"
                        cy="35"
                        r={radius}
                        stroke="rgba(31,41,55,0.9)"
                        strokeWidth={strokeWidth}
                        fill="none"
                      />
                      <circle
                        cx="35"
                        cy="35"
                        r={radius}
                        stroke="url(#overallGradient)"
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeDasharray={circumference}
                        strokeDashoffset={offsetOverall}
                        strokeLinecap="round"
                        transform="rotate(-90 35 35)"
                        style={{
                          transition: "stroke-dashoffset 0.1s linear",
                        }}
                      />
                      <defs>
                        <linearGradient
                          id="overallGradient"
                          x1="0"
                          y1="0"
                          x2="1"
                          y2="1"
                        >
                          <stop offset="0%" stopColor="#f97316" />
                          <stop offset="40%" stopColor="#a855f7" />
                          <stop offset="100%" stopColor="#6366f1" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        color: "#e5e7eb",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                        }}
                      >
                        {clampedOverall}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: "#9ca3af",
                        }}
                      >
                        / 100
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: "#d1d5db",
                      }}
                    >
                      이 코드는 위의 총점과 같이 평가되었습니다. 상세 카테고리
                      점수와 피드백을 아래에서 확인하세요.
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    height: 1,
                    backgroundColor: "rgba(31,41,55,0.95)",
                    margin: "8px 0",
                  }}
                />

                {/* 카테고리별 점수 */}
                <div className="dkmv-score-grid">
                  {(
                    [
                      { key: "bug", label: "Bug", icon: Bug },
                      {
                        key: "maintainability",
                        label: "Maintainability",
                        icon: Wrench,
                      },
                      { key: "style", label: "Style", icon: Palette },
                      { key: "security", label: "Security", icon: Shield },
                    ] as const
                  ).map(({ key, label, icon: Icon }) => {
                    const value =
                      displayCategoryScores[key as keyof ScoreCategories] ?? 0;
                    const r = 18;
                    const sw = 4;
                    const c = 2 * Math.PI * r;
                    const vClamp = Math.max(0, Math.min(100, value));
                    const off = c * (1 - vClamp / 100);

                    return (
                      <div
                        key={key}
                        style={{
                          borderRadius: 8,
                          border: "1px solid rgba(31,41,55,0.95)",
                          backgroundColor: "rgba(15,23,42,0.9)",
                          padding: 8,
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <Icon size={14} color="#c4b5fd" strokeWidth={1.8} />
                            <span
                              style={{
                                fontSize: 11,
                                color: "#e5e7eb",
                              }}
                            >
                              {label}
                            </span>
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginTop: 4,
                          }}
                        >
                          <div
                            style={{
                              position: "relative",
                              width: 48,
                              height: 48,
                            }}
                          >
                            <svg width={48} height={48} viewBox="0 0 48 48">
                              <circle
                                cx="24"
                                cy="24"
                                r={r}
                                stroke="rgba(31,41,55,1)"
                                strokeWidth={sw}
                                fill="none"
                              />
                              <circle
                                cx="24"
                                cy="24"
                                r={r}
                                stroke="#c084fc"
                                strokeWidth={sw}
                                fill="none"
                                strokeDasharray={c}
                                strokeDashoffset={off}
                                strokeLinecap="round"
                                transform="rotate(-90 24 24)"
                                style={{
                                  transition: "stroke-dashoffset 0.1s linear",
                                }}
                              />
                            </svg>
                            <div
                              style={{
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 10,
                                color: "#e5e7eb",
                              }}
                            >
                              {vClamp}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* 리뷰 요약 */}
          <div
            style={{
              height: 1,
              backgroundColor: "rgba(31,41,55,0.95)",
              margin: "2px 0 4px",
            }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <SectionHeader label="리뷰 요약" />
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#d1d5db",
                whiteSpace: "pre-wrap",
                lineHeight: 1.4,
                minHeight: 48,
              }}
            >
              {reviewText
                ? reviewText
                : resultData
                ? "리뷰 요약이 응답에 포함되어 있지 않습니다."
                : "아직 분석 결과가 없습니다. 코드를 분석하면 이곳에 리뷰가 표시됩니다."}
            </div>
          </div>

          {/* 상세 피드백 */}
          {resultData && (
            <>
              <div
                style={{
                  height: 1,
                  backgroundColor: "rgba(31,41,55,0.95)",
                  margin: "6px 0 4px",
                }}
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <SectionHeader label="상세 피드백" />
                  {issueDetails.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleCopyJson(issueDetails as any)}
                      style={{
                        fontSize: 10,
                        padding: "2px 8px",
                        borderRadius: 999,
                        border: "1px solid rgba(55,65,81,0.9)",
                        backgroundColor: "rgba(15,23,42,0.9)",
                        color: "#9ca3af",
                        cursor: "pointer",
                      }}
                    >
                      issues JSON 복사
                    </button>
                  )}
                </div>

                {/* 카테고리별 코멘트 카드 */}
                {categoryComments.length > 0 && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
                      gap: 8,
                    }}
                  >
                    {categoryComments.map(
                      ({ key, label, icon: Icon, text }) => (
                        <div
                          key={key}
                          style={{
                            borderRadius: 8,
                            border: "1px solid rgba(31,41,55,0.95)",
                            backgroundColor: "rgba(15,23,42,0.9)",
                            padding: 8,
                            display: "flex",
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 999,
                              border: "1px solid rgba(168,85,247,0.95)",
                              background:
                                "radial-gradient(circle at 30% 20%, rgba(233,213,255,0.45), transparent 60%), rgba(24,16,54,0.95)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Icon size={16} color="#e9d5ff" strokeWidth={1.8} />
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 3,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 500,
                                color: "#e5e7eb",
                              }}
                            >
                              {label}
                            </span>
                            <p
                              style={{
                                fontSize: 11,
                                color: "#d4d4d8",
                                lineHeight: 1.4,
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {text}
                            </p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* 개별 이슈 리스트 */}
                {issueDetails.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      maxHeight: 160,
                      overflow: "auto",
                      marginTop: categoryComments.length > 0 ? 4 : 0,
                    }}
                  >
                    {issueDetails.map((issue, idx) => {
                      const style = getSeverityStyle(issue.issue_severity);
                      const locPieces: string[] = [];
                      if (typeof issue.issue_line_number === "number") {
                        locPieces.push(`line ${issue.issue_line_number}`);
                      }
                      if (typeof issue.issue_column_number === "number") {
                        locPieces.push(`col ${issue.issue_column_number}`);
                      }
                      const locationLabel = locPieces.join(", ");

                      return (
                        <div
                          key={`${issue.issue_id}-${idx}`}
                          style={{
                            borderRadius: 6,
                            border: "1px solid rgba(31,41,55,0.95)",
                            backgroundColor: "rgba(15,23,42,0.9)",
                            padding: 8,
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 6,
                                alignItems: "center",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 10,
                                  padding: "1px 6px",
                                  borderRadius: 999,
                                  border: style.border,
                                  backgroundColor: style.bg,
                                  color: style.color,
                                  fontWeight: 500,
                                }}
                              >
                                {style.label}
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  color: "#e5e7eb",
                                }}
                              >
                                {issue.issue_summary}
                              </span>
                            </div>
                            <span
                              style={{
                                fontSize: 10,
                                color: "#9ca3af",
                              }}
                            >
                              {issue.issue_id}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: "#a1a1aa",
                            }}
                          >
                            카테고리: {issue.issue_category}
                            {locationLabel && ` · ${locationLabel}`}
                          </div>
                          {issue.issue_details && (
                            <div
                              style={{
                                fontSize: 11,
                                color: "#d4d4d8",
                                whiteSpace: "pre-wrap",
                                lineHeight: 1.4,
                              }}
                            >
                              {issue.issue_details}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {categoryComments.length === 0 && issueDetails.length === 0 && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "#9ca3af",
                    }}
                  >
                    상세 피드백 데이터가 없습니다. (review_details / issues 가
                    비어 있음)
                  </div>
                )}
              </div>
            </>
          )}

          {/* 파싱된 JSON */}
          {resultData && (
            <>
              <div
                style={{
                  height: 1,
                  backgroundColor: "rgba(31,41,55,0.95)",
                  margin: "4px 0 4px",
                }}
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  minHeight: 40,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <SectionHeader label="파싱된 JSON" />
                  <button
                    type="button"
                    onClick={() => handleCopyJson(resultData)}
                    style={{
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: 999,
                      border: "1px solid rgba(55,65,81,0.9)",
                      backgroundColor: "rgba(15,23,42,0.9)",
                      color: "#9ca3af",
                      cursor: "pointer",
                    }}
                  >
                    복사
                  </button>
                </div>
                <div
                  style={{
                    flex: 1,
                    fontFamily: "monospace",
                    fontSize: 11,
                    color: "#d1d5db",
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    borderRadius: 4,
                    border: "1px solid rgba(55,65,81,0.9)",
                    padding: 6,
                    backgroundColor: "#020617",
                    maxHeight: 150,
                  }}
                >
                  {renderJsonTree(resultData)}
                </div>
              </div>
            </>
          )}
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
              gap: 10,
            }}
          >
            <img
              src={logoSrc}
              alt="Loading..."
              style={{
                width: 100,
                height: 100,
                borderRadius: 16,
                objectFit: "contain",
                animation: "dkmv-logo-pulse 1.4s ease-in-out infinite",
              }}
            />
            <span
              className="dkmv-loading-text"
              style={{
                fontSize: 12,
                color: "#e5e7eb",
              }}
            >
              코드의 바이브를 읽는 중
            </span>
          </div>
        )}
      </div>
    </section>
  );
};

export default ResultPanel;
