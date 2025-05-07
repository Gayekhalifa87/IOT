import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faTachometerAlt, faUsers, faSyringe, faKiwiBird, faHistory, faSignOutAlt, faBars, faBowlFood, faCog } from '@fortawesome/free-solid-svg-icons';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {

  constructor(private router: Router, private authService: AuthService) { }

  faTachometerAlt = faTachometerAlt;
  faUsers = faUsers;
  faSyringe = faSyringe;
  faKiwiBird = faKiwiBird;
  faHistory = faHistory;
  faSignOutAlt = faSignOutAlt;
  faBars = faBars;
  faBowlFood = faBowlFood;
  faCog = faCog;

  // État du sidebar
  isSidebarOpen = false;

  // Basculer l'état du sidebar
  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  // Vérifier si une route est active
  isActive(route: string): boolean {
    return this.router.isActive(route, {
      paths: 'exact',
      queryParams: 'ignored',
      fragment: 'ignored',
      matrixParams: 'ignored'
    });
  }

  navigateToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  navigateToUserManagement() {
    this.router.navigate(['/alimentation']);
  }

  navigateToVaccinationManagement() {
    this.router.navigate(['/vaccinations']);
  }

  navigateToPoultryManagement() {
    this.router.navigate(['/productions']);
  }

  navigateToAlimentation() {
    this.router.navigate(['/alimentation']);
  }

  navigateToHistoriques() {
    this.router.navigate(['/historiques']);
  }

  navigateToSettings() {
    this.router.navigate(['/parametres']);
  }

  logout(): void {
    this.authService.logout(); // Déconnecter l'utilisateur
    this.router.navigate(['/']); // Rediriger vers la page de connexion
  }
}