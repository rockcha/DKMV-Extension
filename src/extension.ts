import * as vscode from "vscode";

let panel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log("DKMV Analyzer (React Webview) activated");

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

      // 웹뷰 패널 생성 (이미 있으면 재사용)
      if (!panel) {
        panel = vscode.window.createWebviewPanel(
          "dkmvAnalyzer",
          "DKMV Analyzer",
          vscode.ViewColumn.Beside,
          {
            enableScripts: true,
          }
        );

        panel.webview.html = getWebviewHtml(
          panel.webview,
          context.extensionUri
        );

        panel.onDidDispose(
          () => {
            panel = undefined;
          },
          null,
          context.subscriptions
        );
      } else {
        panel.reveal(vscode.ViewColumn.Beside);
      }

      // 웹뷰(React)로 코드 전달
      panel.webview.postMessage({
        type: "NEW_CODE",
        payload: {
          code,
          fileName: editor.document.fileName,
          mode: hasSelection ? "selection" : "document",
        },
      });
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}

function getWebviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri
): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "webview.js")
  );

  const nonce = getNonce();

  return /* html */ `
    <!DOCTYPE html>
    <html lang="ko">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-Security-Policy"
          content="default-src 'none'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>DKMV Analyzer</title>
      </head>
      <body>
        <div id="root"></div>

        <script nonce="${nonce}">
          // VS Code Webview에는 process가 없어서 React 번들이 터지므로 셰임 추가
          (function () {
            if (typeof window.process === "undefined") {
              window.process = { env: { NODE_ENV: "production" } };
            }
          })();
        </script>

        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
    </html>
  `;
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
