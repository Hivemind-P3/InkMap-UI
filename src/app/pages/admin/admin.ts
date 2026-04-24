import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment.local';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { DatePipe } from '@angular/common';

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  startDt: string;
  blocked: boolean;
}

interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

@Component({
  selector: 'app-admin',
  templateUrl: './admin.html',
  styleUrls: ['./admin.scss'],
  imports: [FormsModule, DatePipe],
})
export class AdminPanel implements OnInit {
  users: AdminUser[] = [];
  loading = false;
  savingId: number | null = null;
  deletingId: number | null = null;
  currentUserId: number | null = null;
  blockingId: number | null = null;

  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;

  searchQuery = '';
  private searchTimeout: any;

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
    let url = `${this.baseUrl}/users?page=${this.currentPage}&size=${this.pageSize}`;
    if (this.searchQuery.trim()) {
      url += `&search=${encodeURIComponent(this.searchQuery.trim())}`;
    }

    this.http.get<PageResponse<AdminUser>>(url, { headers: this.headers() }).subscribe({
      next: (data) => {
        this.users = data.content;
        this.totalPages = data.totalPages;
        this.totalElements = data.totalElements;
        this.currentPage = data.number;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('API error:', err);
        this.toast.show('error', err.error?.message || 'Could not load users.');
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onSearchInput(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.currentPage = 0;
      this.loadUsers();
    }, 350);
  }

  goToPage(page: number): void {
    if(page < 0 || page >= this.totalPages) return;
    this.currentPage = page;
    this.loadUsers();
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
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

  blockUser(user: AdminUser): void {
    if (this.isSelf(user)) {
      this.toast.show('error', 'You cannot block your own account.');
      return;
    }
    this.blockingId = user.id;
    const action = user.blocked ? 'unblock' : 'block';
    this.http
      .patch(`${this.baseUrl}/users/${user.id}/${action}`, {}, { headers: this.headers() })
      .subscribe({
        next: () => {
          user.blocked = !user.blocked;
          this.blockingId = null;
          this.toast.show('success', `User ${user.email} ${action}ed successfully.`);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.blockingId = null;
          this.toast.show('error', err.error?.message || `Could not ${action} user.`);
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
