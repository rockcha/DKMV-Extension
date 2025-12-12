// src/extension.ts
import * as vscode from "vscode";

// 🔗 서버 엔드포인트
// 지금은 auth / reviews 둘 다 8000 에서 제공된다고 가정
const API_BASE = "http://18.205.229.159:8000";

const AUTH_API_BASE = API_BASE;
const REVIEW_API_BASE = API_BASE;

// ✅ 새 리뷰 생성 & 조회 엔드포인트
const REVIEW_REQUEST_URL = `${REVIEW_API_BASE}/v1/reviews/request`;
const REVIEW_GET_URL = `${REVIEW_API_BASE}/v1/reviews`;

// 🌐 웹 대시보드 주소 (토큰 발급 페이지 열 때 사용)
const FRONTEND_URL = "https://web-dkmv.vercel.app";

// 🔐 익스텐션 내부에서만 관리하는 인증 상태
let authToken: string | null = null;
let authUser: AuthUser | null = null;

let panel: vscode.WebviewPanel | undefined;

// 서버가 주는 유저 스펙(웹에서 쓰는 AuthUser와 거의 동일하게 맞춤)
type AuthUser = {
  id: number;
  github_id?: string;
  login: string;
  name?: string | null;
  avatar_url?: string | null;
  created_at?: string;
};

type WebviewMessage =
  | { type: "REQUEST_FULL_DOCUMENT" }
  | {
      type: "REQUEST_ANALYZE";
      payload?: {
        code?: string;
        filePath?: string;
        languageId?: string;
        model?: string;
      };
    }
  | { type: "GET_AUTH_STATE" }
  | { type: "OPEN_LOGIN" }
  | { type: "OPEN_TOKEN_PAGE" }
  | { type: "SET_TOKEN"; payload?: { token?: string } }
  | { type: "LOGOUT" }
  | { type: string; payload?: any };

// ⚙️ /v1/reviews/request 스펙에 맞춘 타입
type ReviewRequestPayload = {
  meta: {
    github_id: string | null;
    review_id: number | null;
    version: "v1";
    actor: string;
    language: string;
    trigger: "manual" | "auto";
    code_fingerprint: string | null;
    model: string | null;
    result: {
      result_ref: string | null;
      error_message: string | null;
    } | null;
    audit: string; // ISO 문자열
  };
  body: {
    snippet: {
      code: string;
    };
  };
};

export async function activate(context: vscode.ExtensionContext) {
  console.log("DKMV Analyzer (React Webview) activated");

  // 🔗 vscode://rockcha.dkmv/callback 으로 들어오는 URI 처리 (예전 플로우, 남겨둠)
  const uriHandler = vscode.window.registerUriHandler({
    async handleUri(uri: vscode.Uri) {
      await handleUriCallback(uri, context);
    },
  });
  context.subscriptions.push(uriHandler);

  // ✅ VS Code 내에 토큰 설정용 커맨드 등록
  const setTokenCmd = vscode.commands.registerCommand(
    "dkmv.setToken",
    async () => {
      const token = await vscode.window.showInputBox({
        prompt: "웹 대시보드에서 발급받은 DKMV 토큰을 붙여넣어 주세요.",
        ignoreFocusOut: true,
        password: true,
      });
      if (!token) return;
      await setAuthToken(token, context);
    }
  );
  context.subscriptions.push(setTokenCmd);

  // 🔁 코드 선택 분석 명령
  const disposable = vscode.commands.registerCommand(
    "dkmv.analyzeSelection",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage("열려 있는 파일이 없습니다.");
        return;
      }

      const selection = editor.selection;
      const hasSelection = !selection.isEmpty;

      const code = hasSelection
        ? editor.document.getText(selection)
        : editor.document.getText();

      if (!code.trim()) {
        vscode.window.showInformationMessage("분석할 코드가 비어 있습니다.");
        return;
      }

      const filePath = editor.document.uri.fsPath;
      const languageId = editor.document.languageId;

      ensureWebviewPanel(context);

      panel!.webview.postMessage({
        type: "NEW_CODE",
        payload: {
          code,
          fileName: editor.document.fileName,
          filePath,
          languageId,
          mode: hasSelection ? "selection" : "document",
        },
      });
    }
  );

  context.subscriptions.push(disposable);

  // 🔄 VS Code globalState 에 저장된 토큰 복원 시도
  const savedToken = context.globalState.get<string>("dkmv.authToken");
  if (savedToken) {
    await setAuthToken(savedToken, context, { silent: true });
  }
}

