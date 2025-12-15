// src/webview/App.tsx
import React, { useEffect, useState } from "react";
import type {
  IncomingMessage,
  AnalyzerResult,
  TabId,
  ScoreCategories,
} from "./types";
import { EMPTY_CATEGORIES } from "./types";
import { clampScore, extractScoresByCategory } from "./utils/scoring";

import CodePanel from "./components/CodePanel";
import ResultPanel from "./components/ResultPanel";
import ImprovedCodePanel from "./components/ImprovedCodePanel";
import TopTabs from "./components/TopTabs";

import { Bell, ExternalLink, Key, LogOut, Shield } from "lucide-react";
import { appStyleText } from "./ui/appStyles";
import { deriveReviewState, type ReviewUIState } from "./ui/reviewState";

declare global {
  interface Window {
    acquireVsCodeApi?: () => { postMessage: (msg: unknown) => void };
    __DKMV_LOGO__?: string;
  }
}

const vscode = window.acquireVsCodeApi ? window.acquireVsCodeApi() : null;

type AuthUser = {
  id: number;
  login: string;
  name?: string | null;
  avatar_url?: string | null;
};

type AuthStateMessage = {
  type: "AUTH_STATE";
  payload: {
    isAuthenticated: boolean;
    user: AuthUser | null;
  };
};

type ReviewMetaCompact = {
  reviewId: number | null;
  model?: string | null;
  audit?: string | null;
};

function safeJsonParse(input: string): unknown {
  try {
    return JSON.parse(input) as unknown;
  } catch {
    return null;
  }
}

function toPrettyJson(input: unknown): string | null {
  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return null;
  }
}

