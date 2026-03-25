import { Component, inject, OnInit } from '@angular/core';
import { Header } from "../../components/header/header";
import { Footer } from "../../components/footer/footer";
import { FormBuilder, FormGroup, FormsModule, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from "@angular/forms";
import { AuthService } from '../../services/auth.service';
import { AuthUser } from '../../models/auth.models';
import { ColorPickerDirective } from 'ngx-color-picker';
import { UserService } from '../../services/user.service';
import { ToastService } from '../../services/toast.service';
import { Router } from '@angular/router';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-edit-profile',
  imports: [Header, Footer, FormsModule, ReactiveFormsModule, ColorPickerDirective],
  templateUrl: './edit-profile.html',
  styleUrl: './edit-profile.scss',
})
export class EditProfile implements OnInit {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  user: AuthUser = this.authService.getUser() as AuthUser;

  fb = inject(FormBuilder);
  form!: FormGroup;
  specialCharRegex = /[A-Z]/;
  uppercaseRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).+$/;
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;

  onSubmit(): void {
    if (this.form.invalid) return;

    const { name, email, password, notificacionesCorreo } = this.form.value;
    const user: User = {
      name: name,
      email: email,
      password: password
    }

    const payload: any = {
      user,
      notificacionesCorreo,
      colores: this.user.preferences.colorCode.colores
    };

    this.userService.updateUserProfile(this.user.id, payload).subscribe({
      next: () => {
        this.toastService.show('success', 'Profile updated successfully');
        setTimeout(() => {
          this.router.navigate(['/profile']);
          this.authService.logout();
        }, 1500);
      },
      error: (err) => {
        this.toastService.show('error', err.error?.message || err.message || 'Something went wrong');
      }
    });
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      name: [this.user.name ?? '', [Validators.required]],
      email: [this.user.email ?? '', [Validators.required, Validators.email]],
      password: ['', [
        Validators.minLength(8),
        uppercaseValidator,
        specialCharValidator
      ]],
      confirmPassword: [''],
      notificacionesCorreo: [this.user.preferences.notificacionesCorreo ?? false],
    }, { validators: passwordMatchValidator });
  }
}

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirm = control.get('confirmPassword');

  if (password && confirm && password.value !== confirm.value) {
    return { passwordMismatch: true };
  }

  return null;
}

function specialCharValidator(control: AbstractControl): ValidationErrors | null {
  const specialCharRegexp: RegExp = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/;
  if (control.value && !specialCharRegexp.test(control.value)) {
    return { noSpecialChar: true };
  }
  return null;
}

function uppercaseValidator(control: AbstractControl): ValidationErrors | null {
  const upperCaseRegexp: RegExp = /[A-Z]/;
  if (control.value && !upperCaseRegexp.test(control.value)) {
    return { noUpperCase: true };
  }
  return null;
}