"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Demo mode: no login screen — open the admin dashboard directly. */
export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return null;
}
