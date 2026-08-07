import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="relative isolate flex h-[calc(100dvh-3.5rem)] lg:h-dvh items-center justify-center overflow-hidden bg-neutral-950">
      {/* Faded background: William Kristel in his Palm Springs mid-century setting */}
      <div className="absolute inset-0 -z-10">
        <img
          src="/hero-kristel.png"
          alt=""
          className="h-full w-full object-cover object-center opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/70 via-neutral-950/50 to-neutral-950" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 mx-auto max-w-3xl px-6 text-center text-white"
      >
        <div className="mb-8 flex justify-center">
          <div className="rounded-full px-3 py-1 text-sm text-white/70 ring-1 ring-white/20 backdrop-blur">
            Named for Palm Springs mid-century modernism
          </div>
        </div>

        <h1 className="text-5xl sm:text-7xl font-light tracking-tight text-balance">
          Find the right crew for every job.
        </h1>

        <p className="mt-8 text-lg text-white/70 text-pretty sm:text-xl">
          Describe your project in one sentence. Kristel Match returns ranked subcontractors from a 10,000-person Southern California roster — matched by role, specialization depth, proximity, and availability.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <Button size="lg" asChild>
            <Link to="/chat">
              Get Started <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="ghost"
            asChild
            className="text-white hover:bg-white/10 hover:text-white"
          >
            <Link to="/team">Browse the roster</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
