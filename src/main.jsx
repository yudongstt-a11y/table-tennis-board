import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const BUILD_TIME = typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : "not configured";

function getHashPath() {
  return window.location.hash.replace(/^#/, "") || "/";
}

function isHealthPath() {
  const hashPath = getHashPath();
  return hashPath === "/health" || window.location.pathname.endsWith("/health");
}

function HealthPage() {
  return (
    <main style={{ padding: 24, fontFamily: "Arial, sans-serif", color: "#0f172a" }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Health OK</h1>
      <p>App shell loaded.</p>
      <p>Hash route: {getHashPath()}</p>
      <p>DATA_SOURCE: {import.meta.env.VITE_DATA_SOURCE || "missing"}</p>
      <p>Supabase URL: {import.meta.env.VITE_SUPABASE_URL ? "configured" : "missing"}</p>
      <p>Supabase anon key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? "configured" : "missing"}</p>
      <p>Build time: {BUILD_TIME}</p>
    </main>
  );
}

function FatalPage({ error }) {
  return (
    <main style={{ padding: 24, fontFamily: "Arial, sans-serif", color: "#0f172a" }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Page failed to load</h1>
      <p style={{ marginBottom: 12 }}>
        The app shell loaded, but the business app failed during startup. Please send this error to the admin.
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
        {error?.stack || error?.message || String(error)}
      </pre>
    </main>
  );
}

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
      return <FatalPage error={this.state.error} />;
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

window.addEventListener("error", (event) => {
  console.error("Window error", event.error || event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection", event.reason);
});

if (isHealthPath()) {
  root.render(
    <React.StrictMode>
      <HealthPage />
    </React.StrictMode>
  );
} else {
  import("./App.jsx")
    .then(({ default: App }) => {
      root.render(
        <React.StrictMode>
          <RootErrorBoundary>
            <App />
          </RootErrorBoundary>
        </React.StrictMode>
      );
    })
    .catch((error) => {
      console.error("Failed to import App", error);
      root.render(<FatalPage error={error} />);
    });
}
