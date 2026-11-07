import type { Metadata } from "next";
import { connection } from "next/server";
import TrackView from "./track-view";

export const instant = false;

export const metadata: Metadata = {
  title: "تتبع طلبك | متجري",
  description: "تتبع حالة طلبك باستخدام رقم الطلب ورقم الهاتف.",
};

export default async function TrackPage() {
  await connection();
  return <TrackView />;
}
