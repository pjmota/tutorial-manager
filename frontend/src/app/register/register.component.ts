import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticationService } from '@app/_services/authentication.service';
import { finalize } from 'rxjs/operators';
declare const require: any;
const Toastify = require('toastify-js');

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  success = '';

  constructor(private readonly fb: FormBuilder, private readonly router: Router, private readonly authService: AuthenticationService) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(4)]]
    });
  }

  get f() { return this.form.controls; }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';
    this.success = '';
    if (this.form.invalid) return;
    this.loading = true;
    const payload = this.form.value;
    this.authService.register(payload).pipe(finalize(() => this.loading = false)).subscribe({
      next: (_) => {
        this.success = 'Conta criada com sucesso. Agora você pode entrar.';
        // Navegar para login após breve atraso para o usuário ler a mensagem
        setTimeout(() => this.router.navigate(['/login']), 800);
      },
      error: (err) => {
        const msg = err?.error?.message || 'Falha ao criar conta';
        this.error = msg;
        if (err?.status === 409 || /exists/i.test(String(msg))) {
          Toastify({
            text: 'Este e-mail já está cadastrado.',
            gravity: 'top',
            position: 'center',
            stopOnFocus: true,
            backgroundColor: '#dc3545',
            className: 'rounded',
            duration: 3000,
          }).showToast();
        } else {
          Toastify({
            text: msg,
            gravity: 'top',
            position: 'center',
            stopOnFocus: true,
            backgroundColor: '#6c757d',
            className: 'rounded',
            duration: 2500,
          }).showToast();
        }
      }
    });
  }
}