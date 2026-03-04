import {
  ChangeDetectionStrategy, Component, inject, signal, computed
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InsightsService } from '@ng-mfe-hub/eco-tracker-data-access';
import type { GoalType } from '@ng-mfe-hub/eco-tracker-data-access';
import { GoalProgressComponent, EmptyStateComponent } from '@ng-mfe-hub/eco-tracker-ui';

const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  'emission-limit':  'Monthly Emission Limit (kg CO₂e)',
  'trees-planted':   'Trees to Plant This Month',
  'offset-target':   'Total CO₂ Offset Target (kg)',
};

@Component({
  selector: 'eco-goals-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, GoalProgressComponent, EmptyStateComponent],
  template: `
    <div class="container py-4 px-3 px-md-4" style="max-width:800px">
      <div class="d-flex align-items-center gap-2 mb-4">
        <button class="btn btn-link p-0 text-muted" (click)="router.navigate(['/eco-tracker/insights'])">
          <i class="icon-arrow-left"></i>
        </button>
        <h2 class="fw-bold text-eco mb-0">🎯 Goals</h2>
      </div>

      <!-- Add Goal Form -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-header bg-white border-bottom d-flex justify-content-between align-items-center">
          <span class="fw-semibold">Set a New Goal</span>
          <button class="btn btn-link btn-sm p-0" (click)="showForm.set(!showForm())">
            <i [class]="showForm() ? 'icon-minus' : 'icon-plus'"></i>
          </button>
        </div>
        @if (showForm()) {
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-4">
                <label class="form-label small fw-semibold">Goal Type</label>
                <select class="form-select form-select-sm" [(ngModel)]="goalType">
                  @for (entry of goalTypes; track entry.value) {
                    <option [value]="entry.value">{{ entry.label }}</option>
                  }
                </select>
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-semibold">Month</label>
                <input type="month" class="form-control form-control-sm"
                       [(ngModel)]="goalMonth" />
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-semibold">Target</label>
                <input type="number" class="form-control form-control-sm"
                       [(ngModel)]="goalTarget" min="1" placeholder="e.g. 100" />
              </div>
              <div class="col-md-2 d-flex align-items-end">
                <button class="btn btn-success btn-sm w-100" (click)="addGoal()" [disabled]="saving()">
                  @if (saving()) { <span class="spinner-border spinner-border-sm"></span> }
                  @else { Set Goal }
                </button>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Goals List -->
      @if (insightsService.goals().length === 0) {
        <eco-empty-state
          icon="🎯"
          title="No goals set"
          message="Set monthly goals to track your progress toward a lower carbon footprint."
          ctaLabel="Set First Goal"
          (ctaClick)="showForm.set(true)" />
      } @else {
        <div class="row g-3">
          @for (goal of insightsService.goals(); track goal.id) {
            <div class="col-md-6">
              <div class="card border-0 shadow-sm p-4 h-100">
                <div class="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <div class="fw-semibold">{{ LABELS[goal.type] }}</div>
                    <div class="text-muted small">{{ goal.month }}</div>
                  </div>
                  <button class="btn btn-link text-danger p-0 btn-sm" (click)="deleteGoal(goal.id)">
                    <i class="icon-trash"></i>
                  </button>
                </div>
                <eco-goal-progress
                  [label]="'Target: ' + goal.targetCo2e + (goal.type === 'trees-planted' ? ' trees' : ' kg')"
                  [progress]="insightsService.getGoalProgress(goal)"
                  [sub]="goalSubLabel(goal)" />
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class GoalsPageComponent {
  protected readonly insightsService = inject(InsightsService);
  protected readonly router = inject(Router);
  protected readonly LABELS = GOAL_TYPE_LABELS;

  protected readonly goalTypes: { value: GoalType; label: string }[] = [
    { value: 'emission-limit', label: 'Monthly emission limit' },
    { value: 'trees-planted',  label: 'Trees to plant' },
    { value: 'offset-target',  label: 'CO₂ offset target' },
  ];

  protected showForm = signal(false);
  protected saving = signal(false);
  protected goalType: GoalType = 'emission-limit';
  protected goalMonth = new Date().toISOString().slice(0, 7);
  protected goalTarget = 100;

  async addGoal(): Promise<void> {
    if (!this.goalMonth || !this.goalTarget) return;
    this.saving.set(true);
    await this.insightsService.addGoal({
      month: this.goalMonth,
      targetCo2e: this.goalTarget,
      type: this.goalType,
    });
    this.saving.set(false);
    this.showForm.set(false);
  }

  async deleteGoal(id: string): Promise<void> {
    if (confirm('Delete this goal?')) {
      await this.insightsService.deleteGoal(id);
    }
  }

  goalSubLabel(goal: import('@ng-mfe-hub/eco-tracker-data-access').Goal): string {
    const pct = this.insightsService.getGoalProgress(goal);
    return pct >= 100 ? '✅ Goal achieved!' : `${pct}% complete`;
  }
}
