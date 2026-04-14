"use client";

import { useTranscribe } from "@/hooks/use-transcribe";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, Square, Copy } from "lucide-react";

interface TranscribeRecorderProps {
  onTranscriptReady?: (transcript: string) => void;
}

export function TranscribeRecorder({
  onTranscriptReady,
}: TranscribeRecorderProps) {
  const {
    isRecording,
    transcripts,
    currentPartial,
    fullTranscript,
    error,
    startRecording,
    stopRecording,
  } = useTranscribe();

  const handleStop = () => {
    stopRecording();
    if (fullTranscript && onTranscriptReady) {
      setTimeout(() => {
        onTranscriptReady(fullTranscript);
      }, 100);
    }
  };

  const handleCopy = async () => {
    if (fullTranscript) {
      await navigator.clipboard.writeText(fullTranscript);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Live Transcription
        </CardTitle>
        <CardDescription>
          Record your training session. Speech is transcribed in real-time via
          AssemblyAI.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          {!isRecording ? (
            <Button onClick={startRecording} className="gap-2">
              <Mic className="h-4 w-4" />
              Start Recording
            </Button>
          ) : (
            <Button
              onClick={handleStop}
              variant="destructive"
              className="gap-2"
            >
              <Square className="h-4 w-4" />
              Stop Recording
            </Button>
          )}

          {isRecording && (
            <Badge variant="destructive" className="animate-pulse">
              Recording
            </Badge>
          )}

          {fullTranscript && !isRecording && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-2"
            >
              <Copy className="h-3 w-3" />
              Copy
            </Button>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <ScrollArea className="h-[250px] rounded-lg border bg-muted/50 p-4">
          {transcripts.length === 0 && !currentPartial && !isRecording && (
            <p className="text-muted-foreground text-sm italic">
              Click &quot;Start Recording&quot; and begin speaking. Your
              transcript will appear here in real-time.
            </p>
          )}

          {transcripts.length === 0 && !currentPartial && isRecording && (
            <p className="text-muted-foreground text-sm italic animate-pulse">
              Listening... Start speaking.
            </p>
          )}

          <div className="space-y-1">
            {transcripts.map((segment) => (
              <span key={segment.resultId} className="text-foreground">
                {segment.text}{" "}
              </span>
            ))}
            {currentPartial && (
              <span className="text-muted-foreground italic">
                {currentPartial}
              </span>
            )}
          </div>
        </ScrollArea>

        {fullTranscript && !isRecording && (
          <p className="text-xs text-muted-foreground">
            {transcripts.length} segment{transcripts.length !== 1 ? "s" : ""}{" "}
            transcribed
          </p>
        )}
      </CardContent>
    </Card>
  );
}
