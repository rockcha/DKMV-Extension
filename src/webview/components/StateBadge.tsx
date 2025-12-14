// src/webview/components/StateBadge.tsx

import React from "react";
import { getStateBadge, type ReviewUIState } from "../ui/reviewState";

type Props = {
  reviewState: ReviewUIState;
  canGenerateImprovedCode: boolean;
};

export default function StateBadge({
  reviewState,
  canGenerateImprovedCode,
}: Props) {
  const badge = getStateBadge(reviewState);
  const isSpinning = reviewState === "ANALYZING";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 10px",
        borderRadius: 999,
        border: `1px solid ${badge.border}`,
        backgroundColor: "rgba(15,23,42,0.92)",
        color: badge.color,
        fontSize: 11,
        flexShrink: 0,
        whiteSpace: "nowrap",
      }}
      title={`현재 상태: ${reviewState}`}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          backgroundColor: badge.color,
          opacity: 0.95,
          ...(isSpinning
            ? { animation: "dkmv-logo-pulse 1.2s ease-in-out infinite" }
            : null),
        }}
      />
      <span style={{ fontWeight: 600 }}>{badge.text}</span>

      {canGenerateImprovedCode && (
        <span
          style={{
            marginLeft: 6,
            padding: "2px 8px",
            borderRadius: 999,
            fontSize: 10,
            color: "#e5e7eb",
            border: "1px solid rgba(34,197,94,0.35)",
            backgroundColor: "rgba(34,197,94,0.10)",
          }}
        >
          개선코드 생성 가능
        </span>
      )}
    </div>
  );
}
