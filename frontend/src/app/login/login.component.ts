import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthenticationService } from '@app/_services/authentication.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  submitted = false;
  error: string = '';
  returnUrl: string = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthenticationService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
    const rawReturnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    // Se o retorno for para Dashboard, direciona para Home
    this.returnUrl =
      typeof rawReturnUrl === 'string' && rawReturnUrl.startsWith('/tutorials')
        ? '/'
        : rawReturnUrl;
    if (this.authService.userValue) {
      this.router.navigate([this.returnUrl]);
    }
  }

  get f() {
    return this.form.controls;
  }

  onSubmit() {
    this.submitted = true;
    this.error = '';
    if (this.form.invalid) {
      return;
    }
    this.loading = true;
    const { email, password } = this.form.value;
    this.authService
      .login(email, password)
      .pipe(
        finalize(
          () => (this.loading = false)
        )
      )
      .subscribe({
        next: (_) => {
          this.router.navigate([this.returnUrl || '/']);
        },
        error: (err) => {
          this.error = err?.error?.message || 'Login falhou';
        },
      });
  }
}
