// src/webview/types.ts

export type IncomingMessage =
  | {
      type: "NEW_CODE";
      payload: {
        code: string;
        fileName: string;
        filePath: string;
        languageId: string;
        mode: "selection" | "document";
      };
    }
  | { type: "ANALYZE_PROGRESS"; payload: string }
  | { type: "ANALYZE_RESULT"; payload: any }
  | { type: "ANALYZE_ERROR"; payload: string }
  | { type: string; payload?: any };

export type ScoreCategories = {
  bug: number;
  maintainability: number;
  style: number;
  security: number;
};

export const EMPTY_CATEGORIES: ScoreCategories = {
  bug: 0,
  maintainability: 0,
  style: 0,
  security: 0,
};

export type IssueSeverity = "HIGH" | "MEDIUM" | "LOW" | string;

export type ReviewIssue = {
  issue_id: string;
  issue_category: string;
  issue_severity: IssueSeverity;
  issue_summary: string;
  issue_details?: string;
  issue_line_number?: number;
  issue_column_number?: number;
};

export type AnalyzerResult = {
  quality_score: number;
  review_summary?: string;
  scores_by_category?: Partial<ScoreCategories>;
  review_details?: any;
  [key: string]: any;
};

export type TabId = "code" | "result";
export type CategoryId = "bug" | "maintainability" | "style" | "security";

export type CategoryComment = {
  key: CategoryId;
  label: string;
  icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
  text: string;
};
