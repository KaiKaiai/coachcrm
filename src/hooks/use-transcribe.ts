"use client";

import { useCallback, useRef, useState } from "react";

export interface TranscriptSegment {
  text: string;
  isPartial: boolean;
  resultId: string;
}

const SAMPLE_RATE = 16000;

export function useTranscribe() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [currentPartial, setCurrentPartial] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const turnCountRef = useRef(0);

  const float32ToPcm16 = (float32Array: Float32Array): ArrayBuffer => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  };

  const downsampleBuffer = (
    buffer: Float32Array,
    inputSampleRate: number,
    outputSampleRate: number
  ): Float32Array => {
    if (inputSampleRate === outputSampleRate) return buffer;
    const ratio = inputSampleRate / outputSampleRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
      let accum = 0;
      let count = 0;
      for (
        let i = offsetBuffer;
        i < nextOffsetBuffer && i < buffer.length;
        i++
      ) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = accum / count;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  };

  const startRecording = useCallback(async () => {
    setError(null);
    setTranscripts([]);
    setCurrentPartial("");
    turnCountRef.current = 0;

    try {
      const tokenRes = await fetch("/api/transcribe-token");
      if (!tokenRes.ok) {
        const err = await tokenRes.json();
        throw new Error(err.error || "Failed to get transcription token");
      }
      const { token } = await tokenRes.json();

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: SAMPLE_RATE,
        },
      });
      mediaStreamRef.current = mediaStream;

      const audioContext = new AudioContext({ sampleRate: 44100 });
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(mediaStream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      const wsUrl = new URL("wss://streaming.assemblyai.com/v3/ws");
      wsUrl.searchParams.set("sample_rate", SAMPLE_RATE.toString());
      wsUrl.searchParams.set("speech_model", "universal-streaming-english");
      wsUrl.searchParams.set("token", token);

      const ws = new WebSocket(wsUrl.toString());
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      let manualStop = false;

      ws.onopen = () => {
        source.connect(processor);
        processor.connect(audioContext.destination);
        setIsRecording(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "Turn") {
            const transcript = msg.transcript || "";
            if (msg.end_of_turn) {
              setCurrentPartial("");
              if (transcript.trim()) {
                turnCountRef.current += 1;
                setTranscripts((prev) => [
                  ...prev,
                  {
                    text: transcript,
                    isPartial: false,
                    resultId: `turn-${turnCountRef.current}`,
                  },
                ]);
              }
            } else {
              setCurrentPartial(transcript);
            }
          } else if (msg.type === "Error" || msg.error) {
            setError(msg.error || msg.message || "Transcription error");
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onerror = () => {
        setError("WebSocket connection failed. Check your AssemblyAI API key.");
        setIsRecording(false);
      };

      ws.onclose = (event) => {
        setIsRecording(false);
        if (!manualStop && event.code !== 1000) {
          setError(
            `Connection closed (code ${event.code}${event.reason ? `: ${event.reason}` : ""}). Check your AssemblyAI API key and plan.`
          );
        }
      };

      (wsRef.current as any).__setManualStop = () => {
        manualStop = true;
      };

      processor.onaudioprocess = (event) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const inputData = event.inputBuffer.getChannelData(0);
        const downsampled = downsampleBuffer(
          inputData,
          audioContext.sampleRate,
          SAMPLE_RATE
        );
        const pcmBuffer = float32ToPcm16(downsampled);
        ws.send(pcmBuffer);
      };
    } catch (err: any) {
      console.error("Transcription error:", err);
      setError(err.message || "Failed to start transcription");
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (wsRef.current) {
      (wsRef.current as any).__setManualStop?.();
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "Terminate" }));
        setTimeout(() => {
          wsRef.current?.close();
          wsRef.current = null;
        }, 1000);
      } else {
        wsRef.current.close();
        wsRef.current = null;
      }
    }

    setIsRecording(false);
    setCurrentPartial("");
  }, []);

  const fullTranscript = transcripts.map((t) => t.text).join(" ");

  const resetTranscripts = useCallback(() => {
    setTranscripts([]);
    setCurrentPartial("");
    setError(null);
  }, []);

  return {
    isRecording,
    transcripts,
    currentPartial,
    fullTranscript,
    error,
    startRecording,
    stopRecording,
    resetTranscripts,
  };
}
