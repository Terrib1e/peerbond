/**
 * Agent Tester Component - Interactive interface for testing agents and tools
 * Demonstrates how to use the agent system easily
 */

import React, { useState, useEffect } from 'react';
import { agentService, Agent, Tool, AgentCallResponse } from '@/services/agentService';

const AgentTester: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [response, setResponse] = useState<AgentCallResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [showDescriptions, setShowDescriptions] = useState<boolean>(false);
  const [agentDescriptions, setAgentDescriptions] = useState<string>('');
  const [toolDescriptions, setToolDescriptions] = useState<string>('');

  // Load agents and tools on component mount
  useEffect(() => {
    loadAgentsAndTools();
    loadDescriptions();
  }, []);

  // Generate a properly formatted session ID
  const generateSessionId = () => {
    const timestamp = Date.now();
    const uuid = crypto.randomUUID();
    const newSessionId = `session_${timestamp}_${uuid}`;
    setSessionId(newSessionId);
  };

  const loadAgentsAndTools = async () => {
    try {
      const data = await agentService.getAvailableAgentsAndTools();
      setAgents(data.agents);
      setTools(data.tools);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to load agents and tools: ${errorMessage}`);
    }
  };

  const loadDescriptions = async () => {
    try {
      const [agentDesc, toolDesc] = await Promise.all([
        agentService.getAgentDescriptions(),
        agentService.getToolDescriptions()
      ]);
      setAgentDescriptions(agentDesc);
      setToolDescriptions(toolDesc);
    } catch (err) {
      console.error('Error loading descriptions:', err);
    }
  };

  const handleCallAgent = async () => {
    if (!selectedAgent || !message || !sessionId) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');
    setResponse(null);

    try {
      const result = await agentService.callAgent(
        selectedAgent,
        message,
        sessionId,
        selectedTool || undefined
      );
      setResponse(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to call agent: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetRecommendation = async () => {
    if (!message || !sessionId) {
      setError('Please enter a message and session ID');
      return;
    }

    setLoading(true);
    setError('');
    setResponse(null);

    try {
      const result = await agentService.callRecommendedAgent(message, sessionId);
      setSelectedAgent(result.recommendation);
      setResponse(result.result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to get recommendation: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const availableTools = tools.filter(tool => tool.agent === selectedAgent);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          🤖 PeerBond Agent Tester
        </h2>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Toggle Descriptions */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setShowDescriptions(!showDescriptions)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            {showDescriptions ? 'Hide' : 'Show'} Agent & Tool Descriptions
          </button>
          
          <button
            onClick={() => {
              setError('');
              loadAgentsAndTools();
            }}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            Reload Agents
          </button>

          <div className="text-sm text-gray-600 flex items-center">
            {agents.length > 0 ? (
              <span className="text-green-600">✅ {agents.length} agents loaded</span>
            ) : (
              <span className="text-red-600">❌ No agents loaded</span>
            )}
          </div>
        </div>

        {/* Descriptions */}
        {showDescriptions && (
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-semibold mb-2">Agents</h3>
              <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-60">
                {agentDescriptions}
              </pre>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-semibold mb-2">Tools</h3>
              <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-60">
                {toolDescriptions}
              </pre>
            </div>
          </div>
        )}

        {/* Input Form */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session ID *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="session_1234567890_abc-def..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={generateSessionId}
                className="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md text-sm"
                title="Generate a valid session ID"
              >
                Generate
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Agent *
            </label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              title="Select an agent to test"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose an agent...</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Tool (Optional)
            </label>
            <select
              value={selectedTool}
              onChange={(e) => setSelectedTool(e.target.value)}
              title="Select a specific tool or use default tools"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!selectedAgent}
            >
              <option value="">Use default tools</option>
              {availableTools.map((tool) => (
                <option key={tool.name} value={tool.name}>
                  {tool.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message to send to the agent..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={handleCallAgent}
            disabled={loading || !selectedAgent || !message || !sessionId}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-2 rounded"
          >
            {loading ? 'Calling...' : 'Call Selected Agent'}
          </button>

          <button
            onClick={handleGetRecommendation}
            disabled={loading || !message || !sessionId}
            className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white px-6 py-2 rounded"
          >
            {loading ? 'Getting...' : 'Get Agent Recommendation'}
          </button>
        </div>

        {/* Response Display */}
        {response && (
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-semibold text-lg mb-3">Agent Response</h3>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <strong>Agent Used:</strong> {response.agentUsed}
              </div>
              <div>
                <strong>Confidence:</strong> {(response.confidence * 100).toFixed(1)}%
              </div>
              <div>
                <strong>Success:</strong> {response.success ? '✅' : '❌'}
              </div>
              <div>
                <strong>Tools Used:</strong> {response.toolsUsed?.join(', ') || 'None specified'}
              </div>
            </div>

            <div className="mb-4">
              <strong>Response:</strong>
              <div className="mt-2 p-3 bg-white border rounded">
                <pre className="whitespace-pre-wrap text-sm">
                  {response.response}
                </pre>
              </div>
            </div>

            {response.metadata && (
              <div>
                <strong>Metadata:</strong>
                <pre className="mt-2 p-3 bg-white border rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(response.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Quick Examples */}
        <div className="mt-8 pt-6 border-t">
          <h3 className="font-semibold text-lg mb-3">Quick Test Examples</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-3 rounded">
              <strong>Group Matching:</strong>
              <p className="text-sm mt-1">"I'm looking for a support group for anxiety"</p>
              <p className="text-xs text-gray-600">→ Should route to matching agent</p>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <strong>Crisis Support:</strong>
              <p className="text-sm mt-1">"I'm feeling hopeless and can't cope"</p>
              <p className="text-xs text-gray-600">→ Should route to crisis agent</p>
            </div>
            <div className="bg-purple-50 p-3 rounded">
              <strong>Progress Insight:</strong>
              <p className="text-sm mt-1">"How am I doing on my mental health journey?"</p>
              <p className="text-xs text-gray-600">→ Should route to insight agent</p>
            </div>
            <div className="bg-yellow-50 p-3 rounded">
              <strong>General Support:</strong>
              <p className="text-sm mt-1">"I'm feeling stressed about work"</p>
              <p className="text-xs text-gray-600">→ Should route to facilitator agent</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentTester;