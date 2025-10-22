import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { AuthenticationService } from '@app/_services/authentication.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent implements OnInit {
  form!: FormGroup<{ email: FormControl<string> }>;
  submitted = false;
  loading = false;
  success = '';
  error = '';

  constructor(private readonly fb: FormBuilder, private readonly authService: AuthenticationService) {}

  ngOnInit(): void {
    this.form = this.fb.nonNullable.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get f() { return this.form.controls; }

  onSubmit() {
    this.submitted = true;
    this.error = '';
    this.success = '';
    if (this.form.invalid) { return; }
    this.loading = true;
    const { email } = this.form.getRawValue();
    this.authService.requestPasswordReset(email).subscribe({
      next: (res) => {
        const baseMsg = res?.message || 'Se o e-mail existir, enviaremos um link de redefinição.';
        if (typeof res?.dispatched === 'boolean') {
          this.success = res.dispatched ? `${baseMsg} (Status: e-mail despachado)` : `${baseMsg} (Status: falha ao despachar e-mail)`;
        } else {
          this.success = baseMsg;
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Não foi possível processar sua solicitação.';
        this.loading = false;
      }
    });
  }
}