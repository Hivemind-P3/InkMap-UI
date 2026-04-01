import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment.local';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

@Component({
  selector: 'app-admin',
  templateUrl: './admin.html',
  styleUrls: ['./admin.scss'],
  imports: [FormsModule],
})
export class AdminPanel implements OnInit {
  users: AdminUser[] = [];
  loading = false;
  savingId: number | null = null;
  deletingId: number | null = null;
  currentUserId: number | null = null;

  private readonly baseUrl = environment.apiBaseUrl;
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.currentUserId = this.auth.getUser()?.id ?? null;
    this.loadUsers();
  }

  private headers(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  isSelf(user: AdminUser): boolean {
    return user.id === this.currentUserId;
  }

  loadUsers(): void {
    this.loading = true;
    this.http.get<AdminUser[]>(`${this.baseUrl}/users`, { headers: this.headers() }).subscribe({
      next: (data) => {
        this.users = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toast.show('error', err.error?.message || 'Could not load users.');
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  updateRole(user: AdminUser): void {
    if (this.isSelf(user)) {
      this.toast.show('error', 'You cannot change your own role.');
      return;
    }

    this.savingId = user.id;
    this.http
      .patch(`${this.baseUrl}/users/${user.id}/role`, { role: user.role }, { headers: this.headers() })
      .subscribe({
        next: () => {
          this.savingId = null;
          this.toast.show('success', `Role updated for ${user.email}.`);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.savingId = null;
          this.toast.show('error', err.error?.message || 'Could not update role.');
          this.cdr.detectChanges();
        },
      });
  }

  deleteUser(user: AdminUser): void {
    if (this.isSelf(user)) {
      this.toast.show('error', 'You cannot delete your own account.');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${user.email}"?\nThis action cannot be undone.`)) return;

    this.deletingId = user.id;
    this.http.delete(`${this.baseUrl}/users/${user.id}`, { headers: this.headers() }).subscribe({
      next: () => {
        this.deletingId = null;
        this.toast.show('success', `User ${user.email} deleted successfully.`);
        this.users = this.users.filter((u) => u.id !== user.id);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.deletingId = null;
        this.toast.show('error', err.error?.message || 'Could not delete user.');
        this.cdr.detectChanges();
      },
    });
  }
}
