import { Component, OnInit } from '@angular/core';
import { AcquisitionService } from '../../../services/acquisition.service';
import { Router } from '@angular/router';
import { Entity } from '@exlibris/exl-cloudapp-angular-lib';
import { of, forkJoin } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { formatDate } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ProcessSummaryModalComponent } from '../../resume/resume.component';
import { Timer } from '../../../utils/utils-timer';
import { UserAccessService } from '../../../services/userAccess.service';
import { AlertService } from '@exlibris/exl-cloudapp-angular-lib';
import { TranslateService } from '@ngx-translate/core';
import { ProcessDataService } from '../../../services/process-data.service';

@Component({
  selector: 'clone-POLines',
  templateUrl: './clone-POLines.component.html',
  styleUrls: ['./clone-POLines.component.scss']
})

export class ClonePOLinesComponent implements OnInit {

  count = 0;
  totalRows : number;
  error = false;
  loading: boolean;
  selectedEntities = new Array<Entity>();
  processedCount : number;
  updatedCount : number;
  errorsCount : number;

  private timer = new Timer();

  createdNumbers: string[] = [];

  // User Validation
  checkingUser: boolean = false;
  isModuleUserAllowed: boolean = false;

  constructor(
    private acquisitionService: AcquisitionService,
    private router: Router,
    private dialog: MatDialog,
    private processDataService: ProcessDataService,
    private userAccessService: UserAccessService,
    private translate: TranslateService,
    private alert: AlertService,
  ) { }

  ngOnInit() {
    this.loading = true;
    this.checkingUser = true;
    this.userAccessService.isModuleAccessAllowed('acquisitions')
      .subscribe(
        allowed => {
          this.isModuleUserAllowed = allowed;
          this.checkingUser = false;
          this.loading = false;
        },
        error => {
          const alertMsg = this.translate.instant('main.error.permissionCheck', { status: error.status });
          this.alert.error(alertMsg, { autoClose: true });
          this.checkingUser = false;
          this.loading = false;
        }
      );

    this.validateFirstEntity();
  }

  back(): void {
    if (!this.loading) {
      this.router.navigate(['/main']);
    }
  }

  reloadClone(): void {
    // Reset the arrays to allow a new selection and cloning cycle
    this.createdNumbers = [];
    this.selectedEntities = [];
  }

  cloneSelectedEntities() {
    this.processedCount = 0;
    this.updatedCount = 0;
    this.errorsCount = 0;
    this.totalRows = this.selectedEntities.length;
    //console.log('Selected Entities:', this.selectedEntities);
    this.loading = true;

    this.timer.startTimer();

    // Retrieve all PO Lines for the selected entities
    const getObservables = this.selectedEntities.map(entity =>
      this.acquisitionService.getPOLine(entity.link)
    );
  
    forkJoin(getObservables).subscribe({
      next: (responses) => {
        const creationObservables = [];
  
        responses.forEach(poLine => {
          if (poLine) {
            this.processedCount += 1;
            delete poLine.number;
            delete poLine.po_number;
            delete poLine.status;
            poLine.link = '';
            const today = formatDate(new Date(), 'yyyy-MM-dd\'Z\'', 'en-US');
            poLine.status_date = today;
            poLine.created_date = today;
  
            // Build the observable for creating the modified PO Line, with error handling
            const creationObservable = this.acquisitionService.createPOLine(poLine).pipe(
              catchError(err => {
                this.errorsCount += 1;
                // Return an empty object or null for failed creations
                return of(null);
              })
            );
  
            creationObservables.push(creationObservable);
          }
        });
  
        // Now create all the modified PO Lines in parallel
        forkJoin(creationObservables).subscribe({
          next: (creationResponses) => {  
            // Filter successful PO Lines (those that are not null)
            this.createdNumbers = creationResponses
              .filter(response => response && (response as any).number)  // Only include non-null responses
              .map(response => {
                const number = (response as any).number;
        
                // Increment updatedCount for successful PO Lines
                this.updatedCount += 1;
        
                // Return the number to be included in createdNumbers
                return number;
              });
        
            this.loading = false;
            this.openSummaryModal();
          },
          error: (err) => {
            this.loading = false;
          }
        });
      },
      error: (err) => {
        this.loading = false;
      }
    });

    this.timer.stopTimer();

  }

  validateFirstEntity() {
    this.error = false;
    console.log(this.selectedEntities[0]);
    if (this.selectedEntities.length > 0 && this.selectedEntities[0].type !== 'PO_LINE') {
      this.selectedEntities.length = 0;
      this.error = true;
    }
  }

  openSummaryModal() {
    this.dialog.open(ProcessSummaryModalComponent, {
      data: {
        poline : true,
        totalRows: this.totalRows,
        processedCount: this.processedCount,
        createdNumbers: this.createdNumbers,
        updatedCount: this.updatedCount,
        errorsCount: this.errorsCount,
      }
    });

    const institutionCode = localStorage.getItem('institutionCode') || 'UNKNOWN_INSTITUTION';

    const processData = {
      updatedCount: this.updatedCount,
      errorsCount: this.errorsCount,
      totalRows: this.totalRows,
      elapsedMinutes: this.timer.elapsedMinutes,
      elapsedSeconds: this.timer.elapsedSeconds,
      type: 'clone_polines',
      institutionCode: institutionCode
    };

    // Send the data to the server
    this.processDataService.sendProcessData(processData).subscribe(
      (response) => {
        console.log('Data sent successfully:', response);
      },
      (error) => {
        console.error('Error sending data:', error);
      }
    );

  }

}
