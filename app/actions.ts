"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { draftRepository } from "@/lib/drafts";

export async function createDraftAction() {
  const draft = await draftRepository.create({});

  revalidatePath("/");
  redirect(`/drafts/${draft.id}`);
}
