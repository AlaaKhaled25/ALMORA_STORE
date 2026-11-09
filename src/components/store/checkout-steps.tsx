const steps = [
  { number: 1, label: "السلة" },
  { number: 2, label: "البيانات" },
  { number: 3, label: "التأكيد" },
] as const;

export default function CheckoutSteps({
  current,
}: {
  current: 1 | 2 | 3;
}) {
  return (
    <ol
      aria-label="خطوات إتمام الطلب"
      className="flex items-center gap-2 rounded-2xl border border-brand-line bg-white/70 px-3 py-2.5 text-xs"
    >
      {steps.map((step, index) => {
        const isDone = step.number < current;
        const isActive = step.number === current;

        return (
          <li
            key={step.number}
            className="flex min-w-0 flex-1 items-center gap-2"
          >
            <span
              className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                isDone
                  ? "bg-brand-success text-white"
                  : isActive
                    ? "bg-brand-wine text-white"
                    : "bg-brand-sand text-brand-muted"
              }`}
              aria-current={isActive ? "step" : undefined}
            >
              {isDone ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                >
                  <path d="m5 12 4 4L19 6" />
                </svg>
              ) : (
                step.number
              )}
            </span>
            <span
              className={`truncate font-semibold ${
                isActive ? "text-brand-ink" : "text-brand-muted"
              }`}
            >
              {step.label}
            </span>
            {index < steps.length - 1 ? (
              <span
                className={`h-px flex-1 ${
                  isDone ? "bg-brand-success/40" : "bg-brand-line"
                }`}
                aria-hidden="true"
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
