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

	isModuleAccessAllowed(moduleName: keyof Configuration['moduleRestrictions']): Observable<boolean> {
		return this.configService.get().pipe(
		  map((config: Configuration) => {
			// If no restrictions are set for the module, allow access
			const moduleRestriction = config.moduleRestrictions?.[moduleName];
			console.log(moduleRestriction);
			if (!moduleRestriction || (!moduleRestriction.allowedRoles?.length && !moduleRestriction.allowedUsers?.length)) {
				return true; 
			}

			// Get the current user details
			const currentUser: UserDetails = this.getUserDetails();
			if (!currentUser) {
			  return false;
			}
			
			// Check if the user is explicitly allowed.
			const allowedByUser = moduleRestriction.allowedUsers?.some(user =>
			  user.primary_id === currentUser.primary_id
			);

			if (moduleRestriction.allowedUsers?.length) {
				return allowedByUser;
			}

			// Check if any of the allowed roles for the module match an active role of the user.
			const allowedByRole = moduleRestriction.allowedRoles?.some(roleId =>
				currentUser.user_role.some(userRole =>
				  parseInt(userRole.role_type.value) === roleId && userRole.status.value === 'ACTIVE'
				)
			  );

			return allowedByRole;
		  })
		);
	}
}
