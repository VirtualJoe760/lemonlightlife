import { UserCircle, MapPin, Phone, Mail, IdCard } from "lucide-react";

export default function Account() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">Account</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Auth is out of scope for this trial. Static demo profile below.
      </p>

      <div className="mt-8 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/15 text-primary text-xl font-semibold">
            JS
          </div>
          <div>
            <div className="text-lg font-semibold">Joseph Sardella</div>
            <div className="text-sm text-muted-foreground">General Contractor</div>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-muted-foreground" />
            <dt className="sr-only">Region</dt>
            <dd>Southern California</dd>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="size-4 text-muted-foreground" />
            <dt className="sr-only">Phone</dt>
            <dd>(760) 555-0142</dd>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-muted-foreground" />
            <dt className="sr-only">Email</dt>
            <dd>joseph@sardella-construction.example</dd>
          </div>
          <div className="flex items-center gap-2">
            <IdCard className="size-4 text-muted-foreground" />
            <dt className="sr-only">License</dt>
            <dd>CSLB #1234567</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
