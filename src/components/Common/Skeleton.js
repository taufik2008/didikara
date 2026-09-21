"use client";
import React from "react";

export function Skeleton({ width = "100%", height = "1rem", borderRadius = 6, style = {} }) {
  return (
    <div
      className="skeleton shimmer"
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
}

export function SkeletonCard({ height = 240 }) {
  return (
    <div className="glass-card skeleton-card" style={{ padding: 18, height }}>
      <Skeleton height="50%" borderRadius={10} style={{ marginBottom: 12 }} />
      <Skeleton width="40%" height="0.8rem" style={{ marginBottom: 8 }} />
      <Skeleton width="85%" height="1.1rem" style={{ marginBottom: 12 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
        <Skeleton width="30%" height="0.9rem" />
        <Skeleton width="35%" height="1.8rem" borderRadius={8} />
      </div>
    </div>
  );
}

export function SkeletonCourseGrid({ count = 6 }) {
  return (
    <div className="course-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} height={320} />
      ))}
    </div>
  );
}

export function SkeletonLessonList({ count = 5 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "8px 0" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            borderRadius: 10,
            background: "var(--bg-glass-card, rgba(255, 255, 255, 0.03))",
            border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))",
          }}
        >
          <Skeleton width="28px" height="28px" borderRadius={8} />
          <div style={{ flex: 1 }}>
            <Skeleton width="75%" height="0.95rem" style={{ marginBottom: 6 }} />
            <Skeleton width="40%" height="0.75rem" />
          </div>
          <Skeleton width="45px" height="1.2rem" borderRadius={6} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonStatsRow({ count = 4 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))`, gap: 16, marginBottom: 24 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            padding: 18,
            borderRadius: 14,
            background: "var(--bg-glass-card, rgba(255, 255, 255, 0.03))",
            border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Skeleton width="50%" height="0.85rem" />
            <Skeleton width="32px" height="32px" borderRadius={10} />
          </div>
          <Skeleton width="40%" height="1.8rem" style={{ marginBottom: 8 }} />
          <Skeleton width="60%" height="0.75rem" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 4, cols = 4 }) {
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10, padding: 12 }}>
      <div style={{ display: "flex", gap: 12 }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} width={`${100 / cols}%`} height="1.2rem" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: "flex", gap: 12, alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border-color)" }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} width={`${100 / cols}%`} height="1rem" />
          ))}
        </div>
      ))}
    </div>
  );
}
