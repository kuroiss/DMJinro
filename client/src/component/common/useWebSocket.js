import { useEffect, useRef, useState } from "react";
import ReconnectingWebSocket from "reconnecting-websocket";
import discordSdk from "./Discord";

const useWebSocket = ({userId}) => {
  const url = `/api/ws?channel=${discordSdk.channelId}&userId=${userId}`;

  const [socketPull, setSocketPull] = useState(null);
  const [socketPush, setSocketPush] = useState(null);
  const webSocketRef = useRef();

  useEffect(() => {
    // userIdがnullの時は接続しに行かない
    if(!userId) return;

    const socket = new ReconnectingWebSocket(url);
    webSocketRef.current = socket;

    socket.onopen = () => {
      console.log("WebSocket connection established");
    };

    socket.onmessage = (event) => {
      const socketData = JSON.parse(event.data);
      setSocketPull(socketData);
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed");
    };

    return () => socket.close();
  }, [userId]);

  const addSocket = (data) => {
    setSocketPush(data);
  };

  useEffect(() => {
    if (socketPush) {
      webSocketRef.current?.send(JSON.stringify(socketPush));
    }
  }, [socketPush]);

  return [socketPull, addSocket];
};

export default useWebSocket;
