"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getTimezone,
  setTimezone,
  TIMEZONE_CHANGE_EVENT,
  TIMEZONE_STORAGE_KEY,
  type TimezoneValue,
} from "@/lib/timezone";

export function useTimezone() {
  const [tz, setTz] = useState<TimezoneValue>("Pacific/Auckland");

  useEffect(() => {
    const syncTimezone = () => {
      setTz(getTimezone());
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== TIMEZONE_STORAGE_KEY) return;
      syncTimezone();
    };

    const onTimezoneChange: EventListener = (event) => {
      const nextTz = (event as CustomEvent<TimezoneValue>).detail;
      setTz(nextTz ?? getTimezone());
    };

    syncTimezone();
    window.addEventListener("storage", onStorage);
    window.addEventListener(TIMEZONE_CHANGE_EVENT, onTimezoneChange);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(TIMEZONE_CHANGE_EVENT, onTimezoneChange);
    };
  }, []);

  const update = useCallback((value: TimezoneValue) => {
    setTimezone(value);
    setTz(value);
  }, []);

  return [tz, update] as const;
}
