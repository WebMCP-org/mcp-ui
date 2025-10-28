"use client";

import { useEffect } from "react";
import { useThread } from "@assistant-ui/react";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

interface WebMCPProxyHandlerProps {
  getClient: () => Client | null;
}

export function WebMCPProxyHandler({ getClient }: WebMCPProxyHandlerProps) {
  const thread = useThread();

  useEffect(() => {
    // Watch for new messages
    const messages = thread.messages;
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage ||  lastMessage.role !== "assistant") return;

    // Check if the last message contains a proxy tool call
    const content = lastMessage.content;
    if (!Array.isArray(content)) return;

    content.forEach(async (part: any) => {
      if (part.type === "tool-call" && part.result) {
        const result = part.result;

        // Check if this is a WebMCP proxy result
        if (result._webmcpProxy) {
          console.log("🔄 Detected WebMCP proxy tool call:", result);

          const client = getClient();
          if (!client) {
            console.warn("⚠️ Client not available for proxy call");
            return;
          }

          try {
            console.log(`📞 Calling iframe tool via proxy: ${result.toolName}`, result.args);
            const toolResult = await client.callTool({
              name: result.toolName,
              arguments: result.args || {},
            });
            console.log("✅ Proxy tool result:", toolResult);

            // You could potentially update the UI here or send a follow-up message
          } catch (error) {
            console.error("❌ Proxy tool call failed:", error);
          }
        }
      }
    });
  }, [thread.messages, getClient]);

  return null; // This is a logic-only component
}
