import { useState, useEffect } from "react";
import api from "../services/api";
import useSocket from "../hooks/useSocket";

function AIReport() {
  const [latestReport, setLatestReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pollInterval, setPollInterval] = useState(null);
  const socket = useSocket();

  useEffect(() => {
    fetchLatestReport();
  }, []);

  // Listen for AI analysis updates via socket
  useEffect(() => {
    if (!socket) return;

    const handleAIAnalysis = (data) => {
      console.log("🔔 AI Analysis received via WebSocket:", data);
      if (data && data.aiAnalysis) {
        setLatestReport(data);
        console.log("✅ AI Analysis updated in UI");
        // Stop polling if it's running
        if (pollInterval) {
          clearInterval(pollInterval);
          setPollInterval(null);
        }
      } else {
        console.warn("⚠️ Received data missing aiAnalysis field:", data);
      }
    };

    socket.on("ai-analysis", handleAIAnalysis);
    console.log("👂 Listening for 'ai-analysis' WebSocket events");

    return () => {
      socket.off("ai-analysis", handleAIAnalysis);
    };
  }, [socket, pollInterval]);

  // Listen for breaking point detection and start polling for AI analysis
  useEffect(() => {
    if (!socket) return;

    const handleTelemetry = (data) => {
      if (data && data.type === "BREAKING_POINT") {
        console.log("🔥 Breaking point detected, starting AI analysis polling...");
        // Start polling for AI analysis every 5 seconds
        const interval = setInterval(() => {
          console.log("🔄 Polling for AI analysis...");
          fetchLatestReport();
        }, 5000);
        setPollInterval(interval);
        
        // Stop polling after 2 minutes
        setTimeout(() => {
          if (interval) {
            clearInterval(interval);
            setPollInterval(null);
            console.log("⏹️ Stopped AI analysis polling");
          }
        }, 120000);
      }
    };

    socket.on("telemetry", handleTelemetry);

    return () => {
      socket.off("telemetry", handleTelemetry);
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [socket]);

  const fetchLatestReport = async () => {
    try {
      setLoading(true);
      const response = await api.get("/tests");
      const tests = response.data.tests || [];
      
      // Find the latest test with AI analysis
      const testWithAnalysis = tests.find(test => test.aiAnalysis);
      setLatestReport(testWithAnalysis);
    } catch (error) {
      console.error("Failed to fetch AI report:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 p-3 md:p-4 rounded-lg shadow">
        <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">🤖 AI Analysis</h2>
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  if (!latestReport || !latestReport.aiAnalysis) {
    return (
      <div className="bg-gray-800 p-3 md:p-4 rounded-lg shadow">
        <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">🤖 AI Analysis</h2>
        <p className="text-gray-400 text-sm">No AI analysis available yet. Run a test to generate insights.</p>
      </div>
    );
  }

  const { aiAnalysis, breakingPoint, status } = latestReport;

  return (
    <div className="bg-gray-800 p-3 md:p-4 rounded-lg shadow">
      <div className="flex justify-between items-center mb-3 md:mb-4">
        <h2 className="text-lg md:text-xl font-semibold">🤖 Root Cause Analysis</h2>
        <span className={`px-3 py-1 rounded text-sm ${
          status === "BREAKING_POINT" ? "bg-red-600" : 
          status === "COMPLETED" ? "bg-green-600" : "bg-gray-600"
        }`}>
          {status}
        </span>
      </div>

      {/* Endpoint Info */}
      {aiAnalysis.endpoint && (
        <div className="mb-4 p-3 bg-blue-900/30 border border-blue-700 rounded">
          <h3 className="font-semibold text-blue-400 mb-1">🎯 Endpoint</h3>
          <code className="text-gray-200">{aiAnalysis.endpoint}</code>
        </div>
      )}

      {/* Breaking Point Summary */}
      <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded">
        <h3 className="font-semibold text-red-400 mb-2">⚠️ Breaking Point</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="text-gray-400">Breaking Point</div>
            <div className="text-lg font-bold text-red-400">{aiAnalysis.breaking_point_users || aiAnalysis.breakingPointUsers} users</div>
          </div>
          <div>
            <div className="text-gray-400">Stable Users</div>
            <div className="text-lg font-bold text-green-400">{aiAnalysis.stable_users || aiAnalysis.stableUsers} users</div>
          </div>
          <div>
            <div className="text-gray-400">Failure Type</div>
            <div className="text-lg font-bold text-orange-400">{aiAnalysis.failure_type || aiAnalysis.failureType}</div>
          </div>
          <div>
            <div className="text-gray-400">P95 Latency</div>
            <div className="text-lg font-bold text-yellow-400">{aiAnalysis.evidence?.p95_latency_ms || aiAnalysis.evidence?.p95LatencyMs}ms</div>
          </div>
        </div>
      </div>

      {/* Root Cause */}
      <div className="mb-4">
        <h3 className="font-semibold text-orange-400 mb-2">🔍 Root Cause</h3>
        <p className="text-gray-300 bg-gray-900/50 p-3 rounded">
          {aiAnalysis.root_cause || aiAnalysis.rootCause}
        </p>
      </div>

      {/* Evidence */}
      {aiAnalysis.evidence && (
        <div className="mb-4">
          <h3 className="font-semibold text-yellow-400 mb-2">📊 Evidence</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            <div className="bg-gray-900/50 p-2 rounded">
              <div className="text-gray-400">Error Rate</div>
              <div className="text-lg font-bold text-red-400">
                {((aiAnalysis.evidence.error_rate || aiAnalysis.evidence.errorRate || 0) * 100).toFixed(2)}%
              </div>
            </div>
            <div className="bg-gray-900/50 p-2 rounded">
              <div className="text-gray-400">Timeout Rate</div>
              <div className="text-lg font-bold text-orange-400">
                {((aiAnalysis.evidence.timeout_rate || aiAnalysis.evidence.timeoutRate || 0) * 100).toFixed(2)}%
              </div>
            </div>
            <div className="bg-gray-900/50 p-2 rounded">
              <div className="text-gray-400">Status Code</div>
              <div className="text-lg font-bold text-blue-400">
                {aiAnalysis.evidence.dominant_status_code || aiAnalysis.evidence.dominantStatusCode}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && (
        <div>
          <h3 className="font-semibold text-green-400 mb-2">💡 Recommendations</h3>
          <ul className="space-y-2">
            {aiAnalysis.recommendations.map((rec, index) => (
              <li key={index} className="text-gray-300 text-sm bg-gray-900/50 p-3 rounded flex">
                <span className="text-green-400 mr-2 flex-shrink-0">✓</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Generated Time */}
      {aiAnalysis.generatedAt && (
        <div className="text-xs text-gray-500 text-right mt-4">
          Generated: {new Date(aiAnalysis.generatedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}

export default AIReport;

