import { DatePipe, NgClass, NgStyle } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { User } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';
import { RouterLink } from "@angular/router";
import { Footer } from "../../components/footer/footer";
import { Header } from "../../components/header/header";

@Component({
  selector: 'app-profile',
  imports: [DatePipe, NgStyle, Footer, Header, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  private readonly authService = inject(AuthService);

  userData = JSON.parse(localStorage.getItem('inkmap_user') || '{}') as User;

  colors = {
    place: this.userData.preferences?.colorCode.colores[0],
    character: this.userData.preferences?.colorCode.colores[1],
    culture: this.userData.preferences?.colorCode.colores[2],
    system: this.userData.preferences?.colorCode.colores[3],
    object: this.userData.preferences?.colorCode.colores[4],
    other: this.userData.preferences?.colorCode.colores[5],
  };
}