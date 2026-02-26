import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserService } from '../services/user.service';
import { UserCard } from '../components/user-card';

@Component({
  selector: 'lib-user-list',
  imports: [UserCard, RouterLink],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserList {
  protected readonly userService = inject(UserService);
  protected readonly users = this.userService.users;
}
