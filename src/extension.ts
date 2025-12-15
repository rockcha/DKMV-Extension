// src/extension.ts
import * as vscode from "vscode";

const API_BASE = "http://18.205.229.159:8000";
const AUTH_API_BASE = API_BASE;
const REVIEW_API_BASE = API_BASE;

const REVIEW_REQUEST_URL = `${REVIEW_API_BASE}/v1/reviews/request`;
const REVIEW_GET_URL = `${REVIEW_API_BASE}/v1/reviews`;
const FIX_URL = `${API_BASE}/v1/fix`;

const FRONTEND_URL = "https://web-dkmv.vercel.app";

type AuthUser = {
  id: number;
  github_id?: string;
  login: string;
  name?: string | null;
  avatar_url?: string | null;
  created_at?: string;
};

type EmptyPayload = Record<string, never>;

type WebviewMessage =
  | { type: "REQUEST_FULL_DOCUMENT" }
  | { type: "REQUEST_PICK_FILE"; payload?: EmptyPayload }
  | { type: "REQUEST_PICK_SELECTION"; payload?: EmptyPayload }
  | {
      type: "REQUEST_ANALYZE";
      payload?: {
        code?: string;
        filePath?: string;
        languageId?: string;
        model?: string;
      };
    }
  | {
      type: "REQUEST_IMPROVED_CODE";
      payload?: { code?: string; reviewId?: number | null };
    }
  | {
      type: "REQUEST_APPLY_IMPROVED_TO_SELECTION";
      payload?: { improvedCode?: string };
    }
  | {
      type: "REQUEST_APPLY_IMPROVED_TO_FILE";
      payload?: { improvedCode?: string };
    }
  | { type: "GET_AUTH_STATE" }
  | { type: "OPEN_LOGIN" }
  | { type: "OPEN_TOKEN_PAGE" }
  | { type: "SET_TOKEN"; payload?: { token?: string } }
  | { type: "LOGOUT" }
  | { type: string; payload?: unknown };

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
    result: { result_ref: string | null; error_message: string | null } | null;
    audit: string;
  };
  body: { snippet: { code: string } };
};

type SelectionSnapshot = {
  filePath: string;
  fileName: string;
  languageId: string;
  selection: vscode.Selection;
  selectedText: string;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(v: unknown): v is UnknownRecord {
  return typeof v === "object" && v !== null;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

let authToken: string | null = null;
let authUser: AuthUser | null = null;

let panel: vscode.WebviewPanel | undefined;

let lastReviewId: number | null = null;
let lastCodeSnippet: string | null = null;

// ✅ 마지막 선택 스냅샷(중요: webview 클릭으로 activeTextEditor가 없어져도 적용 가능)
let lastSelectionSnapshot: SelectionSnapshot | null = null;

export async function activate(context: vscode.ExtensionContext) {
  console.log("DKMV Analyzer (React Webview) activated");

  const uriHandler = vscode.window.registerUriHandler({
    async handleUri(uri: vscode.Uri) {
      await handleUriCallback(uri, context);
    },
  });
  context.subscriptions.push(uriHandler);

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

      lastCodeSnippet = code;

      panel!.webview.postMessage({
        type: "NEW_CODE",
        payload: {
          code,
          fileName: editor.document.fileName,
          filePath,
          languageId,
          mode: hasSelection ? "selection" : "document",
          selectionInfo: hasSelection
            ? {
                hasSelection: true,
                startLine: selection.start.line,
                startChar: selection.start.character,
                endLine: selection.end.line,
                endChar: selection.end.character,
              }
            : null,
        },
      });
    }
  );
  context.subscriptions.push(disposable);

  // ✅ 에디터 선택 변화 -> 스냅샷 저장 (적용 fallback 목적)
  const selSub = vscode.window.onDidChangeTextEditorSelection((e) => {
    if (!panel) return;

    const editor = e.textEditor;
    const sel = editor.selection;

    const filePath = editor.document.uri.fsPath;
    const fileName = editor.document.fileName;
    const languageId = editor.document.languageId;
    const selectedText = sel.isEmpty ? "" : editor.document.getText(sel);

    lastSelectionSnapshot = {
      filePath,
      fileName,
      languageId,
      selection: sel,
      selectedText,
    };

    panel.webview.postMessage({
      type: "SELECTION_CHANGED",
      payload: {
        hasSelection: !sel.isEmpty,
        startLine: sel.start.line,
        startChar: sel.start.character,
        endLine: sel.end.line,
        endChar: sel.end.character,
        filePath,
        languageId,
      },
    });
  });
  context.subscriptions.push(selSub);

  const savedToken = context.globalState.get<string>("dkmv.authToken");
  if (savedToken) {
    await setAuthToken(savedToken, context, { silent: true });
  }
}

