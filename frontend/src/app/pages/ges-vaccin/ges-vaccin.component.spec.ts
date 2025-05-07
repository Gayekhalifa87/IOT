import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GesVaccinComponent } from './ges-vaccin.component';

describe('GesVaccinComponent', () => {
  let component: GesVaccinComponent;
  let fixture: ComponentFixture<GesVaccinComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GesVaccinComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GesVaccinComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
