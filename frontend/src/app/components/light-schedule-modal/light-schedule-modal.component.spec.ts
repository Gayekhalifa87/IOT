import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LightScheduleModalComponent } from './light-schedule-modal.component';

describe('LightScheduleModalComponent', () => {
  let component: LightScheduleModalComponent;
  let fixture: ComponentFixture<LightScheduleModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LightScheduleModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LightScheduleModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
