import { Component, Input } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'


@Component({
	selector: 'app-loader',
	templateUrl: './loader.component.html',
	styleUrls: ['./loader.component.scss']
})
export class LoaderComponent {

	@Input() loading: boolean
	@Input() processedCount: number = 0;
  	@Input() totalCount: number = 0;
	@Input() statusMessage: string = '';

	constructor(
		private translate: TranslateService,
	) { }

}