export function deactivate() {}

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

async function setAuthToken(
  token: string,
  context: vscode.ExtensionContext,
  options?: { silent?: boolean }
) {
  try {
    const res = await fetch(`${AUTH_API_BASE}/v1/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok)
      throw new Error(`유효하지 않은 토큰입니다. (HTTP ${res.status})`);

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
        payload: { isAuthenticated: true, user: authUser },
      });
    }
  } catch (error) {
    const msg =
      error instanceof Error
        ? error.message
        : "토큰 설정 중 알 수 없는 오류가 발생했습니다.";

    if (!options?.silent) vscode.window.showErrorMessage(`DKMV: ${msg}`);

    authToken = null;
    authUser = null;
    await context.globalState.update("dkmv.authToken", undefined);

    if (panel) {
      panel.webview.postMessage({
        type: "AUTH_STATE",
        payload: { isAuthenticated: false, user: null },
      });
      panel.webview.postMessage({ type: "TOKEN_ERROR", payload: msg });
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
        case "REQUEST_PICK_FILE":
          await handleRequestPickFile();
          break;
        case "REQUEST_PICK_SELECTION":
          await handleRequestPickSelection();
          break;
        case "REQUEST_ANALYZE":
          await handleRequestAnalyze(message.payload ?? {});
          break;
        case "REQUEST_IMPROVED_CODE":
          await handleRequestImprovedCode(message.payload ?? {});
          break;
        case "REQUEST_APPLY_IMPROVED_TO_SELECTION":
          await handleApplyImprovedToSelection(message.payload ?? {});
          break;
        case "REQUEST_APPLY_IMPROVED_TO_FILE":
          await handleApplyImprovedToFile(message.payload ?? {});
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
          const token =
            message.payload && isRecord(message.payload)
              ? (message.payload.token as string | undefined)
              : undefined;
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

        case "LOGOUT":
          authToken = null;
          authUser = null;
          await context.globalState.update("dkmv.authToken", undefined);

          lastReviewId = null;
          lastCodeSnippet = null;
          lastSelectionSnapshot = null;

          panel?.webview.postMessage({
            type: "AUTH_STATE",
            payload: { isAuthenticated: false, user: null },
          });
          break;

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

/**
 * ✅ 드래그 선택 버튼(“코드 로드”용)
 */
async function handleRequestPickSelection() {
  if (!panel) return;

  panel.webview.postMessage({
    type: "PICK_SELECTION_PROGRESS",
    payload: "선택 영역을 가져오는 중입니다...",
  });

  const editor = vscode.window.activeTextEditor;

  // 1) active editor 우선
  if (editor) {
    const selection = editor.selection;
    if (selection.isEmpty) {
      panel.webview.postMessage({
        type: "PICK_SELECTION_ERROR",
        payload: "코드를 드래그 하세요",
      });
      return;
    }

    const code = editor.document.getText(selection);
    if (!code.trim()) {
      panel.webview.postMessage({
        type: "PICK_SELECTION_ERROR",
        payload: "코드를 드래그 하세요",
      });
      return;
    }

    lastSelectionSnapshot = {
      filePath: editor.document.uri.fsPath,
      fileName: editor.document.fileName,
      languageId: editor.document.languageId,
      selection,
      selectedText: code,
    };

    lastCodeSnippet = code;

    panel.webview.postMessage({
      type: "NEW_CODE",
      payload: {
        code,
        fileName: editor.document.fileName,
        filePath: editor.document.uri.fsPath,
        languageId: editor.document.languageId,
        mode: "selection",
        selectionInfo: {
          hasSelection: true,
          startLine: selection.start.line,
          startChar: selection.start.character,
          endLine: selection.end.line,
          endChar: selection.end.character,
        },
      },
    });
    return;
  }

  // 2) active editor 없으면 스냅샷 fallback
  if (!lastSelectionSnapshot) {
    panel.webview.postMessage({
      type: "PICK_SELECTION_ERROR",
      payload: "열려 있는 에디터가 없습니다.",
    });
    return;
  }

  const snap = lastSelectionSnapshot;

  if (!snap.selectedText.trim() || snap.selection.isEmpty) {
    panel.webview.postMessage({
      type: "PICK_SELECTION_ERROR",
      payload: "코드를 드래그 하세요",
    });
    return;
  }

  lastCodeSnippet = snap.selectedText;

  panel.webview.postMessage({
    type: "NEW_CODE",
    payload: {
      code: snap.selectedText,
      fileName: snap.fileName,
      filePath: snap.filePath,
      languageId: snap.languageId,
      mode: "selection",
      selectionInfo: {
        hasSelection: true,
        startLine: snap.selection.start.line,
        startChar: snap.selection.start.character,
        endLine: snap.selection.end.line,
        endChar: snap.selection.end.character,
      },
    },
  });
}

/**
 * ✅ QuickPick: 파일 전체 로드(“코드 로드”용)
 */
async function handleRequestPickFile() {
  if (!panel) return;

  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    panel.webview.postMessage({
      type: "PICK_FILE_ERROR",
      payload:
        "워크스페이스가 열려있지 않습니다. 폴더를 연 뒤 다시 시도하세요.",
    });
    return;
  }

  panel.webview.postMessage({
    type: "PICK_FILE_PROGRESS",
    payload: "파일 목록을 불러오는 중입니다...",
  });

  try {
    const include = "**/*.{ts,tsx,js,jsx,py,go,java,kt,rs,cpp,c,h,cs,json,md}";
    const exclude =
      "**/{node_modules,.git,dist,build,out,coverage,.next,.turbo,.vercel}/**";

    const uris = await vscode.workspace.findFiles(include, exclude, 5000);
    if (!uris.length) {
      panel.webview.postMessage({
        type: "PICK_FILE_ERROR",
        payload: "선택할 파일을 찾지 못했습니다.",
      });
      return;
    }

    const items = uris.map((u) => {
      const wsFolder = vscode.workspace.getWorkspaceFolder(u);
      const rel = wsFolder ? vscode.workspace.asRelativePath(u) : u.fsPath;
      return {
        label: rel.split(/[\\/]/).slice(-1)[0],
        description: rel,
        uri: u,
      };
    });

    const picked = await vscode.window.showQuickPick(items, {
      title: "DKMV • 파일 선택",
      placeHolder:
        "불러올 파일을 선택하세요 (전체 코드가 Webview로 들어옵니다)",
      matchOnDescription: true,
      canPickMany: false,
    });

    if (!picked) {
      panel.webview.postMessage({
        type: "PICK_FILE_ERROR",
        payload: "파일 선택이 취소되었습니다.",
      });
      return;
    }

    panel.webview.postMessage({
      type: "PICK_FILE_PROGRESS",
      payload: "파일을 여는 중입니다...",
    });

    const doc = await vscode.workspace.openTextDocument(picked.uri);
    const fullCode = doc.getText();

    if (!fullCode.trim()) {
      panel.webview.postMessage({
        type: "PICK_FILE_ERROR",
        payload: "선택한 파일이 비어 있습니다.",
      });
      return;
    }

    lastCodeSnippet = fullCode;

    panel.webview.postMessage({
      type: "NEW_CODE",
      payload: {
        code: fullCode,
        fileName: doc.fileName,
        filePath: doc.uri.fsPath,
        languageId: doc.languageId,
        mode: "document",
        selectionInfo: null,
      },
    });
  } catch (e) {
    panel.webview.postMessage({
      type: "PICK_FILE_ERROR",
      payload:
        e instanceof Error ? e.message : "파일 선택 중 오류가 발생했습니다.",
    });
  }
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

  lastCodeSnippet = fullCode;

  panel?.webview.postMessage({
    type: "NEW_CODE",
    payload: {
      code: fullCode,
      fileName: active.document.fileName,
      filePath: active.document.uri.fsPath,
      languageId: active.document.languageId,
      mode: "document",
      selectionInfo: null,
    },
  });
}

async function handleRequestAnalyze(payload: {
  code?: string;
  filePath?: string;
  languageId?: string;
  model?: string;
}) {
  if (!authToken || !authUser) {
    panel?.webview.postMessage({
      type: "ANALYZE_ERROR",
      payload: "분석을 사용하려면 VS Code 토큰을 먼저 설정해야 합니다.",
    });
    return;
  }

  const editor = vscode.window.activeTextEditor;
  const fallbackLanguageId = editor?.document.languageId ?? "";

  const codeSnippet = payload.code ?? "";
  if (!codeSnippet.trim()) {
    panel?.webview.postMessage({
      type: "ANALYZE_ERROR",
      payload: "분석할 코드가 비어 있습니다.",
    });
    return;
  }

  const languageForReq = payload.languageId ?? (fallbackLanguageId || "python");
  const modelForReq = payload.model ?? "openai/gpt-5.1";

  try {
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
      body: { snippet: { code: codeSnippet } },
    };

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
    if (!postResp.ok)
      throw new Error(`리뷰 생성 실패 (HTTP ${postResp.status}): ${postText}`);

    const postJson = safeJsonParse(postText);
    const reviewId = extractReviewId(postJson);
    if (reviewId == null)
      throw new Error("리뷰 생성 응답에서 review_id를 찾을 수 없습니다.");

    panel!.webview.postMessage({
      type: "ANALYZE_PROGRESS",
      payload: `2/3 • 리뷰 생성 완료 (review_id: ${reviewId}). 결과를 조회합니다...`,
    });

    const getResp = await fetch(`${REVIEW_GET_URL}/${reviewId}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${authToken}`,
      },
    });

    const getText = await getResp.text();
    if (!getResp.ok)
      throw new Error(`리뷰 조회 실패 (HTTP ${getResp.status}): ${getText}`);

    const getJson = safeJsonParse(getText) ?? getText;
    const analyzerResult = extractAnalyzerResultFromResponse(getJson);

    lastReviewId = reviewId;
    lastCodeSnippet = codeSnippet;

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
    panel?.webview.postMessage({ type: "ANALYZE_ERROR", payload: messageText });
  }
}

async function handleRequestImprovedCode(payload: {
  code?: string;
  reviewId?: number | null;
}) {
  if (!authToken || !authUser) {
    panel?.webview.postMessage({
      type: "IMPROVED_ERROR",
      payload: "개선코드를 사용하려면 VS Code 토큰을 먼저 설정해야 합니다.",
    });
    return;
  }

  const code = payload.code ?? lastCodeSnippet ?? "";
  const reviewId = payload.reviewId ?? lastReviewId ?? null;

  if (!code.trim()) {
    panel?.webview.postMessage({
      type: "IMPROVED_ERROR",
      payload: "개선할 코드가 비어 있습니다.",
    });
    return;
  }
  if (reviewId == null) {
    panel?.webview.postMessage({
      type: "IMPROVED_ERROR",
      payload: "review_id가 없습니다. 먼저 리뷰를 생성하세요.",
    });
    return;
  }

  panel?.webview.postMessage({
    type: "IMPROVED_PROGRESS",
    payload: "개선코드 생성 요청 중입니다...",
  });

  try {
    const resp = await fetch(FIX_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ review_id: reviewId, code }),
    });

    const text = await resp.text();
    if (!resp.ok)
      throw new Error(`개선코드 생성 실패 (HTTP ${resp.status})\n${text}`);

    const parsed = safeJsonParse(text);
    let improvedCode = text;

    if (isRecord(parsed)) {
      const v =
        (parsed.improved_code as string | undefined) ??
        (parsed.code as string | undefined) ??
        (parsed.result as string | undefined);
      if (typeof v === "string") improvedCode = v;
    }

    panel?.webview.postMessage({
      type: "IMPROVED_RESULT",
      payload: { improvedCode },
    });
  } catch (e) {
    panel?.webview.postMessage({
      type: "IMPROVED_ERROR",
      payload:
        e instanceof Error
          ? e.message
          : "개선코드 생성 중 오류가 발생했습니다.",
    });
  }
}

/**
 * ✅ 개선 적용(선택영역): “지금 active editor selection” 우선, 없으면 lastSelectionSnapshot 적용
 */
async function handleApplyImprovedToSelection(payload: {
  improvedCode?: string;
}) {
  if (!panel) return;

  const improved = payload.improvedCode ?? "";
  if (!improved.trim()) {
    panel.webview.postMessage({
      type: "APPLY_ERROR",
      payload: "적용할 개선코드가 비어 있습니다.",
    });
    return;
  }

  const editor = vscode.window.activeTextEditor;

  // 1) active selection 우선
  if (editor && !editor.selection.isEmpty) {
    const uri = editor.document.uri;
    const range = editor.selection;

    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, range, improved);

    const ok = await vscode.workspace.applyEdit(edit);
    if (!ok) {
      panel.webview.postMessage({
        type: "APPLY_ERROR",
        payload: "워크스페이스 편집 적용에 실패했습니다.",
      });
      return;
    }

    await revealAppliedFile(uri);
    panel.webview.postMessage({
      type: "APPLY_SUCCESS",
      payload: "선택 영역에 개선코드를 적용했습니다.",
    });
    return;
  }

  // 2) fallback snapshot
  if (!lastSelectionSnapshot || lastSelectionSnapshot.selection.isEmpty) {
    panel.webview.postMessage({
      type: "APPLY_ERROR",
      payload:
        "선택 영역이 없습니다. 에디터에서 코드를 드래그한 뒤 다시 적용하세요.",
    });
    return;
  }

  try {
    const uri = vscode.Uri.file(lastSelectionSnapshot.filePath);
    const range = new vscode.Range(
      lastSelectionSnapshot.selection.start,
      lastSelectionSnapshot.selection.end
    );

    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, range, improved);

    const ok = await vscode.workspace.applyEdit(edit);
    if (!ok) throw new Error("워크스페이스 편집 적용에 실패했습니다.");

    await revealAppliedFile(uri);
    panel.webview.postMessage({
      type: "APPLY_SUCCESS",
      payload: "저장된 선택 영역에 개선코드를 적용했습니다.",
    });
  } catch (e) {
    panel.webview.postMessage({
      type: "APPLY_ERROR",
      payload:
        e instanceof Error
          ? e.message
          : "선택영역 적용 중 오류가 발생했습니다.",
    });
  }
}

/**
 * ✅ 개선 적용(파일 전체): QuickPick으로 파일 고르게 한 뒤 전체 교체
 */
async function handleApplyImprovedToFile(payload: { improvedCode?: string }) {
  if (!panel) return;

  const improved = payload.improvedCode ?? "";
  if (!improved.trim()) {
    panel.webview.postMessage({
      type: "APPLY_ERROR",
      payload: "적용할 개선코드가 비어 있습니다.",
    });
    return;
  }

  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    panel.webview.postMessage({
      type: "APPLY_ERROR",
      payload:
        "워크스페이스가 열려있지 않습니다. 폴더를 연 뒤 다시 시도하세요.",
    });
    return;
  }

  try {
    const include = "**/*.{ts,tsx,js,jsx,py,go,java,kt,rs,cpp,c,h,cs,json,md}";
    const exclude =
      "**/{node_modules,.git,dist,build,out,coverage,.next,.turbo,.vercel}/**";

    const uris = await vscode.workspace.findFiles(include, exclude, 5000);
    if (!uris.length) {
      panel.webview.postMessage({
        type: "APPLY_ERROR",
        payload: "선택할 파일을 찾지 못했습니다.",
      });
      return;
    }

    const items = uris.map((u) => {
      const wsFolder = vscode.workspace.getWorkspaceFolder(u);
      const rel = wsFolder ? vscode.workspace.asRelativePath(u) : u.fsPath;
      return {
        label: rel.split(/[\\/]/).slice(-1)[0],
        description: rel,
        uri: u,
      };
    });

    const picked = await vscode.window.showQuickPick(items, {
      title: "DKMV • 적용할 파일 선택",
      placeHolder: "개선코드를 적용할 파일을 선택하세요 (파일 전체 교체)",
      matchOnDescription: true,
      canPickMany: false,
    });

    if (!picked) {
      panel.webview.postMessage({
        type: "APPLY_ERROR",
        payload: "파일 선택이 취소되었습니다.",
      });
      return;
    }

    const uri = picked.uri;
    const doc = await vscode.workspace.openTextDocument(uri);

    const fullRange = new vscode.Range(
      doc.positionAt(0),
      doc.positionAt(doc.getText().length)
    );

    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, fullRange, improved);

    const ok = await vscode.workspace.applyEdit(edit);
    if (!ok) throw new Error("워크스페이스 편집 적용에 실패했습니다.");

    await revealAppliedFile(uri);
    panel.webview.postMessage({
      type: "APPLY_SUCCESS",
      payload: "파일 전체에 개선코드를 적용했습니다.",
    });
  } catch (e) {
    panel.webview.postMessage({
      type: "APPLY_ERROR",
      payload:
        e instanceof Error ? e.message : "파일 적용 중 오류가 발생했습니다.",
    });
  }
}

async function revealAppliedFile(uri: vscode.Uri) {
  try {
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, {
      viewColumn: vscode.ViewColumn.One,
      preview: false,
      preserveFocus: false,
    });
    if (panel) panel.reveal(vscode.ViewColumn.Beside, true);
  } catch {
    // 파일 다시 열기 실패는 무시 (적용 자체는 성공했을 수 있음)
  }
}

function extractReviewId(resp: unknown): number | null {
  if (!isRecord(resp)) return null;

  // resp.body.review_id / resp.review_id 둘 다 대응
  const body = resp.body;
  if (isRecord(body) && typeof body.review_id === "number")
    return body.review_id;

  if (typeof resp.review_id === "number") return resp.review_id;

  return null;
}

function extractAnalyzerResultFromResponse(resp: unknown): unknown {
  if (!isRecord(resp)) return resp;

  const candidates: unknown[] = [
    (resp as UnknownRecord).analyzer_result,
    isRecord(resp.body) ? (resp.body as UnknownRecord).review : undefined,
    isRecord(resp.body) ? (resp.body as UnknownRecord).result : undefined,
    resp.body,
    (resp as UnknownRecord).review,
    resp,
  ];

  for (const c of candidates) {
    if (!isRecord(c)) continue;

    const keys = [
      "quality_score",
      "qualityScore",
      "global_score",
      "review_summary",
      "scores_by_category",
      "review_details",
      "issues",
    ];

    if (keys.some((k) => k in c)) return c;
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
