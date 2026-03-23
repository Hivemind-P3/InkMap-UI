import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgForOf, NgIf } from '@angular/common';

interface User {
  id: number;
  email: string;
  role: string;
}

@Component({
  selector: 'app-admin',
  templateUrl: './admin.html',
  styleUrls: ['./admin.scss'],
  imports: [FormsModule, NgIf, NgForOf],
})
export class AdminPanel implements OnInit {
  users: User[] = [];
  loading = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.http.get<User[]>('/api/users').subscribe({
      next: (data) => {
        this.users = data;
        this.loading = false;
      },
      error: () => {
        alert('Error cargando usuarios');
        this.loading = false;
      },
    });
  }

  updateRole(user: User) {
    this.http
      .patch(`/api/users/${user.id}/role`, {
        role: user.role,
      })
      .subscribe({
        next: () => alert('Rol actualizado'),
        error: () => alert('Error actualizando rol'),
      });
  }

  deleteUser(user: User) {
    if (!confirm(`¿Eliminar usuario ${user.email}?`)) return;

    this.http.delete(`/api/users/${user.id}`).subscribe({
      next: () => {
        alert('Usuario eliminado');
        this.loadUsers();
      },
      error: (err) => {
        alert(err.error?.message || 'Error eliminando usuario');
      },
    });
  }
}
