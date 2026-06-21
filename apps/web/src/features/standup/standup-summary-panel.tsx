"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserRole } from "@flowforge/shared";
import { AlertTriangle, CheckCircle2, RefreshCw, Timer } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, queryKeys } from "@/lib/api-client";

type StandupSummaryPanelProps = {
  projectId: string | null;
  role?: UserRole;
};

export function StandupSummaryPanel({ projectId, role }: StandupSummaryPanelProps) {
  const queryClient = useQueryClient();
  const canView = role === "PM" || role === "INTERNAL";
  const canGenerate = role === "PM";

  const standup = useQuery({
    queryKey: queryKeys.standup(projectId),
    queryFn: () => api.dailyStandup(projectId as string),
    enabled: Boolean(projectId && canView),
  });

  const generateMutation = useMutation({
    mutationFn: () => api.generateStandup(projectId as string),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.standup(projectId) }),
  });

  if (!canView) return null;

  const latest = standup.data?.[0];
  const previous = standup.data?.slice(1) ?? [];

  return (
    <section>
      <div className="rounded-2xl border border-white/80 bg-violet-50/70 p-4 shadow-sm shadow-violet-100/60">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Daily standup summary</h2>
            <p className="mt-1 text-xs text-slate-500">
              {latest ? new Date(latest.summaryDate).toLocaleDateString() : "No generated summary yet."}
            </p>
          </div>
          {canGenerate ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 rounded-lg border-white/80 bg-white/70 text-xs hover:bg-white"
              disabled={!projectId || generateMutation.isPending}
              onClick={() => generateMutation.mutate()}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {generateMutation.isPending ? "Generating..." : "Generate today"}
            </Button>
          ) : null}
        </div>

        {standup.error ? <Alert className="mt-4 border-coral text-coral">{(standup.error as Error).message}</Alert> : null}
        {generateMutation.error ? <Alert className="mt-4 border-coral text-coral">{(generateMutation.error as Error).message}</Alert> : null}
        {standup.isLoading ? <p className="mt-4 text-sm text-slate-500">Loading summary...</p> : null}

        {latest ? (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap items-start gap-2">
              <Badge variant="outline" className="gap-1.5 rounded-md border-white/80 bg-white/70 text-sky-700">
                <CheckCircle2 className="h-3 w-3" />
                {latest.completedCount} done
              </Badge>
              <Badge variant="muted" className="gap-1.5 rounded-md border-white/80 bg-white/70 text-orange-700">
                <Timer className="h-3 w-3" />
                {latest.inProgressCount} in progress
              </Badge>
              <Badge variant={latest.blockedCount ? "warning" : "outline"} className="gap-1.5 rounded-md border-white/80 bg-white/70 text-rose-700">
                <AlertTriangle className="h-3 w-3" />
                {latest.blockedCount} blocked
              </Badge>
            </div>
            {latest.blockers.length ? (
              <div>
                <p className="text-[10px] font-medium uppercase text-slate-500">Blockers</p>
                <ul className="mt-1 flex flex-wrap gap-1.5 text-xs text-rose-700">
                  {latest.blockers.map((blocker) => (
                    <li key={blocker.id} className="rounded-md border border-white/80 bg-white/65 px-2 py-1">
                      {blocker.title}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {previous.length ? (
              <div className="border-t border-white/70 pt-3">
                <p className="text-[10px] font-medium uppercase text-slate-500">Previous summaries</p>
                <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {previous.map((summary) => (
                    <div key={summary.id} className="rounded-xl border border-white/80 bg-white/60 px-3 py-2 text-xs">
                      <p className="font-medium text-ink">{new Date(summary.summaryDate).toLocaleDateString()}</p>
                      <p className="mt-1 line-clamp-2 text-slate-600">{summary.summaryText}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : !standup.isLoading ? (
          <p className="mt-4 rounded-xl border border-white/70 bg-white/50 px-3 py-2 text-sm text-slate-500">
            Generate a summary to capture today's delivery progress.
          </p>
        ) : null}
      </div>
    </section>
  );
}
