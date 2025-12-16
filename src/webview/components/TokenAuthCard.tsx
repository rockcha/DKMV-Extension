// src/webview/components/TokenAuthCard.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  Key,
  LogOut,
  Shield,
  UserRoundCheck,
} from "lucide-react";

type AuthUser = {
  id: number;
  login: string;
  name?: string | null;
  avatar_url?: string | null;
};

type Props = {
  isAuthenticated: boolean;
  authUser: AuthUser | null;

  tokenInput: string;
  onChangeToken: (v: string) => void;

  tokenError: string | null;
  isSettingToken: boolean;
  isBusy: boolean;

  onOpenTokenPage: () => void;
  onSubmitToken: () => void;
  onLogout: () => void;
};

const S = {
  root: {
    width: "min(520px, 94vw)",
    margin: "0 auto",
  } as React.CSSProperties,

  card: {
    borderRadius: 22,
    border: "1px solid rgba(139,92,246,0.36)",
    background:
      "radial-gradient(1200px 420px at 20% -10%, rgba(139,92,246,0.20), transparent 60%)," +
      "linear-gradient(180deg, rgba(139,92,246,0.08), rgba(2,6,23,0.90))",
    boxShadow:
      "0 18px 60px rgba(0,0,0,0.62), 0 0 0 1px rgba(139,92,246,0.16), 0 0 70px rgba(139,92,246,0.14)",
    overflow: "hidden",
    backdropFilter: "blur(14px)",
  } as React.CSSProperties,

  header: {
    padding: 18,
    display: "flex",
    alignItems: "center",
    gap: 12,
    borderBottom: "1px solid rgba(148,163,184,0.14)",
  } as React.CSSProperties,

  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 999,
    background: "rgba(139,92,246,0.20)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 22px rgba(139,92,246,0.30)",
    border: "1px solid rgba(139,92,246,0.24)",
    flex: "0 0 auto",
  } as React.CSSProperties,

  title: {
    fontSize: 15,
    fontWeight: 900,
    color: "#f9fafb",
    letterSpacing: "-0.25px",
    lineHeight: 1.1,
  } as React.CSSProperties,

  subtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.62)",
    marginTop: 3,
  } as React.CSSProperties,

  body: {
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  } as React.CSSProperties,

  centerBlock: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: 10,
    padding: "14px 12px",
    borderRadius: 18,
    border: "1px solid rgba(148,163,184,0.14)",
    background: "rgba(2,6,23,0.34)",
  } as React.CSSProperties,

  avatarWrap: {
    position: "relative",
    width: 86,
    height: 86,
    borderRadius: 999,
    padding: 3,
    background:
      "linear-gradient(135deg, rgba(167,139,250,0.85), rgba(139,92,246,0.25))",
    boxShadow: "0 14px 30px rgba(0,0,0,0.42)",
  } as React.CSSProperties,

  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    objectFit: "cover",
    display: "block",
    background: "rgba(2,6,23,0.55)",
  } as React.CSSProperties,

  name: {
    fontSize: 15,
    fontWeight: 950,
    color: "#f9fafb",
    letterSpacing: "-0.2px",
    lineHeight: 1.1,
  } as React.CSSProperties,

  meta: {
    fontSize: 12,
    color: "rgba(255,255,255,0.64)",
    lineHeight: 1.2,
  } as React.CSSProperties,

  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11,
    fontWeight: 850,
    color: "rgba(255,255,255,0.78)",
    border: "1px solid rgba(139,92,246,0.26)",
    background: "rgba(139,92,246,0.10)",
    padding: "5px 10px",
    borderRadius: 999,
    width: "fit-content",
  } as React.CSSProperties,

  intro: {
    padding: "8px 4px 4px 4px",
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    lineHeight: 1.45,
    textAlign: "center",
  } as React.CSSProperties,

  row: {
    display: "flex",
    gap: 10,
    alignItems: "center",
  } as React.CSSProperties,

  input: {
    flex: 1,
    padding: "11px 12px",
    borderRadius: 14,
    border: "1px solid rgba(75,85,99,0.80)",
    backgroundColor: "rgba(2,6,23,0.66)",
    color: "#e5e7eb",
    outline: "none",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.03)",
    transition: "box-shadow 160ms ease, border-color 160ms ease",
  } as React.CSSProperties,

  error: {
    color: "#fca5a5",
    fontSize: 11,
    paddingTop: 2,
    textAlign: "center",
  } as React.CSSProperties,

  btnBase: {
    borderRadius: 14,
    padding: "11px 14px",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
    border: "1px solid transparent",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    transition:
      "transform 140ms ease, box-shadow 140ms ease, filter 140ms ease, border-color 140ms ease, background 140ms ease, opacity 140ms ease",
    userSelect: "none",
    whiteSpace: "nowrap",
  } as React.CSSProperties,

  btnFull: {
    width: "100%",
    justifyContent: "center",
  } as React.CSSProperties,

  btnViolet: {
    color: "#ffffff",
    border: "1px solid rgba(167,139,250,0.92)",
    background: "linear-gradient(90deg, #7c3aed, #8b5cf6)",
    boxShadow: "0 12px 28px rgba(139,92,246,0.22)",
  } as React.CSSProperties,

  btnGhost: {
    color: "#e5e7eb",
    border: "1px solid rgba(139,92,246,0.34)",
    background: "rgba(2,6,23,0.22)",
  } as React.CSSProperties,

  btnDanger: {
    color: "#fff",
    border: "1px solid rgba(248,113,113,0.92)",
    background:
      "linear-gradient(90deg, rgba(239,68,68,1), rgba(248,113,113,1))",
  } as React.CSSProperties,

  hintRow: {
    padding: "0 18px 16px 18px",
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    display: "flex",
    alignItems: "center",
    gap: 6,
  } as React.CSSProperties,

  separator: {
    height: 1,
    background: "rgba(148,163,184,0.14)",
    margin: "6px 0 2px 0",
  } as React.CSSProperties,

  spinner: {
    width: 14,
    height: 14,
    borderRadius: 999,
    border: "2px solid rgba(255,255,255,0.30)",
    borderTopColor: "rgba(255,255,255,0.92)",
    display: "inline-block",
    animation: "dkmv-spin 0.9s linear infinite",
  } as React.CSSProperties,
};

