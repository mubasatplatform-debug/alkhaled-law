import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { dbSource, type DbSource } from "@/lib/db";

export interface InfraReadiness {
  /** Which database backend the running server actually picked. */
  db: DbSource;
  /** Whether that backend survives a restart. */
  durable: boolean;
}

/**
 * Staff-only: the office needs to know whether it is running on the throwaway
 * preview database before it starts booking real clients. Reading it on the
 * server is the only honest answer — the client cannot see `DATABASE_URL`.
 */
export const getInfraReadiness = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async (): Promise<InfraReadiness> => ({
    db: dbSource,
    durable: dbSource === "neon",
  }));
