// src/webview/ui/appStyles.ts

export const appStyleText = `
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

  /* 아바타 버튼 */
  .dkmv-avatar-button {
    position: relative;
    padding: 0;
    margin: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .dkmv-avatar-tooltip {
    position: absolute;
    bottom: -22px;
    right: 0;
    font-size: 10px;
    background: rgba(15,23,42,0.98);
    color: #e5e7eb;
    padding: 4px 8px;
    border-radius: 999px;
    border: 1px solid rgba(79,70,229,0.8);
    opacity: 0;
    transform: translateY(4px);
    pointer-events: none;
    white-space: nowrap;
    transition: opacity 0.15s ease, transform 0.15s ease;
    z-index: 20;
  }
  .dkmv-avatar-button:hover .dkmv-avatar-tooltip {
    opacity: 1;
    transform: translateY(0);
  }

  /* 토큰 탭 레이아웃 */
  .dkmv-token-root {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justifyContent: center;
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
