import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthenticationService } from '@app/_services/authentication.service';
import { User } from '@app/_models/user';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  users: User[] = [];
  loading = false;
  error = '';
  success = '';
  showCreate = false;
  form!: FormGroup;
  activeTab: 'users' | 'settings' = 'users';
  mailerForm!: FormGroup;

  constructor(private readonly authService: AuthenticationService, private readonly fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(4)]]
    });
    this.mailerForm = this.fb.group({
      mailerFrom: ['', [Validators.required, Validators.email]]
    });
    this.loadUsers();
    this.loadMailerFrom();
  }

  loadUsers(): void {
    this.loading = true;
    this.error = '';
    this.authService.listUsers().subscribe({
      next: (list) => { this.users = list || []; this.loading = false; },
      error: (err) => { this.error = err?.error?.message || 'Falha ao carregar usuários'; this.loading = false; }
    });
  }

  toggleCreate(): void {
    this.showCreate = !this.showCreate;
  }

  onSubmit(): void {
    if (this.form.invalid) { return; }
    this.loading = true;
    this.error = '';
    this.success = '';
    const payload = {
      firstName: this.form.value.firstName,
      lastName: this.form.value.lastName,
      email: this.form.value.email,
      password: this.form.value.password,
    };
    this.authService.register(payload).subscribe({
      next: () => {
        this.success = 'Usuário criado com sucesso';
        this.form.reset();
        this.loading = false;
        this.loadUsers();
      },
      error: (err) => { this.error = err?.error?.message || 'Falha ao criar usuário'; this.loading = false; }
    });
  }

  switchTab(tab: 'users' | 'settings'): void {
    this.activeTab = tab;
    this.success = '';
    this.error = '';
    if (tab === 'users') {
      this.loadUsers();
    } else {
      this.loadMailerFrom();
    }
  }

  loadMailerFrom(): void {
    this.loading = true;
    this.error = '';
    this.authService.getMailerFrom().subscribe({
      next: (res) => {
        const email = res?.email || '';
        this.mailerForm.patchValue({ mailerFrom: email });
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Falha ao carregar e-mail do remetente';
        this.loading = false;
      }
    });
  }

  saveMailerFrom(): void {
    if (this.mailerForm.invalid) { return; }
    this.loading = true;
    this.error = '';
    this.success = '';
    const email = this.mailerForm.value.mailerFrom;
    this.authService.updateMailerFrom(email).subscribe({
      next: () => { this.success = 'E-mail do remetente atualizado'; this.loading = false; },
      error: (err) => { this.error = err?.error?.message || 'Falha ao atualizar e-mail do remetente'; this.loading = false; }
    });
  }

  resetPassword(u: User): void {
    if (!u?.id) { return; }
    const ok = typeof window !== 'undefined' ? window.confirm(`Resetar a senha de ${u.username} para 123456?`) : true;
    if (!ok) { return; }
    this.loading = true;
    this.error = '';
    this.success = '';
    this.authService.resetUserPassword(u.id!).subscribe({
      next: () => {
        this.success = `Senha de ${u.username} redefinida para '123456'. O usuário poderá mantê-la ou alterá-la no menu 'Alterar senha'.`;
        this.loading = false;
      },
      error: (err) => { this.error = err?.error?.message || 'Falha ao resetar senha'; this.loading = false; }
    });
  }
}