// src/webview/components/StatusBar.tsx

import React from "react";
import { Bell, Bot } from "lucide-react";

type Props = {
  displayMessage: string;
  statusColor: string;
  selectedModel: string;
};

export default function StatusBar({
  displayMessage,
  statusColor,
  selectedModel,
}: Props) {
  return (
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
        flexWrap: "wrap",
      }}
    >
      {/* 상태 메시지 pill */}
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
            textOverflow: "ellipsis",
          }}
        >
          {displayMessage}
        </span>
      </div>

      {/* 선택된 모델 표시 pill */}
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
            maxWidth: 260,
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
  );
}
