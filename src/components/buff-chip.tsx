import { formatDuration } from "@/lib/utils";

export function BuffChip({
    label,
    remainingMs,
    fadedText = "wore off",
}: {
    label: string;
    remainingMs: number;
    fadedText?: string;
}) {
    const active = remainingMs > 0;
    return(
        <span
            className={
                active
                    ? "rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide text-accent"
                    : "rounded-full border border-border/40 bg-transparent px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide text-muted opacity-60"
            }
        >
            {active ? `${label} . ${formatDuration(remainingMs)}` : `${label} . ${fadedText}`}
        </span>
    );
}