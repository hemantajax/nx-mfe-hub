import { Injectable, signal } from '@angular/core';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly _users = signal<User[]>([
    { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'admin' },
    { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'editor' },
    { id: 3, name: 'Carol White', email: 'carol@example.com', role: 'viewer' },
  ]);

  readonly users = this._users.asReadonly();

  getById(id: number): User | undefined {
    return this._users().find((u) => u.id === id);
  }
}
