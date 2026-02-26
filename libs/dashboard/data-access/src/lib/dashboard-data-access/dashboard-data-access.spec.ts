import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardDataAccess } from './dashboard-data-access';

describe('DashboardDataAccess', () => {
  let component: DashboardDataAccess;
  let fixture: ComponentFixture<DashboardDataAccess>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardDataAccess],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardDataAccess);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
