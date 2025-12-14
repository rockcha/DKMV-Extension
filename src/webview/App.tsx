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

  // derived state
  const reviewState: ReviewUIState = deriveReviewState({
    isAuthenticated,
    hasCode: !!code.trim(),
    isLoading: isBusy,
    hasResult: !!resultData,
    isError,
  });

  const canGenerateImprovedCode = reviewState === "DONE";

  // VSCode message handler
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
            `${name}님 인증되었습니다. 코드를 선택하고 모델을 고른 뒤 리뷰를 시작해보세요.`
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

      if (message.type === "NEW_CODE") {
        const { code, filePath, languageId, mode } = message.payload;

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
          "코드를 받았습니다. 모델을 선택한 뒤 [분석] 또는 Ctrl+Enter로 리뷰를 시작하세요."
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

  const handleCodeKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (!isBusy) handleAnalyze();
    }
  };

  const handleCodeChange = (value: string) => {
    setCode(value);
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
    if (isBusy) return "#c4b5fd";
    return "#a855f7";
  })();

  const displayMessage =
    resultMessage && resultMessage.trim().length > 0
      ? resultMessage
      : "이곳에 메세지가 표시됩니다.";

  const onPrimaryAction = () => {
    if (activeTab === "code") return handleAnalyze();
    if (activeTab === "improved") return handleGenerateImprovedCode();
    setActiveTab("code");
  };

  const primaryLabel = activeTab === "improved" ? "개선코드 생성" : "분석하기";

  return (
    <>
      <style>{appStyleText}</style>

      <div className="dkmv-shell">
        <div className="dkmv-container">
          {/* Top bar */}
          <header className="dkmv-topbar">
            <div className="dkmv-brand">
              <img
                src={logoSrc}
                alt="Don't Kill My Vibe"
                style={{
                  width: 22,
                  height: 22,
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

          {/* Tabs row */}
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

          {/* Status row */}
          <div className="dkmv-row">
            <div className="dkmv-statusbar-like">
              <div className="dkmv-status-left">
                <Bell size={16} />
                <span
                  className="dkmv-dot"
                  style={{ background: statusColor }}
                />
              </div>

              <div className="dkmv-status-msg" title={displayMessage}>
                {displayMessage}
              </div>

              {/* ✅ token 탭에서는 분석/개선 버튼 자체를 숨김 */}
              {activeTab !== "token" && (
                <button
                  type="button"
                  className="dkmv-primary"
                  onClick={onPrimaryAction}
                  disabled={
                    isBusy ||
                    (activeTab === "code" &&
                      (!code.trim() || !selectedModel)) ||
                    (activeTab === "improved" && !canGenerateImprovedCode)
                  }
                  title={
                    activeTab === "improved" ? "개선코드 생성" : "분석하기"
                  }
                >
                  {primaryLabel}
                </button>
              )}
            </div>
          </div>

          {/* Main content */}
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
                      <div
                        className="dkmv-token-authed"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 12,
                          paddingTop: 8,
                          paddingBottom: 8,
                        }}
                      >
                        <img
                          src={
                            authUser.avatar_url ||
                            "https://avatars.githubusercontent.com/u/0?v=4"
                          }
                          alt={authUser.login}
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 999,
                            objectFit: "cover",
                            border: "1px solid rgba(165,180,252,0.9)",
                          }}
                        />
                        <div style={{ textAlign: "center" }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "#e5e7eb",
                            }}
                          >
                            {authUser.login}님, 인증되었습니다.
                          </div>
                          <div
                            style={{
                              marginTop: 4,
                              fontSize: 11,
                              color: "#9ca3af",
                            }}
                          >
                            이제 에디터에서 DKMV 코드 리뷰를 바로 사용할 수
                            있어요.
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleLogoutClick}
                          className="dkmv-token-btn"
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
                            marginTop: 2,
                          }}
                        >
                          <LogOut size={14} />
                          <span>로그아웃</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            gap: 10,
                            marginBottom: 10,
                            opacity: 0.9,
                          }}
                        >
                          <div
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 999,
                              border: "1px solid rgba(129,140,248,0.9)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: "rgba(15,23,42,0.9)",
                            }}
                          >
                            <Key size={14} color="#a855f7" />
                          </div>
                          <div
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 999,
                              border: "1px solid rgba(148,163,184,0.9)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: "rgba(15,23,42,0.9)",
                            }}
                          >
                            <ExternalLink size={14} color="#e5e7eb" />
                          </div>
                          <div
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 999,
                              border: "1px solid rgba(56,189,248,0.9)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: "rgba(15,23,42,0.9)",
                            }}
                          >
                            <Shield size={14} color="#38bdf8" />
                          </div>
                        </div>

                        <div>
                          <h2 className="dkmv-token-title">
                            DKMV 토큰 인증하기
                          </h2>
                          <p className="dkmv-token-sub">
                            웹 대시보드에서 GitHub로 로그인한 뒤 발급받은{" "}
                            <strong style={{ fontWeight: 500 }}>
                              VS Code 토큰
                            </strong>
                            을 붙여넣으면,
                            <br />
                            에디터에서 바로 AI 코드 리뷰를 사용할 수 있습니다.
                          </p>
                        </div>

                        <div className="dkmv-token-actions">
                          <button
                            type="button"
                            onClick={handleOpenTokenPage}
                            className="dkmv-link-btn"
                            style={{
                              padding: "7px 16px",
                              fontSize: 11,
                              borderRadius: 999,
                              border: "1px solid rgba(148,163,184,0.9)",
                              backgroundColor: "#020617",
                              color: "#e5e7eb",
                              cursor: "pointer",
                              fontWeight: 500,
                              whiteSpace: "nowrap",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <ExternalLink size={13} />
                            <span>웹으로 가기</span>
                          </button>
                        </div>

                        <div className="dkmv-token-input-wrap">
                          <div className="dkmv-token-input-row">
                            <input
                              className="dkmv-token-input"
                              placeholder="DKMV 웹에서 발급한 VS Code 토큰을 붙여넣어 주세요."
                              value={tokenInput}
                              onChange={(e) => setTokenInput(e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={handleSubmitToken}
                              disabled={isSettingToken}
                              className="dkmv-token-btn"
                              style={{
                                padding: "8px 18px",
                                fontSize: 12,
                                borderRadius: 10,
                                border: "1px solid rgba(129,140,248,0.95)",
                                background:
                                  "linear-gradient(90deg,rgba(79,70,229,1),rgba(129,140,248,1))",
                                color: "#f9fafb",
                                cursor: isSettingToken ? "default" : "pointer",
                                opacity: isSettingToken ? 0.78 : 1,
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <Key size={15} />
                              <span>
                                {isSettingToken ? "토큰 확인 중..." : "확인"}
                              </span>
                            </button>
                          </div>

                          {tokenError && (
                            <div className="dkmv-token-error">{tokenError}</div>
                          )}
                        </div>

                        <div className="dkmv-token-foot">
                          <Shield size={11} />
                          <span>토큰은 이 VS Code 환경에만 저장됩니다.</span>
                        </div>
                      </>
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
                canGenerateImprovedCode={canGenerateImprovedCode}
                isImproving={isImproving}
                improvedCode={improvedCode}
                onGenerate={handleGenerateImprovedCode}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};
