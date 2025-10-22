import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Tutorial } from '@app/_models/tutorial';
import { TutorialService } from '@app/_services/tutorial.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-tutorial-details',
  templateUrl: './tutorial-details.component.html',
  styleUrls: ['./tutorial-details.component.css'],
})
export class TutorialDetailsComponent implements OnInit {
  @Input() viewMode = false;
  @Input() currentTutorial?: Tutorial;
  form!: FormGroup;
  message = '';
  loading = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly tutorialService: TutorialService
  ) {}

  ngOnInit(): void {
    if (this.viewMode) {
      this.initForm();
      return;
    }
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loading = true;
      this.tutorialService
        .get(id)
        .pipe(
          finalize(
            () => (this.loading = false)
          )
        )
        .subscribe({
          next: (data) => {
            this.currentTutorial = data;
            this.initForm();
          },
          error: (_) => {},
        });
    }
  }

  initForm() {
    this.form = this.fb.group({
      title: [this.currentTutorial?.title || '', Validators.required],
      description: [this.currentTutorial?.description || ''],
      published: [this.currentTutorial?.published || false],
    });
  }

  updatePublished(status: boolean) {
    if (!this.currentTutorial) return;
    this.loading = true;
    this.tutorialService
      .update(this.currentTutorial.id, { published: status })
      .pipe(
        finalize(
          () => (this.loading = false)
        )
      )
      .subscribe({
        next: (data) => {
          this.currentTutorial = data;
          this.form.patchValue({ published: data.published });
        },
        error: (_) => {},
      });
  }

  updateTutorial() {
    if (!this.currentTutorial || this.form.invalid) return;
    const { title, description, published } = this.form.value;
    this.loading = true;
    this.tutorialService
      .update(this.currentTutorial.id, { title, description, published })
      .pipe(
        finalize(
          () => (this.loading = false)
        )
      )
      .subscribe({
        next: (data) => {
          this.currentTutorial = data;
          this.message = 'Tutorial atualizado com sucesso';
        },
        error: (_) => {},
      });
  }

  deleteTutorial() {
    if (!this.currentTutorial) return;
    this.loading = true;
    this.tutorialService
      .delete(this.currentTutorial.id)
      .pipe(
        finalize(
          () => (this.loading = false)
        )
      )
      .subscribe({
        next: (_) => {
          this.message = 'Tutorial removido';
          this.router.navigate(['/tutorials']);
        },
        error: (_) => {},
      });
  }
}
