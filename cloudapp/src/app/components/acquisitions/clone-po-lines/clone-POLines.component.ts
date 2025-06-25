import { Component, OnInit } from '@angular/core';
import { AcquisitionService } from '../../../services/acquisition.service';
import { Router } from '@angular/router';
import { Entity } from '@exlibris/exl-cloudapp-angular-lib';
import { of, forkJoin } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { formatDate } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ProcessSummaryModalComponent } from '../../resume/resume.component';
import { Timer } from '../../../utils/utils-timer';
import { UserAccessService } from '../../../services/userAccess.service';
import { AlertService } from '@exlibris/exl-cloudapp-angular-lib';
import { TranslateService } from '@ngx-translate/core';
import { ProcessDataService } from '../../../services/process-data.service';
import { fieldOptions, FieldOption } from './field-options';

interface ClonedResult {
  originalId: string;
  newId?: string;
  error?: string;
}

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
  clonedResults: ClonedResult[] = [];
  enableFieldOverrides: boolean = false;

  fieldOverrides: { field: string; value: string }[] = [
    { field: '', value: '' }
  ];

  private timer = new Timer();

  createdNumbers: string[] = [];

  // User Validation
  checkingUser: boolean = false;
  isModuleUserAllowed: boolean = false;

   // Options
  fieldOptions = fieldOptions;

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
    this.sortAndTranslateFieldOptions();
  }

  private sortAndTranslateFieldOptions(): void {
    const translationKeys = this.fieldOptions.map(option => option.label);
  
    this.translate.get(translationKeys).subscribe(translations => {
      this.fieldOptions.forEach(option => {
        option.label = translations[option.label];
      });
  
      this.fieldOptions.sort((a, b) => a.label.localeCompare(b.label));
    });
  }

  getAvailableOptions(currentIndex: number): FieldOption[] {
    const selectedFields = this.fieldOverrides
      .filter((_, i) => i !== currentIndex)
      .map(f => f.field);
    return fieldOptions.filter(opt => !selectedFields.includes(opt.value));
  }

  addField(): void {
    if (this.hasAvailableOptions()) {
      this.fieldOverrides.push({ field: '', value: '' });
    }
  }

  removeField(index: number): void {
    this.fieldOverrides.splice(index, 1);
  }

  hasAvailableOptions(): boolean {
    const selectedFields = this.fieldOverrides.map(f => f.field);
    return fieldOptions.some(opt => !selectedFields.includes(opt.value));
  }

  applyOverridesToPOLine(poLine: any): any {
    if (!this.enableFieldOverrides) return poLine;

    this.fieldOverrides.forEach(({ field, value }) => {
      if (field) poLine[field] = value;
    });

    return poLine;
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
    this.clonedResults = [];
  }

  cloneSelectedEntities() {
    this.processedCount = 0;
    this.updatedCount = 0;
    this.errorsCount = 0;
    this.totalRows = this.selectedEntities.length;
    //console.log('Selected Entities:', this.selectedEntities);
    this.loading = true;
    this.clonedResults = [];

    this.timer.startTimer();

    // Retrieve all PO Lines for the selected entities
    const getObservables = this.selectedEntities.map(entity =>
      this.acquisitionService.getPOLine(entity.link)
    );
  
    forkJoin(getObservables).subscribe({
      next: (responses) => {
        const creationObservables = [];
  
        responses.forEach((poLine, index) => {
          //const originalId = this.selectedEntities[index].link;
          const rawId = this.selectedEntities[index].link;
          const lastPart = rawId.split('/').pop() || '';
          const originalId = lastPart.startsWith('POL-') ? lastPart : `POL-${lastPart}`;

          if (poLine) {
            this.processedCount += 1;

            delete poLine.number;
            delete poLine.po_number;
            delete poLine.status;
            poLine.link = '';
            const today = formatDate(new Date(), 'yyyy-MM-dd\'Z\'', 'en-US');
            poLine.status_date = today;
            poLine.created_date = today;
            poLine = this.applyOverridesToPOLine(poLine);

            const creationObservable = this.acquisitionService.createPOLine(poLine).pipe(
              map(response => ({
                originalId,
                newId: response?.number,
              })),
              catchError(err => {
                this.errorsCount += 1;
                return of({
                  originalId,
                  error: err?.message || 'Unknown error'
                });
              })
            );

            creationObservables.push(creationObservable);
          } else {
            // poLine is null or undefined
            this.clonedResults.push({
              originalId,
              error: 'Could not retrieve PO Line'
            });
          }
        });
  
        // Now create all the modified PO Lines in parallel
        forkJoin(creationObservables).subscribe({
          next: (results: ClonedResult[]) => {
            results.forEach(result => {
              if (result.newId) this.updatedCount += 1;
            });

            this.clonedResults = [...this.clonedResults, ...results];
            this.timer.stopTimer();
            this.loading = false;
            this.openSummaryModal();
          },
          error: (err) => {
            this.timer.stopTimer();
            this.loading = false;
          }
        });
      },
      error: (err) => {
        this.timer.stopTimer();
        this.loading = false;
      }
    });

  }

  validateFirstEntity() {
    this.error = false;
    //console.log(this.selectedEntities[0]);
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

  get successfulClones() {
    return this.clonedResults.filter(result => result.newId);
  }

  get failedClones() {
    return this.clonedResults.filter(result => result.error);
  }

}
