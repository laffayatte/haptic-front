import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { QRCodeSVG } from "qrcode.react";
import bannerSvg from "./assets/banner.svg";
import waitingSvg from "./assets/waiting.svg";
import processSvg from "./assets/process.svg";

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

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Aguardando vídeo");

  useEffect(() => {
    fetch("http://localhost:3000/video/ip")
      .then((r) => r.json())
      .then((data) => setLocalIp(data.ip))
      .catch(() => setLocalIp("Indisponível"));
  }, []);

  useEffect(() => {
    socket.on("connect", () => {
      setConnected(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
    };
  }, []);

  const handleUpload = async (selectedFile?: File) => {
    const currentFile = selectedFile || file;

    if (!currentFile) return;

    setProcessing(true);
    setProgress(0);
    setStatusText("Enviando vídeo...");

    let fake = 0;

    const interval = setInterval(() => {
      fake += Math.random() * 10;

      if (fake >= 25) {
        setStatusText("Preparando vibrações...");
      }

      if (fake >= 55) {
        setStatusText("Sincronizando movimentos...");
      }

      if (fake >= 80) {
        setStatusText("Finalizando processamento...");
      }

      if (fake >= 90) {
        fake = 90;
      }

      setProgress(Math.floor(fake));
    }, 350);

    try {
      const formData = new FormData();
      formData.append("video", currentFile);

      const res = await fetch("http://localhost:3000/video/process", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      clearInterval(interval);

      setProgress(100);
      setStatusText("Processamento concluído ✓");

      setSessionId(data.sessionId);

      setTimeout(() => {
        setProcessing(false);
      }, 800);
    } catch (error) {
      clearInterval(interval);

      setStatusText("Erro ao processar vídeo");
      setProcessing(false);
    }
  };

  const emit = (event: string) => {
    if (!videoRef.current || !sessionId) return;

    socket.emit(event, {
      sessionId,
      time: videoRef.current.currentTime,
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();

    setDragging(false);

    const dropped = e.dataTransfer.files?.[0];

    if (dropped && dropped.type.startsWith("video/")) {
      setFile(dropped);
      handleUpload(dropped);
    }
  };

  const showDropzone = !file && (hovering || dragging);

  return (
    <div className="min-h-screen bg-[#FCFCFC] font-sans">
      <header className="h-[82px] bg-white border-b border-zinc-200 flex items-center px-10">
        <img src={bannerSvg} alt="Haptic" className="h-10" />
      </header>

      <div className="w-full max-w-[1440px] mx-auto px-10 py-8">
        <div className="grid grid-cols-[1fr_320px] gap-10 items-start">
          <div className="flex flex-col flex-1 min-w-0">
            <p className="text-[#4A41C4] text-[14px] font-medium mb-5">
              {!file
                ? "Aguardando arquivo..."
                : processing
                  ? "Processando vídeo..."
                  : sessionId
                    ? "Vídeo processado"
                    : "Preparando processamento..."}
            </p>

            <div
              className="relative w-full aspect-video rounded-2xl overflow-hidden bg-[#EEEEED] shadow-sm"
              onMouseEnter={() => !file && setHovering(true)}
              onMouseLeave={() => setHovering(false)}
              onDragOver={(e) => {
                e.preventDefault();

                if (!file) {
                  setDragging(true);
                }
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              {file && (
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-contain bg-[#F0F0EE]"
                  controls={!processing}
                  onPlay={() => emit("PLAY")}
                  onPause={() => emit("PAUSE")}
                  onSeeked={() => emit("SEEK")}
                >
                  <source src={URL.createObjectURL(file)} />
                </video>
              )}

              {processing && (
                <div className="absolute inset-0 bg-[#F0F0EE]/90 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                  <img
                    src={processSvg}
                    alt="Processando"
                    className="w-24 opacity-80 mb-6 animate-pulse"
                  />

                  <div className="w-[320px]">
                    <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#4A41C4] transition-all duration-300"
                        style={{
                          width: `${progress}%`,
                        }}
                      />
                    </div>

                    <div className="flex justify-between mt-2 text-[13px] text-zinc-500">
                      <span>{statusText}</span>
                      <span>{progress}%</span>
                    </div>
                  </div>
                </div>
              )}

              {!file && !showDropzone && (
                <div className="absolute inset-0 bg-[#EEEEED] flex items-center justify-center">
                  <img
                    src={waitingSvg}
                    alt="Aguardando"
                    className="w-36 opacity-50"
                  />
                </div>
              )}

              {showDropzone && (
                <div className="absolute inset-0 bg-white flex flex-col items-center justify-center gap-5 border-[2.5px] border-dashed border-[#4A41C4] rounded-xl">
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
                        const selected = e.target.files?.[0];

                        if (!selected) return;

                        setFile(selected);
                        setHovering(false);

                        handleUpload(selected);
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

            {file && !processing && (
              <div className="flex items-center gap-3 mt-5">
                <button
                  onClick={() => {
                    setFile(null);
                    setSessionId(null);
                    setProgress(0);
                    setStatusText("Aguardando vídeo");
                  }}
                  className="text-[13px] text-zinc-500 bg-white border border-zinc-200 rounded-lg px-3.5 py-2 hover:bg-zinc-50 transition-colors"
                >
                  Trocar vídeo
                </button>

                {sessionId && (
                  <div className="text-[13px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">
                    Processado ✓
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="w-[320px] flex flex-col gap-4 pt-8">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                  connected ? "bg-emerald-400" : "bg-zinc-300"
                }`}
              />

              <span className="text-[13px] text-zinc-400">
                {connected
                  ? "Dispositivo conectado"
                  : "Nenhum dispositivo conectado"}
              </span>
            </div>

            <div className="bg-white rounded-[28px] border border-zinc-200 px-7 py-7 flex flex-col items-center shadow-sm min-h-[520px]">
              {!processing ? (
                <>
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
                </>
              ) : (
                <div className="flex-1 w-full flex flex-col items-center justify-center">
                  <img
                    src={processSvg}
                    alt="Processando"
                    className="w-20 opacity-70 animate-pulse mb-6"
                  />

                  <p className="text-[20px] font-medium text-zinc-700 text-center">
                    Sincronizando...
                  </p>

                  <p className="text-[13px] text-zinc-400 text-center mt-2 leading-relaxed">
                    {statusText}
                  </p>

                  <div className="w-full mt-6">
                    <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#4A41C4] transition-all duration-300"
                        style={{
                          width: `${progress}%`,
                        }}
                      />
                    </div>

                    <div className="text-center mt-2 text-[12px] text-zinc-400">
                      {progress}%
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
