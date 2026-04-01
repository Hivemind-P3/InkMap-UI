import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeographicMaps } from './geographic-maps';

describe('GeographicMaps', () => {
  let component: GeographicMaps;
  let fixture: ComponentFixture<GeographicMaps>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeographicMaps],
    }).compileComponents();

    fixture = TestBed.createComponent(GeographicMaps);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
