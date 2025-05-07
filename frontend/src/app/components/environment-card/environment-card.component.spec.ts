import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnvironmentCardComponent } from './environment-card.component';

describe('EnvironmentCardComponent', () => {
  let component: EnvironmentCardComponent;
  let fixture: ComponentFixture<EnvironmentCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnvironmentCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnvironmentCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
