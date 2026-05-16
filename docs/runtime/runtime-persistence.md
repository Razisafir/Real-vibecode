# RuntimePersistenceService (#103)

The RuntimePersistenceService provides durable storage for the AI Execution Kernel's runtime state. It ensures that the system can recover from crashes, restarts, and unexpected terminations with minimal data loss and maximum continuity. The service implements a write-ahead log pattern, periodic snapshots, and crash-safe persistence protocols that guarantee consistency even when writes are interrupted mid-operation.

## Runtime Snapshot Architecture

A runtime snapshot is a complete, self-contained record of the kernel's state at a specific point in time. Snapshots capture the following data:

- **Kernel lifecycle state**: The current lifecycle stage, transition history, and configuration.
- **Service registry**: All registered services, their states, health scores, and configuration.
- **Execution queues**: The full contents of all priority queues in the ExecutionSchedulerService, including item priorities, ages, and retry counts.
- **Agent registry**: All registered agents, their descriptors, capabilities, isolation levels, and current task assignments.
- **Coordination graph**: The current state of the agent coordination graph, including all edges and their metadata.
- **Resource allocations**: Current resource budgets and quotas from the ResourceGovernanceService.
- **Health scores**: Current health scores and thermal states for all monitored services.
- **Recovery state**: Any in-progress recovery plans and their current stage.

Snapshots are taken at configurable intervals. The default snapshot cadence is every 10 seconds (200 ticks at 50ms cadence), but this can be adjusted through `runtime.persistence.snapshotIntervalMs`. The cadence trades off between recovery granularity (shorter intervals mean less data loss) and I/O overhead (more frequent writes consume disk bandwidth).

The snapshot process is non-blocking. The persistence service forks a snapshot task that copies the current state into an immutable snapshot object. This copy is performed under a read lock that allows concurrent reads but blocks state mutations for no more than 5ms. The serialized snapshot is then written to disk asynchronously, without holding any locks.

Snapshot files are named using the pattern `snapshot-{timestamp}-{sequence}.rps` and are stored in the configured `runtime.persistence.snapshotDirectory` (default: `./runtime-data/snapshots/`). The sequence number ensures uniqueness even when multiple snapshots occur within the same millisecond.

## Crash-Safe Persistence

The persistence service uses a write-ahead log (WAL) pattern to ensure crash safety. Before any mutation to the persisted state is applied in memory, it is first written to the WAL on disk. The WAL entry contains the mutation type, the target state key, the old value, the new value, and a monotonically increasing sequence number.

The WAL operates in two modes: synchronous and asynchronous. In synchronous mode (the default for critical state mutations), the WAL entry is flushed to disk using `fsync` before the in-memory mutation is applied. This guarantees that the mutation will survive a process crash or power loss. In asynchronous mode (used for non-critical mutations like telemetry), the WAL entry is buffered and flushed in batches every `walFlushIntervalMs` (default: 100ms).

On recovery, the persistence service reads the most recent snapshot and then replays any WAL entries that were written after the snapshot was taken. This brings the state forward to the last successfully written WAL entry. WAL entries that were partially written (indicated by an invalid checksum or incomplete record) are discarded, and the state is rolled back to the last complete entry.

The WAL files are named `wal-{startSequence}-{endSequence}.rwl` and are stored in `runtime.persistence.walDirectory` (default: `./runtime-data/wal/`). Each WAL file has a maximum size of `maxWalFileSizeMb` (default: 64MB). When a WAL file reaches this size, it is rotated: the current file is closed and a new one is started. Closed WAL files are eligible for compaction once their entries have been incorporated into a snapshot.

## Execution Recovery Checkpoints

Beyond periodic snapshots, the persistence service creates checkpoints at critical execution boundaries. Checkpoints are lightweight snapshots that capture only the state that changed since the last full snapshot, making them faster to write and smaller to store.

Checkpoints are created at the following trigger points:

