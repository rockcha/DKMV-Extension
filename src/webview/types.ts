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

  // ✅ 개선코드 생성 관련 (추가)
  | { type: "IMPROVE_PROGRESS"; payload: string }
  | { type: "IMPROVE_RESULT"; payload: any }
  | { type: "IMPROVE_ERROR"; payload: string }
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

/**
 * VS Code 쪽에서 사용하는 분석 결과 타입
 */
export type AnalyzerResult = {
  quality_score: number;
  review_summary?: string;
  summary?: string;
  scores_by_category?: Partial<ScoreCategories>;
  review_details?: any;

  comments?: Record<string, string>;
  [key: string]: any;
};

export type TabId = "token" | "code" | "result" | "improved";
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

/* Playground / FastAPI /v1/reviews/{id} 와 동일한 구조를 쓰기 위한 타입 */
export type ReviewMeta = {
  github_id?: string | null;
  review_id?: number | null;
  version?: string;
  actor?: string;
  language?: string;
  trigger?: string;
  code_fingerprint?: string | null;
  model?: string | null;
  result?: {
    result_ref?: string | null;
    error_message?: string | null;
  } | null;
  audit?: string | null;
  status?: string;
  [key: string]: any;
};

export type ReviewBody = {
  quality_score: number;
  summary: string;
  scores_by_category: Partial<ScoreCategories>;
  comments: Record<string, string>;
};

export type ReviewDetailResponse = {
  meta: ReviewMeta;
  body: ReviewBody;
};
