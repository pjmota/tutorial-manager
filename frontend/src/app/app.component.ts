import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Location } from '@angular/common';
import { AuthenticationService } from './_services/authentication.service';
import { User } from './_models/user';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Sistema de Tutoriais';
  user: User | null = null;
  isLoginRoute = false;
  crumbParent = '';
  crumbChild = '';
  showUserMenu = false;

  constructor(private readonly authService: AuthenticationService, private readonly router: Router, private readonly location: Location) {
    this.authService.user.subscribe(u => this.user = u);
    // Initialize and listen for route changes to hide navbar on login route
    this.isLoginRoute = this.router.url.startsWith('/login') || this.router.url.startsWith('/register') || this.router.url.startsWith('/forgot-password') || this.router.url.startsWith('/reset-password');
    this.router.events.subscribe(evt => {
      if (evt instanceof NavigationEnd) {
        this.isLoginRoute = evt.urlAfterRedirects.startsWith('/login') || evt.urlAfterRedirects.startsWith('/register') || evt.urlAfterRedirects.startsWith('/forgot-password') || evt.urlAfterRedirects.startsWith('/reset-password');
        const state: any = this.location.getState();
        const nonNavbarNav = !!state?.showBreadcrumb;
        const url = evt.urlAfterRedirects || '';
        const isDeeperRoute = /\/tutorials\/\d+$/.test(url);
  
        if (isDeeperRoute) {
          // Para rotas profundas (ex.: /tutorials/:id), sempre mostrar Dashboard / Editar
          this.crumbParent = 'Dashboard';
          this.crumbChild = 'Editar';
        } else {
          // Breadcrumb base sempre visível: Home, Dashboard ou Adicionar
          this.crumbChild = this.resolveBaseLabel(url);
          // Se navegação aconteceu via link/botão interno (não navbar), adicionar ramificação
          this.crumbParent = nonNavbarNav && this.crumbChild !== 'Home' ? (state?.parentLabel || 'Home') : '';
        }
      }
    });
  }

  logout() {
    this.authService.logout();
  }

  toggleUserMenu(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.showUserMenu = !this.showUserMenu;
    if (this.showUserMenu) {
      // close on outside click
      const close = () => {
        this.showUserMenu = false;
        document.removeEventListener('click', close);
      };
      setTimeout(() => document.addEventListener('click', close), 0);
    }
  }

  navigateAdmin() {
    this.showUserMenu = false;
    this.router.navigate(['/admin']);
  }

  navigateChangePassword() {
    this.showUserMenu = false;
    this.router.navigate(['/change-password'], { state: { showBreadcrumb: true, parentLabel: 'Home', childLabel: 'Alterar senha' } });
  }

  get isAdmin(): boolean {
    return !!this.user?.roles?.includes('ROLE_ADMIN');
  }

  get displayName(): string {
    const full = `${this.user?.firstName ?? ''} ${this.user?.lastName ?? ''}`.trim();
    return full || (this.user?.username ?? '');
  }

  get avatarInitials(): string {
    const fi = this.user?.firstName?.charAt(0) ?? '';
    const li = this.user?.lastName?.charAt(0) ?? '';
    const base = `${fi}${li}`.trim();
    return (base || this.user?.username?.charAt(0) || '?').toUpperCase();
  }

  private resolveBaseLabel(url: string): string {
    if (url === '/' || url === '') return 'Home';
    if (url.startsWith('/tutorials')) return 'Dashboard';
    if (url.startsWith('/add')) return 'Adicionar';
    if (url.startsWith('/register')) return 'Registrar';
    if (url.startsWith('/forgot-password')) return 'Esqueci a senha';
    if (url.startsWith('/reset-password')) return 'Redefinir senha';
    if (url.startsWith('/change-password')) return 'Alterar senha';
    if (url.startsWith('/admin')) return 'Admin';
    return '';
  }

  resolveLinkFromLabel(label: string): string {
    if (label === 'Home') return '/';
    if (label === 'Dashboard') return '/tutorials';
    if (label === 'Adicionar') return '/add';
    if (label === 'Login') return '/login';
    if (label === 'Registrar') return '/register';
    if (label === 'Esqueci a senha') return '/forgot-password';
    if (label === 'Redefinir senha') return '/reset-password';
    if (label === 'Alterar senha') return '/change-password';
    if (label === 'Admin') return '/admin';
    return '/';
  }
}
