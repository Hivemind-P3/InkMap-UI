import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectSectionCard } from './project-section-card';

describe('ProjectSectionCard', () => {
  let component: ProjectSectionCard;
  let fixture: ComponentFixture<ProjectSectionCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectSectionCard],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectSectionCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