function mergeStyle(a: React.CSSProperties, b?: React.CSSProperties) {
  return { ...a, ...(b ?? {}) };
}

function Spinner({ style }: { style?: React.CSSProperties }) {
  return <span aria-hidden="true" style={{ ...S.spinner, ...(style ?? {}) }} />;
}

export default function TokenAuthCard({
  isAuthenticated,
  authUser,
  tokenInput,
  onChangeToken,
  tokenError,
  isSettingToken,
  isBusy,
  onOpenTokenPage,
  onSubmitToken,
  onLogout,
}: Props) {
  // ✅ 어떤 액션(로그인/로그아웃)을 눌렀는지 UI용으로 기억
  const [pending, setPending] = useState<"login" | "logout" | null>(null);

  // ✅ 버튼 disabled 기준은 기존대로 + pending도 반영
  const disabled = useMemo(
    () => isBusy || isSettingToken || pending !== null,
    [isBusy, isSettingToken, pending]
  );

  // ✅ 상태 변화에 따라 pending 자동 해제
  useEffect(() => {
    if (pending === "login") {
      // 토큰 설정이 끝났고(=확인중 종료), 로그인 상태가 되었거나/에러가 떠도 버튼은 다시 누를 수 있게
      if (!isSettingToken) setPending(null);
    }
  }, [pending, isSettingToken]);

  useEffect(() => {
    if (pending === "logout") {
      // 로그아웃이 완료되어 인증이 풀리면 해제
      if (!isAuthenticated) setPending(null);
      // 혹시 외부에서 isBusy로만 관리한다면, busy가 풀릴 때도 해제
      if (!isBusy) setPending(null);
    }
  }, [pending, isAuthenticated, isBusy]);

  const withHover = (kind: "violet" | "ghost" | "danger") =>
    ({
      onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
        const el = e.currentTarget;
        if (el.disabled) return;
        el.style.transform = "translateY(-1px)";
        el.style.filter = "brightness(1.06)";
        if (kind === "violet") {
          el.style.boxShadow =
            "0 16px 34px rgba(139,92,246,0.38), 0 0 0 1px rgba(167,139,250,0.78)";
        } else if (kind === "ghost") {
          el.style.boxShadow = "0 0 18px rgba(139,92,246,0.20)";
        } else {
          el.style.boxShadow = "0 16px 34px rgba(248,113,113,0.20)";
        }
      },
      onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
        const el = e.currentTarget;
        el.style.transform = "translateY(0)";
        el.style.filter = "brightness(1)";
        el.style.boxShadow = "";
      },
      onMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.style.transform = "translateY(0)";
      },
    } as any);

  const inputFocusHandlers = {
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      e.currentTarget.style.borderColor = "rgba(139,92,246,0.90)";
      e.currentTarget.style.boxShadow =
        "0 0 0 1px rgba(139,92,246,0.86), 0 0 18px rgba(139,92,246,0.24), inset 0 0 0 1px rgba(255,255,255,0.03)";
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
      e.currentTarget.style.borderColor = "rgba(75,85,99,0.80)";
      e.currentTarget.style.boxShadow =
        "inset 0 0 0 1px rgba(255,255,255,0.03)";
    },
  };

  const avatarSrc =
    authUser?.avatar_url || "https://avatars.githubusercontent.com/u/0?v=4";

  return (
    <div style={S.root}>
      {/* ✅ spinner keyframes */}
      <style>{`@keyframes dkmv-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <div style={S.card}>
        <div style={S.header}>
          <div style={S.iconBadge}>
            <UserRoundCheck size={20} color="#c4b5fd" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={S.title}>계정 연결</div>
            <div style={S.subtitle}>DKMV • VS Code</div>
          </div>
        </div>

        <div style={S.body}>
          {isAuthenticated && authUser ? (
            <>
              <div style={S.centerBlock}>
                <div style={S.avatarWrap} aria-hidden="true">
                  <img src={avatarSrc} alt={authUser.login} style={S.avatar} />
                </div>

                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  <div style={S.name}>{authUser.login}</div>
                  <div style={S.meta}>
                    {authUser.name
                      ? authUser.name
                      : "GitHub 계정이 연결되어 있어요"}
                  </div>
                </div>

                <div style={S.pill}>
                  <Shield size={14} />
                  인증됨
                </div>
              </div>

              <div style={S.separator} />

              <button
                type="button"
                onClick={() => {
                  if (disabled) return;
                  setPending("logout");
                  onLogout();
                }}
                disabled={disabled}
                style={mergeStyle(S.btnBase, {
                  ...S.btnDanger,
                  ...S.btnFull,
                  opacity: disabled ? 0.72 : 1,
                  cursor: disabled ? "not-allowed" : "pointer",
                })}
                {...withHover("danger")}
              >
                {pending === "logout" ? (
                  <>
                    <Spinner />
                    로그아웃 중…
                  </>
                ) : (
                  <>
                    <LogOut size={16} />
                    로그아웃
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <div style={S.intro}>
                DKMV를 사용하려면{" "}
                <b style={{ color: "#f9fafb" }}>GitHub 토큰</b>을 연결해주세요.
                <br />
                토큰은 <b style={{ color: "#f9fafb" }}>VS Code 로컬</b>에만
                저장됩니다.
              </div>

              <button
                type="button"
                onClick={onOpenTokenPage}
                disabled={disabled}
                style={mergeStyle(S.btnBase, {
                  ...S.btnGhost,
                  ...S.btnFull,
                  opacity: disabled ? 0.72 : 1,
                  cursor: disabled ? "not-allowed" : "pointer",
                })}
                {...withHover("ghost")}
              >
                <ExternalLink size={16} />
                토큰 발급 페이지 열기
              </button>

              <div style={S.row}>
                <input
                  style={S.input}
                  placeholder="토큰을 붙여넣어 주세요"
                  value={tokenInput}
                  onChange={(e) => onChangeToken(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !disabled) {
                      setPending("login");
                      onSubmitToken();
                    }
                  }}
                  aria-label="토큰 입력"
                  {...inputFocusHandlers}
                />

                <button
                  type="button"
                  onClick={() => {
                    if (disabled) return;
                    setPending("login");
                    onSubmitToken();
                  }}
                  disabled={disabled}
                  style={mergeStyle(S.btnBase, {
                    ...S.btnViolet,
                    opacity: disabled ? 0.72 : 1,
                    cursor: disabled ? "not-allowed" : "pointer",
                    minWidth: 110,
                    justifyContent: "center",
                  })}
                  {...withHover("violet")}
                >
                  {pending === "login" || isSettingToken ? (
                    <>
                      <Spinner />
                      로그인 중…
                    </>
                  ) : (
                    <>
                      <Key size={16} />
                      연결하기
                    </>
                  )}
                </button>
              </div>

              {tokenError ? <div style={S.error}>{tokenError}</div> : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
