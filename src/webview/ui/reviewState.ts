export type ReviewUIState =
  | "UNAUTH"
  | "EMPTY"
  | "READY"
  | "ANALYZING"
  | "DONE"
  | "ERROR";

export function deriveReviewState(params: {
  isAuthenticated: boolean;
  hasCode: boolean;
  isLoading: boolean; // ✅ 이제 "분석/개선코드 포함한 busy"로 들어옴
  hasResult: boolean;
  isError: boolean;
}): ReviewUIState {
  const { isAuthenticated, hasCode, isLoading, hasResult, isError } = params;

  if (!isAuthenticated) return "UNAUTH";
  if (isLoading) return "ANALYZING";
  if (isError) return "ERROR";
  if (hasResult) return "DONE";
  if (hasCode) return "READY";
  return "EMPTY";
}

export function getStateBadge(state: ReviewUIState) {
  switch (state) {
    case "UNAUTH":
      return {
        text: "토큰 필요",
        color: "#fda4af",
        border: "rgba(248,113,113,0.55)",
      };
    case "EMPTY":
      return {
        text: "코드 필요",
        color: "#cbd5e1",
        border: "rgba(148,163,184,0.45)",
      };
    case "READY":
      return {
        text: "분석 준비",
        color: "#a5b4fc",
        border: "rgba(129,140,248,0.55)",
      };
    case "ANALYZING":
      return {
        text: "로딩 중",
        color: "#c4b5fd",
        border: "rgba(167,139,250,0.55)",
      };
    case "DONE":
      return {
        text: "분석 완료",
        color: "#86efac",
        border: "rgba(34,197,94,0.45)",
      };
    case "ERROR":
      return {
        text: "오류",
        color: "#fca5a5",
        border: "rgba(248,113,113,0.55)",
      };
  }
}
