import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="relative isolate overflow-hidden">
      {/* Top blob */}
      <div aria-hidden="true" className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
        <div
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary/40 to-primary/10 opacity-40 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
        />
      </div>

      <div className="mx-auto max-w-3xl px-6 py-24 sm:py-36 lg:px-8 lg:py-48">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center"
        >
          <div className="mb-8 flex justify-center">
            <div className="rounded-full px-3 py-1 text-sm text-muted-foreground ring-1 ring-border">
              Serving Southern California — LA to Coachella Valley to San Diego
            </div>
          </div>

          <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-balance">
            Find the right crew for every job.
          </h1>

          <p className="mt-6 text-lg text-muted-foreground text-pretty sm:text-xl">
            Describe your project in one sentence. We surface ranked subcontractors from a 10,000-person roster — matched by role, specialization depth, proximity, and availability.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Button size="lg" asChild>
              <Link to="/chat">
                Get Started <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="ghost" asChild>
              <Link to="/team">Browse the roster</Link>
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Bottom blob */}
      <div aria-hidden="true" className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]">
        <div
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
          className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-primary/40 to-primary/10 opacity-40 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
        />
      </div>
    </div>
  );
}