- **Before recovery actions**: When the RuntimeRecoveryOrchestratorService is about to initiate a recovery plan, a checkpoint captures the pre-recovery state. This enables rollback if the recovery makes things worse.
- **After agent registration/deregistration**: The agent registry is checkpointed to ensure that the system can restore the correct agent set after a restart.
- **After configuration changes**: When runtime configuration is modified, a checkpoint captures the new configuration alongside the old configuration, enabling configuration rollback.
- **Before coordinated shutdown**: A final checkpoint is taken at the start of the shutdown protocol to preserve the last known good state.
- **After queue drainage events**: When the ExecutionSchedulerService sheds load or drains queues, a checkpoint records the remaining queue state.

Checkpoints use a delta encoding scheme: only the differences from the previous snapshot or checkpoint are stored. This makes checkpoints extremely compact, typically 1-5% of a full snapshot's size. Checkpoints are applied in sequence during recovery: the most recent full snapshot is loaded first, then each subsequent checkpoint is applied in order to bring the state forward.

## Task Resumption Protocol

When the runtime recovers from a crash, interrupted tasks must be resumed. The task resumption protocol ensures that no task is lost and that each task resumes from a consistent point.

Each task carries a `resumptionPoint` that records its last completed step. The resumption point is updated and persisted at each step boundary within the task's execution. On recovery, the persistence service identifies all tasks that were in-flight at the time of the crash (by scanning the WAL for tasks that started but did not complete) and re-enqueues them with their last known resumption point.

The resumption protocol handles three cases:

1. **Idempotent tasks**: Tasks that can be safely re-executed from the beginning without side effects. These tasks are simply re-enqueued at their original priority. The task's `isIdempotent` flag must be set to true for this behavior.

2. **Resumable tasks**: Tasks that carry explicit resumption points. These tasks are re-enqueued with a `ResumeFromCheckpoint` instruction that tells the executor to skip already-completed steps. The executor must implement the `resumeFrom(point)` method to support this.

3. **Non-resumable tasks**: Tasks that cannot be resumed and are not idempotent. These tasks are failed with a `TaskInterruptedError` and their originators are notified. The originator can choose to re-submit the task from scratch.

The task resumption protocol runs as the first action after state recovery, before any new work is accepted. This ensures that in-flight tasks are re-enqueued before the scheduler begins processing new tasks, preventing new work from jumping ahead of interrupted work.

## Continuity Restoration

Continuity restoration is the full state recovery process that occurs after a crash or hard restart. The process proceeds through five phases:

**Phase 1 -- Validate Storage**: The persistence service scans the snapshot and WAL directories for corruption. Each file is checksum-verified against its stored CRC32. Corrupted files are quarantined and logged. If the most recent snapshot is corrupted, the service falls back to the next most recent snapshot that passes validation.

**Phase 2 -- Load Snapshot**: The most recent valid snapshot is loaded into memory. The snapshot format is a versioned binary protocol; if the snapshot version is newer than the current runtime version, the load fails with a `SnapshotVersionMismatchError`. If the snapshot version is older, the service applies migration transformations to bring the format up to date.

**Phase 3 -- Replay WAL**: All WAL entries written after the snapshot's timestamp are replayed in sequence order. Each entry is validated before application: the old value in the WAL entry must match the current in-memory value. If a mismatch is detected, the entry is flagged and the service switches to a conservative mode where only entries that pass validation are applied.

**Phase 4 -- Apply Checkpoints**: Any checkpoints written after the last replayed WAL entry are applied. Checkpoints are validated using the same checksum and version checks as snapshots.

**Phase 5 -- Verify Consistency**: The restored state is checked for internal consistency. This includes verifying that all service references are valid, that the dependency graph contains no cycles, and that all resource allocations are within bounds. If inconsistencies are detected, the service emits a `RestoredStateInconsistent` event and the RuntimeRecoveryOrchestratorService is invoked.

The entire restoration process is designed to complete within `maxRestorationTimeMs` (default: 5000ms). If restoration exceeds this limit, the service falls back to a clean-slate initialization with a `RestorationTimeoutWarning`.

## Queue Restoration from Persistent Storage

The execution scheduler's queues are a critical component of the runtime state. Queue restoration must preserve the exact ordering and priority of all queued items to ensure that no work is lost or reordered during recovery.

