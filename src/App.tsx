import { useRef, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("video", file);

    const res = await fetch("http://localhost:3000/video/process", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setSessionId(data.sessionId);

    console.log("Session criada:", data.sessionId);
  };

  const handlePlay = () => {
    if (!videoRef.current || !sessionId) return;

    const time = videoRef.current.currentTime;

    socket.emit("PLAY", {
      sessionId,
      time,
    });
  };

  const handlePause = () => {
    console.log("⏸️ PAUSE disparado");
    if (!videoRef.current || !sessionId) return;

    const time = videoRef.current.currentTime;
    console.log("Enviando PAUSE para o servidor com time:", time);
    socket.emit("PAUSE", {
      sessionId,
      time,
    });
  };

  const handleSeek = () => {
    if (!videoRef.current || !sessionId) return;

    const time = videoRef.current.currentTime;

    socket.emit("SEEK", {
      sessionId,
      time,
    });
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>🎬 Haptic Player</h1>

      <input
        type="file"
        accept="video/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <button onClick={handleUpload} disabled={!file}>
        Processar Vídeo
      </button>

      <p>Session: {sessionId}</p>

      {file && (
        <video
          ref={videoRef}
          width="600"
          controls
          onPlay={handlePlay}
          onPause={handlePause}
          onSeeked={handleSeek}
          style={{ marginTop: 20 }}
        >
          <source src={URL.createObjectURL(file)} />
        </video>
      )}
    </div>
  );
}

export default App;
