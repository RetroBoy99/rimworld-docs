import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('Rimworld Documentation');
  protected searchQuery = signal('');

  constructor(private router: Router) {
    // Scroll to top on route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  onSearch() {
    if (this.searchQuery().trim()) {
      // Navigate to search with query using Angular router
      this.router.navigate(['/search'], { 
        queryParams: { q: this.searchQuery().trim() } 
      });
    }
  }
}
