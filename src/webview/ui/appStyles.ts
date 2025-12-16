// src/webview/ui/appStyles.ts
export const appStyleText = `
  /* ---------------------------
    Design tokens
  --------------------------- */
  :root {
    --font-kr: "Gowun Dodum", "Noto Sans KR", "Apple SD Gothic Neo", "Segoe UI", Arial, sans-serif;

    --bg: #020617;
    --bg2: #030712;

    --text: rgba(255,255,255,0.92);
    --muted: rgba(255,255,255,0.62);
    --muted2: rgba(255,255,255,0.48);

    --border: rgba(148,163,184,0.14);
    --border-strong: rgba(148,163,184,0.22);

    --panel: rgba(2,6,23,0.72);
    --panel2: rgba(2,6,23,0.86);

    --accent: rgba(168,85,247,1);
    --accent2: rgba(129,140,248,1);

    --radius-lg: 14px;
    --radius-md: 12px;
    --radius-sm: 10px;

    --space-1: 6px;
    --space-2: 10px;
    --space-3: 14px;
    --space-4: 18px;

    --shadow: 0 16px 40px rgba(0,0,0,0.35);

    --focus-ring: 0 0 0 2px rgba(168,85,247,0.45), 0 0 0 4px rgba(56,189,248,0.18);
  }

  * { box-sizing: border-box; font-family: var(--font-kr); }
  html, body { margin: 0; padding: 0; }
  button, input, textarea { font-family: var(--font-kr); }

  /* ---------------------------
    Logo pulse
  --------------------------- */
  @keyframes dkmv-logo-pulse {
    0% { filter: hue-rotate(0deg) brightness(1); transform: scale(1); }
    50% { filter: hue-rotate(12deg) brightness(1.12); transform: scale(1.03); }
    100% { filter: hue-rotate(-8deg) brightness(0.98); transform: scale(1); }
  }

  /* ---------------------------
    Shell layout
  --------------------------- */
  .dkmv-shell {
    min-height: 100vh;
    width: 100%;
    background: linear-gradient(135deg, var(--bg) 0%, var(--bg2) 40%, var(--bg) 100%);
    color: var(--text);
  }

  .dkmv-container {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    gap: var(--space-3);
  }

  /* ---------------------------
    Top app bar
  --------------------------- */
  .dkmv-topbar {
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;

    padding: 12px 14px;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border);
    background: linear-gradient(180deg, rgba(2,6,23,0.68), rgba(2,6,23,0.52));
    box-shadow: 0 10px 26px rgba(0,0,0,0.28);
  }

  .dkmv-brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .dkmv-brand-title {
    font-weight: 900;
    font-size: 13px;
    letter-spacing: 0.2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dkmv-top-actions {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  /* ---------------------------
    User badge
  --------------------------- */
  .dkmv-user-badge {
    display: inline-flex;
    align-items: center;
    gap: 10px;

    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: rgba(2,6,23,0.35);
    color: var(--text);
    cursor: default;
  }

  .dkmv-user-badge[disabled] {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .dkmv-user-name {
    font-size: 12px;
    font-weight: 900;
    color: rgba(255,255,255,0.9);
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 620px) {
    .dkmv-user-name { display: none; }
  }

  /* ---------------------------
    Status bar
  --------------------------- */
  .dkmv-statusbar-like {
    display: flex;
    align-items: center;
    gap: var(--space-2);

    padding: 10px 12px;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border);
    background: linear-gradient(180deg, rgba(2,6,23,0.68), rgba(2,6,23,0.52));
    box-shadow: 0 10px 26px rgba(0,0,0,0.28);

    min-width: 0;
    flex-wrap: nowrap;
  }

  .dkmv-status-left {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--muted);
    flex: 0 0 auto;
    min-width: 0;
  }

  .dkmv-dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    box-shadow: 0 0 0 2px rgba(2,6,23,0.6);
    flex-shrink: 0;
  }

  .dkmv-status-msg {
    font-size: 12px;
    color: var(--text);
    opacity: 0.92;
  }

  .dkmv-ellipsis {
    min-width: 0;
    flex: 1 1 auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dkmv-status-actions {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex: 0 0 auto;
    flex-shrink: 0;
  }

  .dkmv-primary {
    border-radius: 999px;
    border: 1px solid rgba(192,132,252,0.55);
    background: linear-gradient(135deg, rgba(126,34,206,0.95), rgba(192,132,252,0.75));
    color: #fff;
    font-weight: 900;
    font-size: 12px;
    padding: 9px 12px;
    cursor: pointer;
    transition: transform 140ms ease, box-shadow 140ms ease, filter 140ms ease, opacity 140ms ease;
    box-shadow: 0 12px 26px rgba(0,0,0,0.28);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .dkmv-primary:hover { transform: translateY(-1px); filter: brightness(1.05); }
  .dkmv-primary:active { transform: translateY(0px); }
  .dkmv-primary:focus-visible { outline: none; box-shadow: var(--focus-ring), 0 12px 26px rgba(0,0,0,0.28); }
  .dkmv-primary[disabled] { opacity: 0.55; cursor: not-allowed; box-shadow: none; transform: none; animation: none; }

  .dkmv-cta-ready {
    position: relative;
    box-shadow:
      0 0 0 1px rgba(168, 85, 247, 0.35),
      0 0 18px rgba(168, 85, 247, 0.35),
      0 12px 26px rgba(0,0,0,0.28);
    animation: dkmv-cta-pulse 1.6s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) { .dkmv-cta-ready { animation: none; } }

  @keyframes dkmv-cta-pulse {
    0% {
      box-shadow:
        0 0 0 1px rgba(168, 85, 247, 0.25),
        0 0 14px rgba(168, 85, 247, 0.25),
        0 12px 26px rgba(0,0,0,0.28);
    }
    50% {
      box-shadow:
        0 0 0 1px rgba(196, 181, 253, 0.55),
        0 0 26px rgba(168, 85, 247, 0.55),
        0 12px 26px rgba(0,0,0,0.28);
    }
    100% {
      box-shadow:
        0 0 0 1px rgba(168, 85, 247, 0.25),
        0 0 14px rgba(168, 85, 247, 0.25),
        0 12px 26px rgba(0,0,0,0.28);
    }
  }

  /* ---------------------------
    TopTabs: 4-split full width buttons
  --------------------------- */
  .dkmv-tabs-grid {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid var(--border-strong);
    background: rgba(2,6,23,0.25);
  }

  .dkmv-tab-square {
    height: 46px;
    border: none;
    background: rgba(15,23,42,0.35);
    color: rgba(255,255,255,0.88);

    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;

    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.2px;

    cursor: pointer;
    user-select: none;

    transition: background 160ms ease, transform 160ms ease, box-shadow 160ms ease, filter 160ms ease, opacity 160ms ease;
    position: relative;
  }

  .dkmv-tab-square:not(:last-child) { box-shadow: inset -1px 0 0 rgba(148,163,184,0.16); }
  .dkmv-tab-square:hover { background: rgba(15,23,42,0.62); filter: brightness(1.05); transform: translateY(-0.5px); }
  .dkmv-tab-square:active { transform: translateY(0); }
  .dkmv-tab-square:focus-visible { outline: none; box-shadow: var(--focus-ring); z-index: 2; }

  .dkmv-tab-square[data-active="true"] {
    background: linear-gradient(135deg, rgba(126,34,206,0.85), rgba(168,85,247,0.30));
  }

  .dkmv-tab-square[disabled] { opacity: 0.55; cursor: not-allowed; transform: none; filter: none; }

  .dkmv-tab-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  @media (max-width: 620px) { .dkmv-tab-square { gap: 0; } .dkmv-tab-label { display: none; } }

  /* ---------------------------
    Link/token button hover effect
  --------------------------- */
  .dkmv-link-btn, .dkmv-token-btn {
    position: relative;
    overflow: hidden;
    transition: transform 0.16s ease-out, box-shadow 0.16s ease-out, background 0.16s ease-out, opacity 0.16s ease-out, border-color 0.16s ease-out;
  }
  .dkmv-link-btn::before, .dkmv-token-btn::before {
    content: "";
    position: absolute;
    inset: 0;
    opacity: 0;
    background: radial-gradient(circle at 0% 0%, rgba(248,250,252,0.12), transparent 60%);
    transition: opacity 0.22s ease-out;
  }
  .dkmv-link-btn:hover::before, .dkmv-token-btn:hover::before { opacity: 1; }
  .dkmv-link-btn:hover, .dkmv-token-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(15,23,42,0.75); }
  .dkmv-link-btn:active, .dkmv-token-btn:active { transform: translateY(0); box-shadow: 0 3px 10px rgba(15,23,42,0.9); }

  /* ---------------------------
    Token surface (v2) - 통일 버전
  --------------------------- */
  .dkmv-token-root{
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px 10px 18px;
  }

  .dkmv-token-card2{
    width: min(520px, 100%);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border);
    background: linear-gradient(180deg, rgba(2,6,23,0.72), rgba(2,6,23,0.52));
    box-shadow: var(--shadow);
    overflow: hidden;
  }

  .dkmv-token-head{
    padding: 14px 14px 12px 14px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .dkmv-token-title{
    font-size: 15px;
    font-weight: 900;
    letter-spacing: -0.2px;
    color: var(--text);
    margin: 0;
  }

  .dkmv-token-desc{
    margin: 6px 0 0 0;
    font-size: 12px;
    color: var(--muted);
    line-height: 1.45;
  }

  .dkmv-token-body{
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .dkmv-field-row{
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }

  .dkmv-input{
    flex: 1;
    padding: 10px 12px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-strong);
    background: rgba(2,6,23,0.62);
    color: var(--text);
    outline: none;
  }

  .dkmv-input::placeholder{ color: rgba(255,255,255,0.40); }

  .dkmv-input:focus{
    border-color: rgba(129,140,248,1);
    box-shadow: 0 0 0 1px rgba(129,140,248,0.85);
  }

  .dkmv-helper{
    font-size: 11px;
    color: var(--muted2);
    line-height: 1.45;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .dkmv-error{
    font-size: 12px;
    color: #fca5a5;
    line-height: 1.35;
  }

  /* ---------------------------
    Token surface (v1) 호환 매핑 (기존 컴포넌트가 쓰면 무조건 v2 느낌으로)
  --------------------------- */
  .dkmv-token-card{
    width: min(520px, 100%);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border);
    background: linear-gradient(180deg, rgba(2,6,23,0.72), rgba(2,6,23,0.52));
    box-shadow: var(--shadow);
    overflow: hidden;
    padding: 0;
  }
  .dkmv-token-sub{
    margin: 6px 0 0 0;
    font-size: 12px;
    color: var(--muted);
    line-height: 1.45;
    text-align: left;
  }
  .dkmv-token-actions, .dkmv-token-input-wrap, .dkmv-token-input-row{
    margin: 0;
    padding: 0;
    display: block;
  }
  .dkmv-token-input{
    width: 100%;
    padding: 10px 12px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-strong);
    background: rgba(2,6,23,0.62);
    color: var(--text);
    outline: none;
    box-sizing: border-box;
  }
  .dkmv-token-input::placeholder{ color: rgba(255,255,255,0.40); }

  .dkmv-token-error{
    font-size: 12px;
    color: #fca5a5;
    text-align: left;
  }

  .dkmv-token-foot{
    font-size: 11px;
    color: var(--muted2);
    display: inline-flex;
    gap: 6px;
    align-items: center;
  }
`;
