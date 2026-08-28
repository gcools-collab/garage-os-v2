import type { ExecutionEvent, ExecutionReporter } from "./types";

export class StructuredExecutionReporter implements ExecutionReporter {
  readonly events: ExecutionEvent[] = [];

  report(event: ExecutionEvent): void {
    this.events.push(event);
    process.stdout.write(`${JSON.stringify(event)}\n`);
  }
}
