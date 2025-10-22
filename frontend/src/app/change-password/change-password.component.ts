import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, AbstractControl, ValidatorFn, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticationService } from '@app/_services/authentication.service';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.css']
})
export class ChangePasswordComponent implements OnInit {
  form!: FormGroup<{ currentPassword: FormControl<string>; newPassword: FormControl<string>; confirmNewPassword: FormControl<string> }>;
  submitted = false;
  loading = false;
  success = '';
  error = '';

  constructor(private readonly fb: FormBuilder, private readonly router: Router, private readonly authService: AuthenticationService) {}

  ngOnInit(): void {
    this.form = this.fb.nonNullable.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmNewPassword: ['', [Validators.required]]
    }, { 
      validators: this.matchPasswords('newPassword', 'confirmNewPassword') 
    });
  }

  get f() { return this.form.controls; }

  onSubmit() {
    this.submitted = true;
    this.error = '';
    this.success = '';
    if (this.form.invalid) { return; }
    const { currentPassword, newPassword } = this.form.getRawValue();
    this.loading = true;
    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: (res) => {
        this.success = res?.message || 'Senha alterada com sucesso';
        this.loading = false;
        this.form.reset();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Não foi possível alterar a senha.';
        this.loading = false;
      }
    });
  }

  private matchPasswords(passwordKey: string, confirmKey: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const group = control as FormGroup;
      const pass = group.get(passwordKey)?.value;
      const confirm = group.get(confirmKey)?.value;
      if (pass === confirm) {
        const errors = group.get(confirmKey)?.errors || {};
        delete errors['mismatch'];
        if (Object.keys(errors).length === 0) {
          group.get(confirmKey)?.setErrors(null);
        } else {
          group.get(confirmKey)?.setErrors(errors);
        }
        return null;
      } else {
        group.get(confirmKey)?.setErrors({ mismatch: true });
        return { mismatch: true };
      }
    };
  }
}