// dacna/app/page.tsx

// Redirect root to login selection
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/login-selection");
}
