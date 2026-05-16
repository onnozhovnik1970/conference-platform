import { Footer } from "@/components/footer";
import { SiteHeader } from "@/components/site-header";

import { cn } from "@/lib/utils";

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className={cn("relative z-0 min-h-0 flex-1", "public-site")}>{children}</div>
      <Footer />
    </div>
  );
}
