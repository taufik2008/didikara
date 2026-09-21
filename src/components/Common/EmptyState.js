"use client";
import React from "react";
import {
  FolderOpen,
  FileText,
  MessageSquare,
  Award,
  Bell,
  Search,
  BookOpen,
  PlusCircle,
  Sparkles,
  ArrowRight
} from "lucide-react";

const ICON_MAP = {
  folder: FolderOpen,
  file: FileText,
  forum: MessageSquare,
  award: Award,
  bell: Bell,
  search: Search,
  book: BookOpen,
  sparkles: Sparkles,
};

export default function EmptyState({
  icon = "folder",
  title = "Belum Ada Data",
  description = "Data untuk bagian ini belum tersedia atau belum ditambahkan.",
  primaryAction,
  secondaryAction,
  badge,
  compact = false,
  style = {},
}) {
  const IconComponent = typeof icon === "string" ? (ICON_MAP[icon] || FolderOpen) : icon;

  return (
    <div
      className="empty-state-card"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: compact ? "28px 16px" : "48px 24px",
        borderRadius: 16,
        background: "var(--bg-glass-card, rgba(255, 255, 255, 0.03))",
        border: "1px dashed var(--border-color, rgba(255, 255, 255, 0.12))",
        width: "100%",
        maxWidth: compact ? 460 : 540,
        margin: "0 auto",
        animation: "fadeIn 0.3s ease-out",
        ...style,
      }}
    >
      {badge && (
        <span
          style={{
            fontSize: "0.72rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            padding: "3px 10px",
            borderRadius: 20,
            background: "rgba(249, 115, 22, 0.15)",
            color: "#f97316",
            border: "1px solid rgba(249, 115, 22, 0.3)",
            marginBottom: 16,
          }}
        >
          {badge}
        </span>
      )}

      <div
        style={{
          width: compact ? 52 : 68,
          height: compact ? 52 : 68,
          borderRadius: 20,
          background: "linear-gradient(135deg, rgba(249, 115, 22, 0.15) 0%, rgba(14, 165, 233, 0.15) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--primary-color, #f97316)",
          marginBottom: 18,
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.1)",
        }}
      >
        <IconComponent size={compact ? 24 : 32} />
      </div>

      <h4
        style={{
          fontSize: compact ? "1.05rem" : "1.2rem",
          fontWeight: 700,
          color: "var(--text-primary)",
          marginBottom: 8,
          lineHeight: 1.3,
        }}
      >
        {title}
      </h4>

      <p
        style={{
          fontSize: "0.85rem",
          color: "var(--text-muted, #94a3b8)",
          lineHeight: 1.6,
          maxWidth: 420,
          marginBottom: primaryAction || secondaryAction ? 22 : 0,
        }}
      >
        {description}
      </p>

      {(primaryAction || secondaryAction) && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="btn btn-primary"
              style={{
                width: "auto",
                padding: "9px 18px",
                fontSize: "0.84rem",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 4px 14px rgba(249, 115, 22, 0.25)",
              }}
            >
              {primaryAction.icon || <PlusCircle size={15} />}
              <span>{primaryAction.label}</span>
            </button>
          )}

          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="btn btn-secondary"
              style={{
                width: "auto",
                padding: "9px 16px",
                fontSize: "0.84rem",
                fontWeight: 500,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>{secondaryAction.label}</span>
              {secondaryAction.icon || <ArrowRight size={14} />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
