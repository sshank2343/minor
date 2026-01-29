import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import useSocket from "../hooks/useSocket";

function MetricsChart() {
  const [data, setData] = useState([]);
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on("telemetry", (metric) => {
      setData((prev) => {
        const next = [
          ...prev,
          {
            time: new Date(metric.timestamp * 1000).toLocaleTimeString(),
            latency: metric.latency_ms,
          },
        ];

        // keep last 30 points only
        return next.slice(-30);
      });
    });

    return () => {
      socket.off("telemetry");
    };
  }, [socket]);

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow h-80">
      <h2 className="text-xl font-semibold mb-2">Latency (ms)</h2>

      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="latency"
            stroke="#3b82f6"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default MetricsChart;
