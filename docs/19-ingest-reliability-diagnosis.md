# Ingest Reliability Diagnosis

Last updated: 2026-04-28

## Purpose

This document records what testing showed about the current watched-folder workflow.

The important point is:

The next problem is not "better clustering first."

The next problem is:

`make automatic ingest reliable before adding more automation on top of it`

## What the seller expected

Expected behavior:

1. paste photos into watched folder
2. app notices them
3. app imports them
4. app groups them
5. app creates stock items automatically when possible

## What the current app actually does

Current behavior is inconsistent.

What works:

- manual `Scan now`
- import pipeline when explicitly triggered
- downstream Stock and Review surfaces

What is not reliable enough:

- passive automatic detection of new files while the app is open
- automatic trigger of grouping after passive file arrival
- visibility into whether ingest or grouping actually ran

## Main finding

The current watcher implementation is the weak point.

The app currently uses in-process filesystem watching inside the Next.js app runtime.

That is a poor fit for the desired behavior because:

- Next app runtime is request-driven
- dev/runtime process lifecycle is not a true desktop background worker
- long-lived filesystem watching is fragile in this shape

## Practical diagnosis

There are two separate concerns.

### Concern 1 - Ingest trigger reliability

This is the current blocker.

If the app does not reliably notice new files, then:

- import may not run
- grouping may never start
- seller cannot trust the app

### Concern 2 - Grouping quality

This is still important, but second.

Many real photo files are named like:

- `IMG_8146`
- `IMG_8147`

Those names provide almost no grouping hint.

So even after ingest is reliable, flat-folder grouping still needs:

- visual descriptors
- similarity scoring
- confidence thresholds

## Product implication

Do not continue building more grouping sophistication on top of an unreliable ingest trigger.

First make watched-folder behavior dependable.

Then improve grouping quality.

## Engineering implication

There are two possible technical paths.

### Near-term fix

Use automatic scanning / polling instead of relying on passive in-process `fs.watch`.

Example shape:

- app checks watched folder on interval while Inbox is active
- app scans on page load
- app scans on explicit `Scan now`
- app records scan result and grouping result clearly

Why:

- simpler
- more predictable
- easier to debug
- enough for current desktop-local use

### Long-term fix

Build a separate local watcher companion process.

Why:

- proper long-lived desktop watcher
- cleaner separation from web app runtime
- better fit for true automatic background behavior

But this should not block the near-term fix.

## Recommendation

The next implementation cycle should do this in order:

1. fix ingest reliability
2. improve visibility and error reporting
3. strengthen manual grouping tools
4. improve automatic clustering
5. only later build the dedicated local watcher service

## Success condition

The watched-folder feature is acceptable only when this becomes true:

- seller pastes files into folder
- app notices them without manual debugging
- imported files appear consistently
- app clearly shows whether grouping succeeded, failed, or needs review

Until that happens, grouping quality work is premature.
