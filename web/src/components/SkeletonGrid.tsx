export function SkeletonGrid() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "var(--sb-grid)",
        gap: 14,
        marginBottom: 28,
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--line-2)",
            borderRadius: 14,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "var(--line-1)",
                animation: "sb-pulse 1.5s ease-in-out infinite",
              }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  height: 13,
                  width: "55%",
                  background: "var(--line-1)",
                  borderRadius: 4,
                  animation: "sb-pulse 1.5s ease-in-out infinite",
                }}
              />
              <div
                style={{
                  height: 10,
                  width: "40%",
                  background: "var(--line-1)",
                  borderRadius: 4,
                  marginTop: 6,
                  animation: "sb-pulse 1.5s ease-in-out infinite",
                }}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div
              style={{
                height: 10,
                width: 40,
                background: "var(--line-1)",
                borderRadius: 4,
                animation: "sb-pulse 1.5s ease-in-out infinite",
              }}
            />
            <div
              style={{
                height: 10,
                width: 30,
                background: "var(--line-1)",
                borderRadius: 4,
                animation: "sb-pulse 1.5s ease-in-out infinite",
              }}
            />
            <div
              style={{
                height: 10,
                width: 35,
                background: "var(--line-1)",
                borderRadius: 4,
                animation: "sb-pulse 1.5s ease-in-out infinite",
              }}
            />
          </div>
          <div
            style={{
              height: 5,
              width: "100%",
              background: "var(--line-1)",
              borderRadius: 3,
              animation: "sb-pulse 1.5s ease-in-out infinite",
            }}
          />
          <div
            style={{
              height: 10,
              width: "50%",
              background: "var(--line-1)",
              borderRadius: 4,
              animation: "sb-pulse 1.5s ease-in-out infinite",
            }}
          />
        </div>
      ))}
    </div>
  );
}