export const App: React.FC = () => {
  const logoSrc = window.__DKMV_LOGO__ ?? "/logo.png";

  const [code, setCode] = useState("");
  const [filePath, setFilePath] = useState<string>("");
  const [languageId, setLanguageId] = useState<string>("plaintext");
  const [mode, setMode] = useState<"selection" | "document" | null>(null);

  // loading
  const [isLoading, setIsLoading] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const isBusy = isLoading || isImproving;

  // ✅ 파일 선택 로딩
  const [isPickingFile, setIsPickingFile] = useState(false);

  // ✅ 드래그 선택 로딩
  const [isPickingSelection, setIsPickingSelection] = useState(false);

  // tabs
  const [activeTab, setActiveTab] = useState<TabId>("token");

  // status msg
  const [resultMessage, setResultMessage] =
    useState<string>("이곳에 메세지가 표시됩니다.");

  const [resultData, setResultData] = useState<AnalyzerResult | null>(null);
  const [reviewMeta, setReviewMeta] = useState<ReviewMetaCompact | null>(null);
  const [rawResponseText, setRawResponseText] = useState<string | null>(null);

  const [codeHighlight, setCodeHighlight] = useState(false);
  const [resultHighlight, setResultHighlight] = useState(false);

  const [hasNewResult, setHasNewResult] = useState(false);
  const [isError, setIsError] = useState(false);

  const [selectedModel, setSelectedModel] = useState<string>("");
  const [modelError, setModelError] = useState(false);

  const [displayOverallScore, setDisplayOverallScore] = useState(0);
  const [displayCategoryScores, setDisplayCategoryScores] =
    useState<ScoreCategories>(EMPTY_CATEGORIES);

  // auth
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // token UI
  const [tokenInput, setTokenInput] = useState("");
  const [isSettingToken, setIsSettingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // improved code
  const [improvedCode, setImprovedCode] = useState<string | null>(null);
  const [hasNewImprovedCode, setHasNewImprovedCode] = useState(false);

  const flashCodeHighlight = () => {
    setCodeHighlight(true);
    window.setTimeout(() => setCodeHighlight(false), 350);
  };

  const flashResultHighlight = () => {
    setResultHighlight(true);
    window.setTimeout(() => setResultHighlight(false), 350);
  };

  const reviewState: ReviewUIState = deriveReviewState({
    isAuthenticated,
    hasCode: !!code.trim(),
    isLoading: isBusy,
    hasResult: !!resultData,
    isError,
  });

  const canGenerateImprovedCode = reviewState === "DONE";

  useEffect(() => {
    const handler = (
      event: MessageEvent<IncomingMessage | AuthStateMessage | any>
    ) => {
      const message = event.data;
      if (!message) return;

      if (message.type === "AUTH_STATE") {
        const authed = !!message.payload?.isAuthenticated;
        const user = message.payload?.user ?? null;

        setIsAuthenticated(authed);
        setAuthUser(user);
        setIsSettingToken(false);
        setReviewMeta(null);

        setIsPickingFile(false);
        setIsPickingSelection(false);

        if (!authed) {
          setIsLoading(false);
          setIsImproving(false);

          setResultData(null);
          setRawResponseText(null);
          setHasNewResult(false);
          setIsError(false);

          setImprovedCode(null);
          setHasNewImprovedCode(false);

          setResultMessage(
            "GitHub 로그인 및 토큰 인증 후 코드를 리뷰할 수 있습니다."
          );
          setActiveTab("token");
        } else {
          const name = user?.login ?? "사용자";
          setResultMessage(
            `${name}님 인증되었습니다. [파일 선택] 또는 [드래그 선택] 후 리뷰를 시작해보세요.`
          );
          setActiveTab("code");
        }
        return;
      }

      if (message.type === "TOKEN_ERROR") {
        setIsSettingToken(false);
        setTokenError(
          typeof message.payload === "string"
            ? message.payload
            : "토큰 설정 중 오류가 발생했습니다."
        );
        return;
      }

      // ✅ 파일 선택 진행/오류
      if (message.type === "PICK_FILE_PROGRESS") {
        setIsPickingFile(true);
        setResultMessage(
          typeof message.payload === "string"
            ? message.payload
            : "파일을 여는 중입니다..."
        );
        setActiveTab("code");
        return;
      }

      if (message.type === "PICK_FILE_ERROR") {
        setIsPickingFile(false);
        const msg =
          typeof message.payload === "string"
            ? message.payload
            : "파일 선택 중 오류가 발생했습니다.";
        setResultMessage(msg);
        setActiveTab("code");
        return;
      }

      // ✅ 드래그 선택 진행/오류
      if (message.type === "PICK_SELECTION_PROGRESS") {
        setIsPickingSelection(true);
        setResultMessage(
          typeof message.payload === "string"
            ? message.payload
            : "선택영역을 가져오는 중입니다..."
        );
        setActiveTab("code");
        return;
      }

      if (message.type === "PICK_SELECTION_ERROR") {
        setIsPickingSelection(false);
        const msg =
          typeof message.payload === "string"
            ? message.payload
            : "선택영역 가져오기 중 오류가 발생했습니다.";
        setResultMessage(msg);
        setActiveTab("code");
        return;
      }

      // ✅ 적용 결과
      if (message.type === "APPLY_SUCCESS") {
        setResultMessage(
          typeof message.payload === "string"
            ? message.payload
            : "적용이 완료되었습니다."
        );
        return;
      }
      if (message.type === "APPLY_ERROR") {
        setResultMessage(
          typeof message.payload === "string"
            ? message.payload
            : "적용 중 오류가 발생했습니다."
        );
        return;
      }

      if (message.type === "NEW_CODE") {
        const { code, filePath, languageId, mode } = message.payload;

        setIsPickingFile(false);
        setIsPickingSelection(false);

        setCode(code);
        setFilePath(filePath);
        setLanguageId(languageId);
        setMode(mode);

        setIsLoading(false);
        setIsImproving(false);

        setResultData(null);
        setRawResponseText(null);
        setReviewMeta(null);
        setHasNewResult(false);
        setIsError(false);

        setImprovedCode(null);
        setHasNewImprovedCode(false);

        setResultMessage(
          "코드를 받았습니다. 모델을 선택한 뒤 [분석하기] 또는 Ctrl+Enter로 리뷰를 시작하세요."
        );

        setDisplayOverallScore(0);
        setDisplayCategoryScores(EMPTY_CATEGORIES);
        setActiveTab("code");
        flashCodeHighlight();
        return;
      }

      if (message.type === "ANALYZE_PROGRESS") {
        setIsLoading(true);
        setIsImproving(false);
        setIsError(false);

        setResultMessage("리뷰 결과를 생성하는 중입니다...");
        setActiveTab("result");
        setHasNewResult(false);
        return;
      }

      if (message.type === "ANALYZE_ERROR") {
        setIsLoading(false);

        setResultData(null);
        setRawResponseText(null);
        setReviewMeta(null);

        setResultMessage(`리뷰 생성 실패: ${message.payload}`);
        setDisplayOverallScore(0);
        setDisplayCategoryScores(EMPTY_CATEGORIES);

        setActiveTab("result");
        setIsError(true);
        setHasNewResult(false);

        setIsImproving(false);
        setImprovedCode(null);
        setHasNewImprovedCode(false);
        return;
      }

      if (message.type === "ANALYZE_RESULT") {
        setIsLoading(false);

        const wrapper = message.payload as unknown;

        let parsed: unknown = wrapper;
        let rawText: string | null = null;

        if (typeof wrapper === "string") {
          rawText = wrapper;
          parsed = safeJsonParse(wrapper);
          if (!parsed) {
            setResultData(null);
            setRawResponseText(rawText);
            setResultMessage(
              "응답은 도착했지만 JSON 파싱에 실패했습니다. (원문은 JSON 섹션에서 확인 가능)"
            );
            setIsError(true);
            setReviewMeta(null);
            return;
          }
        } else {
          rawText = toPrettyJson(wrapper);
        }

        const parsedObj =
          typeof parsed === "object" && parsed !== null
            ? (parsed as Record<string, any>)
            : null;

        const inner =
          parsedObj?.analyzer_result || parsedObj?.body?.review || parsedObj;

        const innerObj =
          typeof inner === "object" && inner !== null
            ? (inner as Record<string, any>)
            : null;

        const compactMeta: ReviewMetaCompact = {
          reviewId: parsedObj?.review_id ?? null,
          model:
            innerObj?.model ??
            parsedObj?.request_payload?.meta?.model ??
            parsedObj?.raw_review_response?.meta?.model ??
            null,
          audit:
            parsedObj?.raw_review_response?.meta?.audit?.created_at ??
            parsedObj?.raw_review_response?.meta?.audit ??
            undefined,
        };

        setRawResponseText(rawText);
        setResultData(inner as AnalyzerResult);
        setReviewMeta(compactMeta);

        setResultMessage("분석이 완료되었습니다.");
        setActiveTab("result");
        flashResultHighlight();
        setHasNewResult(true);
        setIsError(false);

        setIsImproving(false);
        setImprovedCode(null);
        setHasNewImprovedCode(false);
        return;
      }

      if (message.type === "IMPROVED_PROGRESS") {
        setIsImproving(true);
        setIsLoading(false);

        setResultMessage("개선코드를 생성하는 중입니다...");
        setActiveTab("improved");
        setHasNewImprovedCode(false);
        return;
      }

      if (message.type === "IMPROVED_ERROR") {
        setIsImproving(false);
        setImprovedCode(null);

        const msg =
          typeof message.payload === "string"
            ? `개선코드 생성 실패: ${message.payload}`
            : "개선코드 생성 중 오류가 발생했습니다.";

        setResultMessage(msg);
        setActiveTab("improved");
        return;
      }

      if (message.type === "IMPROVED_RESULT") {
        setIsImproving(false);

        const payload = message.payload;
        const codeText =
          typeof payload === "string"
            ? payload
            : payload?.improvedCode ?? payload?.code ?? "";

        setImprovedCode(codeText || null);
        setHasNewImprovedCode(true);
        setResultMessage(
          codeText ? "개선코드가 생성되었습니다." : "개선코드가 비어있습니다."
        );
        setActiveTab("improved");
        return;
      }
    };

    window.addEventListener("message", handler);

    if (vscode) vscode.postMessage({ type: "GET_AUTH_STATE" });

    return () => window.removeEventListener("message", handler);
  }, []);

  const handleAnalyze = () => {
    if (isBusy) return;

    if (!isAuthenticated) {
      setResultMessage(
        "토큰 인증이 필요합니다. 상단 [토큰 인증] 탭에서 토큰을 연결해 주세요."
      );
      setResultData(null);
      setRawResponseText(null);
      setReviewMeta(null);
      setDisplayOverallScore(0);
      setDisplayCategoryScores(EMPTY_CATEGORIES);
      setIsError(true);
      setHasNewResult(false);
      setActiveTab("result");
      return;
    }

    if (!code.trim()) {
      setResultMessage(
        "분석할 코드가 없습니다. 파일에서 코드를 선택하거나 왼쪽에 코드를 붙여넣어 주세요."
      );
      setResultData(null);
      setRawResponseText(null);
      setReviewMeta(null);
      setDisplayOverallScore(0);
      setDisplayCategoryScores(EMPTY_CATEGORIES);
      setIsError(false);
      setHasNewResult(false);
      return;
    }

    if (!selectedModel) {
      setResultMessage("사용할 모델을 먼저 선택해 주세요.");
      setResultData(null);
      setRawResponseText(null);
      setReviewMeta(null);
      setDisplayOverallScore(0);
      setDisplayCategoryScores(EMPTY_CATEGORIES);
      setIsError(true);
      setHasNewResult(false);
      setModelError(true);
      return;
    }

    if (!vscode) {
      setResultMessage("VS Code API를 사용할 수 없습니다.");
      setResultData(null);
      setRawResponseText(null);
      setReviewMeta(null);
      setDisplayOverallScore(0);
      setDisplayCategoryScores(EMPTY_CATEGORIES);
      setIsError(true);
      setHasNewResult(false);
      return;
    }

    setIsLoading(true);
    setIsImproving(false);
    setResultMessage("리뷰 요청을 전송했습니다. 결과를 생성하는 중입니다...");
    setIsError(false);
    setHasNewResult(false);
    setActiveTab("result");

    vscode.postMessage({
      type: "REQUEST_ANALYZE",
      payload: { code, filePath, languageId, model: selectedModel },
    });
  };

  const handleGenerateImprovedCode = () => {
    if (isBusy) return;

    if (!vscode) {
      setResultMessage("VS Code API를 사용할 수 없습니다.");
      return;
    }
    if (!canGenerateImprovedCode) {
      setResultMessage("분석 완료 후 개선코드를 생성할 수 있습니다.");
      setActiveTab("improved");
      return;
    }
    if (!code.trim()) {
      setResultMessage("개선할 코드가 없습니다.");
      setActiveTab("improved");
      return;
    }

    setIsImproving(true);
    setIsLoading(false);
    setImprovedCode(null);
    setHasNewImprovedCode(false);
    setActiveTab("improved");

    setResultMessage("개선코드를 생성하는 중입니다...");

    vscode.postMessage({
      type: "REQUEST_IMPROVED_CODE",
      payload: {
        code,
        filePath,
        languageId,
        model: selectedModel,
        reviewId: reviewMeta?.reviewId ?? null,
        analyzerResult: resultData ?? null,
      },
    });
  };

  // ✅ 파일 선택
  const handlePickFile = () => {
    if (isBusy || isPickingFile || isPickingSelection) return;

    if (!vscode) {
      setResultMessage("VS Code API를 사용할 수 없습니다.");
      return;
    }

    setMode("document");
    setIsPickingFile(true);
    setResultMessage("파일을 여는 중입니다...");
    setActiveTab("code");

    vscode.postMessage({ type: "REQUEST_PICK_FILE", payload: {} });
  };

  // ✅ 드래그 선택
  const handlePickSelection = () => {
    if (isBusy || isPickingSelection || isPickingFile) return;

    if (!vscode) {
      setResultMessage("VS Code API를 사용할 수 없습니다.");
      return;
    }

    setMode("selection");
    setIsPickingSelection(true);
    setResultMessage("선택 영역을 가져오는 중입니다...");
    setActiveTab("code");

    vscode.postMessage({ type: "REQUEST_PICK_SELECTION", payload: {} });
  };

  const handleCodeKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (!isBusy) handleAnalyze();
    }
  };

  const handleCodeChange = (value: string) => {
    setCode(value);
    setMode(null);
    flashCodeHighlight();
  };

  const handleOpenTokenPage = () => {
    const url = "https://web-dkmv.vercel.app/";
    if (vscode)
      vscode.postMessage({ type: "OPEN_TOKEN_PAGE", payload: { url } });
    else window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSubmitToken = () => {
    const trimmed = tokenInput.trim();
    if (!trimmed || !vscode) {
      setTokenError("토큰을 입력해주세요.");
      return;
    }
    setTokenError(null);
    setIsSettingToken(true);
    vscode.postMessage({ type: "SET_TOKEN", payload: { token: trimmed } });
  };

  const handleLogoutClick = () => {
    if (isBusy) return;

    setIsAuthenticated(false);
    setAuthUser(null);
    setTokenInput("");
    setTokenError(null);
    setIsSettingToken(false);

    setIsLoading(false);
    setIsImproving(false);
    setIsPickingFile(false);
    setIsPickingSelection(false);

    setResultData(null);
    setRawResponseText(null);
    setReviewMeta(null);
    setResultMessage(
      "GitHub 로그인 및 토큰 인증 후 코드를 리뷰할 수 있습니다."
    );
    setDisplayOverallScore(0);
    setDisplayCategoryScores(EMPTY_CATEGORIES);
    setActiveTab("token");
    setIsError(false);
    setHasNewResult(false);

    setImprovedCode(null);
    setHasNewImprovedCode(false);

    if (vscode) vscode.postMessage({ type: "LOGOUT" });
  };

  // ✅ 개선 적용: 선택영역(모드 무관)
  const handleApplyToSelection = () => {
    if (!vscode) {
      setResultMessage("VS Code API를 사용할 수 없습니다.");
      return;
    }
    if (!improvedCode || !improvedCode.trim()) {
      setResultMessage("적용할 개선코드가 없습니다.");
      return;
    }

    vscode.postMessage({
      type: "REQUEST_APPLY_IMPROVED_TO_SELECTION",
      payload: { improvedCode },
    });

    setResultMessage("선택 영역에 개선코드를 적용하는 중입니다...");
  };

  // ✅ 개선 적용: 파일 전체(모드 무관)
  const handleApplyToFile = () => {
    if (!vscode) {
      setResultMessage("VS Code API를 사용할 수 없습니다.");
      return;
    }
    if (!improvedCode || !improvedCode.trim()) {
      setResultMessage("적용할 개선코드가 없습니다.");
      return;
    }

    vscode.postMessage({
      type: "REQUEST_APPLY_IMPROVED_TO_FILE",
      payload: { improvedCode },
    });

    setResultMessage("파일을 선택한 뒤, 파일 전체에 개선코드를 적용합니다...");
  };

  // score animation
  useEffect(() => {
    if (!resultData) {
      setDisplayOverallScore(0);
      setDisplayCategoryScores(EMPTY_CATEGORIES);
      return;
    }

    const rawOverall =
      (resultData as any).quality_score ??
      (resultData as any).qualityScore ??
      (resultData as any).global_score ??
      0;

    const targetOverall = clampScore(rawOverall);
    const targetCategories = extractScoresByCategory(resultData);

    const duration = 500;
    const frameMs = 16;
    const steps = Math.max(1, Math.round(duration / frameMs));
    let currentStep = 0;

    setDisplayOverallScore(0);
    setDisplayCategoryScores(EMPTY_CATEGORIES);

    const intervalId = window.setInterval(() => {
      currentStep += 1;
      const t = Math.min(1, currentStep / steps);
      const ease = t * t * (3 - 2 * t);

      setDisplayOverallScore(Math.round(targetOverall * ease));
      setDisplayCategoryScores({
        bug: Math.round(targetCategories.bug * ease),
        maintainability: Math.round(targetCategories.maintainability * ease),
        style: Math.round(targetCategories.style * ease),
        security: Math.round(targetCategories.security * ease),
      });

      if (t >= 1) window.clearInterval(intervalId);
    }, frameMs);

    return () => window.clearInterval(intervalId);
  }, [resultData]);

  const statusColor = (() => {
    if (isError) return "#fca5a5";
    if (isBusy || isPickingFile || isPickingSelection) return "#c4b5fd";
    return "#a855f7";
  })();

  const displayMessage =
    resultMessage && resultMessage.trim().length > 0
      ? resultMessage
      : "이곳에 메세지가 표시됩니다.";

  const canPressAnalyze =
    !isBusy &&
    !isPickingFile &&
    !isPickingSelection &&
    !!code.trim() &&
    !!selectedModel &&
    isAuthenticated;

  const canPressImprove =
    !isBusy && !isPickingFile && !isPickingSelection && canGenerateImprovedCode;

  return (
    <>
      <style>{appStyleText}</style>

      <div className="dkmv-shell">
        <div className="dkmv-container">
          <header className="dkmv-topbar">
            <div className="dkmv-brand">
              <img
                src={logoSrc}
                alt="Don't Kill My Vibe"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  objectFit: "contain",
                  animation: "dkmv-logo-pulse 5s ease-in-out infinite",
                }}
              />
              <span className="dkmv-brand-title">Don&apos;t Kill My Vibe</span>
            </div>

            <div className="dkmv-top-actions">
              {isAuthenticated && authUser ? (
                <button
                  type="button"
                  className="dkmv-user-badge"
                  disabled={isBusy}
                  onClick={() => {}}
                  title={authUser.login}
                >
                  <img
                    src={
                      authUser.avatar_url ||
                      "https://avatars.githubusercontent.com/u/0?v=4"
                    }
                    alt={authUser.login}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 999,
                      objectFit: "cover",
                      border: "1px solid rgba(165,180,252,0.75)",
                    }}
                  />
                  <span className="dkmv-user-name">{authUser.login}</span>
                </button>
              ) : null}
            </div>
          </header>

          <div className="dkmv-row">
            <TopTabs
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              isAuthenticated={isAuthenticated}
              isLoading={isBusy}
              hasNewResult={hasNewResult}
              setHasNewResult={setHasNewResult}
              reviewState={reviewState}
              canGenerateImprovedCode={canGenerateImprovedCode}
              hasNewImprovedCode={hasNewImprovedCode}
              setHasNewImprovedCode={setHasNewImprovedCode}
            />
          </div>

          {/* ✅ 메시지 섹션: 버튼 절대 사라지지 + 메시지는 ... 처리 */}
          <div className="dkmv-row">
            <div className="dkmv-statusbar-like dkmv-statusbar-tight">
              <div className="dkmv-status-left">
                <Bell size={16} />
                <span
                  className="dkmv-dot"
                  style={{ background: statusColor }}
                />
              </div>

              <div
                className="dkmv-status-msg dkmv-ellipsis"
                title={displayMessage}
              >
                {displayMessage}
              </div>

              <div className="dkmv-status-actions">
                {activeTab === "code" && (
                  <button
                    type="button"
                    className={`dkmv-primary ${
                      canPressAnalyze ? "dkmv-cta-ready" : ""
                    }`}
                    onClick={() => {
                      setActiveTab("result");
                      handleAnalyze();
                    }}
                    disabled={!canPressAnalyze}
                    title="리뷰 생성"
                  >
                    리뷰 생성하기
                  </button>
                )}

                {activeTab === "improved" && (
                  <button
                    type="button"
                    className={`dkmv-primary ${
                      canPressImprove ? "dkmv-cta-ready" : ""
                    }`}
                    onClick={() => {
                      handleGenerateImprovedCode();
                    }}
                    disabled={!canPressImprove}
                    title="개선코드 생성"
                  >
                    개선코드 생성하기
                  </button>
                )}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0 }}>
            {activeTab === "token" && (
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
                <div className="dkmv-token-root">
                  <div className="dkmv-token-card">
                    {isAuthenticated && authUser ? (
                      <div style={{ color: "#e5e7eb" }}>
                        {/* ✅ 환영 영역 복구 */}
                        <div
                          style={{
                            padding: 14,
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            borderBottom: "1px solid rgba(148,163,184,0.12)",
                          }}
                        >
                          <img
                            src={
                              authUser.avatar_url ||
                              "https://avatars.githubusercontent.com/u/0?v=4"
                            }
                            alt={authUser.login}
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 999,
                              objectFit: "cover",
                              border: "1px solid rgba(165,180,252,0.75)",
                            }}
                          />
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 2,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 900,
                                color: "#f9fafb",
                              }}
                            >
                              {authUser.login}님, 환영합니다 👋
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "rgba(255,255,255,0.60)",
                              }}
                            >
                              토큰 인증이 완료되었습니다. 상단 탭에서 코드
                              리뷰/개선을 진행하세요.
                            </div>
                          </div>
                        </div>

                        {/* ✅ 로그아웃 */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            padding: 12,
                          }}
                        >
                          <button
                            type="button"
                            onClick={handleLogoutClick}
                            disabled={isBusy}
                            style={{
                              padding: "7px 16px",
                              fontSize: 11,
                              borderRadius: 999,
                              border: "1px solid rgba(248,113,113,0.95)",
                              background:
                                "linear-gradient(90deg,rgba(239,68,68,1),rgba(248,113,113,1))",
                              color: "#f9fafb",
                              cursor: isBusy ? "not-allowed" : "pointer",
                              opacity: isBusy ? 0.7 : 1,
                              fontWeight: 600,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <LogOut size={14} />
                            로그아웃
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: "#e5e7eb" }}>
                        <div style={{ padding: 12 }}>
                          <h2
                            style={{
                              fontSize: 16,
                              fontWeight: 800,
                              marginBottom: 6,
                            }}
                          >
                            DKMV 토큰 인증하기
                          </h2>
                          <p
                            style={{
                              fontSize: 12,
                              color: "#9ca3af",
                              marginBottom: 12,
                            }}
                          >
                            웹 대시보드에서 발급받은 VS Code 토큰을 붙여넣어
                            주세요.
                          </p>

                          <button
                            type="button"
                            onClick={handleOpenTokenPage}
                            style={{
                              padding: "7px 16px",
                              fontSize: 11,
                              borderRadius: 999,
                              border: "1px solid rgba(148,163,184,0.9)",
                              backgroundColor: "#020617",
                              color: "#e5e7eb",
                              cursor: "pointer",
                              fontWeight: 500,
                              marginBottom: 10,
                            }}
                          >
                            <ExternalLink
                              size={13}
                              style={{ marginRight: 6 }}
                            />
                            웹으로 가기
                          </button>

                          <div style={{ display: "flex", gap: 8 }}>
                            <input
                              style={{
                                flex: 1,
                                padding: "8px 10px",
                                borderRadius: 10,
                                border: "1px solid rgba(75,85,99,0.9)",
                                backgroundColor: "#020617",
                                color: "#e5e7eb",
                              }}
                              placeholder="DKMV 웹에서 발급한 VS Code 토큰"
                              value={tokenInput}
                              onChange={(e) => setTokenInput(e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={handleSubmitToken}
                              disabled={isSettingToken}
                              style={{
                                padding: "8px 16px",
                                borderRadius: 10,
                                border: "1px solid rgba(129,140,248,0.95)",
                                background:
                                  "linear-gradient(90deg,rgba(79,70,229,1),rgba(129,140,248,1))",
                                color: "#f9fafb",
                                cursor: isSettingToken ? "default" : "pointer",
                                opacity: isSettingToken ? 0.78 : 1,
                                fontWeight: 700,
                              }}
                            >
                              <Key size={14} style={{ marginRight: 6 }} />
                              {isSettingToken ? "확인 중..." : "확인"}
                            </button>
                          </div>

                          {tokenError && (
                            <div
                              style={{
                                marginTop: 10,
                                color: "#fca5a5",
                                fontSize: 12,
                              }}
                            >
                              {tokenError}
                            </div>
                          )}
                        </div>

                        <div
                          style={{
                            padding: 12,
                            fontSize: 11,
                            color: "#9ca3af",
                          }}
                        >
                          <Shield size={11} style={{ marginRight: 6 }} />
                          토큰은 이 VS Code 환경에만 저장됩니다.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {activeTab === "code" && (
              <CodePanel
                code={code}
                onChangeCode={handleCodeChange}
                onCodeKeyDown={handleCodeKeyDown}
                mode={mode}
                filePath={filePath}
                codeHighlight={codeHighlight}
                selectedModel={selectedModel}
                onChangeModel={(id) => {
                  setSelectedModel(id);
                  setModelError(false);
                  setIsError(false);
                }}
                modelError={modelError}
                onAnalyze={handleAnalyze}
                isLoading={isBusy}
                onPickFile={handlePickFile}
                isPickingFile={isPickingFile}
                onPickSelection={handlePickSelection}
                isPickingSelection={isPickingSelection}
              />
            )}

            {activeTab === "result" && (
              <ResultPanel
                resultData={resultData}
                isError={isError}
                isLoading={isBusy}
                resultHighlight={resultHighlight}
                displayOverallScore={displayOverallScore}
                displayCategoryScores={displayCategoryScores}
                logoSrc={logoSrc}
                rawResponseText={rawResponseText}
                selectedModel={selectedModel}
              />
            )}

            {activeTab === "improved" && (
              <ImprovedCodePanel
                logoSrc={logoSrc}
                originalCode={code}
                improvedCode={improvedCode}
                isImproving={isImproving}
                onApplyToSelection={handleApplyToSelection}
                onApplyToFile={handleApplyToFile}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};
