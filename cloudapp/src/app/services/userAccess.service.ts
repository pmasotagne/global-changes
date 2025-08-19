import { Injectable } from '@angular/core'
import { CloudAppConfigService, CloudAppEventsService } from '@exlibris/exl-cloudapp-angular-lib'
import { combineLatest } from 'rxjs'
import { Observable } from 'rxjs/internal/Observable'
import { flatMap, map } from 'rxjs/operators'
import { Configuration } from '../types/configuration.type'
import { UserDetails } from '../types/userDetails.type'
import { UserDetailsChecked } from '../types/userDetailsChecked'
import { UserService } from './user.service'

@Injectable({
	providedIn: 'root'
})
export class UserAccessService {

	
	private userDetails: any = '';

	constructor(
		private configService: CloudAppConfigService,
		private eventsService: CloudAppEventsService,
		private userService: UserService,
	) { }

	isUserAllowed(): Observable<boolean> {
		let userDetails$: Observable<UserDetails> = this.eventsService.getInitData()
			.pipe(map(initData => initData.user.primaryId))
			.pipe(flatMap(primaryUserId => this.userService.getUserDetails(primaryUserId)))
		let config$: Observable<any> = this.configService.get()

		return combineLatest([config$, userDetails$])
			.pipe((map(([rawConfig, userDetails]) => {
				
				this.userDetails = userDetails;

				let config: Configuration = rawConfig
				// app is not configured ->
				// no configuration means access is not restricted
				if (Object.keys(config).length === 0) {
					return true
				}
				if (this.isAccessConfigured(config)) {
					// if the user in the allowed user list -> allowed
					if (this.isUserInAllowedList(config, userDetails)) {
						return true
					}
					// at this stage, the user is not in the allowed users list,
					// check if the allowed users list is empty
					// if empty -> check for roles
					// if not empty -> other users are allowed but not the current user
					if (config.allowedUsers.length > 0) {
						return false
					}
					// at this stage, the user is not in the allowed users list,
					// no other user is in the allowed users list,
					// check if the user has one of the allowed roles
					if (this.hasUserAllowedRole(config, userDetails)) {
						return true
					}
					return false
				}
				return true
			})))
	}

	private isAccessConfigured(config: Configuration): boolean {
		let allowedUsersConfigured = config.allowedUsers?.length > 0
		let allowedRolesConfigured = !config.allowedRoles?.includes(0)
		return allowedUsersConfigured || allowedRolesConfigured
	}

	private isUserInAllowedList(config: Configuration, userDetails: UserDetails): boolean {
		let allowedUsers: UserDetailsChecked[] = config.allowedUsers
		return allowedUsers.some(user => user.primary_id == userDetails.primary_id)
	}

	private hasUserAllowedRole(config: Configuration, userDetails: UserDetails): boolean {
		let allowedRoles: number[] = config.allowedRoles
		// role 0 is a placeholder value for "all roles allowed"
		if (allowedRoles.includes(0)) {
			return true
		}
		return userDetails.user_role.some(userRole => {
			return allowedRoles.includes(parseInt(userRole.role_type.value)) && userRole.status.value === 'ACTIVE'
		})
	}

	getUserDetails(): any{
		return this.userDetails;
	}

	isModuleAccessAllowed(
		moduleName: keyof Configuration['moduleRestrictions']
		): Observable<boolean> {
		return combineLatest([
			this.configService.get(),
			this.isUserAllowed()
		]).pipe(
			map(([config, globalAllowed]) => {
			const moduleRestriction = config.moduleRestrictions?.[moduleName];

			// Determine if there are any module‐specific restrictions at all
			const hasUserRestrictions = Array.isArray(moduleRestriction?.allowedUsers)
				&& moduleRestriction.allowedUsers.length > 0;
			const hasRoleRestrictions = Array.isArray(moduleRestriction?.allowedRoles)
				&& moduleRestriction.allowedRoles.length > 0;
			const hasAnyRestriction = hasUserRestrictions || hasRoleRestrictions;

			// 1) If there are no restrictions for this module, defer to global access
			if (!hasAnyRestriction) {
				return globalAllowed;
			}

			// 2) If there are restrictions, the user must satisfy one of them
			// Grab the current user snapshot
			const currentUser: UserDetails = this.getUserDetails();
			if (!currentUser) {
				return false;
			}

			// 2a) Explicit per‐user allow
			if (hasUserRestrictions) {
				return moduleRestriction.allowedUsers
				.some(u => u.primary_id === currentUser.primary_id);
			}

			// 2b) Otherwise, explicit per‐role allow
			return moduleRestriction.allowedRoles!
				.some(roleId =>
				currentUser.user_role.some(userRole =>
					parseInt(userRole.role_type.value, 10) === roleId
					&& userRole.status.value === 'ACTIVE'
				)
				);
			})
		);
	}
}
