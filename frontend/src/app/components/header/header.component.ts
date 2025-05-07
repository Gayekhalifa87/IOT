import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

// Définissez l'interface UserInfo
interface UserInfo {
  data?: {
    username?: string;
    email?: string;
    role?: string;
    profilePicture?: string;
    createdAt?: string;
  };
  message?: string;
  success?: boolean;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  currentDate = new Date();
  pageTitle = 'Tableau de bord';
  userName = '';
  userRole = '';
  userProfilePicture = 'assets/images/user-profil.png'; // Image par défaut définie dès le départ

  // Mapping des routes vers les titres
  private routeTitles: { [key: string]: string } = {
    '/dashboard': 'Tableau de bord',
    '/user-management': 'Gestion utilisateurs',
    '/vaccination-management': 'Gestion vaccination',
    '/poultry-management': 'Gestion de volailles',
    '/alimentation': 'Alimentations',
    '/historiques': 'Historiques'
  };

  constructor(private router: Router, private authService: AuthService) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.pageTitle = this.routeTitles[event.url] || 'Tableau de bord';
    });
  }

  ngOnInit() {
    this.pageTitle = this.routeTitles[this.router.url] || 'Tableau de bord';
    this.loadUserInfoFromLocalStorage();
    this.loadUserInfo();
  }

  loadUserInfoFromLocalStorage() {
    const storedUserInfo = localStorage.getItem('userInfo');
    console.log('Contenu de localStorage:', storedUserInfo);
    if (storedUserInfo) {
      const userInfo = JSON.parse(storedUserInfo);
      console.log('UserInfo parsed:', userInfo);
      
      const userData = userInfo.data || userInfo;
      this.userName = userData.username || '';
      this.userRole = userData.role || '';
      // On force l'image par défaut, peu importe profilePicture
      this.userProfilePicture = 'assets/images/user-profil.png';

      console.log('Valeurs assignées - userName:', this.userName, 'userRole:', this.userRole, 'userProfilePicture:', this.userProfilePicture);
    } else {
      console.log('Aucune donnée dans localStorage');
    }
  }

  loadUserInfo() {
    this.authService.getCurrentUser().subscribe((userInfo: any) => {
      console.log('Données de getCurrentUser:', userInfo);
      if (userInfo) {
        const userData = userInfo.data || userInfo;
        this.userName = userData.username || '';
        this.userRole = userData.role || '';
        // On force l'image par défaut, peu importe profilePicture
        this.userProfilePicture = 'assets/images/user-profil.png';

        localStorage.setItem('userInfo', JSON.stringify(userInfo));
        console.log('Après chargement - userName:', this.userName, 'userProfilePicture:', this.userProfilePicture);
      }
    }, (error) => {
      console.error('Erreur lors du chargement de userInfo:', error);
    });
  }
}