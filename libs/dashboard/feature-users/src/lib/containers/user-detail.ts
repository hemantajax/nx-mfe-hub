import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { UserService } from '../services/user.service';
import { UserForm } from '../components/user-form';

@Component({
  selector: 'lib-user-detail',
  imports: [UserForm, RouterLink],
  templateUrl: './user-detail.html',
  styleUrl: './user-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly userService = inject(UserService);

  private readonly userId = toSignal(
    this.route.paramMap.pipe(map((p) => Number(p.get('id'))))
  );

  protected readonly user = computed(() => {
    const id = this.userId();
    return id ? this.userService.getById(id) : undefined;
  });
}
