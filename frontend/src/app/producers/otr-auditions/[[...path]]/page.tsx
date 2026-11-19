import { redirect } from "next/navigation";
import { PRODUCER_DASHBOARD_PATH } from "@/features/auth/producer-navigation";

export default function RetiredIntakePage() {
  redirect(PRODUCER_DASHBOARD_PATH);
}
