import { Injectable } from '@angular/core';
import { CloudAppRestService, HttpMethod, Request } from '@exlibris/exl-cloudapp-angular-lib';
import { Observable } from 'rxjs';
import { Item } from '../components/interfaces/item.interface';
import { AppConfig } from '../app.config'

@Injectable({
  providedIn: 'root'
})

export class ItemService {
  constructor(private restService: CloudAppRestService) { }

  async getHolding(params: { mmsid: string; holdingid: string }): Promise<string> {
    const url = `/almaws/v1/bibs/${params.mmsid}/holdings/${params.holdingid}`;
  
    const request: Request = {
      url,
      method: HttpMethod.GET,
    };
  
    return new Promise((resolve, reject) => {
      this.restService.call(request).subscribe({
        next: (response) => resolve(response),
        error: (err) => reject(err),
      });
    });
  }

  updateHolding(mmsid: string, holdingid: string, holdingData: string): any {
    const request: Request = {
      url: `/almaws/v1/bibs/${mmsid}/holdings/${holdingid}`,
      method: HttpMethod.PUT,
      headers: {
        "Content-Type": "application/xml",
        Accept: "application/json"
      },
      requestBody: holdingData,
    };
    
    return this.restService.call(request);
  }

  getItemByBarcode(barcode: string): Observable<Item> {

    const request: Request = {
      url: `/almaws/v1/items?item_barcode=${encodeURI(barcode)}`,
      method: HttpMethod.GET
    };
    return this.restService.call(request);
  }

  getItem(params: { barcode?: string; mmsid?: string; holdingid?: string; pid?: string }): Observable<Item> {
    let url: string;
  
    if (params.barcode) {
      // Request by barcode
      url = `/almaws/v1/items?item_barcode=${encodeURI(params.barcode)}`;
    } else if (params.mmsid && params.holdingid && params.pid) {
      // Request by MMS ID, Holding ID, and Physical ID
      url = `/almaws/v1/bibs/${params.mmsid}/holdings/${params.holdingid}/items/${params.pid}`;
    } else {
      throw new Error('Invalid parameters: Provide either a barcode or MMS ID, Holding ID, and Physical ID.');
    }
  
    const request: Request = {
      url,
      method: HttpMethod.GET,
    };
  
    return this.restService.call(request);
  }

  updateItem(mmsid: string, holdingid: string, pid: string, itemData: Item): Observable<Item> {
    const request: Request = {
      url: `/almaws/v1/bibs/${mmsid}/holdings/${holdingid}/items/${pid}`,
      method: HttpMethod.PUT,
      headers: AppConfig.httpHeader,
      requestBody: itemData,
    };
    
    return this.restService.call(request);
  }

  createItem(mmsid: string, holdingid: string, itemData: any): Observable<Item> {
    const request: Request = {
      url: `/almaws/v1/bibs/${mmsid}/holdings/${holdingid}/items`,
      method: HttpMethod.POST,
      headers: {
        ...AppConfig.httpHeader,
        'Content-Type': 'application/xml'
      },
      requestBody: itemData,
    };
  
    return this.restService.call(request);
  }
     
}
