// Connects camera → MediaPipe → our GestureEngine → overlay + React state.
import { useCallback, useEffect, useRef, useState } from 'react';
import { createHandTracker } from '../vision/handTracking.js';
import { GestureEngine } from '../vision/gestureEngine.js';
import { GESTURES } from '../data/gestures.js';
import { drawOverlay } from '../components/handOverlay.js';

let trackerPromise = null;
/** Starts downloading the model early (called on the welcome screen). */
export function preloadTracker() {
  if (!trackerPromise) {
    trackerPromise = createHandTracker().catch((e) => {
      trackerPromise = null;
      throw e;
    });
  }
  return trackerPromise;
}

function cameraErrorKind(err) {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'denied';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'notFound';
    case 'NotReadableError':
    case 'AbortError':
      return 'busy';
    default:
      return 'denied';
  }
}

export function useRecognition({ mode, targetId, settings, onConfirm }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  if (!engineRef.current) {
    engineRef.current = new GestureEngine(GESTURES);
    if (import.meta.env.DEV) window.__signaEngine = engineRef.current; // console debugging
  }
  const trackerRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const settingsRef = useRef(settings);
  const onConfirmRef = useRef(onConfirm);
  settingsRef.current = settings;
  onConfirmRef.current = onConfirm;

  const [phase, setPhase] = useState('idle'); // idle | starting | loading | running | error
  const [error, setError] = useState(null);
  const [frame, setFrame] = useState(null);
  const [perf, setPerf] = useState({ fps: 0, delegate: '' });

  useEffect(() => {
    engineRef.current.configure({
      mode,
      targetId,
      sensitivity: settings.sensitivity,
      invertPalm: settings.invertPalm,
    });
  }, [mode, targetId, settings.sensitivity, settings.invertPalm]);

  useEffect(() => {
    engineRef.current.onConfirm = (ev) => onConfirmRef.current?.(ev);
  }, []);

  const loop = useCallback(() => {
    let lastVideoTime = -1;
    let frames = 0;
    let fpsSince = performance.now();
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const video = videoRef.current;
      const tracker = trackerRef.current;
      if (!video || !tracker || video.readyState < 2 || !video.videoWidth) return;
      if (video.currentTime === lastVideoTime) return;
      lastVideoTime = video.currentTime;

      const now = performance.now();
      let result;
      try {
        result = tracker.detect(video, now);
      } catch (e) {
        console.error(e);
        return;
      }
      if (import.meta.env.DEV) window.__signaLast = { result, width: video.videoWidth, height: video.videoHeight };
      const out = engineRef.current.process(result, { width: video.videoWidth, height: video.videoHeight }, now);
      drawOverlay(canvasRef.current, out, video, settingsRef.current);
      setFrame(out);

      frames += 1;
      if (now - fpsSince >= 1000) {
        setPerf({ fps: Math.round((frames * 1000) / (now - fpsSince)), delegate: tracker.delegate });
        frames = 0;
        fpsSince = now;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const tokenRef = useRef(0);
  const stop = useCallback(() => {
    tokenRef.current += 1; // invalidates any start() still awaiting the camera/model
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    stop();
    const token = tokenRef.current;
    const stale = () => token !== tokenRef.current;
    setError(null);
    setPhase('starting');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError('insecure');
      setPhase('error');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
      });
      if (stale()) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play().catch(() => {});
    } catch (e) {
      console.warn('[signa] camera error', e);
      setError(cameraErrorKind(e));
      setPhase('error');
      return;
    }
    setPhase('loading');
    try {
      trackerRef.current = await preloadTracker();
    } catch (e) {
      console.error('[signa] model error', e);
      setError('modelFail');
      setPhase('error');
      return;
    }
    if (stale()) return;
    engineRef.current.reset();
    setPhase('running');
    loop();
  }, [loop, stop]);

  useEffect(() => stop, [stop]);

  return { videoRef, canvasRef, phase, error, frame, perf, start, engine: engineRef.current };
}
