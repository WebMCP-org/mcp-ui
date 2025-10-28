import { openai } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";

// MCP client to call our server
async function callMCPTool(toolName: string, args: Record<string, unknown> = {}) {
  try {
    // Initialize session
    const initResponse = await fetch("http://localhost:3001/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "webmcp-assistant", version: "1.0.0" },
        },
      }),
    });

    const initResult = await initResponse.json();
    const sessionId = initResponse.headers.get("Mcp-Session-Id");

    if (!sessionId) {
      throw new Error("No session ID received from MCP server");
    }

    // Call the tool
    const toolResponse = await fetch("http://localhost:3001/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "mcp-session-id": sessionId,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: toolName, arguments: args },
      }),
    });

    const toolResult = await toolResponse.json();

    if (toolResult.error) {
      throw new Error(toolResult.error.message);
    }

    return toolResult.result;
  } catch (error) {
    console.error("Error calling MCP tool:", error);
    throw error;
  }
}

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: `You are a helpful assistant with access to a shopping cart and analytics dashboard via MCP-UI.

When users ask to see the shopping cart or add items to cart, use the showShoppingCart tool.
When users ask about analytics, sales data, or dashboard, use the showAnalyticsDashboard tool.

Important: These tools return UI resources that will be rendered in the interface. After calling a tool, briefly explain what you've shown them.`,
    messages,
    tools: {
      showShoppingCart: tool({
        description: "Display an interactive shopping cart with WebMCP tools. Use this when users want to see the cart, manage products, or shop.",
        parameters: z.object({}),
        execute: async () => {
          const result = await callMCPTool("showShoppingCart");
          return result;
        },
      }),
      showAnalyticsDashboard: tool({
        description: "Display an analytics dashboard with sales data and user statistics. Use this when users ask about analytics, metrics, or dashboard.",
        parameters: z.object({}),
        execute: async () => {
          const result = await callMCPTool("showAnalyticsDashboard");
          return result;
        },
      }),
    },
  });

  return result.toDataStreamResponse();
}
