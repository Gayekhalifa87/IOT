import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LightScheduleDialogComponent } from './light-schedule-dialog.component';

describe('LightScheduleDialogComponent', () => {
  let component: LightScheduleDialogComponent;
  let fixture: ComponentFixture<LightScheduleDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LightScheduleDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LightScheduleDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
