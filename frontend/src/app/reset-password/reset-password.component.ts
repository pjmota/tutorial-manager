import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthenticationService } from '@app/_services/authentication.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  form!: FormGroup<{ password: FormControl<string>; confirmPassword: FormControl<string> }>;
  submitted = false;
  loading = false;
  success = '';
  error = '';
  token = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthenticationService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    this.form = this.fb.nonNullable.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.matchPasswords('password', 'confirmPassword') });
  }

  matchPasswords(passKey: string, confirmKey: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const group = control as FormGroup;
      const pass = group.get(passKey)?.value as string | undefined;
      const confirmControl = group.get(confirmKey);
      const confirm = confirmControl?.value as string | undefined;
      if (pass !== confirm) {
        confirmControl?.setErrors(confirmControl.errors ? { ...confirmControl.errors, mismatch: true } : { mismatch: true });
      } else if (confirmControl?.errors) {
        const { mismatch, ...rest } = confirmControl.errors;
        confirmControl.setErrors(Object.keys(rest).length ? rest : null);
      }
      return null;
    };
  }

  get f() { return this.form.controls; }

  onSubmit() {
    this.submitted = true;
    this.error = '';
    this.success = '';
    if (this.form.valid && this.token) {
      this.loading = true;
      const password = this.form.controls.password.value;
      this.authService.resetPassword(this.token, password).subscribe({
        next: (res) => {
          this.success = res?.message || 'Senha atualizada com sucesso';
          this.loading = false;
        },
        error: (err) => {
          this.error = err?.error?.message || 'Não foi possível atualizar sua senha.';
          this.loading = false;
        }
      });
    }
  }
}