export function deactivate() {}

/**
 * (예전 OAuth 플로우용) vscode://rockcha.dkmv/callback?token=...
 */
async function handleUriCallback(
  uri: vscode.Uri,
  context: vscode.ExtensionContext
) {
  try {
    const query = new URLSearchParams(uri.query);
    const token = query.get("token");

    if (!token) {
      vscode.window.showErrorMessage("DKMV: 토큰 정보가 없습니다.");
      return;
    }

    await setAuthToken(token, context);
  } catch (e) {
    console.error("[DKMV] handleUri error", e);
    vscode.window.showErrorMessage("DKMV: 로그인 처리 중 오류가 발생했습니다.");
  }
}

/**
 * 🔐 토큰 설정 + /v1/users/me 검증 + webview에 AUTH_STATE 전파
 */
async function setAuthToken(
  token: string,
  context: vscode.ExtensionContext,
  options?: { silent?: boolean }
) {
  try {
    // ✅ 유저 검증은 AUTH_API_BASE (8000)로 전송
    const res = await fetch(`${AUTH_API_BASE}/v1/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`유효하지 않은 토큰입니다. (HTTP ${res.status})`);
    }

    const me = (await res.json()) as AuthUser;
    authToken = token;
    authUser = me;

    await context.globalState.update("dkmv.authToken", token);

    if (!options?.silent) {
      vscode.window.showInformationMessage(
        `DKMV: ${
          me.login || me.name || "사용자"
        }님, 토큰 인증이 완료되었습니다.`
      );
    }

    if (panel) {
      panel.webview.postMessage({
        type: "AUTH_STATE",
        payload: {
          isAuthenticated: true,
          user: authUser,
        },
      });
    }
  } catch (error) {
    const msg =
      error instanceof Error
        ? error.message
        : "토큰 설정 중 알 수 없는 오류가 발생했습니다.";

    if (!options?.silent) {
      vscode.window.showErrorMessage(`DKMV: ${msg}`);
    }

    authToken = null;
    authUser = null;
    await context.globalState.update("dkmv.authToken", undefined);

    if (panel) {
      panel.webview.postMessage({
        type: "AUTH_STATE",
        payload: {
          isAuthenticated: false,
          user: null,
        },
      });
      panel.webview.postMessage({
        type: "TOKEN_ERROR",
        payload: msg,
      });
    }
  }
}

function ensureWebviewPanel(context: vscode.ExtensionContext) {
  if (panel) {
    panel.reveal(vscode.ViewColumn.Beside);
    return;
  }

  panel = vscode.window.createWebviewPanel(
    "dkmvAnalyzer",
    "DKMV Analyzer",
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      // 🔒 웹뷰에서 접근할 수 있는 로컬 리소스 루트
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "media")],
    }
  );

  panel.webview.html = getWebviewHtml(panel.webview, context.extensionUri);

  panel.webview.onDidReceiveMessage(
    async (message: WebviewMessage) => {
      if (!message || typeof message !== "object") return;

      switch (message.type) {
        case "REQUEST_FULL_DOCUMENT":
          await handleRequestFullDocument();
          break;

        case "REQUEST_ANALYZE":
          await handleRequestAnalyze(message.payload ?? {});
          break;

        case "GET_AUTH_STATE":
          panel?.webview.postMessage({
            type: "AUTH_STATE",
            payload: {
              isAuthenticated: !!authToken && !!authUser,
              user: authUser,
            },
          });
          break;

        case "OPEN_LOGIN":
          vscode.env.openExternal(
            vscode.Uri.parse(`${FRONTEND_URL}/login?from=extension`)
          );
          break;

        case "OPEN_TOKEN_PAGE":
          vscode.env.openExternal(vscode.Uri.parse(`${FRONTEND_URL}`));
          break;

        case "SET_TOKEN": {
          const token = message.payload?.token as string | undefined;
          if (!token) {
            panel?.webview.postMessage({
              type: "TOKEN_ERROR",
              payload: "토큰이 비어 있습니다.",
            });
            return;
          }
          await setAuthToken(token, context);
          break;
        }

        case "LOGOUT": {
          authToken = null;
          authUser = null;
          await context.globalState.update("dkmv.authToken", undefined);
          panel?.webview.postMessage({
            type: "AUTH_STATE",
            payload: {
              isAuthenticated: false,
              user: null,
            },
          });
          break;
        }

        default:
          console.warn("[DKMV] Unknown message.type from webview:", message);
      }
    },
    undefined,
    context.subscriptions
  );

  panel.onDidDispose(
    () => {
      panel = undefined;
    },
    null,
    context.subscriptions
  );
}

async function handleRequestFullDocument() {
  const active = vscode.window.activeTextEditor;
  if (!active) {
    panel?.webview.postMessage({
      type: "ANALYZE_ERROR",
      payload: "열려 있는 파일이 없습니다.",
    });
    return;
  }

  const fullCode = active.document.getText();
  if (!fullCode.trim()) {
    panel?.webview.postMessage({
      type: "ANALYZE_ERROR",
      payload: "현재 파일이 비어 있습니다.",
    });
    return;
  }

  const fullFilePath = active.document.uri.fsPath;
  const fullLanguageId = active.document.languageId;

  panel?.webview.postMessage({
    type: "NEW_CODE",
    payload: {
      code: fullCode,
      fileName: active.document.fileName,
      filePath: fullFilePath,
      languageId: fullLanguageId,
      mode: "document",
    },
  });
}

/**
 * 코드 분석 요청:
 *  1) POST /v1/reviews/request   → 리뷰 생성 + review_id 받기
 *  2) GET  /v1/reviews/{id}      → 실제 리뷰 결과 조회
 */
async function handleRequestAnalyze(payload: {
  code?: string;
  filePath?: string;
  languageId?: string;
  model?: string;
}) {
  // 🔐 로그인 강제: 토큰 없으면 거절
  if (!authToken || !authUser) {
    panel?.webview.postMessage({
      type: "ANALYZE_ERROR",
      payload: "분석을 사용하려면 VS Code 토큰을 먼저 설정해야 합니다.",
    });
    return;
  }

  const editor = vscode.window.activeTextEditor;
  const fallbackFilePath = editor?.document.uri.fsPath ?? "";
  const fallbackLanguageId = editor?.document.languageId ?? "";

  const codeSnippet = payload.code ?? "";
  if (!codeSnippet.trim()) {
    panel?.webview.postMessage({
      type: "ANALYZE_ERROR",
      payload: "분석할 코드가 비어 있습니다.",
    });
    return;
  }

  const filePathForReq = payload.filePath ?? fallbackFilePath;
  const languageForReq = payload.languageId ?? (fallbackLanguageId || "python");
  const modelForReq = payload.model ?? "openai/gpt-5.1";

  try {
    // 1) LLM 요청 준비
    panel?.webview.postMessage({
      type: "ANALYZE_PROGRESS",
      payload: "1/3 • 리뷰 생성 요청을 준비 중입니다...",
    });

    const nowIso = new Date().toISOString();

    const body: ReviewRequestPayload = {
      meta: {
        github_id: authUser?.github_id ?? null,
        review_id: null,
        version: "v1",
        actor: "vscode-extension",
        language: languageForReq,
        trigger: "manual",
        code_fingerprint: null,
        model: modelForReq,
        result: null,
        audit: nowIso,
      },
      body: {
        snippet: {
          code: codeSnippet,
        },
      },
    };

    // 2) POST /v1/reviews/request
    panel?.webview.postMessage({
      type: "ANALYZE_PROGRESS",
      payload: "2/3 • LLM 서버로 리뷰 생성 요청을 전송 중입니다...",
    });

    const postResp = await fetch(REVIEW_REQUEST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });

    const postText = await postResp.text();
    if (!postResp.ok) {
      throw new Error(`리뷰 생성 실패 (HTTP ${postResp.status}): ${postText}`);
    }

    let reviewId: number | null = null;
    let postJson: any = null;

    try {
      postJson = JSON.parse(postText);
      reviewId = postJson?.body?.review_id ?? postJson?.review_id ?? null;
    } catch {
      // JSON 파싱 실패 시 아래에서 에러 처리
    }

    if (reviewId == null) {
      throw new Error("리뷰 생성 응답에서 review_id를 찾을 수 없습니다.");
    }

    panel!.webview.postMessage({
      type: "ANALYZE_PROGRESS",
      payload: `2/3 • 리뷰 생성 완료 (review_id: ${reviewId}). 결과를 조회합니다...`,
    });

    // 3) GET /v1/reviews/{review_id}
    const getUrl = `${REVIEW_GET_URL}/${reviewId}`;
    const getResp = await fetch(getUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${authToken}`,
      },
    });

    const getText = await getResp.text();
    if (!getResp.ok) {
      throw new Error(`리뷰 조회 실패 (HTTP ${getResp.status}): ${getText}`);
    }

    let getJson: any = null;
    try {
      getJson = JSON.parse(getText);
    } catch {
      getJson = getText;
    }

    const analyzerResult = extractAnalyzerResultFromResponse(getJson);

    panel!.webview.postMessage({
      type: "ANALYZE_PROGRESS",
      payload: "3/3 • 리뷰 결과 수신 완료! 분석 내용을 표시합니다.",
    });

    panel!.webview.postMessage({
      type: "ANALYZE_RESULT",
      payload: {
        phase: "success",
        review_id: reviewId,
        request_payload: body,
        raw_review_response: getJson,
        analyzer_result: analyzerResult,
      },
    });
  } catch (error) {
    const messageText =
      error instanceof Error
        ? error.message
        : "서버 요청 중 알 수 없는 오류가 발생했습니다.";

    panel?.webview.postMessage({
      type: "ANALYZE_PROGRESS",
      payload: "⚠️ 리뷰 처리 중 오류가 발생했습니다.",
    });

    panel?.webview.postMessage({
      type: "ANALYZE_ERROR",
      payload: messageText,
    });
  }
}

