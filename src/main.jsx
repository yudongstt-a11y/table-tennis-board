import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Application render failed", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main style={{ padding: 24, fontFamily: "Arial, sans-serif", color: "#0f172a" }}>
          <h1 style={{ fontSize: 22, marginBottom: 12 }}>页面加载出错 / Page failed to load</h1>
          <p style={{ marginBottom: 12 }}>
            请刷新页面。如果仍然出现这个提示，请把下面的错误信息发给管理员。
          </p>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              background: "#fee2e2",
              border: "1px solid #fecaca",
              borderRadius: 12,
              padding: 16,
              color: "#991b1b",
            }}
          >
            {this.state.error?.message || String(this.state.error)}
          </pre>
        </main>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);
