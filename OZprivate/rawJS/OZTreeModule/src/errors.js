export class UserInterruptError extends Error {
  constructor(message) {
    super(message);
    this.name = "UserInterruptError";
  }
}

/** Signals we're still waiting for a data_store to load */
export class DataStoreNotReadyError extends Error {
  constructor(message) {
    super(message);
    this.name = "DataStoreNotReadyError";
  }
}
