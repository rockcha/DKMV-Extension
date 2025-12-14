// src/webview/components/ModelSelector.tsx

import React, { useMemo, useState } from "react";
import { MODEL_OPTIONS } from "../modelOptions";
import { Bot, Search } from "lucide-react";

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
        m.id.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q) ||
        m.label.toLowerCase().includes(q)
    );
  }, [query]);

  const borderColor = hasError
    ? "1px solid rgba(248,113,113,0.9)"
    : "1px solid rgba(55,65,81,0.9)";

  const inputBorderColor = hasError
    ? "1px solid rgba(248,113,113,0.9)"
    : "1px solid rgba(55,65,81,0.9)";

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
      {/* 라벨 + 검색 인풋 한 줄 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          minWidth: 0, // ✅ flex 자식 shrink 허용(중요)
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: hasError ? "#fecaca" : "#e5e7eb",
            opacity: 0.95,
            whiteSpace: "nowrap",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            flexShrink: 0, // ✅ 라벨은 줄어들지 않게
          }}
        >
          <Bot size={13} />
          <span>내가 사용한 AI Agent</span>
        </span>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flex: "1 1 0%", // ✅ 남는 공간을 차지 + shrink 가능
            minWidth: 0, // ✅ 자식(input)이 부모 밖으로 안 나가게 핵심
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              minWidth: 0, // ✅ 여기까지 내려줘야 안전
              flex: "1 1 0%",
            }}
          >
            <Search
              size={12}
              style={{
                position: "absolute",
                left: 8,
                top: "50%",
                transform: "translateY(-50%)",
                opacity: 0.7,
                pointerEvents: "none",
              }}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="모델 ID / provider 검색"
              style={{
                width: "100%",
                maxWidth: "100%", // ✅ 혹시 모를 overflow 방지
                fontSize: 12,
                padding: "6px 10px 6px 24px",
                borderRadius: 999,
                border: inputBorderColor,
                backgroundColor: "rgba(15,23,42,0.95)",
                color: "#e5e7eb",
                outline: "none",
                minWidth: 0,
                boxSizing: "border-box", // ✅ padding/border 포함해서 width 계산
              }}
            />
          </div>
        </div>
      </div>

      {/* 모델 리스트: 고정 높이 + 스크롤 */}
      <div
        style={{
          borderRadius: 10,
          border: borderColor,
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
              width: "100%",
              height: "100%",
              minHeight: 112,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: 8,
              boxSizing: "border-box",
            }}
          >
            {/* ⚠️ 웹뷰에서는 /public 경로가 아닐 수 있어. 아래 NOTE 참고 */}
            <img
              src="/public/not_found.png"
              alt="모델을 찾을 수 없습니다."
              style={{
                width: 72,
                height: 72,
                objectFit: "contain",
                opacity: 0.95,
              }}
            />
            <span
              style={{
                fontSize: 11,
                color: "#9ca3af",
                textAlign: "center",
              }}
            >
              검색 결과가 없습니다.
            </span>
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
                  minWidth: 0, // ✅ 내부 텍스트가 길어도 버튼이 안 튐
                }}
              >
                <span
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    minWidth: 0,
                    flex: "1 1 0%",
                  }}
                  title={m.id}
                >
                  {m.label}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: active ? "#ede9fe" : "#9ca3af",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
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
