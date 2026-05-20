import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { QRCodeSVG } from "qrcode.react";
import bannerSvg from "./assets/banner.svg";
import waitingSvg from "./assets/waiting.svg";

const socket = io("http://localhost:3000");

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [localIp, setLocalIp] = useState<string>("...");
  const [hovering, setHovering] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    fetch("http://localhost:3000/video/ip")
      .then((r) => r.json())
      .then((data) => setLocalIp(data.ip))
      .catch(() => setLocalIp("Indisponível"));
  }, []);

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
  };

  const emit = (event: string) => {
    if (!videoRef.current || !sessionId) return;
    socket.emit(event, { sessionId, time: videoRef.current.currentTime });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && dropped.type.startsWith("video/")) setFile(dropped);
  };

  const showDropzone = !file && (hovering || dragging);

  return (
    <div className="min-h-screen bg-[#F2F2F0] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-8 py-[18px] flex items-center">
        <img src={bannerSvg} alt="Haptic" className="h-7" />
      </header>

      {/* Body — max-width container centralizado */}
      <div className="max-w-[1100px] mx-auto px-8 py-7">
        <div className="flex gap-7 items-start">
          {/* Left – player column */}
          <div className="flex flex-col flex-1 min-w-0">
            <p className="text-[#4A41C4] text-[13px] font-medium mb-3">
              {file
                ? sessionId
                  ? "Dispositivo conectado"
                  : "Aguardando conexão do dispositivo..."
                : "Aguardando arquivo..."}
            </p>

            {/* Player / Dropzone — aspect-video mantém proporção 16:9 */}
            <div
              className="relative w-full aspect-video rounded-xl overflow-hidden"
              onMouseEnter={() => !file && setHovering(true)}
              onMouseLeave={() => setHovering(false)}
              onDragOver={(e) => {
                e.preventDefault();
                !file && setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              {/* Video */}
              {file && (
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-contain bg-[#F0F0EE]"
                  controls
                  onPlay={() => emit("PLAY")}
                  onPause={() => emit("PAUSE")}
                  onSeeked={() => emit("SEEK")}
                >
                  <source src={URL.createObjectURL(file)} />
                </video>
              )}

              {/* Idle */}
              {!file && !showDropzone && (
                <div className="absolute inset-0 bg-[#EEEEED] flex items-center justify-center">
                  <img
                    src={waitingSvg}
                    alt="Aguardando"
                    className="w-36 opacity-50"
                  />
                </div>
              )}

              {/* Dropzone on hover/drag */}
              {showDropzone && (
                <div className="absolute inset-0 bg-white flex flex-col items-center justify-center gap-5 border-[2.5px] border-dashed border-[#4A41C4] rounded-xl">
                  {/* File icon */}
                  <div className="relative w-20 h-24">
                    <div
                      className="absolute inset-0 bg-zinc-100 rounded-lg"
                      style={{
                        clipPath:
                          "polygon(0 0, 72% 0, 100% 28%, 100% 100%, 0 100%)",
                      }}
                    />
                    <div className="absolute top-0 right-0 w-[23px] h-[23px] bg-zinc-200 rounded-bl-md rounded-tr-lg" />
                    <div className="absolute inset-0 flex items-center justify-center pt-2">
                      <svg
                        width="26"
                        height="26"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="text-[#4A41C4]"
                      >
                        <path
                          d="M12 15V3m0 0L8 7m4-4 4 4"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>

                  <label className="bg-[#4A41C4] hover:bg-[#3D35A8] text-white text-[13px] font-medium px-6 py-2.5 rounded-lg cursor-pointer transition-colors active:scale-[0.98]">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/mp4,video/mov,.mov,video/avif,video/webm"
                      className="hidden"
                      onChange={(e) => {
                        setFile(e.target.files?.[0] || null);
                        setHovering(false);
                      }}
                    />
                    Escolher arquivo do computador
                  </label>

                  <p className="text-[11px] text-zinc-400">
                    Formato do arquivo: mp4, mov, avif, webM
                  </p>
                </div>
              )}
            </div>

            {/* Bottom controls — só com arquivo selecionado */}
            {file && (
              <div className="flex items-center gap-2.5 mt-3.5">
                <button
                  onClick={() => {
                    setFile(null);
                    setSessionId(null);
                  }}
                  className="text-[13px] text-zinc-500 bg-white border border-zinc-200 rounded-lg px-3.5 py-2 hover:bg-zinc-50 transition-colors"
                >
                  Trocar vídeo
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!!sessionId}
                  className="text-[13px] font-medium text-white bg-[#4A41C4] rounded-lg px-4 py-2 whitespace-nowrap transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#3D35A8] active:scale-[0.98]"
                >
                  {sessionId ? "Processado ✓" : "Processar vídeo"}
                </button>
              </div>
            )}
          </div>

          {/* Right – connection panel */}
          <div className="shrink-0 w-[260px] flex flex-col gap-3 mt-7">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full shrink-0 transition-colors ${connected ? "bg-emerald-400" : "bg-zinc-300"}`}
              />
              <span className="text-[13px] text-zinc-400">
                {connected
                  ? "Dispositivo conectado"
                  : "Nenhum dispositivo conectado"}
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-100 px-4 pt-5 pb-5 flex flex-col items-center shadow-sm">
              <p className="text-[13px] text-zinc-500 text-center leading-relaxed mb-3">
                Conecte seu dispositivo com
                <br />o código abaixo
              </p>
              <span className="text-[26px] font-semibold text-[#4A41C4] tracking-wide mb-4">
                {localIp}
              </span>
              <div className="flex items-center gap-2.5 w-full mb-3.5">
                <div className="flex-1 h-px bg-zinc-100" />
                <span className="text-[12px] text-zinc-300">Ou</span>
                <div className="flex-1 h-px bg-zinc-100" />
              </div>
              <p className="text-[12px] text-zinc-400 text-center leading-relaxed mb-3">
                Escaneie este QR Code
                <br />
                com o celular
              </p>
              <div className="border-[2.5px] border-[#4A41C4] rounded-xl p-1.5 leading-none">
                <QRCodeSVG
                  value={
                    localIp === "..." || localIp === "Indisponível"
                      ? " "
                      : `http://${localIp}:3000`
                  }
                  size={160}
                  bgColor="#ffffff"
                  fgColor="#1a1a1a"
                  level="M"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
