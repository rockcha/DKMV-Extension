// src/webview/components/TopTabs.tsx

import React from "react";
import { Key, Code2, FileText, Wand2 } from "lucide-react";
import type { TabId } from "../types";
import StateBadge from "./StateBadge";
import type { ReviewUIState } from "../ui/reviewState";

type Props = {
  activeTab: TabId;
  setActiveTab: (id: TabId) => void;

  isAuthenticated: boolean;
  isLoading: boolean;

  hasNewResult: boolean;
  setHasNewResult: (v: boolean) => void;

  reviewState: ReviewUIState;
  canGenerateImprovedCode: boolean;

  // ✅ 개선코드 탭에 깜빡이는 점(알림) 컨트롤
  hasNewImprovedCode: boolean;
  setHasNewImprovedCode: (v: boolean) => void;
};

export default function TopTabs({
  activeTab,
  setActiveTab,
  isAuthenticated,
  isLoading,
  hasNewResult,
  setHasNewResult,
  reviewState,
  canGenerateImprovedCode,
  hasNewImprovedCode,
  setHasNewImprovedCode,
}: Props) {
  const canEnterImprovedTab = canGenerateImprovedCode && !isLoading;

  const tabs: Array<{
    id: TabId;
    label: string;
    Icon: React.ComponentType<{ size?: number }>;
    // 배지/잠금/비활성 조건
    getDisabled: (id: TabId, isActive: boolean) => boolean;
    showBlinkDot: boolean;
    onEnter?: () => void;
  }> = [
    {
      id: "token",
      label: "토큰 인증",
      Icon: Key,
      getDisabled: (id, _isActive) => id !== "token" && !isAuthenticated,
      showBlinkDot: false,
    },
    {
      id: "code",
      label: "입력 코드",
      Icon: Code2,
      getDisabled: (id, isActive) => {
        const lockedByAuth = !isAuthenticated && id !== "token";
        return lockedByAuth || (isLoading && !isActive && id !== "token");
      },
      showBlinkDot: false,
    },
    {
      id: "result",
      label: "리뷰 결과",
      Icon: FileText,
      getDisabled: (id, isActive) => {
        const lockedByAuth = !isAuthenticated && id !== "token";
        return lockedByAuth || (isLoading && !isActive && id !== "token");
      },
      showBlinkDot: hasNewResult,
      onEnter: () => setHasNewResult(false),
    },
    {
      id: "improved",
      label: "개선코드",
      Icon: Wand2,
      getDisabled: (id, isActive) => {
        const lockedByAuth = !isAuthenticated && id !== "token";
        if (lockedByAuth) return true;
        if (isLoading && !isActive) return true;
        // ✅ 분석 완료(DONE)일 때만 진입 가능
        return !canEnterImprovedTab;
      },
      // ✅ 분석 완료일 때 점 깜빡임(원하면 hasNewImprovedCode로 컨트롤)
      showBlinkDot: canGenerateImprovedCode && hasNewImprovedCode,
      onEnter: () => setHasNewImprovedCode(false),
    },
  ];

  // 보라 테마 컬러들
  const purple = {
    bg: "rgba(88, 28, 135, 0.55)", // deep purple
    bgStrong: "rgba(88, 28, 135, 0.85)",
    bgActive: "rgba(126, 34, 206, 0.9)", // purple-700 느낌
    border: "rgba(196, 181, 253, 0.35)", // violet-200 느낌
    borderActive: "rgba(216, 180, 254, 0.65)",
    text: "#ffffff",
    textMuted: "rgba(255,255,255,0.72)",
    textDisabled: "rgba(255,255,255,0.35)",
    dot: "#c084fc", // purple dot
    shadow: "0 10px 26px rgba(17, 24, 39, 0.55)",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        paddingTop: 6,
        paddingBottom: 6,
        borderBottom: "1px solid rgba(31,41,55,0.9)",
        minWidth: 0,
      }}
    >
      {/* 왼쪽: 탭 */}
      <div
        style={{
          display: "inline-flex",
          padding: 4,
          borderRadius: 999,
          background: `linear-gradient(135deg, ${purple.bgStrong}, ${purple.bg})`,
          border: `1px solid ${purple.border}`,
          gap: 4,
          boxShadow: purple.shadow,
          minWidth: 0,
          flex: "1 1 auto",
        }}
      >
        {/* 로컬 keyframes (TopTabs에서만 필요) */}
        <style>
          {`
            @keyframes dkmv-purple-ping {
              0% { transform: scale(1); opacity: 1; }
              70% { transform: scale(1.6); opacity: 0; }
              100% { transform: scale(1.6); opacity: 0; }
            }
            @keyframes dkmv-dot-blink {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 1; }
            }
          `}
        </style>

        {tabs.map(({ id, label, Icon, getDisabled, showBlinkDot, onEnter }) => {
          const isActive = activeTab === id;
          const disabled = getDisabled(id, isActive);

          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                if (disabled) return;
                setActiveTab(id);
                onEnter?.();
              }}
              style={{
                position: "relative",
                padding: "7px 12px",
                fontSize: 11,
                borderRadius: 999,
                border: `1px solid ${
                  isActive ? purple.borderActive : "transparent"
                }`,
                background: isActive
                  ? `linear-gradient(135deg, ${purple.bgActive}, rgba(168,85,247,0.65))`
                  : "transparent",
                color: disabled ? purple.textDisabled : purple.text,
                cursor: disabled ? "not-allowed" : "pointer",
                outline: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                opacity: disabled ? 0.65 : 1,
                boxShadow: isActive
                  ? "0 0 0 1px rgba(216,180,254,0.45), 0 10px 20px rgba(17,24,39,0.45)"
                  : "none",
                transition:
                  "background-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, opacity 0.15s ease",
                transform: isActive ? "translateY(-0.5px)" : "translateY(0)",
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}
              title={
                id === "improved" && !canEnterImprovedTab
                  ? "분석 완료 후 이용 가능합니다."
                  : undefined
              }
            >
              <Icon size={13} />
              <span style={{ fontWeight: 700, letterSpacing: 0.2 }}>
                {label}
              </span>

              {/* ✅ 깜빡이는 보라 점 (탭 우상단) */}
              {showBlinkDot && !disabled && (
                <span
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 6,
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    backgroundColor: purple.dot,
                    boxShadow: "0 0 0 2px rgba(15,23,42,0.65)",
                    animation: "dkmv-dot-blink 1.1s ease-in-out infinite",
                  }}
                >
                  {/* ping ring */}
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 999,
                      border: "1px solid rgba(192,132,252,0.85)",
                      animation: "dkmv-purple-ping 1.1s ease-out infinite",
                    }}
                  />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 오른쪽: 상태 뱃지 */}
      <div style={{ flexShrink: 0 }}>
        <StateBadge
          reviewState={reviewState}
          canGenerateImprovedCode={canGenerateImprovedCode}
        />
      </div>
    </div>
  );
}
