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

export const App: React.FC = () => {
  const logoSrc = window.__DKMV_LOGO__ ?? "/logo.png";

  const [code, setCode] = useState("");
  const [filePath, setFilePath] = useState<string>("");
  const [languageId, setLanguageId] = useState<string>("plaintext");
  const [mode, setMode] = useState<"selection" | "document" | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<TabId>("code");

  const [resultMessage, setResultMessage] = useState<string>(
    "분석 결과가 이 영역에 표시됩니다."
  );
  const [resultData, setResultData] = useState<AnalyzerResult | null>(null);

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

  // 🔐 익스텐션에서 전달받는 로그인 상태
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

      // 🔐 로그인 상태 동기화
      if (message.type === "AUTH_STATE") {
        const authed = !!message.payload?.isAuthenticated;
        const user = message.payload?.user ?? null;

        setIsAuthenticated(authed);
        setAuthUser(user);
        setIsSettingToken(false);

        if (!authed) {
          setResultMessage(
            "GitHub 로그인 및 토큰 인증 후 코드를 리뷰할 수 있습니다."
          );
        } else {
          const name = user?.login ?? "사용자";
          setResultMessage(
            `${name}님 환영합니다. 토큰 인증이 완료되었습니다. 코드를 선택하고 리뷰를 시작해보세요.`
          );
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
        setResultMessage(
          "코드를 받았습니다. 모델을 선택한 뒤 [분석] 버튼 또는 Ctrl+Enter로 리뷰를 시작하세요."
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
        setResultMessage(`오류 발생: ${message.payload}`);
        setDisplayOverallScore(0);
        setDisplayCategoryScores(EMPTY_CATEGORIES);
        setActiveTab("result");
        setIsError(true);
        setHasNewResult(false);
      }

      if (message.type === "ANALYZE_RESULT") {
        setIsLoading(false);

        let parsed: any = message.payload;
        let rawText: string | null = null;

        if (typeof message.payload === "string") {
          rawText = message.payload;
          try {
            parsed = JSON.parse(message.payload);
          } catch (e) {
            console.warn("[DKMV] 응답 JSON 파싱 실패:", e);
            setResultData(null);
            setRawResponseText(rawText);
            setResultMessage("응답은 왔지만 JSON 파싱에 실패했습니다.");
            setIsError(true);
            return;
          }
        } else {
          try {
            rawText = JSON.stringify(message.payload, null, 2);
          } catch {
            rawText = null;
          }
        }

        const inner =
          (parsed && (parsed as any).analyzer_result) ||
          (parsed && (parsed as any).body?.review) ||
          parsed;

        setRawResponseText(rawText);
        setResultData(inner as AnalyzerResult);
        setResultMessage("분석이 완료되었습니다.");
        setActiveTab("result");
        flashResultHighlight();
        setHasNewResult(true);
        setIsError(false);
      }
    };

    window.addEventListener("message", handler);

    // 최초 진입 시 현재 auth 상태 요청
    if (vscode) {
      vscode.postMessage({ type: "GET_AUTH_STATE" });
    }

    return () => window.removeEventListener("message", handler);
  }, []);

  const handleAnalyze = () => {
    if (!isAuthenticated) {
      setResultMessage(
        "VS Code용 토큰을 먼저 설정해야 합니다. 상단 안내를 확인해주세요."
      );
      setResultData(null);
      setRawResponseText(null);
      setDisplayOverallScore(0);
      setDisplayCategoryScores(EMPTY_CATEGORIES);
      setIsError(true);
      setHasNewResult(false);
      setActiveTab("result");
      return;
    }

    if (!code.trim()) {
      setResultMessage(
        "분석할 코드가 없습니다. VS Code에서 코드를 선택 후 실행하거나 왼쪽에 코드를 붙여넣어 주세요."
      );
      setResultData(null);
      setRawResponseText(null);
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
    // 실제 백엔드 로그아웃이 아니라, 웹뷰 상태만 초기화해서
    // 다시 토큰 인증 랜딩 화면으로 돌아가도록 처리
    setIsAuthenticated(false);
    setAuthUser(null);
    setTokenInput("");
    setTokenError(null);
    setIsSettingToken(false);

    setResultData(null);
    setRawResponseText(null);
    setResultMessage(
      "GitHub 로그인 및 토큰 인증 후 코드를 리뷰할 수 있습니다."
    );
    setDisplayOverallScore(0);
    setDisplayCategoryScores(EMPTY_CATEGORIES);
    setActiveTab("code");
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
    return "#a855f7"; // 기본도 보라 계열
  })();

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
              filter: hue-rotate(15deg) brightness(1.15);
              transform: scale(1.02);
            }
            100% {
              filter: hue-rotate(-10deg) brightness(0.98);
              transform: scale(1);
            }
          }

          .dkmv-score-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }
          @media (max-width: 520px) {
            .dkmv-score-grid {
              grid-template-columns: 1fr;
            }
          }

          /* 아바타 버튼 + 툴팁 */
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

          /* 토큰 안내 칩 */
          .dkmv-token-chip {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 999px;
            border: 1px solid rgba(167,139,250,0.9);
            background: radial-gradient(circle at top left, rgba(129,140,248,0.25), rgba(15,23,42,0.95));
            font-size: 11px;
            color: #e5e7eb;
          }
        `}
      </style>

      <div
        style={{
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          boxSizing: "border-box",
          background:
            "linear-gradient(135deg, #020617 0%, #030712 40%, #1e1b4b 100%)",
          color: "#e5e7eb",
          minHeight: "100vh",
          height: isLoading ? "100vh" : "auto",
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
            borderBottom: "1px solid rgba(79,70,229,0.5)",
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
              <span
                style={{
                  fontSize: 11,
                  color: "#a5b4fc",
                }}
              >
                VS Code 코드 리뷰 익스텐션
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
            {/* 로그인 상태 표시 + 로그아웃 액션 */}
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
                    maxWidth: 120,
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

        {/* 🔐 토큰 설정 / 로그인 랜딩 화면 */}
        {!isAuthenticated && (
          <div
            style={{
              marginTop: 18,
              padding: 18,
              borderRadius: 14,
              border: "1px solid rgba(88,28,135,0.8)",
              background:
                "radial-gradient(circle at top, rgba(129,140,248,0.3), rgba(15,23,42,0.98))",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {/* 상단 설명 */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  GitHub 인증 후 DKMV 리뷰를 시작해요
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "#e5e7eb",
                    lineHeight: 1.6,
                  }}
                >
                  DKMV는 웹에서 GitHub 계정으로 로그인한 뒤 발급받은{" "}
                  <strong style={{ fontWeight: 500 }}>VS Code 전용 토큰</strong>
                  으로만 사용 가능합니다.
                  <br />
                  아래 절차에 따라 토큰을 설정한 후, 이 익스텐션에서 리뷰를
                  실행할 수 있습니다.
                </span>
              </div>

              <span className="dkmv-token-chip">
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background:
                      "radial-gradient(circle, #22c55e, #15803d, #166534)",
                  }}
                />
                <span>웹에서 GitHub 로그인 → 토큰 발행</span>
              </span>
            </div>

            {/* 절차 안내 + 웹 이동 버튼 */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                marginTop: 4,
              }}
            >
              <ol
                style={{
                  fontSize: 11,
                  color: "#e5e7eb",
                  paddingLeft: 18,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <li>1. DKMV 웹에서 GitHub로 로그인합니다.</li>
                <li>2. 설정/프로필에서 VS Code용 토큰을 발급합니다.</li>
                <li>3. 아래 입력창에 토큰을 붙여넣고 저장합니다.</li>
              </ol>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 10,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={handleOpenTokenPage}
                  style={{
                    padding: "7px 13px",
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid rgba(129,140,248,0.9)",
                    background:
                      "linear-gradient(120deg, rgba(79,70,229,0.95), rgba(147,197,253,0.9))",
                    color: "#0b1120",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontWeight: 500,
                  }}
                >
                  <span>DKMV 웹 열기 (GitHub 로그인)</span>
                  <span style={{ fontSize: 11 }}>↗</span>
                </button>
              </div>
            </div>

            {/* 토큰 입력 박스 */}
            <div
              style={{
                marginTop: 10,
                padding: 12,
                borderRadius: 12,
                background:
                  "linear-gradient(145deg, rgba(15,23,42,0.98), rgba(15,23,42,1))",
                border: "1px solid rgba(55,65,81,0.9)",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <label
                style={{
                  fontSize: 11,
                  color: "#a5b4fc",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>발급받은 VS Code 토큰</span>
                <span
                  style={{
                    fontSize: 10,
                    color: "#9ca3af",
                  }}
                >
                  복사한 값을 그대로 붙여넣어 주세요
                </span>
              </label>

              <textarea
                rows={2}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                style={{
                  width: "100%",
                  resize: "vertical",
                  minHeight: 46,
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid rgba(75,85,99,0.9)",
                  backgroundColor: "#020617",
                  color: "#e5e7eb",
                  fontSize: 11,
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                }}
                placeholder="DKMV 웹에서 발급받은 토큰을 입력해주세요..."
              />
              {tokenError && (
                <span
                  style={{
                    fontSize: 11,
                    color: "#fca5a5",
                  }}
                >
                  {tokenError}
                </span>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: 4,
                  gap: 8,
                  alignItems: "center",
                }}
              >
                {isSettingToken && (
                  <span
                    style={{
                      fontSize: 10,
                      color: "#a5b4fc",
                    }}
                  >
                    토큰을 확인하는 중입니다...
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSubmitToken}
                  disabled={isSettingToken}
                  style={{
                    padding: "6px 14px",
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid rgba(129,140,248,0.9)",
                    background:
                      "linear-gradient(90deg,rgba(129,140,248,1),rgba(168,85,247,0.95))",
                    color: "#020617",
                    cursor: isSettingToken ? "default" : "pointer",
                    opacity: isSettingToken ? 0.75 : 1,
                    fontWeight: 500,
                  }}
                >
                  {isSettingToken ? "토큰 확인 중..." : "토큰 저장"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🔍 인증된 상태에서만 기존 탭 + 분석 UI 표시 */}
        {isAuthenticated && (
          <>
            {/* 탭 헤더 + 분석 버튼 (한 줄) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid rgba(31,41,55,0.9)",
                gap: 8,
                paddingTop: 8,
                paddingBottom: 4,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 4,
                }}
              >
                {(["code", "result"] as TabId[]).map((id) => {
                  const label = id === "code" ? "입력 코드" : "분석 결과";
                  const isActive = activeTab === id;
                  const showBadge = id === "result" && hasNewResult;
                  const disabled = isLoading && !isActive;

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
                        padding: "6px 12px",
                        fontSize: 12,
                        border: "1px solid transparent",
                        borderRadius: 8,
                        backgroundColor: isActive
                          ? "rgba(30,64,175,0.35)"
                          : "transparent",
                        color: disabled
                          ? "rgba(75,85,99,0.85)"
                          : isActive
                          ? "#e5e7eb"
                          : "#9ca3af",
                        cursor: disabled ? "not-allowed" : "pointer",
                        outline: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        opacity: disabled ? 0.6 : 1,
                      }}
                    >
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

              <button
                onClick={handleAnalyze}
                style={{
                  padding: "6px 14px",
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid rgba(129,140,248,0.9)",
                  background:
                    "linear-gradient(90deg,rgba(129,140,248,1),rgba(168,85,247,0.95))",
                  color: "#020617",
                  cursor: isLoading ? "default" : "pointer",
                  opacity: isLoading ? 0.85 : 1,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                }}
                disabled={isLoading}
              >
                {isLoading ? "분석 중..." : "분석 (Ctrl+Enter)"}
              </button>
            </div>

            {/* 상태 메시지 바 */}
            <div
              style={{
                marginTop: 6,
                marginBottom: 4,
                fontSize: 11,
                minHeight: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                padding: "0 10px",
                color: statusColor,
              }}
            >
              <span style={{ fontWeight: 500 }}>{resultMessage}</span>
              {selectedModel && (
                <span
                  style={{
                    fontSize: 10,
                    color: "#e5e7eb",
                    opacity: 0.9,
                  }}
                >
                  사용 모델: {selectedModel}
                </span>
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
                />
              )}

              {activeTab === "result" && (
                <ResultPanel
                  resultData={resultData}
                  isError={isError}
                  isLoading={isLoading}
                  resultHighlight={resultHighlight}
                  displayOverallScore={displayOverallScore}
                  displayCategoryScores={displayCategoryScores}
                  logoSrc={logoSrc}
                />
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};
