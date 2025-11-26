// src/webview/utils/scoring.ts

import type {
  AnalyzerResult,
  IssueSeverity,
  ReviewIssue,
  ScoreCategories,
  EMPTY_CATEGORIES,
  CategoryComment,
} from "../types";
import { Bug, Wrench, Palette, Shield } from "lucide-react";

export const clampScore = (s: any): number => {
  if (s == null) return 0;

  if (typeof s === "object") {
    const cand =
      (s as any).score ??
      (s as any).value ??
      (s as any).points ??
      (s as any).total ??
      (s as any).avg ??
      Object.values(s)[0];
    s = cand;
  }

  if (typeof s !== "number") {
    const parsed = Number(s);
    if (Number.isNaN(parsed)) return 0;
    s = parsed;
  }
  if (s >= 0 && s <= 1) s = s * 100;
  if (s < 0) s = 0;
  if (s > 100) s = 100;
  return Math.round(s);
};

export const extractScoresByCategory = (
  data: AnalyzerResult | null
): ScoreCategories => {
  if (!data) return EMPTY_CATEGORIES;

  const src =
    (data as any).scores_by_category ??
    (data as any).scoresByCategory ??
    (data as any).category_scores ??
    {};

  const get = (obj: any, ...keys: string[]) => {
    for (const k of keys) {
      if (obj && obj[k] != null) return obj[k];
    }
    return 0;
  };

  return {
    bug: clampScore(get(src, "bug", "Bug", "BUG", "bug_score")),
    maintainability: clampScore(
      get(
        src,
        "maintainability",
        "Maintainability",
        "MAINTAINABILITY",
        "maintainability_score"
      )
    ),
    style: clampScore(get(src, "style", "Style", "STYLE", "style_score")),
    security: clampScore(
      get(src, "security", "Security", "SECURITY", "security_score")
    ),
  };
};

export const getScoreLabel = (
  score: number
): { label: string; color: string } => {
  if (score >= 90) return { label: "Excellent", color: "#a3e635" };
  if (score >= 70) return { label: "Good", color: "#4ade80" };
  if (score >= 40) return { label: "Okay", color: "#fbbf24" };
  if (score > 0) return { label: "Needs Work", color: "#f97373" };
  return { label: "—", color: "#6b7280" };
};

export const getSeverityStyle = (severityRaw: IssueSeverity) => {
  const severity = (severityRaw || "").toString().toUpperCase();
  if (severity === "HIGH") {
    return {
      label: "HIGH",
      bg: "rgba(127,29,29,0.5)",
      border: "rgba(248,113,113,0.9)",
      color: "#fecaca",
    };
  }
  if (severity === "MEDIUM") {
    return {
      label: "MEDIUM",
      bg: "rgba(120,53,15,0.5)",
      border: "rgba(251,191,36,0.9)",
      color: "#facc15",
    };
  }
  if (severity === "LOW") {
    return {
      label: "LOW",
      bg: "rgba(22,101,52,0.45)",
      border: "rgba(52,211,153,0.9)",
      color: "#6ee7b7",
    };
  }
  return {
    label: severity || "N/A",
    bg: "rgba(30,64,175,0.4)",
    border: "rgba(129,140,248,0.9)",
    color: "#e5e7eb",
  };
};

export const normalizeReviewDetails = (
  resultData: AnalyzerResult | null
): { categoryComments: CategoryComment[]; issueDetails: ReviewIssue[] } => {
  if (!resultData) return { categoryComments: [], issueDetails: [] };

  const raw =
    (resultData as any).review_details ??
    (resultData as any).reviewDetails ??
    (resultData as any).issues ??
    null;

  const comments: CategoryComment[] = [];
  const issues: ReviewIssue[] = [];

  const mapping: {
    key: CategoryComment["key"];
    label: string;
    icon: CategoryComment["icon"];
  }[] = [
    { key: "bug", label: "Bug", icon: Bug },
    { key: "maintainability", label: "Maintainability", icon: Wrench },
    { key: "style", label: "Style", icon: Palette },
    { key: "security", label: "Security", icon: Shield },
  ];

  // 1) 타입별 코멘트 (object)
  if (raw && !Array.isArray(raw) && typeof raw === "object") {
    for (const m of mapping) {
      const text =
        (raw as any)[m.key] ??
        (raw as any)[m.key.toUpperCase()] ??
        (raw as any)[m.key.charAt(0).toUpperCase() + m.key.slice(1)];
      if (typeof text === "string" && text.trim().length > 0) {
        comments.push({
          key: m.key,
          label: m.label,
          icon: m.icon,
          text: text.trim(),
        });
      }
    }
  }

  // 2) 개별 이슈 배열
  let rawArray: any[] = [];
  if (Array.isArray(raw)) {
    rawArray = raw;
  } else {
    const alt =
      (resultData as any).issues_list ?? (resultData as any).issues ?? null;
    if (Array.isArray(alt)) rawArray = alt;
  }

  if (rawArray.length > 0) {
    rawArray.forEach((item: any, idx: number) => {
      const issue_id =
        item.issue_id ?? item.id ?? item.code ?? `ISSUE_${idx + 1}`;

      const issue_category =
        item.issue_category ?? item.category ?? item.type ?? "unknown_category";

      const issue_severity = (item.issue_severity ??
        item.severity ??
        "N/A") as IssueSeverity;

      const issue_summary =
        item.issue_summary ??
        item.summary ??
        item.message ??
        item.title ??
        "(요약 없음)";

      const issue_details =
        item.issue_details ?? item.details ?? item.description ?? undefined;

      const issue_line_number =
        item.issue_line_number ?? item.line_number ?? item.line ?? undefined;

      const issue_column_number =
        item.issue_column_number ??
        item.column_number ??
        item.column ??
        undefined;

      issues.push({
        issue_id,
        issue_category,
        issue_severity,
        issue_summary,
        issue_details,
        issue_line_number,
        issue_column_number,
      });
    });
  }

  return { categoryComments: comments, issueDetails: issues };
};
