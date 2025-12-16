// src/webview/components/CodePanel.tsx
import React, { useMemo, useState } from "react";
import { Bot, FileText, MousePointer2 } from "lucide-react";
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
  const lineCount = useMemo(() => {
    return code ? code.split(/\r\n|\r|\n/).length : 0;
  }, [code]);

  const charCount = code.length;

  const [isPickHover, setIsPickHover] = useState(false);
  const [isDragHover, setIsDragHover] = useState(false);

  const pickLabel = "파일 선택";

  const pickDisabled = isLoading || isPickingFile || isPickingSelection;
  const dragDisabled = isLoading || isPickingSelection || isPickingFile;

  const isFileMode = mode === "document";
  const isSelectionMode = mode === "selection";

  const statusDotColor = (() => {
    if (modelError) return "#fca5a5";
    if (isLoading || isPickingFile || isPickingSelection) return "#c4b5fd";
    return "#a855f7";
  })();

  /** ✅ ResultPanel처럼: 전체 섹션에 남색 배경(살짝) */
  const panelBg =
    "radial-gradient(circle at 20% 10%, rgba(30,41,59,0.55), rgba(2,6,23,0.35))";

  /** ✅ 각 섹션 카드도 살짝 남색 틴트 */
  const sectionCardBg =
    "linear-gradient(135deg, rgba(15,23,42,0.55), rgba(2,6,23,0.35))";

  const sectionWrapStyle: React.CSSProperties = {
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.14)",
    background: sectionCardBg,
    padding: 10,
    boxSizing: "border-box",
    boxShadow:
      "0 10px 24px rgba(2,6,23,0.45), inset 0 0 0 1px rgba(2,6,23,0.25)",
  };

  const sectionHeaderStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "2px 2px 8px 2px",
    userSelect: "none",
  };

  const dotStyle: React.CSSProperties = {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: statusDotColor,
    boxShadow: "0 0 0 3px rgba(168,85,247,0.12)",
    flex: "0 0 auto",
  };

  const headerTitleStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 800,
    color: "#e5e7eb",
    letterSpacing: "-0.01em",
  };

  const subHintStyle: React.CSSProperties = {
    fontSize: 10,
    color: "rgba(255,255,255,0.45)",
    lineHeight: 1.4,
  };

  const baseBtnStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 10px",
    borderRadius: 10,
    border: "1px solid rgba(75,85,99,0.9)",
    color: "#e5e7eb",
    fontSize: 11,
    fontWeight: 650,
    userSelect: "none",
    whiteSpace: "nowrap",
    transition: "background-color 0.15s ease, border-color 0.15s ease",
  };

  const activeBg = "rgba(168,85,247,0.92)";
  const idleBgHover = "rgba(15,23,42,0.85)";
  const idleBg = "rgba(2,6,23,0.65)";

  const readOnlyInputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 10px",
    borderRadius: 10,
    border: modelError
      ? "1px solid rgba(252,165,165,0.95)"
      : "1px solid rgba(75,85,99,0.9)",
    backgroundColor: "#020617",
    color: "#e5e7eb",
    fontSize: 12,
    outline: "none",
    boxSizing: "border-box",
  };

  const textareaStyle: React.CSSProperties = {
    width: "100%",
    resize: "none",
    fontFamily: "JetBrains Mono, Consolas, monospace",
    fontSize: 12,
    lineHeight: 1.55,
    padding: 10,
    borderRadius: 10,
    border: codeHighlight
      ? "1px solid rgba(168,85,247,0.95)"
      : "1px solid rgba(75,85,99,0.9)",
    boxSizing: "border-box",
    backgroundColor: "#020617",
    color: "#e5e7eb",
    outline: "none",
    transition: "border-color 0.18s ease-out",
    minHeight: 260,
  };

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        borderRadius: 12,
        border: "1px solid rgba(55,65,81,0.55)",
        background: panelBg, // ✅ 남색 배경 적용
        padding: 10,
        minHeight: "calc(100vh - 190px)",
        boxSizing: "border-box",
        gap: 10,
        boxShadow: "0 12px 26px rgba(2,6,23,0.55)",
      }}
    >
      {/* =========================
          1) 사용한 모델 선택
      ========================== */}
      <div style={sectionWrapStyle}>
        <div style={sectionHeaderStyle}>
          <span style={dotStyle} />
          <div style={headerTitleStyle}>사용한 모델 선택</div>
        </div>

        <div style={{ marginTop: 8 }}>
          <ModelSelector
            value={selectedModel}
            onChange={onChangeModel}
            hasError={modelError}
          />
        </div>
      </div>

      {/* =========================
          2) 코드 선택
      ========================== */}
      <div style={{ ...sectionWrapStyle, flex: 1, minHeight: 0 }}>
        <div style={sectionHeaderStyle}>
          <span style={dotStyle} />
          <div style={headerTitleStyle}>코드 선택</div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 10,
          }}
        >
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
        </div>

        <textarea
          value={code}
          onChange={(e) => onChangeCode(e.target.value)}
          onKeyDown={onCodeKeyDown}
          placeholder="VS Code에서 코드를 선택 후 명령을 실행하거나, 이곳에 분석할 코드를 붙여넣어 주세요."
          style={textareaStyle}
        />

        <div
          style={{
            marginTop: 8,
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
      </div>
    </section>
  );
};

export default CodePanel;
