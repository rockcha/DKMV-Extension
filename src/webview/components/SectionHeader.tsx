// src/webview/components/SectionHeader.tsx

import React from "react";

type Props = {
  label: string;
};

const SectionHeader: React.FC<Props> = ({ label }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
    }}
  >
    <span
      style={{
        width: 3,
        height: 16,
        borderRadius: 999,
        background: "linear-gradient(180deg,#a855f7,#6366f1)",
      }}
    />
    <span
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: "#e5e7eb",
        letterSpacing: 0.3,
      }}
    >
      {label}
    </span>
  </div>
);

export default SectionHeader;
