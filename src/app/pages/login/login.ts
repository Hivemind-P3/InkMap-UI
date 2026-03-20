import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  email = '';
  password = '';
  showPassword = signal(false);

  togglePassword() {
    this.showPassword.update((v) => !v);
  }

  onSubmit() {
    // TODO: connect to auth service
    console.log('Login attempt', { email: this.email });
  }
}