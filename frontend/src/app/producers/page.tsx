import { redirect } from "next/navigation";
import { producerAuditionPostRoutes } from "@/features/audition-posts/types";

export default function ProducersPage() {
  redirect(producerAuditionPostRoutes.list);
}
