"use server";

import { revalidatePath } from "next/cache";

import { getAuthenticatedUser, isAdmin } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import type { EventInput } from "@/lib/types";

function revalidateEvents() {
  revalidatePath("/portal/events");
  revalidatePath("/events");
  revalidatePath("/");
}

export async function saveEvent(input: EventInput) {
  const user = await getAuthenticatedUser();
  if (!user || !(await isAdmin(user))) {
    return { ok: false as const, error: "Not authorized." };
  }

  const title = input.title?.trim();
  const eventDate = input.event_date?.trim();
  if (!title) return { ok: false as const, error: "A title is required." };
  if (!eventDate) {
    return { ok: false as const, error: "A date and time is required." };
  }

  // `datetime-local` values have no timezone, so parsing them here would use
  // the server's zone (UTC on Vercel) instead of the director's. The client
  // sends an absolute timestamp; reject anything without an explicit offset so
  // this cannot silently regress.
  const parsedDate = new Date(eventDate);
  if (
    !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(eventDate) ||
    Number.isNaN(parsedDate.getTime())
  ) {
    return { ok: false as const, error: "A valid date and time is required." };
  }

  const payload = {
    title,
    description: input.description?.trim() ?? "",
    event_date: parsedDate.toISOString(),
    location: input.location?.trim() ?? "",
    registration_link: input.registration_link?.trim() ?? "",
  };

  const supabase = await createClient();
  const { data, error } = input.id
    ? await supabase
        .from("events")
        .update(payload)
        .eq("id", input.id)
        .select("id")
    : await supabase
        .from("events")
        .insert({ ...payload, created_by: user.id })
        .select("id");

  if (error) return { ok: false as const, error: error.message };
  if (!data?.length) {
    return {
      ok: false as const,
      error: "That event could not be saved. It may have been deleted.",
    };
  }

  revalidateEvents();
  return { ok: true as const };
}

export async function deleteEvent(id: string) {
  const user = await getAuthenticatedUser();
  if (!user || !(await isAdmin(user))) {
    return { ok: false as const, error: "Not authorized." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidateEvents();
  return { ok: true as const };
}
