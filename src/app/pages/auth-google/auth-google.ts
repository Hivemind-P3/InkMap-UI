import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface GoogleAccount {
  name: string;
  email: string;
  initials: string;
  color: string;
}

@Component({
  selector: 'app-auth-google',
  imports: [RouterLink],
  templateUrl: './auth-google.html',
  styleUrl: './auth-google.scss',
})
export class AuthGoogle {
  accounts: GoogleAccount[] = [
    { name: 'Aria Solano', email: 'aria.solano@gmail.com', initials: 'AS', color: '#4A7C7E' },
    { name: 'Jordan Blake', email: 'j.blake@gmail.com', initials: 'JB', color: '#C17767' },
    { name: 'Morgan Lee', email: 'morgan.lee@hivemind.studio', initials: 'ML', color: '#8B7355' },
  ];

  selectedAccount: GoogleAccount | null = null;

  selectAccount(account: GoogleAccount) {
    this.selectedAccount = account;
    // TODO: trigger real Google OAuth flow
    console.log('Selected account:', account.email);
  }
}
