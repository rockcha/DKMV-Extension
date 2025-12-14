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

import { Key, Shield, ExternalLink, LogOut } from "lucide-react";
import TopTabs from "./components/TopTabs";
import StatusBar from "./components/StatusBar";
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

  const [isLoading, setIsLoading] = useState(false);

  // ✅ 탭
  const [activeTab, setActiveTab] = useState<TabId>("token");

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

  // 🔐 인증 상태
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 🔐 토큰 입력 UI 상태
  const [tokenInput, setTokenInput] = useState("");
  const [isSettingToken, setIsSettingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // ✅ 개선코드 상태
  const [isImproving, setIsImproving] = useState(false);
  const [improvedCode, setImprovedCode] = useState<string | null>(null);
  const [improvedMessage, setImprovedMessage] =
    useState<string>("아직 생성된 개선코드가 없습니다.");
  const [hasNewImprovedCode, setHasNewImprovedCode] = useState(false);

  const flashCodeHighlight = () => {
    setCodeHighlight(true);
    window.setTimeout(() => setCodeHighlight(false), 350);
  };

  const flashResultHighlight = () => {
    setResultHighlight(true);
    window.setTimeout(() => setResultHighlight(false), 350);
  };

  // ✅ 상태 파생
  const reviewState: ReviewUIState = deriveReviewState({
    isAuthenticated,
    hasCode: !!code.trim(),
    isLoading,
    hasResult: !!resultData,
    isError,
  });

  // ✅ "분석 완료일 때만 개선코드 생성 가능"
  const canGenerateImprovedCode = reviewState === "DONE";

  // VSCode → 웹뷰 메시지 핸들링
  useEffect(() => {
    const handler = (
      event: MessageEvent<IncomingMessage | AuthStateMessage | any>
    ) => {
      const message = event.data;
      if (!message) return;

      // 🔐 로그인/토큰 상태 동기화
      if (message.type === "AUTH_STATE") {
        const authed = !!message.payload?.isAuthenticated;
        const user = message.payload?.user ?? null;

        setIsAuthenticated(authed);
        setAuthUser(user);
        setIsSettingToken(false);
        setReviewMeta(null);

        // 로그아웃이면 개선코드 상태도 리셋
        if (!authed) {
          setIsImproving(false);
          setImprovedCode(null);
          setImprovedMessage("아직 생성된 개선코드가 없습니다.");
          setHasNewImprovedCode(false);
        }

        if (!authed) {
          setResultMessage(
            "GitHub 로그인 및 토큰 인증 후 코드를 리뷰할 수 있습니다."
          );
          setActiveTab("token");
        } else {
          const name = user?.login ?? "사용자";
          setResultMessage(
            `${name}님 환영합니다. 토큰 인증이 완료되었습니다. 코드를 선택하고 리뷰를 시작해보세요.`
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
        setResultData(null);
        setRawResponseText(null);
        setReviewMeta(null);
        setResultMessage(
          "코드를 받았습니다. 모델을 선택한 뒤 아래 [분석] 버튼 또는 Ctrl+Enter로 리뷰를 시작하세요."
        );
        setDisplayOverallScore(0);
        setDisplayCategoryScores(EMPTY_CATEGORIES);
        setActiveTab("code");
        flashCodeHighlight();
        setHasNewResult(false);
        setIsError(false);

        // ✅ 새 코드가 오면 개선코드는 초기화(이전 개선코드가 남아 보이는 혼란 방지)
        setIsImproving(false);
        setImprovedCode(null);
        setImprovedMessage("아직 생성된 개선코드가 없습니다.");
        setHasNewImprovedCode(false);
        return;
      }

      if (message.type === "ANALYZE_PROGRESS") {
        setIsLoading(true);
        setResultMessage(message.payload || "모델이 코드를 읽고 있습니다...");
        setActiveTab("result");
        setIsError(false);
        return;
      }

      if (message.type === "ANALYZE_ERROR") {
        setIsLoading(false);
        setResultData(null);
        setRawResponseText(null);
        setReviewMeta(null);
        setResultMessage(`오류 발생: ${message.payload}`);
        setDisplayOverallScore(0);
        setDisplayCategoryScores(EMPTY_CATEGORIES);
        setActiveTab("result");
        setIsError(true);
        setHasNewResult(false);
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
            setResultMessage("응답은 왔지만 JSON 파싱에 실패했습니다.");
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

        // ✅ 분석이 새로 완료되면 개선코드 상태는 “대기”로 초기화
        setIsImproving(false);
        setImprovedCode(null);
        setImprovedMessage(
          "분석 결과를 기반으로 개선코드를 생성할 수 있습니다."
        );
        setHasNewImprovedCode(false);

        return;
      }

      // ✅ 개선코드 진행/결과 메시지 처리
      if (message.type === "IMPROVED_PROGRESS") {
        setIsImproving(true);
        setImprovedMessage(message.payload || "개선코드를 생성 중입니다...");
        setActiveTab("improved");
        return;
      }

      if (message.type === "IMPROVED_ERROR") {
        setIsImproving(false);
        setImprovedCode(null);
        setImprovedMessage(
          typeof message.payload === "string"
            ? `개선코드 생성 실패: ${message.payload}`
            : "개선코드 생성 중 오류가 발생했습니다."
        );
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
        setImprovedMessage(
          codeText ? "개선코드가 생성되었습니다." : "개선코드가 비어있습니다."
        );
        setHasNewImprovedCode(true);
        setActiveTab("improved");
        return;
      }
    };

    window.addEventListener("message", handler);

    if (vscode) {
      vscode.postMessage({ type: "GET_AUTH_STATE" });
    }

    return () => window.removeEventListener("message", handler);
  }, []);

  const handleAnalyze = () => {
    if (!isAuthenticated) {
      setResultMessage(
        "VS Code용 토큰을 먼저 설정해야 합니다. 상단 [토큰 인증] 탭에서 토큰을 연결해 주세요."
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
        "분석할 코드가 없습니다. 파일에서 코드를 선택 후 실행하거나 왼쪽에 코드를 붙여넣어 주세요."
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
    setResultMessage("리뷰 요청을 준비 중입니다...");
    setIsError(false);
    setHasNewResult(false);
    setActiveTab("result");

    vscode.postMessage({
      type: "REQUEST_ANALYZE",
      payload: { code, filePath, languageId, model: selectedModel },
    });
  };

  const handleGenerateImprovedCode = () => {
    if (!vscode) {
      setImprovedMessage("VS Code API를 사용할 수 없습니다.");
      return;
    }
    if (!canGenerateImprovedCode) {
      setImprovedMessage("분석 완료 후 개선코드를 생성할 수 있습니다.");
      setActiveTab("improved");
      return;
    }
    if (!code.trim()) {
      setImprovedMessage("개선할 코드가 없습니다.");
      setActiveTab("improved");
      return;
    }

    setIsImproving(true);
    setImprovedCode(null);
    setImprovedMessage("개선코드를 생성 중입니다...");
    setHasNewImprovedCode(false);
    setActiveTab("improved");

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
      if (!isLoading) handleAnalyze();
    }
  };

  const handleCodeChange = (value: string) => {
    setCode(value);
    flashCodeHighlight();
  };

  const handleOpenTokenPage = () => {
    const url = "https://web-dkmv.vercel.app/";
    if (vscode) {
      vscode.postMessage({ type: "OPEN_TOKEN_PAGE", payload: { url } });
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
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
    setIsAuthenticated(false);
    setAuthUser(null);
    setTokenInput("");
    setTokenError(null);
    setIsSettingToken(false);

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

    setIsImproving(false);
    setImprovedCode(null);
    setImprovedMessage("아직 생성된 개선코드가 없습니다.");
    setHasNewImprovedCode(false);

    if (vscode) vscode.postMessage({ type: "LOGOUT" });
  };

  // 결과 데이터 → 점수 애니메이션
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
    if (isLoading) return "#c4b5fd";
    return "#a855f7";
  })();

  const displayMessage =
    resultMessage && resultMessage.trim().length > 0
      ? resultMessage
      : "이곳에 메세지가 표시됩니다.";

  return (
    <>
      <style>{appStyleText}</style>

      <div
        style={{
          fontFamily:
            "'Gowun Dodum', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          boxSizing: "border-box",
          background:
            "linear-gradient(135deg, #020617 0%, #030712 40%, #020617 100%)",
          color: "#e5e7eb",
          minHeight: "100vh",
          maxWidth: 1200,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* 헤더 */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            paddingBottom: 6,
            borderBottom: "1px solid rgba(31,41,55,0.9)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src={logoSrc}
              alt="Don't Kill My Vibe"
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                objectFit: "contain",
                animation: "dkmv-logo-pulse 5s ease-in-out infinite",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{ fontWeight: 600, fontSize: 14, letterSpacing: 0.3 }}
              >
                Don&apos;t Kill My Vibe
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
            }}
          >
            {isAuthenticated && authUser && (
              <button
                type="button"
                className="dkmv-avatar-button"
                onClick={handleLogoutClick}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: "#c4b5fd",
                    maxWidth: 140,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {authUser.login}
                </span>
                <img
                  src={
                    authUser.avatar_url ||
                    "https://avatars.githubusercontent.com/u/0?v=4"
                  }
                  alt={authUser.login}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    objectFit: "cover",
                    border: "1px solid rgba(165,180,252,0.9)",
                  }}
                />
                <span className="dkmv-avatar-tooltip">로그아웃</span>
              </button>
            )}
          </div>
        </header>

        {/* 메인 */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            marginTop: 10,
            gap: 6,
          }}
        >
          <TopTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isAuthenticated={isAuthenticated}
            isLoading={isLoading || isImproving}
            hasNewResult={hasNewResult}
            setHasNewResult={setHasNewResult}
            reviewState={reviewState}
            canGenerateImprovedCode={canGenerateImprovedCode}
            hasNewImprovedCode={hasNewImprovedCode}
            setHasNewImprovedCode={setHasNewImprovedCode}
          />

          <StatusBar
            displayMessage={displayMessage}
            statusColor={statusColor}
            selectedModel={selectedModel}
          />

          <div style={{ flex: 1, minHeight: 0, marginTop: 2 }}>
            {/* 토큰 탭 */}
            {activeTab === "token" && (
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
                        style={{
                          padding: "7px 16px",
                          fontSize: 11,
                          borderRadius: 999,
                          border: "1px solid rgba(248,113,113,0.95)",
                          background:
                            "linear-gradient(90deg,rgba(239,68,68,1),rgba(248,113,113,1))",
                          color: "#f9fafb",
                          cursor: "pointer",
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
                          <span style={{ display: "inline-flex" }}>
                            <ExternalLink size={14} color="#e5e7eb" />
                          </span>
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
                        <h2 className="dkmv-token-title">DKMV 토큰 인증하기</h2>
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
            )}

            {/* 코드 탭 */}
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
                isLoading={isLoading}
              />
            )}

            {/* 결과 탭 */}
            {activeTab === "result" && (
              <ResultPanel
                resultData={resultData}
                isError={isError}
                isLoading={isLoading}
                resultHighlight={resultHighlight}
                displayOverallScore={displayOverallScore}
                displayCategoryScores={displayCategoryScores}
                logoSrc={logoSrc}
                reviewMeta={reviewMeta ?? undefined}
                rawResponseText={rawResponseText}
              />
            )}

            {/* ✅ 개선코드 탭 */}
            {activeTab === "improved" && (
              <ImprovedCodePanel
                originalCode={code}
                improveState={reviewState}
                canGenerateImprovedCode={canGenerateImprovedCode}
                isImproving={isImproving}
                improvedCode={improvedCode}
                improvedMessage={improvedMessage}
                onGenerate={handleGenerateImprovedCode}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};
