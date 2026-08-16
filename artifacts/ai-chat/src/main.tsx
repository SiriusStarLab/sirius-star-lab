import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[Sirius] Unhandled error:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "#080c14", color: "#a0b4c8", fontFamily: "monospace", padding: 32
        }}>
          <p style={{ color: "hsl(193,100%,52%)", fontSize: 13, marginBottom: 8 }}>SIRIUS · RECOVERY MODE</p>
          <p style={{ fontSize: 12, opacity: 0.6, marginBottom: 24 }}>Something went wrong. Press the button below to reload.</p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{
              background: "hsl(193,100%,52%)", color: "#080c14", border: "none",
              padding: "10px 24px", borderRadius: 8, fontFamily: "monospace",
              fontSize: 13, cursor: "pointer", fontWeight: 700
            }}
          >
            Reload Sirius
          </button>
          <details style={{ marginTop: 24, fontSize: 10, opacity: 0.35, maxWidth: 480 }}>
            <summary>Error details</summary>
            <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {this.state.error.stack || this.state.error.message}
            </pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
