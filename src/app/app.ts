import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './components/toast/toast';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit{
  protected readonly title = signal('InkMap-UI');

  ngOnInit(): void {
    if(!localStorage.getItem('user')) {
      const userPlaceholderData: UserPlaceholder = {
        name: 'John Doe',
        role: 'Author',
        email: 'johndoe@gmail.com',
        startDt: new Date('2025-06-03'),
        projects: 3,
        characters: 17,
        collaborators: 5
      }
      
      localStorage.setItem('user', JSON.stringify(userPlaceholderData));
    }
  }
}