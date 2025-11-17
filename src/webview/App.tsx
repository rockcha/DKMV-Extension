import React, { useEffect, useState } from "react";

type IncomingMessage =
  | {
      type: "NEW_CODE";
      payload: {
        code: string;
        fileName: string;
        mode: "selection" | "document";
      };
    }
  | { type: string; payload?: any };

declare global {
  interface Window {
    acquireVsCodeApi?: () => any;
  }
}

const vscode = window.acquireVsCodeApi ? window.acquireVsCodeApi() : null;

export const App: React.FC = () => {
  const [code, setCode] = useState("");
  const [fileName, setFileName] = useState<string>("");
  const [mode, setMode] = useState<"selection" | "document" | null>(null);
  const [analysis, setAnalysis] =
    useState<string>("아직 분석을 실행하지 않았습니다.");

  // VS Code extension → webview로 오는 메시지 받기
  useEffect(() => {
    const handler = (event: MessageEvent<IncomingMessage>) => {
      const message = event.data;
      if (!message) return;

      if (message.type === "NEW_CODE") {
        const { code, fileName, mode } = message.payload;
        setCode(code);
        setFileName(fileName);
        setMode(mode);
        setAnalysis("코드를 받았습니다. 'Analyze' 버튼을 눌러 분석하세요.");
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // 나중에 이 함수 안을 FastAPI 호출로 교체하면 됨
  const handleAnalyze = async () => {
    if (!code.trim()) {
      setAnalysis("분석할 코드가 없습니다.");
      return;
    }

    // TODO: 여기서 fetch("http://.../analyze", { method: "POST", body: JSON.stringify({ code }) })
    // 로 FastAPI + LLM 연동 예정

    const lines = code.split("\n").length;
    const lengthInfo = code.length;

    const fakeResult = [
      `파일: ${fileName || "(알 수 없음)"}`,
      `모드: ${mode === "selection" ? "선택 영역" : "전체 문서"}`,
      "",
      `▶ 코드 통계`,
      `- 라인 수: ${lines}`,
      `- 문자 수: ${lengthInfo}`,
      "",
      `▶ 임시 분석 (DEMO)`,
      `- Bug:        Low`,
      `- Style:      Medium`,
      `- Docs:       Missing`,
      "",
      `※ 이 분석은 LLM이 아닌 데모용 하드코딩입니다.`,
      `   나중에 FastAPI + LLM 결과로 교체할 예정입니다.`,
    ].join("\n");

    setAnalysis(fakeResult);

    // 원하면 확장 쪽으로도 메시지 보낼 수 있음 (로그 등)
    vscode?.postMessage?.({
      type: "ANALYSIS_DONE",
      payload: { summary: "fake-analysis" },
    });
  };

  return (
    <div
      style={{
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        height: "100vh",
        boxSizing: "border-box",
      }}
    >
      <h2 style={{ margin: 0 }}>DKMV Analyzer (React Skeleton)</h2>
      <small style={{ color: "#666" }}>
        VS Code에서 코드 선택 후 명령을 실행하면 이 패널에 코드가 들어옵니다.
      </small>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* 왼쪽: 코드 뷰 */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "4px",
            }}
          >
            <strong>입력 코드</strong>
            <span style={{ fontSize: 11, color: "#999" }}>
              {mode === "selection" ? "선택 영역" : "전체 문서"}
            </span>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{
              flex: 1,
              width: "100%",
              resize: "none",
              fontFamily: "monospace",
              fontSize: 12,
              padding: 8,
              borderRadius: 4,
              border: "1px solid #ccc",
              boxSizing: "border-box",
              background: "#1e1e1e",
              color: "#f5f5f5",
            }}
          />
        </div>

        {/* 오른쪽: 분석 결과 */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "4px",
            }}
          >
            <strong>분석 결과</strong>
            <button
              onClick={handleAnalyze}
              style={{
                padding: "4px 10px",
                fontSize: 12,
                borderRadius: 4,
                border: "1px solid #444",
                background: "#007acc",
                color: "white",
                cursor: "pointer",
              }}
            >
              Analyze
            </button>
          </div>
          <pre
            style={{
              flex: 1,
              width: "100%",
              margin: 0,
              padding: 8,
              borderRadius: 4,
              border: "1px solid #ccc",
              background: "#111",
              color: "#dcdcdc",
              fontFamily: "monospace",
              fontSize: 12,
              overflow: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {analysis}
          </pre>
        </div>
      </div>
    </div>
  );
};
