import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { FeedingManagementComponent } from './components/feeding-management/feeding-management.component';
import { StockManagementComponent } from './components/stock-management/stock-management.component';
import { StockDetailDialogComponent } from './components/stock-detail-dialog/stock-detail-dialog.component';
import { RegisterComponent } from './components/register/register.component';
import { ForgetPasswordComponent } from './components/forget-password/forget-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { VaccinationComponent } from './components/vaccination/vaccination.component';
import { ProductionComponent } from './components/production/production.component';
import { HistoriquesComponent } from './components/historiques/historiques.component';
import { SettingsComponent } from './components/settings/settings.component';
import { PasswordConfirmComponent } from './components/password-confirm/password-confirm.component';

import { LoginComponent } from './pages/login/login.component';
import { AuthGuard } from './auth.guard'; // Importez le guard

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' }, // Redirection par défaut vers le login
  { path: 'register', component: RegisterComponent },
  { path: 'forget-password', component: ForgetPasswordComponent },
  { path: 'reset-password/:token', component: ResetPasswordComponent },
  { path: 'confirm-password-change/:token', component: PasswordConfirmComponent },
  { path: 'cancel-password-change/:token', component: PasswordConfirmComponent },
  { path: 'login', component: LoginComponent }, // Route pour le login
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] }, // Protégée par le guard
  { path: 'alimentation', component: FeedingManagementComponent, canActivate: [AuthGuard] }, // Protégée par le guard
  { path: 'stocks', component: StockManagementComponent, canActivate: [AuthGuard] }, // Protégée par le guard
  { path: 'stocks/details', component: StockDetailDialogComponent, canActivate: [AuthGuard] }, // Protégée par le guard
  { path: 'vaccinations', component: VaccinationComponent, canActivate: [AuthGuard]},
  { path: 'productions', component: ProductionComponent, canActivate: [AuthGuard]},
  { path: 'historiques', component: HistoriquesComponent, canActivate: [AuthGuard]},
  { path: 'parametres', component: SettingsComponent, canActivate: [AuthGuard]},
  { path: '**', redirectTo: '/login' } // Redirection en cas de route non trouvée
];