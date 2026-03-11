import { useState, useEffect } from "react";
import api from "../services/api";
import useSocket from "../hooks/useSocket";

function ControlPanel() {
  // Single Endpoint Configuration
  const [baseUrl, setBaseUrl] = useState("http://target-server:3000");
  const [endpointPath, setEndpointPath] = useState("/cpu-heavy");
  const [method, setMethod] = useState("GET");
  const [headers, setHeaders] = useState({});
  const [body, setBody] = useState("");
  
  // Mode Selection
  const [autoDiscoveryMode, setAutoDiscoveryMode] = useState(true);
  
  // Ramp Configuration (only used when autoDiscoveryMode is false)
  const [startUsers, setStartUsers] = useState(20);
  const [stepUsers, setStepUsers] = useState(20);
  const [stepDurationSec, setStepDurationSec] = useState(15);
  const [maxUsers, setMaxUsers] = useState(1000);
  
  // Stop Conditions
  const [maxErrorRate, setMaxErrorRate] = useState(5); // Percentage (5%)
  const [maxP95LatencyMs, setMaxP95LatencyMs] = useState(2000);
  const [maxTimeoutRate, setMaxTimeoutRate] = useState(3); // Percentage (3%)
  
  const [loading, setLoading] = useState(false);
  const [currentTestId, setCurrentTestId] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const socket = useSocket();

  // Check for running tests on mount
  useEffect(() => {
    const checkRunningTests = async () => {
      try {
        const response = await api.get("/tests");
        const tests = Array.isArray(response.data.tests) ? response.data.tests : (Array.isArray(response.data) ? response.data : []);
        const runningTest = tests.find(test => test.status === "RUNNING");
        if (runningTest) {
          setCurrentTestId(runningTest._id);
          setIsRunning(true);
        }
      } catch (error) {
        console.error("Failed to check running tests:", error);
      }
    };
    checkRunningTests();
  }, []);

  // Listen for breaking point detection via socket
  useEffect(() => {
    if (!socket) return;

    const handleBreakingPoint = (data) => {
      try {
        if (data && data.breakingPoint) {
          setIsRunning(false);
        }
      } catch (error) {
        console.error("Error handling breaking point:", error);
      }
    };

    socket.on("breaking-point", handleBreakingPoint);

    return () => {
      socket.off("breaking-point", handleBreakingPoint);
    };
  }, [socket]);

  const startTest = async () => {
    try {
      setLoading(true);
      
      // Parse body if POST/PUT/PATCH
      let parsedBody = null;
      if (["POST", "PUT", "PATCH"].includes(method) && body.trim()) {
        try {
          parsedBody = JSON.parse(body);
        } catch (e) {
          alert("Invalid JSON body");
          return;
        }
      }
      
      const response = await api.post("/start-test", {
        baseUrl: baseUrl.trim(),
        endpointPath: endpointPath.trim(),
        method,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        body: parsedBody,
        autoDiscoveryMode,
        ramp: autoDiscoveryMode ? {
          // In auto-discovery mode, backend will use intelligent ramping
          startUsers: 1,
          stepUsers: null, // Let backend decide
          stepDurationSec: 10,
          maxUsers: 10000, // Safety limit
        } : {
          startUsers,
          stepUsers,
          stepDurationSec,
          maxUsers,
        },
        stopConditions: {
          maxErrorRate: maxErrorRate / 100, // Convert to decimal
          maxP95LatencyMs,
          maxTimeoutRate: maxTimeoutRate / 100, // Convert to decimal
        },
      });
      setCurrentTestId(response.data.testRun._id);
      setIsRunning(true);
    } catch (error) {
      console.error("Failed to start test", error);
      alert("Failed to start test: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const stopTest = async () => {
    if (!currentTestId) return;
    try {
      setLoading(true);
      await api.post(`/stop-test/${currentTestId}`);
      setIsRunning(false);
      setCurrentTestId(null);
    } catch (error) {
      console.error("Failed to stop test", error);
      alert("Failed to stop test: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 md:p-5">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-1">🎯 Breaking Point Finder</h2>
        <p className="text-blue-100 text-xs md:text-sm">Discover your endpoint's capacity limits with intelligent load testing</p>
      </div>

      <div className="p-4 md:p-5 lg:p-6 space-y-4 md:space-y-5">
        {/* Endpoint Configuration */}
        <div className="bg-gray-800 rounded-lg p-4 md:p-5 border border-gray-700">
          <div className="flex items-center mb-3 md:mb-4">
            <span className="text-xl md:text-2xl mr-2">🌐</span>
            <h3 className="text-base md:text-lg font-semibold text-white">Endpoint Configuration</h3>
          </div>
          
          <div className="space-y-3 md:space-y-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">Base URL</label>
              <input
                className="w-full px-4 py-2.5 rounded-md bg-gray-900 border border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://target-server:3000"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Endpoint Path</label>
                <input
                  className="w-full px-4 py-2.5 rounded-md bg-gray-900 border border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  value={endpointPath}
                  onChange={(e) => setEndpointPath(e.target.value)}
                  placeholder="/cpu-heavy"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">HTTP Method</label>
                <select
                  className="w-full px-4 py-2.5 rounded-md bg-gray-900 border border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition appearance-none cursor-pointer"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>
            </div>

            {["POST", "PUT", "PATCH"].includes(method) && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Request Body (JSON)</label>
                <textarea
                  className="w-full px-4 py-2.5 rounded-md bg-gray-900 border border-gray-600 text-white placeholder-gray-500 font-mono text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  rows="4"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder='{\n  "key": "value"\n}'
                />
              </div>
            )}
          </div>
        </div>

        {/* Ramp Configuration */}
        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <span className="text-2xl mr-2">⚡</span>
              <h3 className="text-lg font-semibold text-white">Ramp Configuration</h3>
            </div>
            
            {/* Auto Discovery Toggle */}
            <label className="flex items-center cursor-pointer group">
              <span className="text-sm font-medium text-gray-300 mr-3">🤖 Auto Discovery</span>
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={autoDiscoveryMode}
                  onChange={(e) => setAutoDiscoveryMode(e.target.checked)}
                />
                <div className={`block w-14 h-8 rounded-full transition ${
                  autoDiscoveryMode ? 'bg-blue-600' : 'bg-gray-600'
                }`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition ${
                  autoDiscoveryMode ? 'transform translate-x-6' : ''
                }`}></div>
              </div>
            </label>
          </div>

          {autoDiscoveryMode ? (
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-300 mb-2">🚀 Intelligent Ramping Enabled</h4>
              <p className="text-xs text-gray-400 mb-3">
                The system will automatically discover your breaking point using an intelligent ramping strategy:
              </p>
              <div className="text-xs text-gray-300 font-mono bg-gray-900/50 p-3 rounded">
                1 → 2 → 3 → 4 → 5 → 10 → 20 → 30 → 40 → 50 → 100 → 200 → 300 → 400 → 500 → 1000 → 2000 ...
              </div>
              <p className="text-xs text-gray-500 mt-2">
                ⚡ Each step runs for 10 seconds • 🛡️ Safety limit: 10,000 users
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Start Users</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 rounded-md bg-gray-900 border border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    value={startUsers}
                    onChange={(e) => setStartUsers(Number(e.target.value))}
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Step Users</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 rounded-md bg-gray-900 border border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    value={stepUsers}
                    onChange={(e) => setStepUsers(Number(e.target.value))}
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Step Duration (s)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 rounded-md bg-gray-900 border border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    value={stepDurationSec}
                    onChange={(e) => setStepDurationSec(Number(e.target.value))}
                    min="5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Max Users</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 rounded-md bg-gray-900 border border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                value={maxUsers}
                onChange={(e) => setMaxUsers(Number(e.target.value))}
                min="10"
              />
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-3 leading-relaxed">
            Start at <span className="text-blue-400 font-semibold">{startUsers}</span> users → increase by <span className="text-blue-400 font-semibold">{stepUsers}</span> every <span className="text-blue-400 font-semibold">{stepDurationSec}s</span> → until breaking point or <span className="text-blue-400 font-semibold">{maxUsers}</span> users
          </p>
            </>
          )}
        </div>

        {/* Stop Conditions */}
        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
          <div className="flex items-center mb-4">
            <span className="text-2xl mr-2">🛑</span>
            <h3 className="text-lg font-semibold text-white">Stop Conditions</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Error Rate (%)
              </label>
              <input
                type="number"
                className="w-full px-4 py-2.5 rounded-md bg-gray-900 border border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                value={maxErrorRate}
                onChange={(e) => setMaxErrorRate(Number(e.target.value))}
                min="1"
                max="100"
                step="0.1"
              />
              <p className="text-xs text-gray-500 mt-2">Stop if error rate exceeds this</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max P95 Latency (ms)
              </label>
              <input
                type="number"
                className="w-full px-4 py-2.5 rounded-md bg-gray-900 border border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                value={maxP95LatencyMs}
                onChange={(e) => setMaxP95LatencyMs(Number(e.target.value))}
                min="100"
                step="100"
              />
              <p className="text-xs text-gray-500 mt-2">Stop if P95 latency exceeds this</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Timeout Rate (%)
              </label>
              <input
                type="number"
                className="w-full px-4 py-2.5 rounded-md bg-gray-900 border border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                value={maxTimeoutRate}
                onChange={(e) => setMaxTimeoutRate(Number(e.target.value))}
                min="1"
                max="100"
                step="0.1"
              />
              <p className="text-xs text-gray-500 mt-2">Stop if timeout rate exceeds this</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={startTest}
            disabled={loading || isRunning}
            className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Starting Test...
              </span>
            ) : isRunning ? (
              <span className="flex items-center justify-center">
                <span className="animate-pulse mr-2">●</span>
                Test Running...
              </span>
            ) : (
              "🚀 Find Breaking Point"
            )}
          </button>
          
          {isRunning && (
            <button
              onClick={stopTest}
              disabled={loading}
              className="px-8 py-4 bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {loading ? "Stopping..." : "⏹️ Stop"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ControlPanel;
