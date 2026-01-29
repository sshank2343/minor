import { useEffect, useState } from "react";
import useSocket from "../hooks/useSocket";

function SystemHealth() {
  const socket = useSocket();
  const [status, setStatus] = useState("UNKNOWN");
  const [lastSeen, setLastSeen] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleTelemetry = () => {
      try {
        setStatus("HEALTHY");
        setLastSeen(new Date().toLocaleTimeString());
      } catch (error) {
        console.error("Error handling telemetry in SystemHealth:", error);
      }
    };

    socket.on("telemetry", handleTelemetry);

    return () => {
      socket.off("telemetry", handleTelemetry);
    };
  }, [socket]);

  const color =
    status === "HEALTHY"
      ? "bg-green-600"
      : status === "UNKNOWN"
      ? "bg-gray-600"
      : "bg-red-600";

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow h-80 flex flex-col justify-center items-center">
      <h2 className="text-xl font-semibold mb-4">System Health</h2>

      <div
        className={`w-24 h-24 rounded-full ${color} animate-pulse mb-4`}
      ></div>

      <p className="text-lg font-medium">{status}</p>

      {lastSeen && (
        <p className="text-sm text-gray-400 mt-2">
          Last update: {lastSeen}
        </p>
      )}
    </div>
  );
}

export default SystemHealth;
