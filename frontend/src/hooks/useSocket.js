import { useEffect, useState } from "react";
import { io } from "socket.io-client";

let socketInstance = null;

function useSocket() {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!socketInstance) {
      socketInstance = io("/", {
        transports: ["websocket"],
      });
    }

    setSocket(socketInstance);

    return () => {
      // we do NOT disconnect on unmount
      // socket is shared across components
    };
  }, []);

  return socket;
}

export default useSocket;