// 응답 안에서 AnalyzerResult 후보를 찾는 헬퍼
function extractAnalyzerResultFromResponse(resp: any): any {
  if (!resp || typeof resp !== "object") return resp;

  const candidates = [
    resp?.analyzer_result,
    resp?.body?.review,
    resp?.body?.result,
    resp?.body,
    resp?.review,
    resp,
  ];

  for (const c of candidates) {
    if (!c || typeof c !== "object") continue;
    if (
      "quality_score" in c ||
      "qualityScore" in c ||
      "global_score" in c ||
      "review_summary" in c ||
      "scores_by_category" in c ||
      "review_details" in c ||
      "issues" in c
    ) {
      return c;
    }
  }
  return resp;
}

function getWebviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri
): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "webview.js")
  );
  const logoUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "logo.png")
  );

  // ✅ ResultPanel에서 사용하는 이미지들
  const notFoundUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "not_found.png")
  );

  const badgeExcellentUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "Excellent.png")
  );
  const badgeGoodUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "Good.png")
  );
  const badgeFairUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "Fair.png")
  );
  const badgeNeedsWorkUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "NeedsWork.png")
  );
  const badgePoorUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "Poor.png")
  );

  const nonce = getNonce();

  return /* html */ `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy"
      content="default-src 'none'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}'; style-src 'unsafe-inline' https:; font-src https:;" />
    
    <!-- 🔤 Gowun Dodum 폰트 로딩 -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap"
      rel="stylesheet"
    />

    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DKMV Analyzer</title>
  </head>
  <body>
    <div id="root"></div>

    <script nonce="${nonce}">
      (function () {
        if (typeof window.process === "undefined") {
          // @ts-ignore
          window.process = { env: { NODE_ENV: "production" } };
        }
        window.__DKMV_LOGO__ = "${logoUri}";
        window.__DKMV_NOT_FOUND__ = "${notFoundUri}";
        window.__DKMV_BADGES__ = {
          excellent: "${badgeExcellentUri}",
          good: "${badgeGoodUri}",
          fair: "${badgeFairUri}",
          needsWork: "${badgeNeedsWorkUri}",
          poor: "${badgePoorUri}"
        };
      })();
    </script>

    <script nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>`;
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
