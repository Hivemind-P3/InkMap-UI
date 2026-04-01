import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapEditor } from './map-editor';

describe('MapEditor', () => {
  let component: MapEditor;
  let fixture: ComponentFixture<MapEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapEditor],
    }).compileComponents();

    fixture = TestBed.createComponent(MapEditor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
