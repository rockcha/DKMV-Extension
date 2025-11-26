// src/webview/components/ModelSelector.tsx

import React, { useMemo, useState } from "react";
import { MODEL_OPTIONS } from "../modelOptions";

type Props = {
  value: string;
  onChange: (modelId: string) => void;
  hasError?: boolean;
};

const ModelSelector: React.FC<Props> = ({ value, onChange, hasError }) => {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MODEL_OPTIONS;
    return MODEL_OPTIONS.filter(
      (m) =>
        m.id.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q)
    );
  }, [query]);

  const current = filtered.find((m) => m.id === value) ?? null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
      }}
    >
      {/* 라벨 + 검색 인풋 + 버튼 한 줄 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "#e5e7eb",
            opacity: 0.9,
            whiteSpace: "nowrap",
          }}
        >
          사용한 AI Agent
        </span>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flex: 1,
            minWidth: 0,
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="모델 ID / provider 검색"
            style={{
              flex: 1,
              fontSize: 12,
              padding: "6px 10px",
              borderRadius: 999,
              border: hasError
                ? "1px solid rgba(248,113,113,0.9)"
                : "1px solid rgba(55,65,81,0.9)",
              backgroundColor: "rgba(15,23,42,0.95)",
              color: "#e5e7eb",
              outline: "none",
              minWidth: 0,
            }}
          />
        </div>
      </div>

      {/* 모델 리스트: 고정 높이 + 스크롤 */}
      <div
        style={{
          borderRadius: 10,
          border: hasError
            ? "1px solid rgba(248,113,113,0.9)"
            : "1px solid rgba(55,65,81,0.9)",
          backgroundColor: "rgba(15,23,42,0.98)",
          maxHeight: 180,
          minHeight: 120,
          overflowY: "auto",
          padding: 4,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {filtered.length === 0 ? (
          <div
            style={{
              fontSize: 11,
              color: "#9ca3af",
              padding: "4px 6px",
            }}
          >
            검색 결과가 없습니다.
          </div>
        ) : (
          filtered.map((m) => {
            const active = m.id === value;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onChange(m.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "none",
                  backgroundColor: active
                    ? "rgba(88,28,135,0.9)"
                    : "transparent",
                  color: active ? "#f9fafb" : "#e5e7eb",
                  fontSize: 11,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={m.id}
                >
                  {m.label}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: active ? "#ede9fe" : "#9ca3af",
                  }}
                >
                  [{m.provider}]
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ModelSelector;
