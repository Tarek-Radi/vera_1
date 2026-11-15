import { databaseFreeCheckout } from "../../config/checkout";
import { AdminDashboard } from "../../components/admin/AdminDashboard";
import { authConfigured } from "../../lib/auth/server";
import { databaseConfigured } from "../../lib/db/client";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Owner dashboard",
  robots: { index: false, follow: false },
};
export default function Admin() {
  if (databaseFreeCheckout)
    return (
      <section className="page-shell">
        <h1>WhatsApp order follow-up</h1>
        <p>
          Orders are followed up in the store’s WhatsApp chat. Central order
          history and admin order actions are disabled in this mode.
        </p>
      </section>
    );
  return (
    <div className="page-shell">
      <header className="page-heading">
        <p className="eyebrow">VERA / OWNER SPACE</p>
        <h1>
          Order studio<span>.</span>
        </h1>
      </header>
      <AdminDashboard configured={authConfigured() && databaseConfigured()} />
    </div>
  );
}
