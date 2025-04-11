import { Component, Output, EventEmitter, Input, OnInit, OnDestroy } from '@angular/core'
import { Observable, Subscription } from 'rxjs'
import { AppConfig } from '../../app.config'
import { UserDetailsChecked } from '../../types/userDetailsChecked'
import { Router } from '@angular/router';

@Component({
    selector: 'menu-global-changes',
    templateUrl: './menu.component.html',
    styleUrls: ['./menu.component.scss']
})

export class MenuComponent implements OnInit, OnDestroy {

    loading: boolean
    searchTerm: string
    resultEntites: UserDetailsChecked[]
    resultCount: number = -1
    userOptions: UserDetailsChecked[]
    pageSize: number = AppConfig.pageSize

    @Input()
    resetEventObservable$: Observable<void>
    resetEventSubscription: Subscription

    @Output()
    selectedUserOutput = new EventEmitter<UserDetailsChecked>()

    constructor(
        private router: Router
    ) { }

    navigateTo(path: string) {
        this.router.navigate([path]);
    }

    ngOnInit(): void {
        this.resetEventSubscription = this.resetEventObservable$?.subscribe(() => this.reset())
    }

    ngOnDestroy(): void {
        this.resetEventSubscription?.unsubscribe()
    }

    private reset() {
        this.searchTerm = ""
        this.resultCount = -1
        this.resultEntites = null
    }
}
