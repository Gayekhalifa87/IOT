import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PasswordConfirmComponent } from './password-confirm.component';

describe('PasswordConfirmComponent', () => {
  let component: PasswordConfirmComponent;
  let fixture: ComponentFixture<PasswordConfirmComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasswordConfirmComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PasswordConfirmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
