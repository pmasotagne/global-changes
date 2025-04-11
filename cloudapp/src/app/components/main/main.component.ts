import { Component, OnDestroy, OnInit } from '@angular/core'
import { AlertService } from '@exlibris/exl-cloudapp-angular-lib'
import { TranslateService } from '@ngx-translate/core'
import { UserAccessService } from '../../services/userAccess.service'
import { ConfigService } from '../../services/configuration.service'

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit, OnDestroy {
  institutionCode: string | null = null;
  userDetails: any = '';

  loading: boolean = false
  checkingUser: boolean = false;
  isUserAllowed: boolean = false

  permissionError: string

  constructor(
    private alert: AlertService,
    private translate: TranslateService,
    private userAccessService: UserAccessService,
    private ConfigService: ConfigService,

  ) { }

  ngOnInit(): void {
      this.ConfigService.testAPI().subscribe({
        next: (xmlString: string) => {
          // Parse XML string
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
          
          // Get text content from <test> element
          const testElement = xmlDoc.getElementsByTagName('test')[0];
          const content = testElement.textContent;
          
          // Extract institution code using regex
          const institutionCodeMatch = content?.match(/institutionCode: (\S+)/);
          this.institutionCode = institutionCodeMatch ? institutionCodeMatch[1] : null;
          
          try {
            localStorage.setItem('institutionCode', this.institutionCode);
          } catch (e) {
            console.error('LocalStorage error:', e);
          }
        },
        error: (err) => console.error('Error:', err)
      });

    this.checkingUser = true
    this.loading = true
    this.userAccessService.isUserAllowed()
      .subscribe(
        (allowed) => {
          this.isUserAllowed = allowed
          this.checkingUser = false
          this.loading = false
          this.userDetails = this.userAccessService.getUserDetails();        
        },
        (error) => {
          let alertMsg = this.translate.instant('main.error.permissionCheck', {
            status: error.status
          })
          this.alert.error(alertMsg, { autoClose: true })
          this.permissionError = `Permission denied: ${error.message}`
          this.loading = false
        }
      )
    
  }

  ngOnDestroy(): void { }

}
