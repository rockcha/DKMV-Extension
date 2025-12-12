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
import {
  Bot,
  Code2,
  FileText,
  Key,
  Shield,
  ExternalLink,
  Bell,
  LogOut,
} from "lucide-react";

declare global {
  interface Window {
    acquireVsCodeApi?: () => any;
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

export const App: React.FC = () => {
  const logoSrc = window.__DKMV_LOGO__ ?? "/logo.png";

  const [code, setCode] = useState("");
  const [filePath, setFilePath] = useState<string>("");
  const [languageId, setLanguageId] = useState<string>("plaintext");
  const [mode, setMode] = useState<"selection" | "document" | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  // ✅ 탭: "token" | "code" | "result"
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

  // 🔐 익스텐션에서 전달받는 로그인 상태 (GitHub + VSCode 토큰)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 🔐 토큰 입력 UI 상태
  const [tokenInput, setTokenInput] = useState("");
  const [isSettingToken, setIsSettingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const flashCodeHighlight = () => {
    setCodeHighlight(true);
    setTimeout(() => setCodeHighlight(false), 350);
  };

  const flashResultHighlight = () => {
    setResultHighlight(true);
    setTimeout(() => setResultHighlight(false), 350);
  };

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
      }

      if (message.type === "ANALYZE_PROGRESS") {
        setIsLoading(true);
        setResultMessage(message.payload || "모델이 코드를 읽고 있습니다...");
        setActiveTab("result");
        setIsError(false);
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
      }

      if (message.type === "ANALYZE_RESULT") {
        setIsLoading(false);

        const wrapper: any = message.payload;
        let parsed: any = wrapper;
        let rawText: string | null = null;

        if (typeof wrapper === "string") {
          rawText = wrapper;
          try {
            parsed = JSON.parse(wrapper);
          } catch (e) {
            console.warn("[DKMV] 응답 JSON 파싱 실패:", e);
            setResultData(null);
            setRawResponseText(rawText);
            setResultMessage("응답은 왔지만 JSON 파싱에 실패했습니다.");
            setIsError(true);
            setReviewMeta(null);
            return;
          }
        } else {
          try {
            rawText = JSON.stringify(wrapper, null, 2);
          } catch {
            rawText = null;
          }
        }

        const inner =
          (parsed && parsed.analyzer_result) ||
          (parsed && parsed.body?.review) ||
          parsed;

        const compactMeta: ReviewMetaCompact = {
          reviewId: parsed?.review_id ?? null,
          model:
            inner?.model ??
            parsed?.request_payload?.meta?.model ??
            parsed?.raw_review_response?.meta?.model ??
            null,
          audit:
            parsed?.raw_review_response?.meta?.audit?.created_at ??
            parsed?.raw_review_response?.meta?.audit ??
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
      payload: {
        code,
        filePath,
        languageId,
        model: selectedModel,
      },
    });
  };

  const handleCodeKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (!isLoading) {
        handleAnalyze();
      }
    }
  };

  const handleCodeChange = (value: string) => {
    setCode(value);
    flashCodeHighlight();
  };

  const handleOpenTokenPage = () => {
    const url = "https://web-dkmv.vercel.app/";
    if (vscode) {
      vscode.postMessage({
        type: "OPEN_TOKEN_PAGE",
        payload: { url },
      });
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

    if (vscode) {
      vscode.postMessage({ type: "LOGOUT" });
    }
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

      if (t >= 1) {
        window.clearInterval(intervalId);
      }
    }, frameMs);

    return () => {
      window.clearInterval(intervalId);
    };
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
      <style>
        {`
          @keyframes dkmv-logo-pulse {
            0% {
              filter: hue-rotate(0deg) brightness(1);
              transform: scale(1);
            }
            50% {
              filter: hue-rotate(12deg) brightness(1.12);
              transform: scale(1.03);
            }
            100% {
              filter: hue-rotate(-8deg) brightness(0.98);
              transform: scale(1);
            }
          }

          .dkmv-link-btn,
          .dkmv-token-btn {
            position: relative;
            overflow: hidden;
            transition:
              transform 0.16s ease-out,
              box-shadow 0.16s ease-out,
              background 0.16s ease-out,
              opacity 0.16s ease-out,
              border-color 0.16s ease-out;
          }
          .dkmv-link-btn::before,
          .dkmv-token-btn::before {
            content: "";
            position: absolute;
            inset: 0;
            opacity: 0;
            background: radial-gradient(
              circle at 0% 0%,
              rgba(248,250,252,0.12),
              transparent 60%
            );
            transition: opacity 0.22s ease-out;
          }
          .dkmv-link-btn:hover::before,
          .dkmv-token-btn:hover::before {
            opacity: 1;
          }
          .dkmv-link-btn:hover,
          .dkmv-token-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 8px 20px rgba(15,23,42,0.75);
          }
          .dkmv-link-btn:active,
          .dkmv-token-btn:active {
            transform: translateY(0);
            box-shadow: 0 3px 10px rgba(15,23,42,0.9);
          }

          /* 아바타 버튼 */
          .dkmv-avatar-button {
            position: relative;
            padding: 0;
            margin: 0;
            border: none;
            background: transparent;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .dkmv-avatar-tooltip {
            position: absolute;
            bottom: -22px;
            right: 0;
            font-size: 10px;
            background: rgba(15,23,42,0.98);
            color: #e5e7eb;
            padding: 4px 8px;
            border-radius: 999px;
            border: 1px solid rgba(79,70,229,0.8);
            opacity: 0;
            transform: translateY(4px);
            pointer-events: none;
            white-space: nowrap;
            transition: opacity 0.15s ease, transform 0.15s ease;
            z-index: 20;
          }
          .dkmv-avatar-button:hover .dkmv-avatar-tooltip {
            opacity: 1;
            transform: translateY(0);
          }

          /* 토큰 탭 레이아웃 */
          .dkmv-token-root {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justifyContent: center;
            padding: 16px 10px 18px;
            box-sizing: border-box;
          }

          .dkmv-token-card {
            width: 100%;
            max-width: 640px;
            border-radius: 16px;
            border: 1px solid rgba(31,41,55,0.95);
            background: radial-gradient(circle at 0% 0%, #020617, #020617);
            padding: 18px 20px 20px;
            box-shadow:
              0 18px 40px rgba(15,23,42,0.9),
              0 0 0 1px rgba(15,23,42,0.85);
          }

          .dkmv-token-title {
            font-size: 16px;
            font-weight: 600;
            color: #e5e7eb;
            text-align: center;
            letter-spacing: 0.03em;
          }

          .dkmv-token-sub {
            margin-top: 8px;
            font-size: 11px;
            line-height: 1.7;
            color: #9ca3af;
            text-align: center;
          }

          .dkmv-token-actions {
            margin-top: 14px;
            display: flex;
            justify-content: center;
          }

          .dkmv-token-input-wrap {
            margin-top: 14px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            align-items: center;
          }

          .dkmv-token-input-row {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            justify-content: center;
            width: 100%;
          }

          .dkmv-token-input {
            flex: 1 1 260px;
            max-width: 420px;
            padding: 8px 10px;
            border-radius: 10px;
            border: 1px solid rgba(55,65,81,0.95);
            background-color: #020617;
            color: #e5e7eb;
            font-size: 11px;
            font-family:
              ui-monospace,
              SFMono-Regular,
              Menlo,
              Monaco,
              Consolas,
              "Liberation Mono",
              "Courier New",
              monospace;
            outline: none;
            box-sizing: border-box;
            transition:
              border-color 0.15s ease-out,
              box-shadow 0.15s ease-out,
              background 0.15s ease-out;
          }

          .dkmv-token-input:focus {
            border-color: rgba(129,140,248,1);
            box-shadow: 0 0 0 1px rgba(129,140,248,0.85);
            background: #020617;
          }

          .dkmv-token-error {
            font-size: 10px;
            color: #fecaca;
            text-align: center;
          }

          .dkmv-token-foot {
            margin-top: 8px;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 6px;
            font-size: 10px;
            color: #6b7280;
          }

          .dkmv-token-authed {
            margin-bottom: 14px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
          }

          .dkmv-token-authed-main {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .dkmv-token-authed-text {
            font-size: 12px;
            color: #c7d2fe;
          }

          .dkmv-token-authed-sub {
            font-size: 11px;
            color: #9ca3af;
            text-align: center;
          }

          @media (max-width: 640px) {
            .dkmv-token-card {
              padding: 16px 14px 18px;
            }
          }
        `}
      </style>

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
          maxWidth: 1200, // ✅ 넓은 화면에서 가운데 정렬
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
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  letterSpacing: 0.3,
                }}
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
          {/* 탭 헤더 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              paddingTop: 4,
              paddingBottom: 4,
              borderBottom: "1px solid rgba(31,41,55,0.9)",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                padding: 2,
                borderRadius: 999,
                backgroundColor: "rgba(15,23,42,0.9)",
                border: "1px solid rgba(31,41,55,0.9)",
                gap: 2,
              }}
            >
              {(["token", "code", "result"] as TabId[]).map((id) => {
                const label =
                  id === "token"
                    ? "토큰 인증"
                    : id === "code"
                    ? "입력 코드"
                    : "리뷰 결과";
                const Icon =
                  id === "token" ? Key : id === "code" ? Code2 : FileText;

                const isActive = activeTab === id;
                const showBadge = id === "result" && hasNewResult;

                // 🔒 토큰 미인증 시 code / result 탭 이동 불가
                const lockedByAuth = !isAuthenticated && id !== "token";
                const disabled =
                  lockedByAuth || (isLoading && !isActive && id !== "token");

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      if (disabled) return;
                      setActiveTab(id);
                      if (id === "result") {
                        setHasNewResult(false);
                      }
                    }}
                    style={{
                      padding: "6px 11px",
                      fontSize: 11,
                      borderRadius: 999,
                      border: "none",
                      backgroundColor: isActive
                        ? "rgba(15,23,42,1)"
                        : "transparent",
                      color: disabled
                        ? "rgba(75,85,99,0.8)"
                        : isActive
                        ? "#e5e7eb"
                        : "#9ca3af",
                      cursor: disabled ? "not-allowed" : "pointer",
                      outline: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      opacity: disabled ? 0.65 : 1,
                      boxShadow: isActive
                        ? "0 0 0 1px rgba(129,140,248,0.9)"
                        : "none",
                      transition:
                        "background-color 0.15s ease, box-shadow 0.15s ease, color 0.15s ease",
                    }}
                  >
                    <Icon size={13} />
                    <span>{label}</span>
                    {showBadge && !disabled && (
                      <span
                        style={{
                          display: "inline-block",
                          width: 6,
                          height: 6,
                          borderRadius: 999,
                          backgroundColor: "#a855f7",
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 상태 + 알림 아이콘 바 */}
          <div
            style={{
              marginTop: 4,
              marginBottom: 4,
              fontSize: 11,
              minHeight: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              padding: "0 4px",
              flexWrap: "wrap", // ✅ 좁은 폭에서 줄바꿈 허용
            }}
          >
            {/* 🔔 상태 메시지 pill */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 10px",
                borderRadius: 999,
                backgroundColor: "rgba(15,23,42,0.95)",
                border: "1px solid rgba(31,41,55,0.9)",
                color: statusColor,
                flex: "1 1 260px",
                minWidth: 0,
                maxWidth: "100%",
              }}
            >
              <Bell size={13} color="#a855f7" />
              <span
                style={{
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis", // ✅ 메세지 길어져도 한 줄로
                }}
              >
                {displayMessage}
              </span>
            </div>

            {/* 선택된 모델 표시 pill – 길어져도 레이아웃 유지 */}
            {selectedModel && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  color: "#e5e7eb",
                  opacity: 0.9,
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(55,65,81,0.9)",
                  backgroundColor: "rgba(15,23,42,0.96)",
                  flexShrink: 0,
                  maxWidth: 260, // ✅ 너무 길어지지 않게 제한
                }}
              >
                <Bot size={14} color="#a855f7" />
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={selectedModel}
                >
                  {selectedModel}
                </span>
              </div>
            )}
          </div>

          {/* 탭 콘텐츠 */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              marginTop: 2,
            }}
          >
            {/* 🔐 토큰 탭 */}
            {activeTab === "token" && (
              <div className="dkmv-token-root">
                <div className="dkmv-token-card">
                  {isAuthenticated && authUser ? (
                    // ✅ 인증된 상태: 아바타 + 멘트 + 로그아웃만
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
                    // ✅ 로그아웃 상태: 토큰 안내 UI 전부
                    <>
                      {/* 미니멀 아이콘 헤더 */}
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
                          <Code2 size={14} color="#e5e7eb" />
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

                      {/* 제목 / 설명 */}
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

                      {/* 웹으로 가기 버튼 */}
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

                      {/* 토큰 입력 + 확인 버튼 */}
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

                      {/* 하단 보안 메시지 */}
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
          </div>
        </div>
      </div>
    </>
  );
};
