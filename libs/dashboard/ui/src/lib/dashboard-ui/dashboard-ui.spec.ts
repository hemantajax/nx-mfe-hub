import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardUi } from './dashboard-ui';

describe('DashboardUi', () => {
  let component: DashboardUi;
  let fixture: ComponentFixture<DashboardUi>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardUi],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardUi);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
