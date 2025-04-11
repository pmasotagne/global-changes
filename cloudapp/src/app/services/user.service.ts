import { Injectable } from '@angular/core'
import { CloudAppRestService, HttpMethod, Request } from '@exlibris/exl-cloudapp-angular-lib'
import { Observable } from 'rxjs'
import { UserListResponse } from '../types/userListResponse.type'
import { UserDetails } from '../types/userDetails.type'
import { AppConfig } from '../app.config'


@Injectable({
	providedIn: 'root'
})
export class UserService {

	constructor(private restService: CloudAppRestService) { }

	findUser(searchTerm: string): Observable<UserListResponse> {
		let request: Request = {
			url: '/users',
			method: HttpMethod.GET,
			headers: AppConfig.httpHeader,
			queryParams: {
				q: this.createPattern(searchTerm),
				order_by: 'last_name,first_name,primary_id',
				limit: AppConfig.pageSize,
			}
		}
		return this.restService.call(request)
	}

	getUserDetails(primaryId: string): Observable<UserDetails> {
		let request: Request = {
			url: '/users/' + primaryId,
			method: HttpMethod.GET,
			headers: AppConfig.httpHeader,
			queryParams: {
				user_id_type: 'all_unique',
				view: 'full',
				expand: 'none',
			}
		}
		return this.restService.call(request)
	}

	deleteUser(primaryId: string): Observable<UserDetails> {
		let request: Request = {
			url: '/users/' + primaryId,
			method: HttpMethod.DELETE,
			headers: AppConfig.httpHeader,
			queryParams: {
				user_id_type: 'all_unique'
			}
		}
		return this.restService.call(request)
	}

	deleteUserLink(link: string): Observable<UserDetails> {
		let request: Request = {
			url: link,
			method: HttpMethod.DELETE,
			headers: AppConfig.httpHeader,
			queryParams: {
				user_id_type: 'all_unique'
			}
		}
		return this.restService.call(request)
	}

	private createPattern(searchTerm: string): string {
		let cleanSearchTerm = searchTerm.trim().replace(' ', '_')
		return `ALL~*${cleanSearchTerm}*`
	}
}
