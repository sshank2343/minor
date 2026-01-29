import { useState, useEffect } from "react";
import api from "../services/api";
import useSocket from "../hooks/useSocket";

function ControlPanel() {
  const [targetUrl, setTargetUrl] = useState("http://target-server:3000/healthy");
  const [users, setUsers] = useState(1000);
  const [spawnRate, setSpawnRate] = useState(2);
  const [duration, setDuration] = useState(30);
  const [progressiveMode, setProgressiveMode] = useState(false);
  const [autoRampMode, setAutoRampMode] = useState(true);
  const [initialUsers, setInitialUsers] = useState(1);
  const [userIncrement, setUserIncrement] = useState(5);
  const [stepDuration, setStepDuration] = useState(15);
  const [maxErrorRate, setMaxErrorRate] = useState(10); // Percentage
  const [maxLatencyMs, setMaxLatencyMs] = useState(5000);
  const [loading, setLoading] = useState(false);
  const [currentTestId, setCurrentTestId] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const socket = useSocket();

  // Check for running tests on mount
  useEffect(() => {
    const checkRunningTests = async () => {
      try {
        const response = await api.get("/tests");
        const tests = Array.isArray(response.data) ? response.data : [];
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

  // Listen for test completion via socket
  useEffect(() => {
    if (!socket) return;

    const handleTelemetry = (data) => {
      try {
        if (data && (data.type === "BREAKING_POINT" || data.test_stopped)) {
          setIsRunning(false);
          setCurrentTestId(null);
        }
      } catch (error) {
        console.error("Error handling telemetry:", error);
      }
    };

    socket.on("telemetry", handleTelemetry);

    return () => {
      socket.off("telemetry", handleTelemetry);
    };
  }, [socket]);

  const startTest = async () => {
    try {
      setLoading(true);
      const response = await api.post("/start-test", {
        targetUrl,
        users,
        spawnRate,
        duration,
        progressiveMode,
        autoRampMode,
        initialUsers,
        userIncrement,
        stepDuration,
        maxErrorRate: maxErrorRate / 100, // Convert to decimal
        maxLatencyMs,
        failureWindow: 30,
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
    <div className="bg-gray-800 p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Control Panel</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="md:col-span-2">
          <label className="block text-sm text-gray-400 mb-2">Target URL</label>
          <input
            className="w-full p-2 rounded bg-gray-700"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="http://target-server:3000/healthy"
          />
        </div>

        {autoRampMode ? (
          // Auto-ramp mode - only show what matters
          <>
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Max Users (Safety Limit) 🛡️
              </label>
              <input
                type="number"
                className="w-full p-3 rounded bg-gray-700 text-lg font-semibold"
                value={users}
                onChange={(e) => setUsers(Number(e.target.value))}
                placeholder="1000"
                min="10"
              />
              <p className="text-xs text-gray-500 mt-1">
                Test stops here if breaking point not found
              </p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Step Duration (seconds) ⏱️
              </label>
              <input
                type="number"
                className="w-full p-3 rounded bg-gray-700 text-lg font-semibold"
                value={stepDuration}
                onChange={(e) => setStepDuration(Number(e.target.value))}
                placeholder="15"
                min="5"
                max="120"
              />
              <p className="text-xs text-gray-500 mt-1">
                Time at each load level: 5s=fast, 15s=balanced, 30s=stable
              </p>
            </div>
          </>
        ) : (
          // Standard/Progressive mode - show all fields
          <>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Max Users</label>
              <input
                type="number"
                className="w-full p-2 rounded bg-gray-700"
                value={users}
                onChange={(e) => setUsers(Number(e.target.value))}
                placeholder="Max Users"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Spawn Rate (users/sec)</label>
              <input
                type="number"
                className="w-full p-2 rounded bg-gray-700"
                value={spawnRate}
                onChange={(e) => setSpawnRate(Number(e.target.value))}
                placeholder="Spawn Rate"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Duration (seconds)</label>
              <input
                type="number"
                className="w-full p-2 rounded bg-gray-700"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                placeholder="Duration (s)"
              />
            </div>
          </>
        )}
      </div>

      {/* Auto-Ramp Mode Toggle */}
      <div className="mb-4 p-4 bg-gray-700 rounded">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={autoRampMode}
            onChange={(e) => {
              setAutoRampMode(e.target.checked);
              if (e.target.checked) {
                setProgressiveMode(false); // Can't have both
                setUsers(1000); // Set high safety limit
                setDuration(600); // 10 minutes max
              }
            }}
            className="mr-3 w-5 h-5"
          />
          <div>
            <span className="text-lg font-semibold">🤖 Auto-Discovery Mode</span>
            <p className="text-sm text-gray-400 mt-1">
              Automatically discover API capacity - starts from 0 users and ramps up until breaking point
            </p>
          </div>
        </label>

        {/* Auto-Ramp Configuration */}
        {autoRampMode && (
          <div className="mt-4 pt-4 border-t border-gray-600">
            <h3 className="text-md font-semibold mb-3 text-yellow-400">🎯 Failure Detection Thresholds</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Max Error Rate (%)
                </label>
                <input
                  type="number"
                  className="w-full p-2 rounded bg-gray-600"
                  value={maxErrorRate}
                  onChange={(e) => setMaxErrorRate(Number(e.target.value))}
                  min="1"
                  max="100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Stop when error rate exceeds this threshold
                </p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Max Latency (ms)
                </label>
                <input
                  type="number"
                  className="w-full p-2 rounded bg-gray-600"
                  value={maxLatencyMs}
                  onChange={(e) => setMaxLatencyMs(Number(e.target.value))}
                  min="100"
                  step="100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Stop when response time exceeds this threshold
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progressive Mode Toggle */}
      {!autoRampMode && (
        <div className="mb-4 p-4 bg-gray-700 rounded">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={progressiveMode}
              onChange={(e) => setProgressiveMode(e.target.checked)}
              className="mr-3 w-5 h-5"
            />
            <div>
              <span className="text-lg font-semibold">📈 Progressive Load Testing</span>
              <p className="text-sm text-gray-400 mt-1">
                Automatically ramp up load and stop at breaking point
              </p>
            </div>
          </label>

          {/* Threshold Configuration */}
          {progressiveMode && (
            <div className="mt-4 pt-4 border-t border-gray-600 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Max Error Rate (%)
                </label>
                <input
                  type="number"
                  className="w-full p-2 rounded bg-gray-600"
                  value={maxErrorRate}
                  onChange={(e) => setMaxErrorRate(Number(e.target.value))}
                  min="1"
                  max="100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Stop if error rate exceeds this threshold
                </p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Max Latency (ms)
                </label>
                <input
                  type="number"
                  className="w-full p-2 rounded bg-gray-600"
                  value={maxLatencyMs}
                  onChange={(e) => setMaxLatencyMs(Number(e.target.value))}
                  min="100"
                  step="100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Consider requests slower than this as failures
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={startTest}
          disabled={loading || isRunning}
          className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 font-semibold text-lg"
        >
          {loading ? "Starting..." : autoRampMode ? "🤖 Discover API Capacity" : progressiveMode ? "🚀 Start Progressive Test" : "Start Test"}
        </button>
        
        {isRunning && (
          <button
            onClick={stopTest}
            disabled={loading}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded disabled:opacity-50 font-semibold text-lg"
          >
            {loading ? "Stopping..." : "⏹ Stop"}
          </button>
        )}
      </div>
      
      {autoRampMode && (
        <div className="mt-3 p-3 bg-green-900/30 border border-green-600 rounded text-sm">
          <span className="font-semibold">🤖 Auto-Discovery:</span> System will ramp through sequence: <strong>1 → 2 → 3 → 4 → 5 → 10 → 25 → 50 → 100 → 200 → 300 → 400 → 500 → 1000 → 2000 → 3000 → 4000 → 5000...</strong> (every {stepDuration}s) until breaking point
        </div>
      )}
      
      {progressiveMode && !autoRampMode && (
        <div className="mt-3 p-3 bg-yellow-900/30 border border-yellow-600 rounded text-sm">
          <span className="font-semibold">⚠️ Progressive Mode:</span> Test will automatically stop when API reaches breaking point
        </div>
      )}
    </div>
  );
}

export default ControlPanel;
