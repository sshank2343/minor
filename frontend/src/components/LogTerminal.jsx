import { useEffect, useRef, useState } from "react";
import useSocket from "../hooks/useSocket";

function LogTerminal() {
  const socket = useSocket();
  const [logs, setLogs] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    socket.on("telemetry", (data) => {
      const timestamp = new Date().toLocaleTimeString();
      const users = data.users || 0;
      const rps = data.rps || 0;
      const p95 = data.p95Latency || 0;
      const errorRate = ((data.errorRate || 0) * 100).toFixed(1);
      const timeoutRate = ((data.timeoutRate || 0) * 100).toFixed(1);
      
      // Get dominant status code
      const statusCodes = data.statusCodes || {};
      const dominantStatus = Object.keys(statusCodes).sort((a, b) => statusCodes[b] - statusCodes[a])[0] || "200";
      
      // Determine status color
      let statusColor = "text-green-400";
      if (dominantStatus >= 400) statusColor = "text-red-400";
      else if (dominantStatus >= 300) statusColor = "text-yellow-400";
      
      setLogs((prev) => [...prev.slice(-100), {
        timestamp,
        users,
        rps,
        p95,
        errorRate,
        timeoutRate,
        dominantStatus,
        statusColor
      }]);
    });

    return () => {
      socket.off("telemetry");
    };
  }, [socket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
      {/* Terminal Header */}
      <div className="bg-gray-700 px-3 py-1.5 flex items-center space-x-2 border-b border-gray-600">
        <div className="flex space-x-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
        </div>
        <span className="text-gray-400 text-xs font-mono ml-3">📡 Live Telemetry Stream</span>
      </div>

      {/* Terminal Content */}
      <div className="bg-black text-green-400 font-mono text-xs p-2 md:p-3 h-[400px] md:h-[500px] lg:h-[580px] overflow-y-auto">
        {logs.length === 0 ? (
          <div className="text-gray-600 text-center mt-8">
            <div className="text-lg md:text-xl mb-1">⏳</div>
            <div className="text-xs md:text-sm">Waiting for telemetry data...</div>
            <div className="text-xs mt-1">Start a test to see live logs</div>
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="mb-0.5 hover:bg-gray-900 px-2 py-0.5 rounded">
              <span className="text-gray-500">[{log.timestamp}]</span>
              <span className="text-cyan-400 ml-2">👥 {log.users}</span>
              <span className="text-blue-400 ml-3">📊 {log.rps} rps</span>
              <span className="text-yellow-400 ml-3">⚡ {log.p95}ms</span>
              <span className={`${log.statusColor} ml-3`}>✓ {log.dominantStatus}</span>
              {parseFloat(log.errorRate) > 0 && (
                <span className="text-red-500 ml-3">❌ {log.errorRate}%</span>
              )}
              {parseFloat(log.timeoutRate) > 0 && (
                <span className="text-orange-500 ml-3">⏱️  {log.timeoutRate}%</span>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

export default LogTerminal;
