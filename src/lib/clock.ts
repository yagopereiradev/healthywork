/**
 * The only place the app reads the wall clock.
 *
 * Domain code never calls Date.now(): it receives a `now` timestamp (or a Clock)
 * from its caller, so reminders, workdays and day rollover can be tested with
 * any moment in time.
 */
export type Clock = () => number;

export const systemClock: Clock = () => Date.now();
