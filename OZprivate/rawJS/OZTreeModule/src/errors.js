export class UserInterruptError extends Error {
  constructor(message) {
    super(message);
    this.name = "UserInterruptError";
  }
}

