import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { User } from '../models/user.model';

@Component({
  selector: 'lib-user-form',
  imports: [],
  templateUrl: './user-form.html',
  styleUrl: './user-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserForm {
  readonly user = input.required<User>();
  readonly saved = output<User>();
}
