import React, { useEffect } from "react";
import { useRouter } from "expo-router";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/feed" as any);
    }, 0);
    
    return () => clearTimeout(timer);
  }, [router]);

  return null;
}
