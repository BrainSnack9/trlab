export function StageHead({ label, title, description, children }) {
  return (
    <section className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {label ? <p className="text-xs font-black uppercase text-slate-500">{label}</p> : null}
        <h1 className="mt-1 text-2xl font-black leading-tight tracking-tight md:text-3xl">{title}</h1>
        <p className="mt-2 max-w-3xl text-[13px] leading-5 text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}
