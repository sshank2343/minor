import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import useSocket from "../hooks/useSocket";

function MetricsChart() {
  const [data, setData] = useState([]);
  const [breakingPoint, setBreakingPoint] = useState(null);
  const [currentRps, setCurrentRps] = useState(0);
  const [peakRps, setPeakRps] = useState(0);
  const [chartError, setChartError] = useState(false);
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleTelemetry = (metric) => {
      try {
        if (!metric) return;

        // Handle breaking point
        if (metric.type === "BREAKING_POINT") {
          setBreakingPoint(metric.breaking_point);
          return;
        }

        // Update RPS tracking
        if (metric.current_rps !== undefined) {
          setCurrentRps(metric.current_rps);
        }
        if (metric.peak_rps !== undefined) {
          setPeakRps(metric.peak_rps);
        }

        // Only add valid data points
        if (metric.timestamp) {
          setData((prev) => {
            const next = [
              ...prev,
              {
                time: new Date(metric.timestamp * 1000).toLocaleTimeString(),
                latency: metric.latency_ms > 0 ? metric.latency_ms : null,
                errorRate: metric.error_rate ? metric.error_rate * 100 : 0,
                rps: metric.current_rps || 0,
                users: metric.current_users || 0,
                timestamp: metric.timestamp,
              },
            ];

            // Keep last 50 points
            return next.slice(-50);
          });
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

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-semibold">Performance Metrics</h2>
        <div className="flex gap-3">
          {currentRps > 0 && (
            <div className="bg-blue-600 px-3 py-1 rounded text-sm font-semibold">
              📊 {currentRps} RPS
            </div>
          )}
          {peakRps > 0 && (
            <div className="bg-purple-600 px-3 py-1 rounded text-sm font-semibold">
              🔥 Peak: {peakRps} RPS
            </div>
          )}
          {breakingPoint && (
            <div className="bg-red-600 px-3 py-1 rounded text-sm font-semibold">
              🚨 BREAKING POINT
            </div>
          )}
        </div>
      </div>

      {breakingPoint && (
        <div className="mb-3 p-3 bg-red-900/30 border border-red-600 rounded text-sm">
          <div className="font-semibold text-red-400 mb-2">🚨 API Capacity Discovered</div>
          <div className="grid grid-cols-2 gap-2 text-gray-300">
            <div><strong>Reason:</strong> {breakingPoint.reason}</div>
            <div><strong>Max Users:</strong> {breakingPoint.users_at_failure || "N/A"}</div>
            <div><strong>Peak RPS:</strong> {breakingPoint.peak_rps || "N/A"} req/s</div>
            <div><strong>Avg RPS:</strong> {breakingPoint.avg_rps ? breakingPoint.avg_rps.toFixed(2) : "N/A"} req/s</div>
            <div><strong>Total Requests:</strong> {breakingPoint.total_requests}</div>
            <div><strong>Failed:</strong> {breakingPoint.failed_requests}</div>
            <div><strong>Error Rate:</strong> {(breakingPoint.error_rate * 100).toFixed(2)}%</div>
            <div><strong>Duration:</strong> {breakingPoint.elapsed_time ? breakingPoint.elapsed_time.toFixed(1) : "N/A"}s</div>
          </div>
        </div>
      )}

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[300px] text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <div>Waiting for test data...</div>
            <div className="text-xs mt-1">Start a test to see metrics</div>
          </div>
        </div>
      ) : chartError ? (
        <div className="flex items-center justify-center h-[300px] text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-2">⚠️</div>
            <div>Chart rendering error</div>
            <div className="text-xs mt-1">Data is being collected but cannot be displayed</div>
          </div>
        </div>
      ) : (
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="time" 
                stroke="#9CA3AF"
                tick={{ fontSize: 12 }}
                allowDataOverflow={false}
              />
              <YAxis 
                yAxisId="left"
                stroke="#9CA3AF"
                label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
                allowDataOverflow={false}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="#EF4444"
                label={{ value: 'Error Rate (%)', angle: 90, position: 'insideRight', fill: '#EF4444' }}
                allowDataOverflow={false}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
              />
              <Legend />
              
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="latency"
                stroke="#3B82F6"
                name="Latency (ms)"
                dot={false}
                strokeWidth={2}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="errorRate"
                stroke="#EF4444"
                name="Error Rate (%)"
                dot={false}
                strokeWidth={2}
                connectNulls
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-2 text-xs text-gray-400 text-center">
        {data.length > 0 ? `Showing last ${data.length} data points` : "Waiting for metrics..."}
      </div>
    </div>
  );
}

export default MetricsChart;
