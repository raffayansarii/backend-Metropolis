import { User } from '../types';
import { UserService } from '../services/userService';

interface QueuedRequest {
  userId: number;
  resolve: (user: User | null) => void;
  reject: (error: Error) => void;
}

export class RequestQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private userService: UserService;

  constructor(userService: UserService) {
    this.userService = userService;
  }

  async enqueue(userId: number): Promise<User | null> {
    return new Promise((resolve, reject) => {
      this.queue.push({ userId, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (!request) break;

      try {
        const user = await this.userService.getUserById(request.userId);
        request.resolve(user);
      } catch (error) {
        request.reject(
          error instanceof Error ? error : new Error('Unknown error')
        );
      }
    }

    this.processing = false;
  }
}

