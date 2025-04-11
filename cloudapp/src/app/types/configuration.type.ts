import { UserDetailsChecked } from './userDetailsChecked'

export interface ModuleRestriction {
	allowedRoles?: number[];
	allowedUsers?: UserDetailsChecked[];
  }
  
  export interface Configuration {
	allowedRoles: number[];
	allowedUsers: UserDetailsChecked[];
	moduleRestrictions?: {
	  acquisitions?: ModuleRestriction;
	  items?: ModuleRestriction;
	  users?: ModuleRestriction;
	  holdings?: ModuleRestriction;
	}
  }
  