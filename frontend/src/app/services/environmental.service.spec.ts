import { TestBed } from '@angular/core/testing';

import { EnvironmentalService } from './environmental.service';

describe('EnvironmentalService', () => {
  let service: EnvironmentalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EnvironmentalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
