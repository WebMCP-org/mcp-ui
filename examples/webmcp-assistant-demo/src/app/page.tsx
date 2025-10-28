"use client";

import { Thread } from "@assistant-ui/react";
import { makeAssistantToolUI } from "@assistant-ui/react";
import { useEdgeRuntime } from "@assistant-ui/react";
import { UIResourceRenderer, UIActionResult } from "@mcp-ui/client";
import { useState, useRef, useEffect, createContext, useContext } from "react";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { TabClientTransport } from "@mcp-b/transports";

// Context to share the iframe clients across components
const IframeClientContext = createContext<{
  shoppingClient: Client | null;
  analyticsClient: Client | null;
  setShoppingClient: (client: Client | null) => void;
  setAnalyticsClient: (client: Client | null) => void;
}>({
  shoppingClient: null,
  analyticsClient: null,
  setShoppingClient: () => {},
  setAnalyticsClient: () => {},
});

// Proxy tool UI for WebMCP cart tools
const createProxyToolUI = (toolNames: string[], clientType: "shopping" | "analytics") => {
  return toolNames.map((toolName) =>
    makeAssistantToolUI({
      toolName,
      render: function ProxyTool({ result, args }) {
        const { shoppingClient, analyticsClient } = useContext(IframeClientContext);
        const [status, setStatus] = useState<string>("Preparing...");
        const [toolResult, setToolResult] = useState<any>(null);

        useEffect(() => {
          const client = clientType === "shopping" ? shoppingClient : analyticsClient;

          if (!result || !(result as any)._webmcpProxy) {
            setStatus("Not a proxy tool");
            return;
          }

          const proxyData = result as any;

          if (!client) {
            setStatus(`⚠️ ${clientType === "shopping" ? "Shopping cart" : "Analytics dashboard"} UI not visible. Please show it first.`);
            return;
          }

          const callTool = async () => {
            try {
              setStatus(`📞 Calling ${proxyData.toolName}...`);
              console.log(`Proxy calling: ${proxyData.toolName}`, proxyData.args);

              const toolCallResult = await client.callTool({
                name: proxyData.toolName,
                arguments: proxyData.args || {},
              });

              console.log("Proxy tool result:", toolCallResult);
              setToolResult(toolCallResult);
              setStatus(`✅ ${proxyData.toolName} completed`);
            } catch (error: any) {
              console.error("Proxy tool error:", error);
              setStatus(`❌ Error: ${error.message}`);
            }
          };

          callTool();
        }, [result, shoppingClient, analyticsClient]);

        return (
          <div
            style={{
              background: "#f0f4ff",
              padding: "12px 16px",
              borderRadius: "8px",
              marginBottom: "12px",
              fontSize: "14px",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "6px" }}>🔄 WebMCP Tool Call</div>
            <div style={{ fontSize: "13px", color: "#666" }}>{status}</div>
            {toolResult && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "8px",
                  background: "#e8f5e9",
                  borderRadius: "4px",
                  fontSize: "12px",
                  fontFamily: "monospace",
                }}
              >
                <strong>Result:</strong>
                <pre style={{ margin: "4px 0 0 0", whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(toolResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );
      },
    })
  );
};

// Create proxy tool UIs for all WebMCP tools
const shoppingProxyTools = createProxyToolUI(
  ["addToCart", "removeFromCart", "getCartContents", "clearCart"],
  "shopping"
);

const analyticsProxyTools = createProxyToolUI(
  ["getSalesData", "getUserStats"],
  "analytics"
);

// Tool UI component for rendering MCP-UI resources
const MCPUIToolUI = makeAssistantToolUI({
  toolName: "showShoppingCart",
  render: function ShoppingCartUI({ result }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [tools, setTools] = useState<any[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [toolCallLog, setToolCallLog] = useState<string[]>([]);
    const clientRef = useRef<Client | null>(null);
    const { setShoppingClient } = useContext(IframeClientContext);

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
          clientRef.current = client;
          setShoppingClient(client); // Store in context for proxy tools

          // Discover tools
          const { tools: discoveredTools } = await client.listTools();
          setTools(discoveredTools);
          setIsConnected(true);
          console.log("✅ Connected to iframe, discovered tools:", discoveredTools);
        } catch (error) {
          console.error("❌ Error connecting to iframe:", error);
        }
      }, 1000);

      return () => {
        clearTimeout(timer);
        setShoppingClient(null);
      };
    }, [result, setShoppingClient]);

    // Handle UI actions from the iframe
    const handleUIAction = async (action: UIActionResult) => {
      console.log("🎯 UI Action received:", action);

      if (action.type === "tool") {
        const { toolName, params } = action.payload;

        setToolCallLog((prev) => [
          ...prev,
          `${new Date().toLocaleTimeString()}: ${toolName}(${JSON.stringify(params).slice(0, 50)}...)`
        ]);

        try {
          if (clientRef.current) {
            console.log(`📞 Calling iframe tool: ${toolName}`, params);
            const toolResult = await clientRef.current.callTool({
              name: toolName,
              arguments: params || {},
            });
            console.log("✅ Tool result:", toolResult);
            return { success: true, result: toolResult };
          } else {
            console.warn("⚠️ Client not connected yet");
            return { success: false, error: "Client not connected" };
          }
        } catch (error: any) {
          console.error("❌ Tool call failed:", error);
          return { success: false, error: error.message };
        }
      }

      return { success: true };
    };

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
            {toolCallLog.length > 0 && (
              <div style={{ marginTop: "8px", borderTop: "1px solid #c8e6c9", paddingTop: "8px" }}>
                <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "4px" }}>
                  📝 Tool Call Log:
                </div>
                <div style={{ fontSize: "11px", fontFamily: "monospace", maxHeight: "100px", overflowY: "auto" }}>
                  {toolCallLog.slice(-5).map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <UIResourceRenderer
          resource={(result as any).content[0].resource}
          onUIAction={handleUIAction}
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
    const [toolCallLog, setToolCallLog] = useState<string[]>([]);
    const clientRef = useRef<Client | null>(null);
    const { setAnalyticsClient } = useContext(IframeClientContext);

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
          clientRef.current = client;
          setAnalyticsClient(client);

          const { tools: discoveredTools } = await client.listTools();
          setTools(discoveredTools);
          setIsConnected(true);
          console.log("✅ Connected to analytics iframe, discovered tools:", discoveredTools);
        } catch (error) {
          console.error("Error connecting:", error);
        }
      }, 1000);

      return () => {
        clearTimeout(timer);
        setAnalyticsClient(null);
      };
    }, [result, setAnalyticsClient]);

    const handleUIAction = async (action: UIActionResult) => {
      console.log("🎯 Analytics UI Action received:", action);

      if (action.type === "tool") {
        const { toolName, params } = action.payload;

        setToolCallLog((prev) => [
          ...prev,
          `${new Date().toLocaleTimeString()}: ${toolName}(${JSON.stringify(params).slice(0, 50)}...)`
        ]);

        try {
          if (clientRef.current) {
            console.log(`📞 Calling analytics tool: ${toolName}`, params);
            const toolResult = await clientRef.current.callTool({
              name: toolName,
              arguments: params || {},
            });
            console.log("✅ Tool result:", toolResult);
            return { success: true, result: toolResult };
          } else {
            console.warn("⚠️ Client not connected yet");
            return { success: false, error: "Client not connected" };
          }
        } catch (error: any) {
          console.error("❌ Tool call failed:", error);
          return { success: false, error: error.message };
        }
      }

      return { success: true };
    };

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
            {toolCallLog.length > 0 && (
              <div style={{ marginTop: "8px", borderTop: "1px solid #c8e6c9", paddingTop: "8px" }}>
                <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "4px" }}>
                  📝 Tool Call Log:
                </div>
                <div style={{ fontSize: "11px", fontFamily: "monospace", maxHeight: "100px", overflowY: "auto" }}>
                  {toolCallLog.slice(-5).map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <UIResourceRenderer
          resource={(result as any).content[0].resource}
          onUIAction={handleUIAction}
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

  const [shoppingClient, setShoppingClient] = useState<Client | null>(null);
  const [analyticsClient, setAnalyticsClient] = useState<Client | null>(null);

  return (
    // @ts-expect-error - React 19 type compatibility issue
    <IframeClientContext.Provider
      value={{ shoppingClient, analyticsClient, setShoppingClient, setAnalyticsClient }}
    >
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
                <strong>Try:</strong> "Show me the shopping cart, then add 2 laptops"
              </p>
              <div
                style={{
                  background: "rgba(255,255,255,0.2)",
                  padding: "12px",
                  borderRadius: "8px",
                  marginTop: "16px",
                  fontSize: "14px",
                }}
              >
                <strong>✨ New:</strong> The AI can now call WebMCP tools inside iframes!<br />
                Try: "Add a laptop to cart" or "Get cart contents"
              </div>
            </div>

            {/* The Thread Messages will render tool UIs here */}
            <div
              style={{
                background: "white",
                borderRadius: "16px",
                padding: "24px",
                minHeight: "500px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              }}
            >
              {/* @ts-expect-error - React 19 type compatibility issue with assistant-ui */}
              <Thread
                assistantMessage={{
                  components: {
                    Text: MCPUIToolUI,
                    ToolFallback: AnalyticsToolUI,
                    ...Object.fromEntries([
                      ...shoppingProxyTools.map((tool, i) => [`tool-${i}`, tool]),
                      ...analyticsProxyTools.map((tool, i) => [`tool-analytics-${i}`, tool]),
                    ]),
                  },
                }}
              />
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
              Ask me to show interfaces and interact with them!<br />
              <span style={{ fontSize: "12px", color: "#999" }}>
                Example: "Show cart, then add 2 smartphones"
              </span>
            </p>
          </div>

          <div style={{ flex: 1, overflow: "auto" }}>
            {/* @ts-expect-error - React 19 type compatibility issue with assistant-ui */}
            <Thread />
          </div>
        </div>
      </div>
    </IframeClientContext.Provider>
  );
}

export default function Home() {
  return <MyAssistant />;
}
