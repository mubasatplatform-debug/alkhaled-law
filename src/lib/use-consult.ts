import { useCallback, useEffect, useRef, useState } from "react";
import { defaultIceServers, type RtcPollResponse, type SignalKind } from "@/lib/multiplayer";

export type ConsultPhase = "lobby" | "connecting" | "live" | "ended";

export type CallChat = { id: string; from: string; text: string };

function rtcToken(raw: string) {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "peer";
}

export function useConsult(roomId: string, selfId: string, selfName: string) {
  const room = rtcToken(roomId);
  const me = rtcToken(selfId);

  const [phase, setPhase] = useState<ConsultPhase>("lobby");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteName, setRemoteName] = useState<string | null>(null);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [peerLive, setPeerLive] = useState(false);
  const [peerSeen, setPeerSeen] = useState(false);
  const [natFailed, setNatFailed] = useState(false);
  const [chat, setChat] = useState<CallChat[]>([]);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const chatRef = useRef<RTCDataChannel | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const displayRef = useRef<MediaStream | null>(null);
  const remoteIdRef = useRef<string | null>(null);
  const cursorRef = useRef(0);
  const pollTimer = useRef<number | null>(null);
  const startedAt = useRef<number>(0);
  const timer = useRef<number | null>(null);
  const closedRef = useRef(false);
  const makingOffer = useRef(false);
  const ignoreOffer = useRef(false);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const offeredChat = useRef(false);
  const joinedAt = useRef(0);
  const peerLiveRef = useRef(false);
  peerLiveRef.current = peerLive;

  const startCamera = useCallback(async () => {
    if (localRef.current) return localRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      localRef.current = stream;
      setLocalStream(stream);
      setCamError(null);
      return stream;
    } catch {
      setCamError("الكاميرا غير مفعّلة. يمكنك المتابعة بالملاحظات والمحادثة.");
      return null;
    }
  }, []);

  const sendSignal = useCallback(
    async (to: string, kind: SignalKind, payload: unknown) => {
      await fetch("/api/rtc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "signal", room, from: me, to, kind, payload }),
      });
    },
    [me, room],
  );

  const attachChat = useCallback((channel: RTCDataChannel) => {
    chatRef.current = channel;
    channel.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as CallChat;
        if (msg?.text) setChat((c) => [...c, msg]);
      } catch {
        /* ignore */
      }
    };
  }, []);

  const ensurePc = useCallback(
    (remoteId: string) => {
      if (pcRef.current) return pcRef.current;
      const pc = new RTCPeerConnection({ iceServers: defaultIceServers() });
      pcRef.current = pc;
      remoteIdRef.current = remoteId;
      const stream = localRef.current;
      if (stream) {
        for (const track of stream.getTracks()) pc.addTrack(track, stream);
      }
      pc.onicecandidate = (ev) => {
        if (ev.candidate) void sendSignal(remoteId, "ice", ev.candidate.toJSON());
      };
      pc.ontrack = (ev) => {
        const media = ev.streams[0] ?? new MediaStream([ev.track]);
        setRemoteStream(media);
        setPeerLive(true);
        setNatFailed(false);
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setPeerLive(true);
          setNatFailed(false);
        }
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          setPeerLive(false);
        }
      };
      pc.ondatachannel = (ev) => {
        if (ev.channel.label === "chat") attachChat(ev.channel);
      };
      pc.onnegotiationneeded = async () => {
        try {
          makingOffer.current = true;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await sendSignal(remoteId, "offer", pc.localDescription?.toJSON());
        } catch {
          /* retry on next negotiation */
        } finally {
          makingOffer.current = false;
        }
      };
      return pc;
    },
    [attachChat, sendSignal],
  );

  const handleSignal = useCallback(
    async (from: string, kind: SignalKind, payload: unknown) => {
      const polite = me < from;
      const pc = ensurePc(from);
      if (kind === "offer") {
        const offerCollision = makingOffer.current || pc.signalingState !== "stable";
        ignoreOffer.current = !polite && offerCollision;
        if (ignoreOffer.current) return;
        const desc = payload as RTCSessionDescriptionInit;
        await pc.setRemoteDescription(new RTCSessionDescription(desc));
        for (const c of pendingIce.current) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          } catch {
            /* ignore */
          }
        }
        pendingIce.current = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal(from, "answer", pc.localDescription?.toJSON());
      } else if (kind === "answer") {
        const desc = payload as RTCSessionDescriptionInit;
        if (pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(desc));
        }
      } else if (kind === "ice") {
        const c = payload as RTCIceCandidateInit;
        if (!pc.remoteDescription) {
          pendingIce.current.push(c);
          return;
        }
        try {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        } catch {
          /* ignore */
        }
      }
    },
    [ensurePc, me, sendSignal],
  );

  const pollOnce = useCallback(async () => {
    const params = new URLSearchParams({
      room,
      peer: me,
      name: selfName.slice(0, 64),
      since: String(cursorRef.current),
    });
    const res = await fetch(`/api/rtc?${params}`);
    if (!res.ok || closedRef.current) return;
    const body = (await res.json()) as RtcPollResponse;
    const others = body.peers.filter((p) => p.id !== me);
    if (others[0]) {
      setPeerSeen(true);
      setRemoteName(others[0].name || "الطرف الآخر");
      const remote = others[0].id;
      const pc = ensurePc(remote);
      if (me > remote && !offeredChat.current) {
        offeredChat.current = true;
        try {
          attachChat(pc.createDataChannel("chat"));
        } catch {
          offeredChat.current = false;
        }
      }
    }
    for (const sig of body.signals) {
      cursorRef.current = Math.max(cursorRef.current, sig.id);
      await handleSignal(sig.from, sig.kind, sig.payload);
    }
    if (others[0] && Date.now() - joinedAt.current > 12000 && !peerLiveRef.current && pcRef.current) {
      if (pcRef.current.connectionState !== "connected") setNatFailed(true);
    }
  }, [attachChat, ensurePc, handleSignal, me, room, selfName]);

  const stopPoll = () => {
    if (pollTimer.current) {
      window.clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  };

  const loopPoll = useCallback(() => {
    if (closedRef.current) return;
    pollTimer.current = window.setTimeout(() => {
      void pollOnce()
        .catch(() => undefined)
        .finally(() => loopPoll());
    }, peerLiveRef.current ? 2000 : 400);
  }, [pollOnce]);

  const join = useCallback(async () => {
    setPhase("connecting");
    closedRef.current = false;
    joinedAt.current = Date.now();
    await startCamera();
    startedAt.current = Date.now();
    timer.current = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 250);
    try {
      await pollOnce();
    } catch {
      /* retry in loop */
    }
    setPhase("live");
    loopPoll();
  }, [loopPoll, pollOnce, startCamera]);

  const hangup = useCallback(() => {
    closedRef.current = true;
    stopPoll();
    void fetch("/api/rtc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "leave", room, peer: me }),
      keepalive: true,
    }).catch(() => undefined);
    chatRef.current?.close();
    chatRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    displayRef.current?.getTracks().forEach((t) => t.stop());
    displayRef.current = null;
    if (timer.current) window.clearInterval(timer.current);
    setPhase("ended");
    setPeerLive(false);
    setSharing(false);
  }, [me, room]);

  const toggleMic = useCallback(() => {
    const next = !micOn;
    localRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = next;
    });
    setMicOn(next);
  }, [micOn]);

  const toggleCam = useCallback(() => {
    const next = !camOn;
    localRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = next;
    });
    setCamOn(next);
  }, [camOn]);

  const toggleShare = useCallback(async () => {
    const pc = pcRef.current;
    if (sharing) {
      displayRef.current?.getTracks().forEach((t) => t.stop());
      displayRef.current = null;
      const cam = localRef.current?.getVideoTracks()[0];
      const sender = pc?.getSenders().find((s) => s.track?.kind === "video");
      if (cam && sender) await sender.replaceTrack(cam);
      setSharing(false);
      return;
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
      displayRef.current = display;
      const track = display.getVideoTracks()[0];
      const sender = pc?.getSenders().find((s) => s.track?.kind === "video");
      if (track && sender) await sender.replaceTrack(track);
      track.onended = () => {
        const cam = localRef.current?.getVideoTracks()[0];
        sender?.replaceTrack(cam ?? null);
        setSharing(false);
      };
      setSharing(true);
    } catch {
      /* cancelled */
    }
  }, [sharing]);

  const sendChat = useCallback(
    (text: string) => {
      const value = text.trim();
      if (!value) return;
      const msg: CallChat = { id: `m-${Date.now()}`, from: me, text: value };
      setChat((c) => [...c, msg]);
      if (chatRef.current?.readyState === "open") {
        chatRef.current.send(JSON.stringify(msg));
      }
    },
    [me],
  );

  useEffect(() => {
    void startCamera();
    return () => {
      closedRef.current = true;
      stopPoll();
      if (timer.current) window.clearInterval(timer.current);
      pcRef.current?.close();
      localRef.current?.getTracks().forEach((t) => t.stop());
      displayRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    phase,
    localStream,
    remoteStream,
    remoteName,
    camOn,
    micOn,
    sharing,
    camError,
    elapsed,
    peerLive,
    peerSeen,
    natFailed,
    chat,
    join,
    hangup,
    toggleMic,
    toggleCam,
    toggleShare,
    startCamera,
    sendChat,
  };
}
