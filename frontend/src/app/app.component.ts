import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd, Event as RouterEvent } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SidebarComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  isAuthPage: boolean = false;
  private routerSubscription: Subscription | null = null;

  // Liste des routes d'authentification
  private authRoutes: string[] = [
    '/login',
    '/register',
    '/forget-password',
    '/reset-password',
    '/confirm-password-change',
    '/cancel-password-change'
  ];

  constructor(private router: Router) {}

  ngOnInit() {
    // S'abonner aux événements de navigation
    this.routerSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(this.handleRouteChange.bind(this));
    
    // Vérifier la route initiale
    this.checkCurrentRoute();
  }

  ngOnDestroy() {
    // Se désabonner pour éviter les fuites de mémoire
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  private handleRouteChange(event: NavigationEnd) {
    this.checkIfAuthPage(event.urlAfterRedirects);
    console.log('Route change detected:', event.urlAfterRedirects, 'isAuthPage:', this.isAuthPage);
  }

  private checkCurrentRoute() {
    this.checkIfAuthPage(this.router.url);
    console.log('Initial route check:', this.router.url, 'isAuthPage:', this.isAuthPage);
  }

  private checkIfAuthPage(url: string) {
    // Nettoyer l'URL des paramètres de requête et fragments
    const cleanUrl = this.getCleanUrl(url);
    
    // Vérifier si l'URL correspond exactement à une route d'auth ou commence par une route d'auth suivie de /
    this.isAuthPage = this.authRoutes.some(route => 
      cleanUrl === route || 
      cleanUrl.startsWith(`${route}/`)
    );
  }

  private getCleanUrl(url: string): string {
    // Enlever les paramètres de requête et fragments
    return url.split('?')[0].split('#')[0];
  }
}