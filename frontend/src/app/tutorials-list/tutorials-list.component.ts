import { Component, OnInit } from '@angular/core';
import { Tutorial } from '@app/_models/tutorial';
import { TutorialService } from '@app/_services/tutorial.service';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-tutorials-list',
  templateUrl: './tutorials-list.component.html',
  styleUrls: ['./tutorials-list.component.css']
})
export class TutorialsListComponent implements OnInit {
  tutorials: Tutorial[] = [];
  currentTutorial?: Tutorial;
  currentIndex = -1;
  title = '';
  loading = false;
  message = '';
  filter: 'all' | 'published' | 'draft' = 'all';
  sortAsc = true;

  constructor(private readonly tutorialService: TutorialService, private readonly router: Router) { }

  ngOnInit(): void {
    this.retrieveTutorials();
  }

  retrieveTutorials(): void {
    this.loading = true;
    this.tutorialService.getAll()
      .pipe(
        finalize(
          () => (this.loading = false)
        )
      )
      .subscribe({
        next: data => { this.tutorials = data; },
        error: _ => { }
      });
  }

  refreshList(): void {
    this.retrieveTutorials();
    this.currentTutorial = undefined;
    this.currentIndex = -1;
  }

  setActiveTutorial(tutorial: Tutorial, index: number): void {
    if (this.currentIndex === index && this.currentTutorial?.id === tutorial.id) {
      this.clearSelection();
    } else {
      this.currentTutorial = tutorial;
      this.currentIndex = index;
    }
  }

  removeAllTutorials(): void {
    this.loading = true;
    this.tutorialService.deleteAll()
      .pipe(
        finalize(
          () => (this.loading = false)
        )
      )
      .subscribe({
        next: _ => {
          this.message = 'Todos os tutoriais foram removidos';
          this.refreshList();
        },
        error: _ => { }
      });
  }

  searchTitle(): void {
    this.loading = true;
    this.tutorialService.findByTitle(this.title)
      .pipe(
        finalize(
          () => (this.loading = false)
        )
      )
      .subscribe({
        next: data => { this.tutorials = data; },
        error: _ => { }
      });
  }

  get stats() {
    const total = this.tutorials.length;
    const published = this.tutorials.filter(t => !!t.published).length;
    const drafts = total - published;
    return { total, published, drafts };
  }

  get filteredTutorials(): Tutorial[] {
    const base = [...this.tutorials];
    let filtered: Tutorial[];
    if (this.filter === 'published') {
      filtered = base.filter(t => !!t.published);
    } else if (this.filter === 'draft') {
      filtered = base.filter(t => !t.published);
    } else {
      filtered = base;
    }
    const sorted = [...filtered].sort((a, b) => {
      const cmp = (a.title || '').localeCompare(b.title || '');
      return this.sortAsc ? cmp : -cmp;
    });
    return sorted;
  }

  applyFilter(f: 'all' | 'published' | 'draft') {
    this.filter = f;
    this.currentTutorial = undefined;
    this.currentIndex = -1;
  }

  toggleSort() {
    this.sortAsc = !this.sortAsc;
  }

  trackById(index: number, item: Tutorial) { return item.id; }

  clearSelection(): void {
    this.currentTutorial = undefined;
    this.currentIndex = -1;
  }
}