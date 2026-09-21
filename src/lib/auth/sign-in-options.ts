import { createServerFn } from "@tanstack/react-start";

/**
 * Which social sign-in the login page may offer. Decided from server env only,
 * so the page never shows a button that cannot complete (see `brokerUsable`).
 */
export const getSignInOptions = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ google: boolean }> => {
    const { googleSignInAvailable } = await import("./server");
    return { google: googleSignInAvailable };
  },
);
