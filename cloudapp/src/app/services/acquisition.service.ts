import { CloudAppRestService, HttpMethod, Request } from '@exlibris/exl-cloudapp-angular-lib';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AppConfig } from '../app.config'

export interface POLine {
  link: string;
}

@Injectable({
  providedIn: 'root'
})

export class AcquisitionService {

  constructor(private restService: CloudAppRestService) { }

  getPOLine(link: string): Observable<any> {

    const request: Request = {
      url: `/almaws/v1/${encodeURI(link)}`,
      method: HttpMethod.GET
    };
    return this.restService.call(request);
  }

  getPOLineId(pid: string): Observable<any> {
    let url: string;
    
    url = `/almaws/v1/acq/po-lines/${encodeURI(pid)}`;
    
    const request: Request = {
      url,
      method: HttpMethod.GET,
    };
    
    return this.restService.call(request);
  }

  updatePOLine(poId: string, POLineData: string): any {
    const request: Request = {
      url: `/almaws/v1/acq/po-lines/${poId}`,
      method: HttpMethod.PUT,
      headers: {
        ...AppConfig.httpHeader,
        'Content-Type': 'application/json'
      },
      requestBody: POLineData,
    }; 
    return this.restService.call(request);
  }

  createPOLine(POLineData: any): Observable<any> {
    
    const params = new URLSearchParams();
    params.set('requires_manual_review', 'true');

    const url = `/almaws/v1/acq/po-lines?${params.toString()}`;

    const request: Request = {
      url: url,
      method: HttpMethod.POST,
      headers: {
        ...AppConfig.httpHeader,
        'Content-Type': 'application/json'
      },
      requestBody: POLineData,
    };
    return this.restService.call(request);
  }
  
}
