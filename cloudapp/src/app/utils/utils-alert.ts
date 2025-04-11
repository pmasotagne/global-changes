import { AlertService } from '@exlibris/exl-cloudapp-angular-lib';
import { MatDialog } from '@angular/material/dialog';
import { ProcessSummaryModalComponent } from '../components/resume/resume.component';
import { TranslateService } from '@ngx-translate/core';

export function showAlert(alertService: AlertService, translate: TranslateService, key: string, isError: boolean = true, isWarning: boolean = false, autoClose: boolean = false, timeout: number = 5000): void {
    const message = `${translate.instant(key)} - ${formatDate(new Date())}`;
    if (isWarning) {
        alertService.warn(message, { autoClose });
    } else if (isError) {
        alertService.error(message, { autoClose });
    } else {
        alertService.success(message, { autoClose });
    }

    if (timeout > 0) {
        // Hide the alert after the timeout
        setTimeout(() => {
            alertService.clear();
        }, timeout);
    }
}

export function formatDate(date: Date): string {
    return `${date.getDate().toString().padStart(2, '0')}/${
        (date.getMonth() + 1).toString().padStart(2, '0')
    }/${date.getFullYear()} ${
        date.getHours().toString().padStart(2, '0')
    }:${
        date.getMinutes().toString().padStart(2, '0')
    }:${
        date.getSeconds().toString().padStart(2, '0')
    }`;
}

export function showSummary(
    dialog: MatDialog,
    updatedCount: number,
    errorsCount: number,
    totalRows: number,
    setId: string | null,
    setIdError: string | null,
    elapsedMinutes: number,
    elapsedSeconds: number
): void {
    const dialogRef = dialog.open(ProcessSummaryModalComponent, {
        width: '500px',
        data: {
            updatedCount,
            errorsCount,
            totalRows,
            setId,
            setIdError,
            minutes: elapsedMinutes,
            seconds: elapsedSeconds
        }
    });
}