import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TutorialService } from '@app/_services/tutorial.service';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-add-tutorial',
  templateUrl: './add-tutorial.component.html',
  styleUrls: ['./add-tutorial.component.css'],
})
export class AddTutorialComponent implements OnInit {
  form!: FormGroup;
  submitted = false;
  loading = false;
  message = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly tutorialService: TutorialService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      published: [false],
    });
  }

  get f() {
    return this.form.controls;
  }

  saveTutorial(): void {
    this.submitted = true;
    if (this.form.invalid) return;
    this.loading = true;
    this.tutorialService
      .create(this.form.value)
      .pipe(
        finalize(
          () => (this.loading = false)
        )
      )
      .subscribe({
        next: (_) => {
          this.message = 'Tutorial criado com sucesso';
          this.form.reset({ title: '', description: '', published: false });
          this.submitted = false;
        },
        error: (_) => {},
      });
  }

  saveAndGoToDashboard(): void {
    this.submitted = true;
    if (this.form.invalid) return;
    this.loading = true;
    this.tutorialService
      .create(this.form.value)
      .pipe(
        finalize(
          () => (this.loading = false)
        )
      )
      .subscribe({
        next: (_) => {
          this.router.navigate(['/tutorials']);
        },
        error: (_) => {},
      });
  }
}
