import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import useSocket from "../hooks/useSocket";

function MetricsChart() {
  const [data, setData] = useState([]);
  const [breakingPoint, setBreakingPoint] = useState(null);
  const [currentMetrics, setCurrentMetrics] = useState({
    users: 0,
    rampStage: 0,
    rps: 0,
    avgLatency: 0,
    p95Latency: 0,
    p99Latency: 0,
    errorRate: 0,
    timeoutRate: 0,
  });
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleBreakingPoint = (data) => {
      try {
        if (data && data.breakingPoint) {
          setBreakingPoint(data.breakingPoint);
        }
      } catch (error) {
        console.error("Error handling breaking point:", error);
      }
    };

    const handleTelemetry = (metric) => {
      try {
        if (!metric || !metric.timestamp) return;

        console.log("📊 Received telemetry:", {
          users: metric.users,
          rps: metric.rps,
          p95_latency: metric.p95_latency,
          p95Latency: metric.p95Latency,
          error_rate: metric.error_rate,
          errorRate: metric.errorRate,
        });

        // Support both snake_case and camelCase
        const users = metric.users || 0;
        const rps = metric.rps || 0;
        const avgLatency = metric.avg_latency || metric.avgLatency || 0;
        const p95Latency = metric.p95_latency || metric.p95Latency || metric.p95 || 0;
        const p99Latency = metric.p99_latency || metric.p99Latency || metric.p99 || 0;
        const errorRate = metric.error_rate !== undefined ? metric.error_rate : (metric.errorRate || 0);
        const timeoutRate = metric.timeout_rate !== undefined ? metric.timeout_rate : (metric.timeoutRate || 0);
        const rampStage = metric.ramp_stage || metric.rampStage || 0;

        // Update current metrics display
        setCurrentMetrics({
          users,
          rampStage,
          rps,
          avgLatency,
          p95Latency,
          p99Latency,
          errorRate,
          timeoutRate,
        });

        // Add data point to chart
        setData((prev) => {
          const next = [
            ...prev,
            {
              time: new Date(metric.timestamp * 1000).toLocaleTimeString(),
              users,
              rps,
              avgLatency,
              p95Latency,
              p99Latency,
              errorRate: errorRate * 100,
              timeoutRate: timeoutRate * 100,
              timestamp: metric.timestamp,
            },
          ];

          // Keep last 100 points
          return next.slice(-100);
        });
      } catch (error) {
        console.error("Error handling telemetry:", error);
      }
    };

    socket.on("breaking-point", handleBreakingPoint);
    socket.on("telemetry", handleTelemetry);

    return () => {
      socket.off("breaking-point", handleBreakingPoint);
      socket.off("telemetry", handleTelemetry);
    };
  }, [socket]);

  return (
    <div className="bg-gray-800 p-3 md:p-4 rounded-lg shadow">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg md:text-xl font-semibold">📊 Live Performance Metrics</h2>
        {breakingPoint && (
          <div className="bg-red-600 px-2 md:px-3 py-1 rounded text-xs md:text-sm font-semibold animate-pulse">
            🚨 BREAKING POINT REACHED
          </div>
        )}
      </div>

      {/* Current Metrics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <div className="bg-gray-700 p-3 rounded">
          <div className="text-xs text-gray-400">Concurrent Users</div>
          <div className="text-2xl font-bold text-blue-400">{currentMetrics.users}</div>
          <div className="text-xs text-gray-500">Stage {currentMetrics.rampStage}</div>
        </div>

        <div className="bg-gray-700 p-3 rounded">
          <div className="text-xs text-gray-400">Requests/sec</div>
          <div className="text-2xl font-bold text-green-400">{currentMetrics.rps}</div>
          <div className="text-xs text-gray-500">RPS</div>
        </div>

        <div className="bg-gray-700 p-3 rounded">
          <div className="text-xs text-gray-400">P95 Latency</div>
          <div className="text-2xl font-bold text-yellow-400">{currentMetrics.p95Latency}ms</div>
          <div className="text-xs text-gray-500">95th percentile</div>
        </div>

        <div className="bg-gray-700 p-3 rounded">
          <div className="text-xs text-gray-400">Error Rate</div>
          <div className="text-2xl font-bold text-red-400">{(currentMetrics.errorRate * 100).toFixed(1)}%</div>
          <div className="text-xs text-gray-500">Failures</div>
        </div>
      </div>

      {breakingPoint && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-600 rounded text-sm">
          <div className="font-semibold text-red-400 mb-2">🚨 Breaking Point Detected</div>
          <div className="grid grid-cols-2 gap-2 text-gray-300">
            <div><strong>Reason:</strong> {breakingPoint.reason}</div>
            <div><strong>Users at Failure:</strong> {breakingPoint.usersAtFailure || breakingPoint.users_at_failure || "N/A"}</div>
            <div><strong>Peak RPS:</strong> {breakingPoint.peakRps || breakingPoint.peak_rps || "N/A"} req/s</div>
            <div><strong>P95 Latency:</strong> {breakingPoint.p95Latency || breakingPoint.p95_latency || "N/A"}ms</div>
            <div><strong>Error Rate:</strong> {((breakingPoint.errorRate || breakingPoint.error_rate || 0) * 100).toFixed(2)}%</div>
            <div><strong>Timeout Rate:</strong> {((breakingPoint.timeoutRate || breakingPoint.timeout_rate || 0) * 100).toFixed(2)}%</div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="space-y-3">
        {/* Users and RPS Chart */}
        <div>
          <h3 className="text-sm font-semibold mb-2 text-gray-300">Users & RPS Over Time</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" style={{ fontSize: 10 }} />
              <YAxis stroke="#9CA3AF" style={{ fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                labelStyle={{ color: '#F3F4F6' }}
              />
              <Legend />
              <Line type="monotone" dataKey="users" stroke="#3B82F6" name="Users" dot={false} />
              <Line type="monotone" dataKey="rps" stroke="#10B981" name="RPS" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Latency Chart (P95, P99) */}
        <div>
          <h3 className="text-sm font-semibold mb-2 text-gray-300">Latency Percentiles (ms)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" style={{ fontSize: 10 }} />
              <YAxis stroke="#9CA3AF" style={{ fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                labelStyle={{ color: '#F3F4F6' }}
              />
              <Legend />
              <Line type="monotone" dataKey="avgLatency" stroke="#6366F1" name="Avg" dot={false} />
              <Line type="monotone" dataKey="p95Latency" stroke="#F59E0B" name="P95" dot={false} />
              <Line type="monotone" dataKey="p99Latency" stroke="#EF4444" name="P99" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Error and Timeout Rate Chart */}
        <div>
          <h3 className="text-sm font-semibold mb-2 text-gray-300">Error & Timeout Rates (%)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" style={{ fontSize: 10 }} />
              <YAxis stroke="#9CA3AF" style={{ fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                labelStyle={{ color: '#F3F4F6' }}
              />
              <Legend />
              <Line type="monotone" dataKey="errorRate" stroke="#DC2626" name="Error Rate" dot={false} />
              <Line type="monotone" dataKey="timeoutRate" stroke="#F97316" name="Timeout Rate" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {data.length === 0 && (
        <div className="flex items-center justify-center h-[150px] text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <div>Waiting for test data...</div>
            <div className="text-xs mt-1">Start a test to see live metrics</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MetricsChart;
