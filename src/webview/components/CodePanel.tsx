import React from "react";
import ModelSelector from "./ModelSelector";

type Mode = "selection" | "document" | null;

type Props = {
  code: string;
  onChangeCode: (value: string) => void;
  onCodeKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  mode: Mode;
  filePath: string;
  codeHighlight: boolean;
  selectedModel: string;
  onChangeModel: (id: string) => void;
  modelError: boolean;
  onAnalyze: () => void;
  isLoading: boolean;
};

const CodePanel: React.FC<Props> = ({
  code,
  onChangeCode,
  onCodeKeyDown,
  mode,
  filePath,
  codeHighlight,
  selectedModel,
  onChangeModel,
  modelError,
  onAnalyze,
  isLoading,
}) => {
  const fileName = filePath ? filePath.split(/[\\/]/).slice(-1)[0] : "";
  const lineCount = code ? code.split(/\r\n|\r|\n/).length : 0;
  const charCount = code.length;

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        borderRadius: 10,
        border: "none",
        background:
          "radial-gradient(circle at top, rgba(37,99,235,0.18), transparent 60%), #020617",
        padding: 10,
        minHeight: "calc(100vh - 190px)",
        boxSizing: "border-box",
      }}
    >
      {/* 상단: 파일 정보 + 모델 선택 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 10,
          marginBottom: 8,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 6,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {mode && (
            <span
              style={{
                padding: "2px 8px",
                borderRadius: 999,
                border: "1px solid rgba(55,65,81,0.9)",
                fontSize: 10,
                color: "#9ca3af",
              }}
            >
              {mode === "selection" ? "선택 영역" : "전체 문서"}
            </span>
          )}
          {fileName && (
            <span
              style={{
                padding: "2px 8px",
                borderRadius: 999,
                border: "1px solid rgba(55,65,81,0.9)",
                fontSize: 10,
                color: "#9ca3af",
              }}
            >
              {fileName}
            </span>
          )}
        </div>

        {/* 👉 모델 검색/선택 UI */}
        <ModelSelector
          value={selectedModel}
          onChange={onChangeModel}
          hasError={modelError}
        />
      </div>

      {/* 코드 입력 영역 */}
      <textarea
        value={code}
        onChange={(e) => onChangeCode(e.target.value)}
        onKeyDown={onCodeKeyDown}
        placeholder="VS Code에서 코드를 선택 후 명령을 실행하거나, 이곳에 분석할 코드를 붙여넣어 주세요."
        style={{
          flex: 1,
          width: "100%",
          resize: "none",
          fontFamily: "JetBrains Mono, Consolas, monospace",
          fontSize: 12,
          lineHeight: 1.5,
          padding: 10,
          borderRadius: 6,
          border: codeHighlight
            ? "1px solid rgba(168,85,247,0.95)"
            : "1px solid rgba(75,85,99,0.9)",
          boxSizing: "border-box",
          backgroundColor: "#020617",
          color: "#e5e7eb",
          outline: "none",
          transition: "border-color 0.18s ease-out",
          minHeight: "220px", // 🔽 조금 줄임
        }}
      />

      {/* 하단: 줄/문자 정보(왼쪽) + 분석 버튼(오른쪽) */}
      <div
        style={{
          marginTop: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          fontSize: 10,
          color: "#6b7280",
        }}
      >
        <span>
          {lineCount} lines · {charCount} chars
        </span>

        <button
          onClick={onAnalyze}
          className="dkmv-analyze-btn"
          style={{
            padding: "7px 18px",
            fontSize: 12,
            borderRadius: 10,
            border: "1px solid rgba(129,140,248,0.95)",
            background:
              "linear-gradient(90deg,rgba(79,70,229,1),rgba(129,140,248,1))",
            color: "#f9fafb",
            cursor: isLoading ? "default" : "pointer",
            opacity: isLoading ? 0.85 : 1,
            fontWeight: 600,
            whiteSpace: "nowrap",
            letterSpacing: 0.1,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
          disabled={isLoading}
        >
          <span>{isLoading ? "분석 중..." : "분석 (Ctrl+Enter)"}</span>
        </button>
      </div>
    </section>
  );
};

export default CodePanel;
