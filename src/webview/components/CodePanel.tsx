// src/webview/components/CodePanel.tsx
import React, { useState } from "react";
import { FileText, MousePointer2 } from "lucide-react";
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

  // ✅ 파일 선택
  onPickFile: () => void;
  isPickingFile: boolean;

  // ✅ 드래그 선택
  onPickSelection: () => void;
  isPickingSelection: boolean;
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

  isLoading,
  onPickFile,
  isPickingFile,
  onPickSelection,
  isPickingSelection,
}) => {
  const lineCount = code ? code.split(/\r\n|\r|\n/).length : 0;
  const charCount = code.length;

  const [isPickHover, setIsPickHover] = useState(false);
  const [isDragHover, setIsDragHover] = useState(false);

  // ✅ 요구사항: 파일선택 모드가 아니면 텍스트 고정 "파일 선택"
  // (파일을 선택해도 "현재 파일: ~" 같은 표시는 하지 않음)
  const pickLabel = "파일 선택";

  const pickDisabled = isLoading || isPickingFile || isPickingSelection;
  const dragDisabled = isLoading || isPickingSelection || isPickingFile;

  const isFileMode = mode === "document";
  const isSelectionMode = mode === "selection";

  const baseBtnStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    borderRadius: 10,
    border: "1px solid rgba(75,85,99,0.9)",
    color: "#e5e7eb",
    fontSize: 11,
    fontWeight: 650,
    userSelect: "none",
    whiteSpace: "nowrap",
    transition: "background-color 0.15s ease, border-color 0.15s ease",
  };

  const activeBg = "rgba(168,85,247,0.92)"; // 보라색 활성
  const idleBgHover = "rgba(15,23,42,0.85)";
  const idleBg = "rgba(2,6,23,0.65)";

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
      {/* 상단: 파일 선택 + 드래그 선택 + 모델 */}
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
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {/* 파일 선택 */}
          <button
            type="button"
            onClick={onPickFile}
            disabled={pickDisabled}
            onMouseEnter={() => setIsPickHover(true)}
            onMouseLeave={() => setIsPickHover(false)}
            style={{
              ...baseBtnStyle,
              backgroundColor: isFileMode
                ? activeBg
                : isPickHover
                ? idleBgHover
                : idleBg,
              borderColor: isFileMode
                ? "rgba(216,180,254,0.95)"
                : "rgba(75,85,99,0.9)",
              cursor: pickDisabled ? "not-allowed" : "pointer",
              opacity: pickDisabled ? 0.65 : 1,
            }}
            title={filePath ? filePath : "파일을 선택해서 불러오기"}
          >
            <FileText size={14} />
            <span>{isPickingFile ? "파일 여는 중..." : pickLabel}</span>
          </button>

          {/* 드래그 선택 */}
          <button
            type="button"
            onClick={onPickSelection}
            disabled={dragDisabled}
            onMouseEnter={() => setIsDragHover(true)}
            onMouseLeave={() => setIsDragHover(false)}
            style={{
              ...baseBtnStyle,
              backgroundColor: isSelectionMode
                ? activeBg
                : isDragHover
                ? idleBgHover
                : idleBg,
              borderColor: isSelectionMode
                ? "rgba(216,180,254,0.95)"
                : "rgba(75,85,99,0.9)",
              cursor: dragDisabled ? "not-allowed" : "pointer",
              opacity: dragDisabled ? 0.65 : 1,
            }}
            title="에디터에서 드래그한 선택 영역을 가져옵니다 (포커스 이동에도 안전)"
          >
            <MousePointer2 size={14} />
            <span>{isPickingSelection ? "가져오는 중..." : "드래그 선택"}</span>
          </button>

          {/* 현재 모드 힌트 */}
          <span
            style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.45)",
              paddingTop: 2,
              userSelect: "none",
              whiteSpace: "nowrap",
            }}
          >
            {mode === "selection"
              ? "• 선택영역 모드"
              : mode === "document"
              ? "• 파일전체 모드"
              : ""}
          </span>
        </div>

        <ModelSelector
          value={selectedModel}
          onChange={onChangeModel}
          hasError={modelError}
        />
      </div>

      {/* 코드 입력 */}
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
          minHeight: "220px",
        }}
      />

      {/* 하단 */}
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
      </div>
    </section>
  );
};

export default CodePanel;