Queue items are persisted in the WAL as individual entries. Each entry records the item's ID, priority, enqueue timestamp, source ID, and any associated metadata (retry count, deferral condition, etc.). On recovery, the persistence service extracts all queue-related WAL entries, sorts them by their original enqueue order (using the sequence number as a tiebreaker), and reconstructs the priority queues.

Queue restoration has a special optimization for large queues. If the queue depth at the time of the crash exceeds `queueRestorationThreshold` (default: 10000 items), the persistence service restores only the top N items per priority tier (where N is the tier's concurrency limit times 2) and marks the remaining items as "deferred restoration." Deferred items are loaded lazily as the queues drain, reducing initial recovery time from potentially seconds to milliseconds.

## Replayable Runtime State

All persisted state is stored in a format that supports deterministic replay. This means that given the same initial snapshot and the same sequence of WAL entries, the restored state will always be identical regardless of the platform or timing of the replay.

Replayability is achieved through several design constraints:

- **No timestamps in state logic**: While timestamps are recorded for auditing, they are never used to make state decisions. All ordering is based on sequence numbers.
- **Deterministic serialization**: All data types use a deterministic serialization format that produces the same byte representation regardless of platform endianness or floating-point representation.
- **No random values in state**: Random values (such as jitter in retry delays) are generated at execution time, not at persistence time. The persisted state records only the decision, not the random input.
- **Versioned schemas**: Each persisted record includes a schema version. Replayers can apply schema migrations to handle format evolution.

The replayable state enables two important capabilities:

1. **Debugging**: Developers can replay the runtime state history to reproduce and diagnose issues that occurred in production.
2. **Auditing**: The complete state history provides an audit trail of all runtime decisions, which is required for compliance in some environments.

## Persistence Compaction Algorithm

Over time, the accumulation of snapshots, checkpoints, and WAL files can consume significant disk space. The persistence service runs a compaction algorithm to reclaim space while preserving the ability to recover to any recent point in time.

The compaction algorithm operates on the following rules:

- **Age-based pruning**: Snapshots older than `maxSnapshotAgeMs` (default: 3600000ms / 1 hour) are deleted. The most recent snapshot within each `snapshotRetentionInterval` (default: 300000ms / 5 minutes) is retained to provide historical recovery points.
- **Size limits**: The total size of all persistence files is capped at `maxPersistenceSizeMb` (default: 512MB). When this limit is exceeded, the oldest files are deleted first.
- **WAL compaction**: After a new snapshot is successfully written, all WAL files whose entries are fully covered by the snapshot are deleted. Checkpoint files covered by the snapshot are similarly deleted.
- **Checkpoint merging**: When multiple consecutive checkpoints exist, they are merged into a single cumulative checkpoint to reduce the number of files and improve recovery speed.

Compaction runs during the maintenance phase, which occurs every 200 ticks (10 seconds at default cadence). A full compaction pass completes in under 100ms for typical data volumes.

## Corruption Validation

Every persisted file is protected against corruption through a multi-layer validation scheme:

- **CRC32 checksum**: Each record within a WAL, snapshot, or checkpoint file includes a CRC32 checksum computed over the record's bytes. On read, the checksum is recomputed and compared. A mismatch indicates corruption.
- **File-level checksum**: Each file includes a footer with a CRC32 checksum of the entire file contents. This provides a fast way to detect corruption without scanning every record.
- **Magic bytes**: Each file begins with a 4-byte magic sequence (`RKW\0` for WAL, `RKS\0` for snapshots, `RKC\0` for checkpoints). Files with incorrect magic bytes are immediately rejected.
- **Schema version**: Each file includes a schema version number. Files with a schema version that the current runtime cannot parse are rejected with a `SchemaVersionTooNewError` or handled through migration for older versions.

When corruption is detected, the persistence service quarantines the corrupted file (moving it to `runtime.persistence.quarantineDirectory`) and attempts to recover from the next most recent file. A `PersistenceCorruptionDetected` event is emitted with details about the corrupted file and the recovery action taken.
