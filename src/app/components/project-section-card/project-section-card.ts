import { NgClass, NgOptimizedImage } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-project-section-card',
  imports: [NgClass, RouterLink, NgOptimizedImage],
  templateUrl: './project-section-card.html',
  styleUrl: './project-section-card.scss',
})
export class ProjectSectionCard {
  @Input() title: string = '';
  @Input() description: string = '';
  @Input() icon: string = '';
  @Input() image: string = '';
  @Input() route: string = '';

  protected imageLoaded = false;

  onImageLoad(): void {
    this.imageLoaded = true;
  }
}
