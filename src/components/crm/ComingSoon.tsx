import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "./PageHeader";

export function ComingSoon({ icon: Icon, eyebrow, title, description, features }: {
  icon: LucideIcon; eyebrow: string; title: string; description: string; features: string[];
}) {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border bg-card p-10 shadow-card">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -left-10 bottom-0 h-56 w-56 rounded-full bg-info/10 blur-3xl" />
        <div className="relative grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <div className="grid h-16 w-16 place-items-center rounded-2xl gradient-primary shadow-glow">
              <Icon className="h-8 w-8 text-white" />
            </div>
            <h2 className="mt-6 text-2xl font-bold">Module ready to configure</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The {title.toLowerCase()} workspace is wired into your CRM. Connect your data and start managing operations from here.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button className="rounded-xl gradient-primary px-4 py-2.5 text-sm font-semibold text-white shadow-glow hover:opacity-95">Get started</button>
              <button className="rounded-xl border bg-card px-4 py-2.5 text-sm font-medium hover:bg-muted">View docs</button>
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {features.map((f) => (
              <li key={f} className="rounded-xl border bg-background/50 p-4 text-sm">
                <span className="font-medium">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
    </div>
  );
}
