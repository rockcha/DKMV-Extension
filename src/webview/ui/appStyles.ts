// src/webview/ui/appStyles.ts

export const appStyleText = `
  /* ---------------------------
    Base / Font
  --------------------------- */
  :root {
    --font-kr: "Gowun Dodum", "Noto Sans KR", "Apple SD Gothic Neo", "Segoe UI",
      Arial, sans-serif;

    --bg: #020617;
    --bg2: #030712;
    --panel: rgba(2,6,23,0.35);
    --panel2: rgba(15,23,42,0.55);
    --line: rgba(31,41,55,0.9);

    --text: #e5e7eb;
    --muted: #9ca3af;

    --accent: #a855f7;
    --accent2: #38bdf8;

    --focus-ring: 0 0 0 2px rgba(168,85,247,0.45), 0 0 0 4px rgba(56,189,248,0.18);
  }

  * {
    box-sizing: border-box;
    font-family: var(--font-kr);
  }

  /* ---------------------------
    Logo pulse
  --------------------------- */
  @keyframes dkmv-logo-pulse {
    0% {
      filter: hue-rotate(0deg) brightness(1);
      transform: scale(1);
    }
    50% {
      filter: hue-rotate(12deg) brightness(1.12);
      transform: scale(1.03);
    }
    100% {
      filter: hue-rotate(-8deg) brightness(0.98);
      transform: scale(1);
    }
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
    gap: 10px;
    min-height: 100vh;
  }

  /* ---------------------------
    Top app bar (sketch-like)
  --------------------------- */
  .dkmv-topbar {
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid var(--line);
    padding-bottom: 8px;
  }

  .dkmv-brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .dkmv-brand-title {
    font-weight: 800;
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
    User badge (bigger avatar + nickname)
  --------------------------- */
  .dkmv-user-badge {
    display: inline-flex;
    align-items: center;
    gap: 10px;

    padding: 6px 10px;
  border:none;
    background: rgba(2,6,23,0.35);
    color: var(--text);

    
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
    .dkmv-user-name {
      display: none;
    }
  }

  /* ---------------------------
    Row separators (tabs/status)
  --------------------------- */
  .dkmv-row {
    padding-top: 8px;
    padding-bottom: 8px;

  }

  /* ---------------------------
    Status bar (sketch middle bar)
  --------------------------- */
  .dkmv-statusbar-like {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 10px;
    align-items: center;

    border-radius: 12px;
    border: 1px solid rgba(148,163,184,0.22);
    background: rgba(2,6,23,0.35);
    padding: 10px 10px;
  }

  .dkmv-status-left {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--muted);
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
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
  }
  .dkmv-primary:hover {
    transform: translateY(-1px);
    filter: brightness(1.05);
  }
  .dkmv-primary:active {
    transform: translateY(0px);
  }
  .dkmv-primary:focus-visible {
    outline: none;
    box-shadow: var(--focus-ring), 0 12px 26px rgba(0,0,0,0.28);
  }
  .dkmv-primary[disabled] {
    opacity: 0.55;
    cursor: not-allowed;
    box-shadow: none;
  }

  @media (max-width: 620px) {
    .dkmv-statusbar-like {
      grid-template-columns: auto 1fr;
    }
    .dkmv-primary {
      display: none;
    }
  }

  /* ---------------------------
    TopTabs: 4-split full width square buttons
  --------------------------- */
  .dkmv-tabs-grid {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid rgba(148,163,184,0.22);
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

    transition:
      background 160ms ease,
      transform 160ms ease,
      box-shadow 160ms ease,
      filter 160ms ease,
      opacity 160ms ease;
    position: relative;
  }

  /* vertical separators inside grid */
  .dkmv-tab-square:not(:last-child) {
    box-shadow: inset -1px 0 0 rgba(148,163,184,0.16);
  }

  .dkmv-tab-square:hover {
    background: rgba(15,23,42,0.62);
    filter: brightness(1.05);
    transform: translateY(-0.5px);
  }

  .dkmv-tab-square:active {
    transform: translateY(0);
  }

  .dkmv-tab-square:focus-visible {
    outline: none;
    box-shadow: var(--focus-ring);
    z-index: 2;
  }

  .dkmv-tab-square[data-active="true"] {
    background: linear-gradient(
      135deg,
      rgba(126,34,206,0.85),
      rgba(168,85,247,0.30)
    );
  }

  .dkmv-tab-square[disabled] {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
    filter: none;
  }

  .dkmv-tab-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (max-width: 620px) {
    .dkmv-tab-square { gap: 0; }
    .dkmv-tab-label { display: none; }
  }

  /* ---------------------------
    Existing: link/token button hover effect
  --------------------------- */
  .dkmv-link-btn,
  .dkmv-token-btn {
    position: relative;
    overflow: hidden;
    transition:
      transform 0.16s ease-out,
      box-shadow 0.16s ease-out,
      background 0.16s ease-out,
      opacity 0.16s ease-out,
      border-color 0.16s ease-out;
  }
  .dkmv-link-btn::before,
  .dkmv-token-btn::before {
    content: "";
    position: absolute;
    inset: 0;
    opacity: 0;
    background: radial-gradient(
      circle at 0% 0%,
      rgba(248,250,252,0.12),
      transparent 60%
    );
    transition: opacity 0.22s ease-out;
  }
  .dkmv-link-btn:hover::before,
  .dkmv-token-btn:hover::before {
    opacity: 1;
  }
  .dkmv-link-btn:hover,
  .dkmv-token-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 20px rgba(15,23,42,0.75);
  }
  .dkmv-link-btn:active,
  .dkmv-token-btn:active {
    transform: translateY(0);
    box-shadow: 0 3px 10px rgba(15,23,42,0.9);
  }

  /* ---------------------------
    Existing: token tab layout
  --------------------------- */
  .dkmv-token-root {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px 10px 18px;
    box-sizing: border-box;
  }

  .dkmv-token-card {
    width: 100%;
    max-width: 640px;
    border-radius: 16px;
    border: 1px solid rgba(31,41,55,0.95);
    background: radial-gradient(circle at 0% 0%, #020617, #020617);
    padding: 18px 20px 20px;
    box-shadow:
      0 18px 40px rgba(15,23,42,0.9),
      0 0 0 1px rgba(15,23,42,0.85);
  }

  .dkmv-token-title {
    font-size: 16px;
    font-weight: 600;
    color: #e5e7eb;
    text-align: center;
    letter-spacing: 0.03em;
  }

  .dkmv-token-sub {
    margin-top: 8px;
    font-size: 11px;
    line-height: 1.7;
    color: #9ca3af;
    text-align: center;
  }

  .dkmv-token-actions {
    margin-top: 14px;
    display: flex;
    justify-content: center;
  }

  .dkmv-token-input-wrap {
    margin-top: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
  }

  .dkmv-token-input-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    width: 100%;
  }

  .dkmv-token-input {
    flex: 1 1 260px;
    max-width: 420px;
    padding: 8px 10px;
    border-radius: 10px;
    border: 1px solid rgba(55,65,81,0.95);
    background-color: #020617;
    color: #e5e7eb;
    font-size: 11px;
    font-family:
      ui-monospace,
      SFMono-Regular,
      Menlo,
      Monaco,
      Consolas,
      "Liberation Mono",
      "Courier New",
      monospace;
    outline: none;
    box-sizing: border-box;
    transition:
      border-color 0.15s ease-out,
      box-shadow 0.15s ease-out,
      background 0.15s ease-out;
  }

  .dkmv-token-input:focus {
    border-color: rgba(129,140,248,1);
    box-shadow: 0 0 0 1px rgba(129,140,248,0.85);
    background: #020617;
  }

  .dkmv-token-error {
    font-size: 10px;
    color: #fecaca;
    text-align: center;
  }

  .dkmv-token-foot {
    margin-top: 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    color: #6b7280;
  }

  .dkmv-token-authed {
    margin-bottom: 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .dkmv-token-authed-main {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .dkmv-token-authed-text {
    font-size: 12px;
    color: #c7d2fe;
  }

  .dkmv-token-authed-sub {
    font-size: 11px;
    color: #9ca3af;
    text-align: center;
  }

  @media (max-width: 640px) {
    .dkmv-token-card {
      padding: 16px 14px 18px;
    }
  }
`;
