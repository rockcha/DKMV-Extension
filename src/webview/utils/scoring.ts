// src/webview/utils/scoring.ts

import type {
  AnalyzerResult,
  ScoreCategories,
  ReviewIssue,
  IssueSeverity,
  CategoryComment,
} from "../types";

import type React from "react";
import { Bug, Wrench, Palette, Shield } from "lucide-react";

/**
 * 0~100 범위로 점수 고정
 */
export function clampScore(value: any): number {
  if (typeof value !== "number") {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    value = n;
  }
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

/**
 * resultData에서 카테고리별 점수 추출
 * - 우선 순위: result.scores_by_category → result.body.scores_by_category
 * - 없으면 0으로 채움
 */
export function extractScoresByCategory(
  result: AnalyzerResult | null
): ScoreCategories {
  const base: ScoreCategories = {
    bug: 0,
    maintainability: 0,
    style: 0,
    security: 0,
  };

  if (!result) return base;

  const root: any = result as any;

  const src =
    root.scores_by_category ||
    root.body?.scores_by_category ||
    root.review_details?.scores_by_category ||
    null;

  if (!src || typeof src !== "object") {
    return base;
  }

  const out: ScoreCategories = { ...base };

  (Object.keys(base) as (keyof ScoreCategories)[]).forEach((k) => {
    const raw = (src as any)[k];
    if (raw == null) return;

    const n = Number(raw);
    if (!Number.isFinite(n)) return;

    out[k] = clampScore(n);
  });

  return out;
}

/**
 * 전체 점수를 위한 레이블 & 색상
 */
export function getScoreLabel(score: number): { label: string; color: string } {
  const v = clampScore(score);

  if (v >= 90) {
    return { label: "Excellent", color: "#22c55e" }; // green-500
  }
  if (v >= 75) {
    return { label: "Good", color: "#a3e635" }; // lime-400
  }
  if (v >= 60) {
    return { label: "Fair", color: "#facc15" }; // yellow-400
  }
  if (v >= 40) {
    return { label: "Needs Work", color: "#fb923c" }; // orange-400
  }
  return { label: "Poor", color: "#f87171" }; // red-400/500
}

/**
 * 이슈 severity 별 스타일
 */
export function getSeverityStyle(severity: IssueSeverity | string | undefined) {
  const s = (severity ?? "").toString().toUpperCase();

  if (s === "HIGH" || s === "ERROR" || s === "CRITICAL") {
    return {
      label: "HIGH",
      bg: "rgba(239,68,68,0.12)",
      color: "#fca5a5",
      border: "1px solid rgba(248,113,113,0.7)",
    };
  }

  if (s === "MEDIUM" || s === "WARN" || s === "WARNING") {
    return {
      label: "MEDIUM",
      bg: "rgba(245,158,11,0.08)",
      color: "#fbbf24",
      border: "1px solid rgba(251,191,36,0.7)",
    };
  }

  if (s === "LOW" || s === "INFO") {
    return {
      label: "LOW",
      bg: "rgba(56,189,248,0.08)",
      color: "#7dd3fc",
      border: "1px solid rgba(125,211,252,0.6)",
    };
  }

  // fallback
  return {
    label: s || "INFO",
    bg: "rgba(148,163,184,0.08)",
    color: "#cbd5f5",
    border: "1px solid rgba(148,163,184,0.6)",
  };
}

/**
 * Playground에서 사용하는 /v1/reviews/{id} 응답을
 * VS Code ResultPanel에서 쓰기 좋게 변환
 *
 * - categoryComments: comments[bug | maintainability | style | security]
 * - issueDetails: review_details.issues / issues 등 (있으면)
 */
export function normalizeReviewDetails(result: AnalyzerResult | null): {
  categoryComments: CategoryComment[];
  issueDetails: ReviewIssue[];
} {
  if (!result) {
    return {
      categoryComments: [],
      issueDetails: [],
    };
  }

  const root: any = result as any;

  // 1) 카테고리별 코멘트: comments
  const commentsObj: Record<string, string> | null =
    root.comments ||
    root.body?.comments ||
    root.review_details?.comments ||
    null;

  const baseCategories: {
    key: CategoryComment["key"];
    label: string;
    icon: CategoryComment["icon"];
  }[] = [
    { key: "bug", label: "Bug", icon: Bug as unknown as React.ComponentType },
    {
      key: "maintainability",
      label: "Maintainability",
      icon: Wrench as unknown as React.ComponentType,
    },
    {
      key: "style",
      label: "Style",
      icon: Palette as unknown as React.ComponentType,
    },
    {
      key: "security",
      label: "Security",
      icon: Shield as unknown as React.ComponentType,
    },
  ];

  const categoryComments: CategoryComment[] = baseCategories.map((c) => ({
    key: c.key,
    label: c.label,
    icon: c.icon,
    text: commentsObj?.[c.key] ?? "",
  }));

  // 2) 이슈 리스트: 가능한 여러 케이스를 한 번에 커버
  const rawIssues: any =
    root.review_details?.issues ||
    root.review_details?.issues_by_category ||
    root.review_details ||
    root.issues ||
    root.body?.review_details?.issues ||
    [];

  const issueDetails: ReviewIssue[] = Array.isArray(rawIssues)
    ? rawIssues.map((it: any, idx: number) => ({
        issue_id:
          it.issue_id ??
          it.id ??
          `issue_${idx + 1}_${String(it.issue_category || "")}`,
        issue_category: it.issue_category ?? it.category ?? "general",
        issue_severity: (it.issue_severity ??
          it.severity ??
          "INFO") as IssueSeverity,
        issue_summary: it.issue_summary ?? it.summary ?? "",
        issue_details: it.issue_details ?? it.details ?? it.message ?? "",
        issue_line_number:
          typeof it.issue_line_number === "number"
            ? it.issue_line_number
            : typeof it.line === "number"
            ? it.line
            : undefined,
        issue_column_number:
          typeof it.issue_column_number === "number"
            ? it.issue_column_number
            : typeof it.column === "number"
            ? it.column
            : undefined,
      }))
    : [];

  return {
    categoryComments,
    issueDetails,
  };
}
