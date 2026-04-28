"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  type DocumentReference,
  type Unsubscribe,
} from "firebase/firestore";
import {
  Copy,
  MonitorUp,
  PhoneCall,
  PhoneOff,
  Radio,
  Video,
  VideoOff,
} from "lucide-react";

import { useUser } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302"] },
    { urls: ["stun:stun1.l.google.com:19302"] },
  ],
};

type CallRole = "idle" | "host" | "guest";

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function attachStream(
  element: HTMLVideoElement | null,
  stream: MediaStream | null,
  muted = false
) {
  if (!element) {
    return;
  }

  if (element.srcObject !== stream) {
    element.srcObject = stream;
  }

  element.muted = muted;
  void element.play().catch(() => undefined);
}

export default function CallStudio() {
  const { user } = useUser();
  const [roomInput, setRoomInput] = useState("");
  const [activeRoomId, setActiveRoomId] = useState("");
  const [status, setStatus] = useState(
    "Sign in, then create a room or join a friend with their room code."
  );
  const [callRole, setCallRole] = useState<CallRole>("idle");
  const [isBusy, setIsBusy] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [screenShareHint, setScreenShareHint] = useState(
    "Choose the YouTube browser tab in the system picker when you want to watch together."
  );

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenPreviewRef = useRef<HTMLVideoElement | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const roomRef = useRef<DocumentReference | null>(null);
  const listenersRef = useRef<Unsubscribe[]>([]);
  const videoSenderRef = useRef<RTCRtpSender | null>(null);
  const audioSenderRef = useRef<RTCRtpSender | null>(null);
  const outgoingAudioStreamRef = useRef<MediaStream | null>(null);
  const outgoingAudioContextRef = useRef<AudioContext | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const recordingFrameRef = useRef<number | null>(null);
  const recordingAudioContextRef = useRef<AudioContext | null>(null);

  const activeRoomRef = useRef("");
  activeRoomRef.current = activeRoomId;

  useEffect(() => {
    attachStream(localVideoRef.current, localStreamRef.current, true);
    attachStream(remoteVideoRef.current, remoteStreamRef.current, false);
    attachStream(screenPreviewRef.current, displayStreamRef.current, true);
  });

  useEffect(() => {
    return () => {
      void endCall({ keepStatus: true, skipRoomUpdate: true });
    };
  }, []);

  const clearListeners = () => {
    listenersRef.current.forEach((unsubscribe) => unsubscribe());
    listenersRef.current = [];
  };

  const closeAudioContext = async (
    audioContextRef: MutableRefObject<AudioContext | null>
  ) => {
    if (audioContextRef.current) {
      await audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
  };

  const buildMixedAudioTrack = async (includeDisplayAudio: boolean) => {
    await closeAudioContext(outgoingAudioContextRef);
    stopStream(outgoingAudioStreamRef.current);
    outgoingAudioStreamRef.current = null;

    const micTrack = localStreamRef.current?.getAudioTracks()[0] ?? null;
    const displayTracks = includeDisplayAudio
      ? displayStreamRef.current?.getAudioTracks() ?? []
      : [];

    if (!micTrack && displayTracks.length === 0) {
      return null;
    }

    if (displayTracks.length === 0) {
      return micTrack;
    }

    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();

    if (micTrack) {
      const micStream = new MediaStream([micTrack]);
      audioContext.createMediaStreamSource(micStream).connect(destination);
    }

    displayTracks.forEach((track) => {
      const displayAudioStream = new MediaStream([track]);
      audioContext
        .createMediaStreamSource(displayAudioStream)
        .connect(destination);
    });

    outgoingAudioContextRef.current = audioContext;
    outgoingAudioStreamRef.current = destination.stream;

    return destination.stream.getAudioTracks()[0] ?? micTrack;
  };

  const replaceOutgoingAudioTrack = async (includeDisplayAudio: boolean) => {
    const nextTrack = await buildMixedAudioTrack(includeDisplayAudio);
    if (!audioSenderRef.current || !nextTrack) {
      return;
    }

    await audioSenderRef.current.replaceTrack(nextTrack);
  };

  const ensureLocalMedia = async () => {
    if (localStreamRef.current) {
      attachStream(localVideoRef.current, localStreamRef.current, true);
      return localStreamRef.current;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user",
      },
    });

    localStreamRef.current = stream;
    attachStream(localVideoRef.current, stream, true);
    return stream;
  };

  const ensureRemoteStream = () => {
    if (!remoteStreamRef.current) {
      remoteStreamRef.current = new MediaStream();
      attachStream(remoteVideoRef.current, remoteStreamRef.current, false);
    }

    return remoteStreamRef.current;
  };

  const createPeerConnection = async (
    currentRoomRef: DocumentReference,
    role: Exclude<CallRole, "idle">
  ) => {
    const localStream = await ensureLocalMedia();
    const remoteStream = ensureRemoteStream();
    const peerConnection = new RTCPeerConnection(rtcConfig);

    peerConnectionRef.current = peerConnection;

    const cameraTrack = localStream.getVideoTracks()[0] ?? null;
    const mixedAudioTrack = await buildMixedAudioTrack(false);

    if (cameraTrack) {
      videoSenderRef.current = peerConnection.addTrack(cameraTrack, localStream);
    }

    if (mixedAudioTrack) {
      audioSenderRef.current = peerConnection.addTrack(
        mixedAudioTrack,
        new MediaStream([mixedAudioTrack])
      );
    }

    peerConnection.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        const alreadyPresent = remoteStream
          .getTracks()
          .some((existingTrack) => existingTrack.id === track.id);

        if (!alreadyPresent) {
          remoteStream.addTrack(track);
        }
      });

      attachStream(remoteVideoRef.current, remoteStream, false);
    };

    peerConnection.oniceconnectionstatechange = () => {
      const state = peerConnection.iceConnectionState;
      if (state === "connected" || state === "completed") {
        setStatus("Call connected. You can screen share, chat over video, or record locally.");
      } else if (state === "disconnected") {
        setStatus("Connection looks unstable. Keep the tab open while WebRTC reconnects.");
      } else if (state === "failed") {
        setStatus("The peer connection failed. End the call and start a fresh room.");
      }
    };

    peerConnection.onicecandidate = async (event) => {
      if (!event.candidate) {
        return;
      }

      const candidateCollection = collection(
        currentRoomRef,
        role === "guest" ? "calleeCandidates" : "callerCandidates"
      );

      await addDoc(candidateCollection, event.candidate.toJSON());
    };

    return peerConnection;
  };

  const listenToRoom = (currentRoomRef: DocumentReference, role: CallRole) => {
    const roomListener = onSnapshot(currentRoomRef, async (snapshot) => {
      const roomData = snapshot.data();
      if (!roomData) {
        return;
      }

      if (
        role === "host" &&
        roomData.answer &&
        !peerConnectionRef.current?.currentRemoteDescription
      ) {
        await peerConnectionRef.current?.setRemoteDescription(
          new RTCSessionDescription(roomData.answer)
        );
        setStatus("A friend joined the room. Your call is ready.");
      }

      if (roomData.status === "ended" && activeRoomRef.current === currentRoomRef.id) {
        setStatus("The call has been ended from the other side.");
      }
    });

    const candidateListener = onSnapshot(
      collection(currentRoomRef, role === "host" ? "calleeCandidates" : "callerCandidates"),
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type !== "added") {
            return;
          }

          const data = change.doc.data();
          void peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(data));
        });
      }
    );

    listenersRef.current.push(roomListener, candidateListener);
  };

  const copyRoomId = async () => {
    if (!activeRoomId) {
      return;
    }

    await navigator.clipboard.writeText(activeRoomId);
    setStatus("Room code copied. Share it with your friend so they can join.");
  };

  const startCall = async () => {
    if (!user) {
      setStatus("Sign in first so the call room can be associated with your account.");
      return;
    }

    if (!db) {
      setStatus("Firebase is not configured yet. Add the frontend Firebase environment variables to enable calling.");
      return;
    }

    setIsBusy(true);
    clearListeners();

    try {
      setCallRole("host");
      setStatus("Creating your call room and warming up camera + mic...");

      const currentRoomRef = doc(collection(db, "callRooms"));
      roomRef.current = currentRoomRef;
      setActiveRoomId(currentRoomRef.id);

      const peerConnection = await createPeerConnection(currentRoomRef, "host");
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      await setDoc(currentRoomRef, {
        answer: null,
        createdAt: Date.now(),
        hostId: user._id ?? user.id ?? user.email,
        hostName: user.name ?? "YourTube user",
        offer: {
          sdp: offer.sdp,
          type: offer.type,
        },
        status: "waiting",
      });

      listenToRoom(currentRoomRef, "host");
      setStatus("Room ready. Share the code, then wait for your friend to join.");
    } catch (error) {
      console.error(error);
      setStatus("We couldn't create the room. Check browser permissions and Firestore access.");
      setCallRole("idle");
    } finally {
      setIsBusy(false);
    }
  };

  const joinCall = async () => {
    if (!user) {
      setStatus("Sign in first so joining and room presence work consistently.");
      return;
    }

    if (!db) {
      setStatus("Firebase is not configured yet. Add the frontend Firebase environment variables to enable calling.");
      return;
    }

    const nextRoomId = roomInput.trim();
    if (!nextRoomId) {
      setStatus("Paste a room code before joining.");
      return;
    }

    setIsBusy(true);
    clearListeners();

    try {
      const currentRoomRef = doc(db, "callRooms", nextRoomId);
      const roomSnapshot = await getDoc(currentRoomRef);

      if (!roomSnapshot.exists()) {
        setStatus("That room code doesn't exist. Ask your friend to create a fresh room.");
        return;
      }

      const roomData = roomSnapshot.data();
      if (!roomData.offer) {
        setStatus("This room isn't ready yet. Wait for the host to finish setup.");
        return;
      }

      setCallRole("guest");
      roomRef.current = currentRoomRef;
      setActiveRoomId(nextRoomId);
      setStatus("Joining room and connecting to your friend's stream...");

      const peerConnection = await createPeerConnection(currentRoomRef, "guest");
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(roomData.offer)
      );

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      await updateDoc(currentRoomRef, {
        answer: {
          sdp: answer.sdp,
          type: answer.type,
        },
        guestId: user._id ?? user.id ?? user.email,
        guestName: user.name ?? "Friend",
        status: "connected",
      });

      listenToRoom(currentRoomRef, "guest");
      setStatus("Connected to the room. If you share a YouTube tab, ask Chrome to include tab audio.");
    } catch (error) {
      console.error(error);
      setStatus("We couldn't join that call. Make sure the room code is valid and permissions are granted.");
      setCallRole("idle");
    } finally {
      setIsBusy(false);
    }
  };

  const startScreenShare = async () => {
    if (!peerConnectionRef.current || !videoSenderRef.current) {
      setStatus("Start or join a call before sharing your screen.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: {
          frameRate: 30,
        },
      });

      const screenTrack = stream.getVideoTracks()[0];
      if (!screenTrack) {
        setStatus("Screen sharing started without a video track, so nothing was sent.");
        stopStream(stream);
        return;
      }

      displayStreamRef.current = stream;
      attachStream(screenPreviewRef.current, stream, true);
      screenTrack.onended = () => {
        void stopScreenShare();
      };

      await videoSenderRef.current.replaceTrack(screenTrack);
      setIsScreenSharing(true);
      setScreenShareHint(
        stream.getAudioTracks().length > 0
          ? "You are sharing tab visuals and audio. Great for a YouTube watch-along."
          : "Screen video is live. If you want YouTube audio too, choose a browser tab and enable share audio."
      );

      await replaceOutgoingAudioTrack(true);
      setStatus("Screen share is live. Pick the YouTube tab for the smoothest shared viewing.");
    } catch (error) {
      console.error(error);
      setStatus("Screen sharing was cancelled or blocked by the browser.");
    }
  };

  const stopScreenShare = async () => {
    if (!isScreenSharing) {
      return;
    }

    const cameraTrack = localStreamRef.current?.getVideoTracks()[0] ?? null;
    if (cameraTrack && videoSenderRef.current) {
      await videoSenderRef.current.replaceTrack(cameraTrack);
    }

    stopStream(displayStreamRef.current);
    displayStreamRef.current = null;
    attachStream(screenPreviewRef.current, null, true);
    setIsScreenSharing(false);
    setScreenShareHint(
      "Choose the YouTube browser tab in the system picker when you want to watch together."
    );

    await replaceOutgoingAudioTrack(false);
    setStatus("Returned from screen share to your camera feed.");
  };

  const stopRecordingInternals = () => {
    if (recordingFrameRef.current) {
      cancelAnimationFrame(recordingFrameRef.current);
      recordingFrameRef.current = null;
    }

    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    recorderRef.current = null;
    void closeAudioContext(recordingAudioContextRef);
  };

  const stopRecording = () => {
    if (!recorderRef.current || recorderRef.current.state === "inactive") {
      return;
    }

    recorderRef.current.stop();
  };

  const startRecording = async () => {
    if (!localStreamRef.current && !remoteStreamRef.current) {
      setStatus("Start a call first so there is something to record.");
      return;
    }

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      recordingCanvasRef.current = canvas;
      const context = canvas.getContext("2d");

      if (!context) {
        setStatus("This browser couldn't create the recording canvas.");
        return;
      }

      const paintFrame = () => {
        context.fillStyle = "#07111f";
        context.fillRect(0, 0, canvas.width, canvas.height);

        const localVideo = localVideoRef.current;
        const remoteVideo = remoteVideoRef.current;
        const screenVideo = screenPreviewRef.current;

        const drawVideo = (
          video: HTMLVideoElement | null,
          x: number,
          y: number,
          width: number,
          height: number
        ) => {
          if (video && video.readyState >= 2) {
            context.drawImage(video, x, y, width, height);
            return true;
          }

          context.fillStyle = "rgba(255,255,255,0.08)";
          context.fillRect(x, y, width, height);
          return false;
        };

        if (isScreenSharing) {
          drawVideo(screenVideo, 0, 0, canvas.width, canvas.height);
          drawVideo(remoteVideo, 36, 36, 360, 202);
          drawVideo(localVideo, canvas.width - 276, canvas.height - 176, 240, 140);
        } else {
          drawVideo(remoteVideo, 0, 0, canvas.width, canvas.height);
          drawVideo(localVideo, canvas.width - 276, canvas.height - 176, 240, 140);
        }

        context.fillStyle = "rgba(7,17,31,0.78)";
        context.fillRect(24, canvas.height - 74, 330, 50);
        context.fillStyle = "#f8fafc";
        context.font = "600 24px Arial";
        context.fillText("YourTube Call Recording", 44, canvas.height - 42);

        recordingFrameRef.current = requestAnimationFrame(paintFrame);
      };

      paintFrame();

      const outputStream = canvas.captureStream(30);
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();
      recordingAudioContextRef.current = audioContext;

      const connectAudioTracks = (stream: MediaStream | null) => {
        const audioTracks = stream?.getAudioTracks() ?? [];
        if (audioTracks.length === 0) {
          return;
        }

        const audioStream = new MediaStream(audioTracks);
        audioContext.createMediaStreamSource(audioStream).connect(destination);
      };

      connectAudioTracks(localStreamRef.current);
      connectAudioTracks(displayStreamRef.current);
      connectAudioTracks(remoteStreamRef.current);

      destination.stream.getAudioTracks().forEach((track) => {
        outputStream.addTrack(track);
      });

      const mimeType =
        MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
          ? "video/webm;codecs=vp9,opus"
          : "video/webm;codecs=vp8,opus";

      const recorder = new MediaRecorder(outputStream, { mimeType });
      recorderRef.current = recorder;
      recordingChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stopRecordingInternals();
        setIsRecording(false);

        const recordingBlob = new Blob(recordingChunksRef.current, {
          type: recorder.mimeType || "video/webm",
        });

        const url = URL.createObjectURL(recordingBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `yourtube-call-${new Date().toISOString().replace(/[:.]/g, "-")}.webm`;
        link.click();
        URL.revokeObjectURL(url);

        setStatus("Recording saved locally to your device.");
      };

      recorder.start(1000);
      setIsRecording(true);
      setStatus("Recording started. When you stop, the file will download locally.");
    } catch (error) {
      console.error(error);
      setStatus("Recording could not start in this browser.");
      setIsRecording(false);
      stopRecordingInternals();
    }
  };

  const endCall = async ({
    keepStatus = false,
    skipRoomUpdate = false,
  }: {
    keepStatus?: boolean;
    skipRoomUpdate?: boolean;
  } = {}) => {
    if (isRecording) {
      stopRecording();
    }

    clearListeners();

    if (!skipRoomUpdate && roomRef.current) {
      await updateDoc(roomRef.current, {
        endedAt: Date.now(),
        status: "ended",
      }).catch(() => undefined);
    }

    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    videoSenderRef.current = null;
    audioSenderRef.current = null;

    stopStream(displayStreamRef.current);
    stopStream(localStreamRef.current);
    stopStream(remoteStreamRef.current);
    stopStream(outgoingAudioStreamRef.current);

    displayStreamRef.current = null;
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    outgoingAudioStreamRef.current = null;
    roomRef.current = null;

    await closeAudioContext(outgoingAudioContextRef);

    attachStream(localVideoRef.current, null, true);
    attachStream(remoteVideoRef.current, null, false);
    attachStream(screenPreviewRef.current, null, true);

    setActiveRoomId("");
    setCallRole("idle");
    setIsScreenSharing(false);
    setRoomInput("");
    setIsBusy(false);

    if (!keepStatus) {
      setStatus("Call ended. You can create a new room whenever you're ready.");
    }
  };

  const inCall = callRole !== "idle";
  const requestSignIn = () => {
    window.dispatchEvent(new Event("yourtube:open-auth"));
    window.scrollTo({ behavior: "smooth", top: 0 });
  };

  return (
    <main className="flex-1 min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#eef4ff_45%,#f8fafc_100%)] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[28px] border border-sky-100 bg-white shadow-[0_30px_80px_-50px_rgba(15,23,42,0.5)]">
          <div className="grid gap-8 p-6 lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700">
                <Radio className="h-4 w-4" />
                Real-time watch-together studio
              </div>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
                  Video calls, YouTube tab sharing, and local recording in one room.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                  Create a private room, invite a friend with the room code, share a
                  browser tab for YouTube discussion, and download the session to your
                  device when you finish.
                </p>
              </div>

              {!user ? (
                <div className="rounded-3xl border border-sky-100 bg-sky-50/70 p-5">
                  <p className="text-sm leading-6 text-slate-700">
                    Sign in is required here so Firestore can manage room signaling
                    and presence safely.
                  </p>
                  <Button className="mt-4" onClick={requestSignIn}>
                    <PhoneCall className="h-4 w-4" />
                    Sign In To Start Calling
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-5 md:grid-cols-2">
                  <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-sm font-medium text-slate-500">Start a room</p>
                    <p className="text-sm leading-6 text-slate-600">
                      Open your camera, generate a friend code, and wait for someone to join.
                    </p>
                    <Button onClick={startCall} disabled={isBusy || inCall}>
                      <PhoneCall className="h-4 w-4" />
                      {isBusy && callRole === "host" ? "Creating Room..." : "Create Call Room"}
                    </Button>
                  </div>

                  <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-sm font-medium text-slate-500">Join a friend</p>
                    <Input
                      value={roomInput}
                      onChange={(event) => setRoomInput(event.target.value)}
                      placeholder="Paste room code"
                      disabled={isBusy || inCall}
                    />
                    <Button
                      variant="outline"
                      onClick={joinCall}
                      disabled={isBusy || inCall}
                    >
                      <Video className="h-4 w-4" />
                      {isBusy && callRole === "guest" ? "Joining..." : "Join Room"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="rounded-3xl bg-slate-950 p-5 text-slate-50">
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-sky-300">
                  Live status
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-200">{status}</p>
                {activeRoomId ? (
                  <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white/8 p-3">
                    <span className="text-xs uppercase tracking-[0.16em] text-slate-300">
                      Room code
                    </span>
                    <code className="rounded-full bg-white/10 px-3 py-1 text-sm text-white">
                      {activeRoomId}
                    </code>
                    <Button variant="secondary" size="sm" onClick={copyRoomId}>
                      <Copy className="h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-950 p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-sky-300">
                    Session Controls
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    Browser-native WebRTC with local download recording.
                  </p>
                </div>
                <div className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
                  {inCall ? "Room Live" : "Idle"}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  variant={isScreenSharing ? "secondary" : "outline"}
                  className="justify-start border-white/10 bg-white/5 text-white hover:bg-white/12"
                  onClick={isScreenSharing ? () => void stopScreenShare() : startScreenShare}
                  disabled={!inCall}
                >
                  <MonitorUp className="h-4 w-4" />
                  {isScreenSharing ? "Stop Screen Share" : "Share YouTube Tab"}
                </Button>

                <Button
                  variant={isRecording ? "secondary" : "outline"}
                  className="justify-start border-white/10 bg-white/5 text-white hover:bg-white/12"
                  onClick={isRecording ? stopRecording : () => void startRecording()}
                  disabled={!inCall}
                >
                  <Radio className="h-4 w-4" />
                  {isRecording ? "Stop Recording" : "Record Session"}
                </Button>

                <Button
                  variant="outline"
                  className="justify-start border-white/10 bg-white/5 text-white hover:bg-white/12"
                  onClick={() => void endCall()}
                  disabled={!inCall}
                >
                  <PhoneOff className="h-4 w-4" />
                  End Call
                </Button>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                  {screenShareHint}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900">
                  <div className="flex items-center justify-between px-4 py-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                    <span>Your Camera</span>
                    {localStreamRef.current ? (
                      <Video className="h-4 w-4 text-emerald-300" />
                    ) : (
                      <VideoOff className="h-4 w-4 text-slate-500" />
                    )}
                  </div>
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="aspect-video w-full bg-slate-900 object-cover"
                  />
                </div>

                <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900">
                  <div className="flex items-center justify-between px-4 py-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                    <span>Shared Screen</span>
                    {isScreenSharing ? (
                      <MonitorUp className="h-4 w-4 text-sky-300" />
                    ) : (
                      <VideoOff className="h-4 w-4 text-slate-500" />
                    )}
                  </div>
                  <video
                    ref={screenPreviewRef}
                    autoPlay
                    playsInline
                    muted
                    className="aspect-video w-full bg-slate-900 object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_25px_70px_-45px_rgba(15,23,42,0.55)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Remote participant</p>
                <h2 className="text-xl font-semibold text-slate-950">Friend stream</h2>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {inCall ? "Live peer feed" : "Waiting"}
              </div>
            </div>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="aspect-video w-full bg-slate-100 object-cover"
            />
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_25px_70px_-45px_rgba(15,23,42,0.55)]">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-sky-700">
              Notes
            </p>
            <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
              <p>
                Screen sharing works best in Chromium browsers. To share YouTube with
                audio, select a browser tab instead of an entire screen and enable the
                audio toggle in the share dialog.
              </p>
              <p>
                Some DRM-protected content may appear as a black frame or may not expose
                audio to the browser. The app handles standard tab sharing, but those
                publisher restrictions still apply.
              </p>
              <p>
                Recordings are downloaded locally as `.webm` files. Nothing from the
                recording pipeline is uploaded by this feature.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
