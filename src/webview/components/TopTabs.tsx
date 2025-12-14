// src/webview/components/TopTabs.tsx

import React, { useEffect, useState } from "react";
import { Key, Code2, FileText, Wand2 } from "lucide-react";
import type { TabId } from "../types";
import type { ReviewUIState } from "../ui/reviewState";

type Props = {
  activeTab: TabId;
  setActiveTab: (id: TabId) => void;

  isAuthenticated: boolean;
  isLoading: boolean;

  // 유지용 props
  hasNewResult: boolean;
  setHasNewResult: (v: boolean) => void;

  reviewState: ReviewUIState;
  canGenerateImprovedCode: boolean;

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
  // 현재는 안 쓰지만 props 유지 (lint 방지)
  void reviewState;
  void hasNewResult;
  void hasNewImprovedCode;

  const canEnterImprovedTab = canGenerateImprovedCode && !isLoading;

  // ✅ 좁아지면 아이콘만
  const [isCompact, setIsCompact] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsCompact(window.innerWidth < 620);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const tabs: Array<{
    id: TabId;
    label: string;
    Icon: React.ComponentType<{ size?: number }>;
    onEnter?: () => void;
    getDisabled: (id: TabId) => boolean;
  }> = [
    {
      id: "token",
      label: "토큰 인증",
      Icon: Key,
      getDisabled: (id) => (isLoading ? id !== activeTab : false),
    },
    {
      id: "code",
      label: "입력 코드",
      Icon: Code2,
      getDisabled: (id) => {
        if (isLoading) return id !== activeTab;
        if (!isAuthenticated) return true;
        return false;
      },
    },
    {
      id: "result",
      label: "리뷰 결과",
      Icon: FileText,
      onEnter: () => setHasNewResult(false),
      getDisabled: (id) => {
        if (isLoading) return id !== activeTab;
        if (!isAuthenticated) return true;
        return false;
      },
    },
    {
      id: "improved",
      label: "개선코드",
      Icon: Wand2,
      onEnter: () => setHasNewImprovedCode(false),
      getDisabled: (id) => {
        if (isLoading) return id !== activeTab;
        if (!isAuthenticated) return true;
        return !canEnterImprovedTab;
      },
    },
  ];

  return (
    <div style={{ width: "100%", minWidth: 0 }}>
      <div className="dkmv-tabs-grid">
        {tabs.map(({ id, label, Icon, onEnter, getDisabled }) => {
          const isActive = activeTab === id;
          const disabled = getDisabled(id);

          const title =
            id === "improved" && !canEnterImprovedTab
              ? "분석 완료 후 이용 가능합니다."
              : isLoading && !isActive
              ? "요청 처리 중에는 탭 이동이 불가합니다."
              : label;

          return (
            <button
              key={id}
              type="button"
              className="dkmv-tab-square"
              data-active={isActive ? "true" : "false"}
              aria-selected={isActive}
              aria-label={label}
              title={title}
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                setActiveTab(id);
                onEnter?.();
              }}
            >
              <Icon size={14} />
              {!isCompact && <span className="dkmv-tab-label">{label}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
