import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { isStaff } from "@/lib/office-live";

export type LaunchState = {
  hoursOk: boolean;
  publicOk: boolean;
  voiceOk: boolean;
  videoOk: boolean;
  remindersOn: boolean;
};

const EMPTY: LaunchState = {
  hoursOk: false,
  publicOk: false,
  voiceOk: false,
  videoOk: false,
  remindersOn: false,
};

function rowToState(r?: {
  hours_ok: boolean;
  public_ok: boolean;
  voice_ok: boolean;
  video_ok: boolean;
  reminders_on: boolean;
}): LaunchState {
  if (!r) return { ...EMPTY };
  return {
    hoursOk: r.hours_ok,
    publicOk: r.public_ok,
    voiceOk: r.voice_ok,
    videoOk: r.video_ok,
    remindersOn: r.reminders_on,
  };
}

export const loadLaunch = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<LaunchState> => {
    if (!(await isStaff(context.userId))) return { ...EMPTY };
    const sql = await getSql();
    const rows = await sql<{
      hours_ok: boolean;
      public_ok: boolean;
      voice_ok: boolean;
      video_ok: boolean;
      reminders_on: boolean;
    }>`
      select hours_ok, public_ok, voice_ok, video_ok, reminders_on
      from office_launch
      where user_id = ${context.userId}
    `;
    return rowToState(rows[0]);
  });

export const saveLaunch = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: Partial<LaunchState>) => input)
  .handler(async ({ data, context }): Promise<LaunchState> => {
    if (!(await isStaff(context.userId))) throw new Error("staff only");
    const sql = await getSql();
    const existing = await sql<{
      hours_ok: boolean;
      public_ok: boolean;
      voice_ok: boolean;
      video_ok: boolean;
      reminders_on: boolean;
    }>`
      select hours_ok, public_ok, voice_ok, video_ok, reminders_on
      from office_launch
      where user_id = ${context.userId}
    `;
    const next: LaunchState = {
      ...rowToState(existing[0]),
      ...data,
    };
    await sql`
      insert into office_launch (
        user_id, hours_ok, public_ok, voice_ok, video_ok, reminders_on, updated_at
      )
      values (
        ${context.userId},
        ${next.hoursOk},
        ${next.publicOk},
        ${next.voiceOk},
        ${next.videoOk},
        ${next.remindersOn},
        now()
      )
      on conflict (user_id) do update set
        hours_ok = excluded.hours_ok,
        public_ok = excluded.public_ok,
        voice_ok = excluded.voice_ok,
        video_ok = excluded.video_ok,
        reminders_on = excluded.reminders_on,
        updated_at = now()
    `;
    return next;
  });
