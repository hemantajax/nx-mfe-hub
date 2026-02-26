import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardFeatureUsers } from './dashboard-feature-users';

describe('DashboardFeatureUsers', () => {
  let component: DashboardFeatureUsers;
  let fixture: ComponentFixture<DashboardFeatureUsers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardFeatureUsers],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardFeatureUsers);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
