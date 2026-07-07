"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const SHAKE_THRESHOLD = 15;
const SHAKE_COOLDOWN_MS = 200;

type PermissionState = "unknown" | "granted" | "denied" | "unsupported";

export function useShakeDetector(onShake: () => void) {
  const [permissionState, setPermissionState] = useState<PermissionState>("unknown");
  const lastShakeTimeRef = useRef(0);
  const lastAccRef = useRef({ x: 0, y: 0, z: 0 });
  const onShakeRef = useRef(onShake);
  onShakeRef.current = onShake;

  const handleMotion = useCallback((e: DeviceMotionEvent) => {
    const acc = e.accelerationIncludingGravity;
    if (!acc || acc.x == null) return;
    const x = acc.x ?? 0;
    const y = acc.y ?? 0;
    const z = acc.z ?? 0;
    const last = lastAccRef.current;
    const delta = Math.abs(x - last.x) + Math.abs(y - last.y) + Math.abs(z - last.z);
    lastAccRef.current = { x, y, z };
    const now = Date.now();
    if (delta > SHAKE_THRESHOLD && now - lastShakeTimeRef.current > SHAKE_COOLDOWN_MS) {
      lastShakeTimeRef.current = now;
      onShakeRef.current();
    }
  }, []);

  const requestPermission = useCallback(async () => {
    // @ts-expect-error iOS Safari non-standard API
    if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
      try {
        // @ts-expect-error iOS Safari non-standard API
        const result: string = await DeviceMotionEvent.requestPermission();
        if (result === "granted") {
          setPermissionState("granted");
          window.addEventListener("devicemotion", handleMotion);
        } else {
          setPermissionState("denied");
        }
      } catch {
        setPermissionState("denied");
      }
    } else {
      setPermissionState("granted");
      window.addEventListener("devicemotion", handleMotion);
    }
  }, [handleMotion]);

  useEffect(() => {
    if (typeof window === "undefined") {
      setPermissionState("unsupported");
      return;
    }
    if (!("DeviceMotionEvent" in window)) {
      setPermissionState("unsupported");
      return;
    }
    // @ts-expect-error iOS Safari non-standard API
    if (typeof DeviceMotionEvent.requestPermission === "function") {
      // iOS: wait for explicit user gesture before attaching
      return;
    }
    // Non-iOS: attach automatically
    setPermissionState("granted");
    window.addEventListener("devicemotion", handleMotion);
    return () => window.removeEventListener("devicemotion", handleMotion);
  }, [handleMotion]);

  return { permissionState, requestPermission };
}
