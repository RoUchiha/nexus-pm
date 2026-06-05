import type { ActivityLogEntry, ActivityAction, AppPhase } from '../types';

let _counter = 0;

export function makeActivityEntry(
  agentId: string,
  agentName: string,
  phase: AppPhase,
  action: ActivityAction,
  missionPortion: string,
  reasoning: string,
  details?: string,
): ActivityLogEntry {
  return {
    id: `log_demo_${Date.now()}_${++_counter}`,
    timestamp: Date.now(),
    agentId,
    agentName,
    phase,
    action,
    missionPortion,
    reasoning,
    details,
  };
}
