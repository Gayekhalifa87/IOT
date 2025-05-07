import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeedingManagementComponent } from './feeding-management.component';

describe('FeedingManagementComponent', () => {
  let component: FeedingManagementComponent;
  let fixture: ComponentFixture<FeedingManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeedingManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeedingManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
