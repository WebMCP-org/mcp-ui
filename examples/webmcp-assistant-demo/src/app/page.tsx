"use client";

import { Thread } from "@assistant-ui/react";
import { makeAssistantToolUI } from "@assistant-ui/react";
import { useEdgeRuntime } from "@assistant-ui/react";
import { UIResourceRenderer } from "@mcp-ui/client";
import { useState, useRef, useEffect } from "react";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { TabClientTransport } from "@mcp-b/transports";

// Tool UI component for rendering MCP-UI resources
const MCPUIToolUI = makeAssistantToolUI({
  toolName: "showShoppingCart",
  render: function ShoppingCartUI({ result }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [tools, setTools] = useState<any[]>([]);
    const [isConnected, setIsConnected] = useState(false);

    // Connect to iframe with TabClientTransport
    useEffect(() => {
      if (!containerRef.current) return;

      const timer = setTimeout(async () => {
        const iframe = containerRef.current?.querySelector("iframe");
        if (!iframe) return;

        try {
          const client = new Client(
            { name: "assistant-host", version: "1.0.0" },
            { capabilities: {} }
          );

          const transport = new TabClientTransport({
            targetOrigin: window.location.origin,
          });

          await client.connect(transport);

          // Discover tools
          const { tools: discoveredTools } = await client.listTools();
          setTools(discoveredTools);
          setIsConnected(true);
          console.log("✅ Connected to iframe, discovered tools:", discoveredTools);
        } catch (error) {
          console.error("❌ Error connecting to iframe:", error);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }, [result]);

    if (!result || typeof result !== "object") {
      return <div>Loading UI...</div>;
    }

    return (
      <div style={{ width: "100%", height: "100%", marginBottom: "20px" }} ref={containerRef}>
        {isConnected && tools.length > 0 && (
          <div
            style={{
              background: "#e8f5e9",
              padding: "12px 16px",
              borderRadius: "8px",
              marginBottom: "16px",
              fontSize: "14px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "6px" }}>
              🔧 WebMCP Tools Auto-Discovered:
            </div>
            <div style={{ color: "#2e7d32", fontSize: "13px" }}>
              {tools.map((t: any) => t.name).join(", ")}
            </div>
          </div>
        )}
        <UIResourceRenderer
          resource={(result as any).content[0].resource}
          htmlProps={{
            style: {
              width: "100%",
              height: "650px",
              border: "1px solid #e0e0e0",
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            },
          }}
        />
      </div>
    );
  },
});

const AnalyticsToolUI = makeAssistantToolUI({
  toolName: "showAnalyticsDashboard",
  render: function AnalyticsDashboardUI({ result }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [tools, setTools] = useState<any[]>([]);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
      if (!containerRef.current) return;

      const timer = setTimeout(async () => {
        const iframe = containerRef.current?.querySelector("iframe");
        if (!iframe) return;

        try {
          const client = new Client(
            { name: "assistant-host", version: "1.0.0" },
            { capabilities: {} }
          );

          const transport = new TabClientTransport({
            targetOrigin: window.location.origin,
          });

          await client.connect(transport);

          const { tools: discoveredTools } = await client.listTools();
          setTools(discoveredTools);
          setIsConnected(true);
        } catch (error) {
          console.error("Error connecting:", error);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }, [result]);

    if (!result || typeof result !== "object") {
      return <div>Loading UI...</div>;
    }

    return (
      <div style={{ width: "100%", height: "100%", marginBottom: "20px" }} ref={containerRef}>
        {isConnected && tools.length > 0 && (
          <div
            style={{
              background: "#e8f5e9",
              padding: "12px 16px",
              borderRadius: "8px",
              marginBottom: "16px",
              fontSize: "14px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "6px" }}>
              🔧 WebMCP Tools Auto-Discovered:
            </div>
            <div style={{ color: "#2e7d32", fontSize: "13px" }}>
              {tools.map((t: any) => t.name).join(", ")}
            </div>
          </div>
        )}
        <UIResourceRenderer
          resource={(result as any).content[0].resource}
          htmlProps={{
            style: {
              width: "100%",
              height: "650px",
              border: "1px solid #e0e0e0",
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            },
          }}
        />
      </div>
    );
  },
});

function MyAssistant() {
  const runtime = useEdgeRuntime({
    api: "/api/chat",
  });

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
      {/* Left side - MCP UI Display (takes up more space) */}
      <div
        style={{
          flex: "2",
          padding: "20px",
          overflowY: "auto",
          background: "#f5f7fa",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              padding: "32px",
              borderRadius: "16px",
              color: "white",
              marginBottom: "24px",
              boxShadow: "0 8px 24px rgba(102, 126, 234, 0.3)",
            }}
          >
            <h1 style={{ fontSize: "32px", marginBottom: "12px", fontWeight: 700 }}>
              🎯 WebMCP + Assistant UI Demo
            </h1>
            <p style={{ opacity: 0.95, fontSize: "16px", lineHeight: "1.6" }}>
              Chat with the AI assistant to interact with MCP-UI resources.<br />
              Try: "Show me the shopping cart" or "Display the analytics dashboard"
            </p>
          </div>

          {/* The Thread Messages will render tool UIs here */}
          <div style={{
            background: "white",
            borderRadius: "16px",
            padding: "24px",
            minHeight: "500px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          }}>
            {/* @ts-expect-error - React 19 type compatibility issue with assistant-ui */}
            <Thread assistantMessage={{ components: { Text: MCPUIToolUI, ToolFallback: AnalyticsToolUI } }} />
          </div>
        </div>
      </div>

      {/* Right side - Assistant Chat (smaller panel) */}
      <div
        style={{
          flex: "1",
          borderLeft: "2px solid #e0e0e0",
          display: "flex",
          flexDirection: "column",
          background: "white",
          minWidth: "420px",
          maxWidth: "520px",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "2px solid #e0e0e0",
            background: "#fafafa",
          }}
        >
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#333", marginBottom: "8px" }}>
            💬 AI Assistant
          </h2>
          <p style={{ fontSize: "14px", color: "#666", lineHeight: "1.5" }}>
            Ask me to show you the shopping cart or analytics dashboard!
          </p>
        </div>

        <div style={{ flex: 1, overflow: "auto" }}>
          {/* @ts-expect-error - React 19 type compatibility issue with assistant-ui */}
          <Thread />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return <MyAssistant />;
}
